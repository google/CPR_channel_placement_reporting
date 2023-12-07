# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
from flask import Flask, request, render_template, send_from_directory
import json

from googleads_housekeeper import bootstrap, views
from googleads_housekeeper.domain import commands, execution
from googleads_housekeeper.services import unit_of_work
from googleads_housekeeper.adapters import publisher

app = Flask(__name__)
STATIC_DIR = os.getenv('STATIC_DIR') or 'static'

bus = bootstrap.Bootstrapper(type=os.getenv("ADS_HOUSEKEEPER_DEPLOYMENT_TYPE",
                                            "Dev"),
                             topic_prefix="cpr").bootstrap_app()


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    file_requested = os.path.join(app.root_path, STATIC_DIR, path)
    if not os.path.isfile(file_requested):
        path = "index.html"
    max_age = 0 if path == "index.html" else None
    return send_from_directory(STATIC_DIR, path, max_age=max_age)


def send_error_email(error: str, body: str, task_name: str = None):
    send_CPR_email(
        subject=f"CPR error. Customer-id: {body.customer_id}",
        body=f"""{body}
        Error: {error}""",
        task_name=task_name)


def refresh_credentials():
    credentials = get_oauth()
    return credentials


def run_automatic_excluder_from_task_id(task_id: str):
    credentials = refresh_credentials()
    file_contents = fb_get_task(task_id)

    if (file_contents):

        customer_id = file_contents['customer_id']
        task_name = file_contents['task_name']
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
            client = make_client_from_config(
                credentials, fb_read_settings())
            response_data = get_placements_full_data(
                client,
                credentials,
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

            all_exclusions = get_channels_to_remove_partial_data(
                response_data["data"])
            exclude_channels(client, customer_id, all_exclusions)

        except Exception as e:
            error_msg = f"run_automatic_excluder_from_task_id failed.\nTask-id: {task_id}\nStacktrace: {str(e)}"
            send_error_email(error_msg, customer_id)
            response = handle_exception(
                f"run_automatic_excluder_from_task_id failed. Dates {date_from}-{date_to}", customer_id, task_id, task_name)
            return response

        if all_exclusions and file_contents['email_alerts']:
            print(f"successfuly exlusluded {all_exclusions}")

            count = len(all_exclusions)
            send_CPR_email(subject=f"CPR Task ID {task_id} has added {count} Channel Exclusions",
                           body=f"""CPR Task: {task_id} {task_name}
                           Dates: {date_from} - {date_to}
                Customer ID: {customer_id} added
                {count} channel exclusions.
                Exclusions:
                {all_exclusions}""", task_name=task_name)
        return _build_response(json.dumps(f"{len(all_exclusions)}"))
||||||| parent of bde52e2 (Initial commit for new structure)
def send_error_email(error: str, body: str, task_name: str = None):
    send_CPR_email(
        subject=f"CPR error. Customer-id: {body.customer_id}",
        body=f"""{body}
        Error: {error}""",
        task_name=task_name)


def refresh_credentials():
    credentials = get_oauth()
    return credentials


def run_automatic_excluder_from_task_id(task_id: str):
    credentials = refresh_credentials()
    file_contents = fb_get_task(task_id)

    if (file_contents):

        customer_id = file_contents['customer_id']
        task_name = file_contents['task_name']
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
            client = make_client_from_config(
                credentials, fb_read_settings())
            response_data = get_placements_full_data(
                client,
                credentials,
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

            all_exclusions = get_channels_to_remove_partial_data(
                response_data["data"])
            exclude_channels(client, customer_id, all_exclusions)

        except Exception as e:
            response = handle_exception(
                f"run_automatic_excluder_from_task_id failed. Dates {date_from}-{date_to}", customer_id, task_id, task_name)
            return response

        if all_exclusions and file_contents['email_alerts']:
            print(f"successfuly exlusluded {all_exclusions}")

            count = len(all_exclusions)
            send_CPR_email(subject=f"CPR Task ID {task_id} has added {count} Channel Exclusions",
                           body=f"""CPR Task: {task_id} {task_name}
                           Dates: {date_from} - {date_to}
                Customer ID: {customer_id} added
                {count} channel exclusions.
                Exclusions:
                {all_exclusions}""", task_name=task_name)
        return _build_response(json.dumps(f"{len(all_exclusions)}"))
# Commands
@app.route("/api/previewPlacements", methods=['POST'])
def preview_placements():
    config = views.config(bus.uow)
    if not config:
        ads_client = bus.dependencies.get("ads_api_client").client
        if not (mcc_id := ads_client.login_customer_id):
            mcc_id = ads_client.linked_customer_id
        cmd = commands.SaveConfig(mcc_id=mcc_id, email_address="", id=None)
        bus.handle(cmd)
        config = {"mcc_id": mcc_id, "email_address": ""}
    else:
        config = config[0]
    data = request.get_json(force=True)
    cmd = commands.PreviewPlacements(**data,
                                     save_to_db=config.get("save_to_db", True))
    result = bus.handle(cmd)
    return _build_response(json.dumps(result))


@app.route("/api/runManualExcluder", methods=['POST', 'GET'])
def run_manual_excluder():
    data = request.get_json(force=True)
    cmd = commands.RunManualExclusion(**data)
    result = bus.handle(cmd)
    resp = _build_response(json.dumps(result))
    return resp


@app.route("/api/runTaskFromTaskId", methods=['POST'])
def run_task_from_task_id():
    [config] = views.config(bus.uow)
    data = request.get_json(force=True)
    data.update({"save_to_db": config.get("save_to_db", True)})
    cmd = commands.RunTask(**data)
    result = bus.handle(cmd)
    return _build_response(json.dumps(result))


@app.route("/api/runTaskFromScheduler/<task_id>", methods=['GET'])
def run_task_from_scheduler(task_id):
    cmd = commands.RunTask(id=task_id,
                           type=execution.ExecutionTypeEnum.SCHEDULED)
    result = bus.handle(cmd)
    return _build_response(json.dumps(result))


@app.route("/api/saveTask", methods=['POST'])
def save_task():
    data = request.get_json(force=True)
    cmd = commands.SaveTask(**data)
    task_id = bus.handle(cmd)
    return _build_response(json.dumps(str(task_id)))


@app.route("/api/deleteTask", methods=['POST'])
def delete_task():
    data = request.get_json(force=True)
    cmd = commands.DeleteTask(**data)
    bus.handle(cmd)
    return _build_response(json.dumps(str(cmd.task_id)))


@app.route("/api/setConfig", methods=['POST'])
def set_config():
    result = views.config(bus.uow)
    data = request.get_json(force=True)
    if not result:
        cmd = commands.SaveConfig(**data)
    else:
        updated_data = {}
        for key, value in result[0].items():
            if not (updated_value := data.get(key)):
                updated_data[key] = value
            elif updated_value != value:
                updated_data[key] = updated_value
            else:
                updated_data[key] = value
        cmd = commands.SaveConfig(**updated_data)
    bus.handle(cmd)
    return _build_response(json.dumps("success"))


@app.route("/api/addToAllowlist", methods=['POST'])
def add_to_allowlisting():
    data = request.get_json(force=True)
    cmd = commands.AddToAllowlisting(**data)
    result = bus.handle(cmd)
    return _build_response(json.dumps("success"))


@app.route("/api/removeFromAllowlist", methods=['POST'])
def remove_from_allowlisting():
    data = request.get_json(force=True)
    cmd = commands.RemoveFromAllowlisting(**data)
    result = bus.handle(cmd)
    return _build_response(json.dumps("success"))


# Views
@app.route("/api/getTasksList", methods=['GET'])
def get_tasks_list():
    result = views.tasks(bus.uow)
    return _build_response(json.dumps(result, default=str))


@app.route("/api/task/<task_id>", methods=['GET'])
def get_task_id(task_id):
    result = views.task(task_id, bus.uow)
    if not result:
        return "not found", 404
    return _build_response(json.dumps(result, default=str))


@app.route("/api/task/<task_id>/executions", methods=['GET'])
def get_task_executions(task_id):
    result = views.executions(task_id, bus.uow)
    if not result:
        return "not found", 404
    return _build_response(json.dumps(result, default=str))


@app.route("/api/task/<task_id>/executions/<execution_id>", methods=['GET'])
def get_task_execution_id(task_id, execution_id):
    result = views.execution_details(task_id, execution_id, bus.uow)
    if not result:
        return "not found", 404
    return _build_response(json.dumps(result, default=str))


@app.route("/api/getTask", methods=['POST'])
def get_task():
    data = request.get_json(force=True)
    result = views.task(data["task_id"], bus.uow)
    if not result:
        return "not found", 404
    return _build_response(json.dumps(result, default=str))


@app.route("/api/getConfig", methods=['GET'])
def get_config():
    result = views.config(bus.uow)
    if not result:
        ads_client = bus.dependencies.get("ads_api_client").client
        if not (mcc_id := ads_client.login_customer_id):
            mcc_id = ads_client.linked_customer_id
        cmd = commands.SaveConfig(mcc_id=mcc_id, email_address="", id=None)
        bus.handle(cmd)
        result = {"mcc_id": mcc_id, "email_address": ""}
    else:
        result = result[0]
    return _build_response(json.dumps(result))


@app.route("/api/getMccIds", methods=['GET'])
def get_all_mcc_ids():
    if not (mcc_ids := views.mcc_ids(bus.uow)):
        cmd = commands.GetMccIds()
        mcc_ids = bus.handle(cmd)
    return _build_response(json.dumps(mcc_ids))


@app.route("/api/getCustomerIds", methods=['GET'])
def get_customer_ids():
    if config := views.config(bus.uow):
        mcc_id = config[0].get("mcc_id")
    else:
        ads_client = bus.dependencies.get("ads_api_client").client
        if not (mcc_id := ads_client.login_customer_id):
            mcc_id = ads_client.linked_customer_id
    result = views.customer_ids(bus.uow, mcc_id)
    if not result:
        cmd = commands.GetCustomerIds(mcc_id=mcc_id)
        result = bus.handle(cmd)
    return _build_response(json.dumps(result))


@app.route("/api/getAllowlistedPlacements", methods=['GET'])
def get_allowlisted_placements():
    if result := views.allowlisted_placements(bus.uow):
        return _build_response(json.dumps(result, default=str))
    return "no allowlisted placements", 200


def _build_response(msg='', status=200, mimetype='application/json'):
    """Helper method to build the response."""
    response = app.response_class(msg, status=status, mimetype=mimetype)
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


if __name__ == '__main__':
    app.run(debug=True, port=5000)
