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
import logging
import math
from os import environ, path, listdir, remove, getenv
import os
import pickle
import traceback

from flask import Flask, request, render_template
from flask_cors import CORS
import json

from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow

from google.appengine.api import wrap_wsgi_app
from google.appengine.api.mail import send_mail

from cpr_services import get_mcc_ids, run_auto_excluder, run_manual_excluder, get_customer_ids, remove_channel_id
from gads_api import get_channel_id_name_list
from cloud_api import get_schedule_list, update_cloud_schedule
from firebase_server import fb_get_task, fb_save_client_secret, fb_save_task, fb_get_tasks_list, fb_delete_task, fb_save_settings, fb_read_settings, fb_read_client_secret, fb_save_token, fb_read_token, fb_clear_token, fb_add_to_allowlist, fb_remove_from_allowlist


app = Flask(__name__, static_url_path='',
            static_folder='static',
            template_folder='static')
app.wsgi_app = wrap_wsgi_app(app.wsgi_app)
CORS(app)

debug_project_id = ""

DATE_FORMAT = '%Y-%m-%d'
PROJECT_ID = getenv('GOOGLE_CLOUD_PROJECT') if not debug_project_id else debug_project_id
LOCATION = "europe-west1" 
 
_REDIRECT_URI = f"https://{PROJECT_ID}.ew.r.appspot.com/authdone"

credentials = None

scopes_array = [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/adwords'
]

flow: Flow


def send_CPR_email(subject: str, body: str):
    config = fb_read_settings()
    send_mail(sender=f"exclusions@{PROJECT_ID}.appspotmail.com",
              to=config['email_address'],
              subject=subject,
              body=body)


def send_error_email(error: str, customer_id: str):
    send_CPR_email(
        subject=f"CPR error. Customer-id: {customer_id}",
        body=f"""
        Customer ID: {customer_id}\n
        Error: {error}""")


def send_ytList_email(ytList: list, task_id: str, customer_id: str):
    config = fb_read_settings()
    count = len(ytList)

    ytListToPrint = ""
    dspListToPrint = ""
    for yt in ytList:
        if yt[0] == 6:
            ytListToPrint += f"{yt[2]} - https://www.youtube.com/channel/{yt[1]}\n"
        else:
            dspListToPrint += f"{yt[2]}\n"

    send_CPR_email(
        subject=f"CPR Task ID {task_id} has added {count} Channel Exclusions",
        body=f"""
        CPR Task ID: {task_id}
        Customer ID: {customer_id}
        {count} channel exclusions added to your account\n
        YouTube Exclusions:
        {ytListToPrint}
        Display Exclusions:
        {dspListToPrint}""")


def refresh_credentials():
    credentials = get_oauth()
    return credentials


def run_automatic_excluder_from_task_id(task_id: str):
    credentials = refresh_credentials()
    file_contents = fb_get_task(task_id)

    if (file_contents):

        customer_id = file_contents['customer_id']
        minus_days: int = int(file_contents['lookback_days'])
        start_days: int = int(file_contents['from_days_ago'])
        total_lookback = minus_days + start_days

        d = date.today() - timedelta(days=total_lookback)
        date_from = d.strftime(DATE_FORMAT)

        dt = date.today() - timedelta(days=start_days)
        date_to = dt.strftime(DATE_FORMAT)

        gads_data_youtube = file_contents['gads_data_youtube']
        gads_data_display = file_contents['gads_data_display']
        gads_filters = file_contents['gads_filter']
        yt_view_count_filter = file_contents['yt_view_operator'] + \
            file_contents['yt_view_value']
        yt_sub_count_filter = file_contents['yt_subscriber_operator'] + \
            file_contents['yt_subscriber_value']
        yt_video_count_filter = file_contents['yt_video_operator'] + \
            file_contents['yt_video_value']
        include_yt_data = file_contents['include_youtube']

        if file_contents['yt_country_operator']:
            yt_country_filter = f"{file_contents['yt_country_operator']}'{file_contents['yt_country_value'].upper()}'"
        else:
            yt_country_filter = ""

        if file_contents['yt_language_operator']:
            yt_language_filter = f"{file_contents['yt_language_operator']}'{file_contents['yt_language_value'].lower()}'"
        else:
            yt_language_filter = ""

        yt_standard_characters_filter = file_contents['yt_std_character']

        try:
            response_data = run_auto_excluder(
                credentials,
                fb_read_settings(),
                True,
                customer_id,
                date_from,
                date_to,
                gads_data_youtube,
                gads_data_display,
                gads_filters,
                yt_view_count_filter,
                yt_sub_count_filter,
                yt_video_count_filter,
                yt_country_filter,
                yt_language_filter,
                yt_standard_characters_filter,
                include_yt_data,
                False
            )
        except Exception as e:
            error_msg = f"run_automatic_excluder_from_task_id failed.\nTask-id: {task_id}\nStacktrace: {str(e)}"
            send_error_email(error_msg, customer_id)
            return _build_response(json.dumps(error_msg))
            response = handle_exception(customer_id)
            return response


        all_exclusions = get_channel_id_name_list(response_data["data"])
        if all_exclusions and file_contents['email_alerts']:
            print("sending email")
            send_CPR_email(all_exclusions, task_id, customer_id)
            
        return _build_response(json.dumps(f"{len(all_exclusions)}"))
    else:
        return _build_response(json.dumps("Config doesn't exist"))

