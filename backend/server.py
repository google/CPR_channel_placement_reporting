# coding=utf-8
# Copyright 2022 Google LLC..
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from datetime import date, datetime, timedelta
import math
from os import path, listdir, remove
from os.path import isfile, join
import pickle
import time
from urllib import response
from flask import Flask, request, url_for, render_template
from flask_cors import CORS
import json
from werkzeug.utils import secure_filename
from smart_open import open

from cpr_services import run_auto_excluder, run_manual_excluder
from gads_api import get_youtube_channel_id_list
from cloud_api import get_schedule_list, update_cloud_schedule
from credentials import get_oauth
from firebase_server import fb_get_task, fb_save_task, fb_get_tasks_list, fb_delete_task


app = Flask(__name__, static_url_path='', 
      static_folder='static', 
      template_folder='static')
CORS(app)

TASKS_FOLDER="tasks"
CONFIG_FILE="config.pickle"
date_format='%Y-%m-%d'

project_id=""
project_url=f"gs://{project_id}-cpr"
location="europe-west1"
server=f"https://{project_id}.appspot.com"
credentials=None


def refresh_credentials():
  global credentials
  if credentials==None:
    credentials = get_oauth(project_url)
    

def run_automatic_excluder_from_task_id(task_id:str):
  refresh_credentials()
  file_contents = fb_get_task(task_id)

  if(file_contents):
    exclude_yt = 'true'
    customer_id = file_contents['customer_id']
    minus_days: int = int(file_contents['days_ago'])
    d = date.today() - timedelta(days=minus_days)
    date_from = d.strftime(date_format)
    yt_date_to = date.today().strftime(date_format)
    gads_filters = file_contents['gads_filter']
    yt_view_count_filter = file_contents['yt_view_operator']+file_contents['yt_view_value']
    yt_sub_count_filter = file_contents['yt_subscriber_operator']+file_contents['yt_subscriber_value']
    yt_video_count_filter = file_contents['yt_video_operator']+file_contents['yt_video_value']
    
    if file_contents['yt_country_operator']:
      yt_country_filter = f"{file_contents['yt_country_operator']}'{file_contents['yt_country_value'].upper()}'"
    else:
      yt_country_filter = ""
      
    
    if file_contents['yt_language_operator']:
      yt_language_filter = f"{file_contents['yt_language_operator']}'{file_contents['yt_language_value'].lower()}'"
    else:
      yt_language_filter= ""
    
    yt_standard_characters_filter = file_contents['yt_std_character']
    
    response_data = run_auto_excluder(
      credentials,
      project_url,
      CONFIG_FILE,
      exclude_yt,
      customer_id,
      date_from,
      yt_date_to,
      gads_filters, 
      yt_view_count_filter,
      yt_sub_count_filter,
      yt_video_count_filter,
      yt_country_filter, 
      yt_language_filter,
      yt_standard_characters_filter
    )
    
    yt_exclusions=get_youtube_channel_id_list(response_data)
    
    return _build_response(json.dumps(f"{len(yt_exclusions)}"))
  else:
    return _build_response(json.dumps("Config doesn't exist"))

@app.route("/", methods=['GET'])
def run_static():
  return render_template('index.html')


@app.route("/newtask", methods=['GET'])
def run_static_nt():
  return render_template('index.html')


@app.route("/api/runTaskFromTaskId", methods=['POST'])
def run_task_from_task_id():
  data = request.get_json(force = True)
  task_id=data['task_id']
  return run_automatic_excluder_from_task_id(task_id)



@app.route("/api/runAutoExcluder", methods=['POST'])
def server_run_excluder():
  refresh_credentials()
  data = request.get_json(force = True)
  exclude_yt = data['excludeYt']
  customer_id = data['gadsCustomerId']
  minus_days: int = int(data['daysAgo'])
  d = date.today() - timedelta(days=minus_days)
  date_from = d.strftime(date_format)
  yt_date_to = date.today().strftime(date_format)
  gads_filters = data['gadsFinalFilters']
  yt_view_count_filter = data['ytViewOperator']+data['ytViewValue']
  yt_sub_count_filter = data['ytSubscriberOperator']+data['ytSubscriberValue']
  yt_video_count_filter = data['ytVideoOperator']+data['ytVideoValue']
  
  if data['ytCountryOperator']== "":
    yt_country_filter = ""
  else:
    yt_country_filter = f"{data['ytCountryOperator']}'{data['ytCountryValue'].upper()}'"
  
  if data['ytLanguageOperator'] == "":
    yt_language_filter= ""
  else:
    yt_language_filter = f"{data['ytLanguageOperator']}'{data['ytLanguageValue'].lower()}'"
  
  yt_standard_characters_filter = data['ytStandardCharValue']
  
  response_data = run_auto_excluder(
    credentials,
    project_url,
    CONFIG_FILE,
    exclude_yt,
    customer_id,
    date_from,
    yt_date_to,
    gads_filters, 
    yt_view_count_filter,
    yt_sub_count_filter,
    yt_video_count_filter,
    yt_country_filter, 
    yt_language_filter,
    yt_standard_characters_filter
  )
  
  return _build_response(json.dumps(response_data))



