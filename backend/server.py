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

import datetime
from os import path, listdir, remove
from os.path import isfile, join
import pickle
import time
from urllib import response
from flask import Flask, request
from flask_cors import CORS
from cpr_services import run_auto_excluder, run_manual_excluder
from gads_api import get_youtube_channel_id_list
import json
from werkzeug.utils import secure_filename


app = Flask(__name__)
CORS(app)

tasks_folder="tasks";

def run_automatic_excluder_from_file(file_name:str):
  full_file_name=f"{tasks_folder}/{file_name}.pickle";

  if path.exists(full_file_name):
    with open(full_file_name, 'rb') as token:
      file_contents = pickle.load(token)
      exclude_yt = 'true'
      customer_id = file_contents['customer_id']
      minus_days: int = int(file_contents['days_ago'])
      d = datetime.date.today() - datetime.timedelta(days=minus_days)
      date_from = d.strftime('%Y-%m-%d')
      yt_date_to = datetime.date.today().strftime('%Y-%m-%d')
      gads_filters = file_contents['gads_filter']
      yt_view_count_filter = file_contents['yt_view_operator']+file_contents['yt_view_value']
      yt_sub_count_filter = file_contents['yt_subscriber_operator']+file_contents['yt_subscriber_value']
      yt_video_count_filter = file_contents['yt_video_operator']+file_contents['yt_video_value']
      
      if file_contents['yt_country_operator']== "":
        yt_country_filter = ""
      else:
        yt_country_filter = f"{file_contents['yt_country_operator']}'{file_contents['yt_country_value'].upper()}'"
      
      if file_contents['yt_language_operator'] == "":
        yt_language_filter= ""
      else:
        yt_language_filter = f"{file_contents['yt_language_operator']}'{file_contents['yt_language_value'].lower()}'"
      
      yt_standard_characters_filter = file_contents['yt_std_character']
      
      response_data = run_auto_excluder(exclude_yt, customer_id, date_from, yt_date_to, gads_filters, 
      yt_view_count_filter, yt_sub_count_filter, yt_video_count_filter, yt_country_filter, 
      yt_language_filter, yt_standard_characters_filter)
      
      yt_exclusions=get_youtube_channel_id_list(response_data)
      
      return _build_response(json.dumps(f"{len(yt_exclusions)}"))
  else:
    return _build_response(json.dumps("Config doesn't exist"))




@app.route("/api/runTaskFromFile", methods=['POST'])
def run_task_from_file():
  data = request.get_json(force = True)
  file_name=data['file_name']
  return run_automatic_excluder_from_file(file_name)



@app.route("/api/runAutoExcluder", methods=['POST', 'GET'])
def server_run_excluder():
    data = request.get_json(force = True)
    exclude_yt = data['excludeYt']
    customer_id = data['gadsCustomerId']
    minus_days: int = int(data['daysAgo'])
    d = datetime.date.today() - datetime.timedelta(days=minus_days)
    date_from = d.strftime('%Y-%m-%d')
    yt_date_to = datetime.date.today().strftime('%Y-%m-%d')
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
    
    response_data = run_auto_excluder(exclude_yt, customer_id, date_from, yt_date_to, gads_filters, 
    yt_view_count_filter, yt_sub_count_filter, yt_video_count_filter, yt_country_filter, 
    yt_language_filter, yt_standard_characters_filter)
    
    return _build_response(json.dumps(response_data))



@app.route("/api/runManualExcluder", methods=['POST', 'GET'])
def server_run_manual_excluder():
  data = request.get_json(force = True)
  customer_id = data['gadsCustomerId']
  exclude_yt = data['ytExclusionList']

  response_data = run_manual_excluder(customer_id, exclude_yt)

  return _build_response(json.dumps(response_data))



@app.route("/api/fileUpload", methods=['POST', 'GET'])
def client_secret_upload():
  f = request.files['clientSecret']
  f.save(secure_filename(f.filename))
  
  return _build_response(json.dumps("success"))