def handle_exception(customer_id):
    error_msg = f"server_run_excluder failed."
    stack_trace = traceback.format_exc()
    full_error_msg = f"error_msg={error_msg}\n stack_trace={stack_trace}"
    print(stack_trace)
    if not is_localhost_run:
        send_error_email(full_error_msg, customer_id)
    return _build_response(json.dumps(full_error_msg))


@app.route("/", methods=['GET'])
def run_static():
    return render_template('index.html')


@app.route("/api/finishAuth", methods=['POST'])
def finalise_auth():
    data = request.get_json(force=True)
    code = data['code']

    fb_save_settings(data)
    msg = finish_auth(code)
    return _build_response(json.dumps(msg))


@app.route("/authdone", methods=['GET'])
def run_static_authdone():
    return render_template('/template/authdone.html')


@app.route("/newtask", methods=['GET'])
def run_static_nt():
    return render_template('index.html')


@app.route("/settings", methods=['GET'])
def run_static_st():
    return render_template('index.html')


@app.route("/api/runTaskFromScheduler/<task_id>", methods=['GET'])
def run_task_from_task_scheduler(task_id):
    return run_automatic_excluder_from_task_id(task_id)


@app.route("/api/runTaskFromTaskId", methods=['POST'])
def run_task_from_task_id():
    data = request.get_json(force=True)
    task_id = data['task_id']
    return run_automatic_excluder_from_task_id(task_id)


@app.route("/api/runAutoExcluder", methods=['POST'])
def server_run_excluder():
    credentials = refresh_credentials()
    data = request.get_json(force=True)
    exclude_yt = data['excludeChannels']
    customer_id = data['gadsCustomerId']
    minus_days: int = int(data['lookbackDays'])
    start_days: int = int(data['fromDaysAgo'])
    total_lookback = minus_days + start_days

    d = date.today() - timedelta(days=total_lookback)
    date_from = d.strftime(DATE_FORMAT)

    dt = date.today() - timedelta(days=start_days)
    date_to = dt.strftime(DATE_FORMAT)

    gads_data_youtube = data['gadsDataYouTube']
    gads_data_display = data['gadsDataDisplay']
    gads_filters = data['gadsFinalFilters']
    yt_view_count_filter = data['ytViewOperator']+data['ytViewValue']
    yt_sub_count_filter = data['ytSubscriberOperator'] + \
        data['ytSubscriberValue']
    yt_video_count_filter = data['ytVideoOperator']+data['ytVideoValue']
    include_yt_data = data['includeYouTubeData']

    if data['ytCountryOperator'] == "":
        yt_country_filter = ""
    else:
        yt_country_filter = f"{data['ytCountryOperator']}'{data['ytCountryValue'].upper()}'"

    if data['ytLanguageOperator'] == "":
        yt_language_filter = ""
    else:
        yt_language_filter = f"{data['ytLanguageOperator']}'{data['ytLanguageValue'].lower()}'"

    yt_standard_characters_filter = data['ytStandardCharValue']

    try:
        response_data = run_auto_excluder(
            credentials,
            fb_read_settings(),
            exclude_yt,
            customer_id,
            date_from,
            date_to,
            gads_data_youtube,
            gads_data_display,
            gads_filters,
            yt_view_count_filter,
            yt_sub_count_filter,
            yt_video_count_filter,
            yt_country_filter,
            yt_language_filter,
            yt_standard_characters_filter,
            include_yt_data,
            True
        )
    except Exception as e:
        error_msg = f"server_run_excluder failed.\nStacktrace: {str(e)}"
        send_error_email(error_msg, customer_id)
        return _build_response(json.dumps(error_msg))
        response = handle_exception(customer_id)
        return response

    return _build_response(json.dumps(response_data))


@app.route("/api/runManualExcluder", methods=['POST', 'GET'])
def server_run_manual_excluder():
    credentials = refresh_credentials()
    data = request.get_json(force=True)
    customer_id = data['gadsCustomerId']
    exclusion_list = data['allExclusionList']

    response_data = run_manual_excluder(
        credentials, fb_read_settings(), customer_id, exclusion_list)

    return _build_response(json.dumps(response_data))


@app.route("/api/fileUpload", methods=['POST'])
def client_secret_upload():
    data = request.get_json(force=True)

    fb_save_client_secret(data)

    return _build_response(json.dumps("success"))


@app.route("/api/getConfig", methods=['GET'])
def get_config():
    try:
        config = fb_read_settings()
        return _build_response(json.dumps(config))
    except:
        return _build_response(json.dumps("x"))


@app.route("/api/setReauth", methods=['GET'])
def set_reauth():
    global credentials
    credentials = None

    fb_clear_token()

    creds: str = refresh_credentials()
    try:
        if creds.startswith("http"):
            return _build_response(json.dumps(creds))
    except:
        return _build_response(json.dumps("success"))


