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
from flask import Flask, request
from flask_cors import CORS
from cpr_services import run_auto_excluder, run_manual_excluder
import json

app = Flask(__name__) # name for the Flask app (refer to output)
# running the server
CORS(app)


@app.route("/api/runAutoExcluder", methods=['POST', 'GET']) # decorator
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
    
    print(customer_id+", "+date_from+", "+yt_date_to +", "+gads_filters +", "+yt_view_count_filter +", "+yt_sub_count_filter +", "+
    yt_video_count_filter +", "+yt_country_filter +", "+yt_language_filter +", "+yt_standard_characters_filter)

    response_data = run_auto_excluder(exclude_yt, customer_id, date_from, yt_date_to, gads_filters, 
    yt_view_count_filter, yt_sub_count_filter, yt_video_count_filter, yt_country_filter, 
    yt_language_filter, yt_standard_characters_filter)
    
    return _build_response(json.dumps(response_data))



@app.route("/api/runManualExcluder", methods=['POST', 'GET']) # decorator
def server_run_manual_excluder():
    data = request.get_json(force = True)
    customer_id = data['gadsCustomerId']
    exclude_yt = data['ytExclusionList']

    response_data = run_manual_excluder(customer_id, exclude_yt)
    
    return _build_response(json.dumps(response_data))



def _build_response(msg='', status=200, mimetype='application/json'):
    """Helper method to build the response."""
    response = app.response_class(msg, status=status, mimetype=mimetype)
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

app.run(debug=True, port=5000)