@app.route("/api/runManualExcluder", methods=['POST', 'GET'])
def server_run_manual_excluder():
  refresh_credentials()
  data = request.get_json(force = True)
  customer_id = data['gadsCustomerId']
  exclude_yt = data['ytExclusionList']

  response_data = run_manual_excluder(credentials, project_url, CONFIG_FILE, customer_id, exclude_yt)

  return _build_response(json.dumps(response_data))



@app.route("/api/fileUpload", methods=['POST'])
def client_secret_upload():
  data = request.get_json(force = True)

  with open(f"{project_url}/client_secret.json", 'wb') as cs:
    cs.write((json.dumps(data)).encode("utf8"))
  
  return _build_response(json.dumps("success"))



@app.route("/api/getConfig", methods=['GET'])
def get_config():
  try:
    with open(f"{project_url}/{CONFIG_FILE}", 'rb') as token:
        config = pickle.load(token)
        return _build_response(json.dumps(config))
  except:
    return _build_response(json.dumps("x"))
  


@app.route("/api/setConfig", methods=['POST'])
def set_config():
  global credentials
  credentials=None
  data = request.get_json(force = True)
  config = {'dev_token': data['dev_token'], 'mcc_id': data['mcc_id'], 'email_address': data['email_address']}
  with open(f"{project_url}/{CONFIG_FILE}", 'wb') as f:
    pickle.dump(config, f)
  
  refresh_credentials()
  return _build_response(json.dumps("success"))



@app.route("/api/saveTask", methods=['POST'])
def save_task():
  refresh_credentials()
  data = request.get_json(force = True)
  
  task_id=fb_save_task(data)

  update_cloud_schedule(credentials, project_id, location, server, str(data['task_id']), int(data['schedule']))
  
  return _build_response(json.dumps(task_id))



@app.route("/api/getTasksList", methods=['GET'])
def get_tasks_list():
  refresh_credentials()
  files_data = fb_get_tasks_list()

  if files_data:
    schedule_list = get_schedule_list(credentials, project_id, location, server)
    for schedule in schedule_list.values():
      sch_date = datetime.fromisoformat(schedule['scheduleTime'][:-1] + '+00:00').replace(tzinfo=None)
      now_date = datetime.today()
      time_difference = sch_date - now_date
      next_run=f"""
      {math.floor(time_difference.total_seconds() / 3600)}h 
      {(math.floor(time_difference.total_seconds() / 60)-(60*math.floor(time_difference.total_seconds() / 3600)))}m
      """

      if 'status' in schedule:
        files_data[schedule['httpTarget']['headers']['task_id']].update({'error_code': schedule['status']['code']})
      else:
        files_data[schedule['httpTarget']['headers']['task_id']].update({'error_code': '0'})
      
      files_data[schedule['httpTarget']['headers']['task_id']].update({'state': schedule['state']})
      files_data[schedule['httpTarget']['headers']['task_id']].update({'schedule_time': (schedule['scheduleTime'][:-1]).replace("T", " ")})
      files_data[schedule['httpTarget']['headers']['task_id']].update({'next_run': next_run})

  return _build_response(json.dumps(files_data))


@app.route("/api/getTask", methods=['POST'])
def get_task():
  data = request.get_json(force = True)
  task_id=data['task_id']
  
  task_data = fb_get_task(task_id)

  return _build_response(json.dumps(task_data))



@app.route("/api/deleteTask", methods=['POST'])
def delete_task():
  refresh_credentials()
  data = request.get_json(force = True)
  task_id=data['task_id']
  
  fb_delete_task(task_id)

  update_cloud_schedule(credentials, project_id, location, server, str(task_id), 0)

  return _build_response(json.dumps(task_id))
  

@app.route("/api/getScheduleList", methods=['GET'])
def get_schedules():
  refresh_credentials()
  schedule_list = get_schedule_list(credentials, project_id, location, server)
  print(schedule_list)

  return _build_response(json.dumps("-"))

def _build_response(msg='', status=200, mimetype='application/json'):
    """Helper method to build the response."""
    response = app.response_class(msg, status=status, mimetype=mimetype)
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response
    

app.run(debug=True, port=5000)