@app.route("/api/setConfig", methods=['POST'])
def set_config():
    global credentials
    credentials = None
    data = request.get_json(force=True)

    fb_save_settings(data)

    creds: str = refresh_credentials()
    try:
        if creds.startswith("http"):
            return _build_response(json.dumps(creds))
    except:
        return _build_response(json.dumps("success"))


@app.route("/api/saveTask", methods=['POST'])
def save_task():
    credentials = refresh_credentials()
    data = request.get_json(force=True)

    task_id = fb_save_task(data)

    update_cloud_schedule(credentials, PROJECT_ID, LOCATION,
                          task_id, int(data['schedule']))

    return _build_response(json.dumps(task_id))


@app.route("/api/getCustomerIds", methods=['GET'])
def get_customr_ids():
    credentials = refresh_credentials()
    customer_list = {}
    customer_list = get_customer_ids(credentials, fb_read_settings())
    return _build_response(json.dumps(customer_list))


@app.route("/api/getMccIds", methods=['GET'])
def get_all_mcc_ids():
    credentials = refresh_credentials()
    mcc_list = {}
    if not isinstance(credentials, str):
        mcc_list = get_mcc_ids(credentials, fb_read_settings())
    return _build_response(json.dumps(mcc_list))


@app.route("/api/getTasksList", methods=['GET'])
def get_tasks_list():
    credentials = refresh_credentials()
    files_data = fb_get_tasks_list()

    if files_data:
        schedule_list = get_schedule_list(credentials, PROJECT_ID, LOCATION)
        for schedule in schedule_list.values():
            if schedule['scheduleTime']:
                sch_date = datetime.fromisoformat(
                    schedule['scheduleTime'][:-1] + '+00:00').replace(tzinfo=None)
                now_date = datetime.today()
                time_difference = sch_date - now_date
                next_run = f"""
        {math.floor(time_difference.total_seconds() / 3600)}h 
        {(math.floor(time_difference.total_seconds() / 60)-(60*math.floor(time_difference.total_seconds() / 3600)))}m
        """

                if 'status' in schedule and 'code' in schedule['status']:
                    files_data[(schedule['name'].split("/"))[5]
                               ].update({'error_code': schedule['status']['code']})
                else:
                    files_data[(schedule['name'].split("/"))[5]
                               ].update({'error_code': '0'})

                files_data[(schedule['name'].split("/"))[5]
                           ].update({'state': schedule['state']})
                files_data[(schedule['name'].split("/"))[5]].update(
                    {'schedule_time': (schedule['scheduleTime'][:-1]).replace("T", " ")})
                files_data[(schedule['name'].split("/"))[5]
                           ].update({'next_run': next_run})

    return _build_response(json.dumps(files_data))


@app.route("/api/getTask", methods=['POST'])
def get_task():
    data = request.get_json(force=True)
    task_id = data['task_id']

    task_data = fb_get_task(task_id)

    return _build_response(json.dumps(task_data))


@app.route("/api/deleteTask", methods=['POST'])
def delete_task():
    credentials = refresh_credentials()
    data = request.get_json(force=True)
    task_id = data['task_id']

    fb_delete_task(task_id)

    update_cloud_schedule(credentials, PROJECT_ID, LOCATION, str(task_id), 0)

    return _build_response(json.dumps(task_id))


@app.route("/api/addToAllowlist", methods=['POST'])
def add_to_allowlist():
    data = request.get_json(force=True)
    credentials = refresh_credentials()
    customer_id = data['gadsCustomerId']
    channel_type = data['type']
    channel_id = data['channel_id']
    config = fb_read_settings()

    fb_add_to_allowlist(channel_id)
    remove_channel_id(credentials, config, customer_id,
                      channel_type, channel_id)

    return _build_response(json.dumps(channel_id))


@app.route("/api/removeFromAllowlist", methods=['POST'])
def remove_from_allowlist():
    data = request.get_json(force=True)
    channel_id = data['channel_id']

    fb_remove_from_allowlist(channel_id)

    return _build_response(json.dumps(channel_id))


def _build_response(msg='', status=200, mimetype='application/json'):
    """Helper method to build the response."""
    response = app.response_class(msg, status=status, mimetype=mimetype)
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


def get_oauth():
    credentials = None
    try:
        credentials = pickle.loads(fb_read_token())
    except:
        logging.info("No token... refreshing")

    if not credentials or not credentials.valid or credentials == None:
        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
            fb_save_token(pickle.dumps(credentials))
            return credentials
        else:
            conf = fb_read_client_secret()
            global flow
            flow = Flow.from_client_config(conf, scopes=scopes_array)
            flow.redirect_uri = _REDIRECT_URI

            authorization_url = flow.authorization_url(
                prompt="consent",
            )
            return authorization_url[0]
    else:
        return credentials


def finish_auth(code: str):
    # try:
    flow.fetch_token(code=code)
    credentials = flow.credentials

    fb_save_token(pickle.dumps(credentials))
    return "success"
    # except:
    #    return "error"


if __name__ == '__main__':
    app.run(debug=True, port=5000)