@app.route("/api/getConfig", methods=['GET'])
def get_config():
  if path.exists('config.pickle'):
        with open('config.pickle', 'rb') as token:
            config = pickle.load(token)
            return _build_response(json.dumps(config))
  
  return _build_response(json.dumps("x"))
  


@app.route("/api/setConfig", methods=['POST'])
def set_config():
  data = request.get_json(force = True)
  config = {'dev_token': data['dev_token'], 'mcc_id': data['mcc_id'], 'email_address': data['email_address']}
  with open('config.pickle', 'wb') as f:
    pickle.dump(config, f)
  
  return _build_response(json.dumps("success"))



@app.route("/api/saveTask", methods=['POST'])
def save_task():
  data = request.get_json(force = True)
  date_created = datetime.date.today().strftime('%Y-%m-%d')
  
  if data['file_name'] == "":
    file_name=int(round(time.time() * 1000))
  else:
    file_name=data['file_name']
  


  task_details = {'file_name': str(file_name), 'task_name': data['task_name'], 'customer_id': data['customer_id'], 'days_ago': data['days_ago'],
    'schedule': data['schedule'], 'gads_filter': data['gads_filter'], 'yt_subscriber_operator': data['yt_subscriber_operator'],
    'yt_subscriber_value': data['yt_subscriber_value'], 'yt_view_operator': data['yt_view_operator'],
    'yt_view_value': data['yt_view_value'], 'yt_video_operator': data['yt_video_operator'],
    'yt_video_value': data['yt_video_value'], 'yt_language_operator': data['yt_language_operator'],
    'yt_language_value': data['yt_language_value'], 'yt_country_operator': data['yt_country_operator'],
    'yt_country_value': data['yt_country_value'], 'yt_std_character': data['yt_std_character'],
    'date_created': date_created
  }

  with open(f"{tasks_folder}/{file_name}.pickle", 'wb') as f:
    pickle.dump(task_details, f)
  
  return _build_response(json.dumps(file_name))



@app.route("/api/getTasksList", methods=['GET'])
def get_tasks_list():
  files_data={}
  if path.exists(f"{tasks_folder}/"):
    file_list = [f for f in listdir(tasks_folder) if isfile(join(tasks_folder, f))]
    index=0
    for file in file_list:
      with open(f"{tasks_folder}/{file}", 'rb') as token:
        file_contents = pickle.load(token)
        files_data[index]= {
          'file_name': file_contents['file_name'],
          'task_name': file_contents['task_name'],
          'customer_id': file_contents['customer_id'],
          'schedule': file_contents['schedule'],
          'date_created': file_contents['date_created']
          }
      index+=1
  return _build_response(json.dumps(files_data))


@app.route("/api/getTask", methods=['POST'])
def get_task():
  data = request.get_json(force = True)
  file_name=data['file_name']
  full_file_name=f"{tasks_folder}/{file_name}.pickle";

  if path.exists(full_file_name):
    with open(full_file_name, 'rb') as token:
      file_contents = pickle.load(token)
      return _build_response(json.dumps(file_contents))
  return _build_response(json.dumps("x"))



@app.route("/api/doesTaskExist", methods=['POST'])
def does_task_exist():
  data = request.get_json(force = True)
  file_name=data['task_name'].replace(" ", "_")
  if path.exists(f"{tasks_folder}/{file_name}.pickle"):
    return_response = { 'task_name': data['task_name'], 'exists':'true'}
    return _build_response(json.dumps(return_response))
  else:
    return_response = { 'task_name': data['task_name'], 'exists':'false'}
    return _build_response(json.dumps(return_response))



@app.route("/api/deleteTask", methods=['POST'])
def delete_task():
  data = request.get_json(force = True)
  file_name=data['file_name']
  full_file_name=f"{tasks_folder}/{file_name}.pickle";

  if path.exists(full_file_name):
    remove(full_file_name)
    return _build_response(json.dumps(file_name))
  else:
    return _build_response(json.dumps("-"))



def _build_response(msg='', status=200, mimetype='application/json'):
    """Helper method to build the response."""
    response = app.response_class(msg, status=status, mimetype=mimetype)
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response
    

app.run(debug=True, port=5000)

