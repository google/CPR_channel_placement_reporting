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

import json
import pickle

from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from smart_open import open

token_file = 'token.pickle'
client_secret_file = 'client_secret.json'
scopes_array = [
                    'https://www.googleapis.com/auth/cloud-platform',
                    'https://www.googleapis.com/auth/youtube.readonly',
                    'https://www.googleapis.com/auth/adwords'
                ]
def get_oauth(project_url):
    credentials = None
    try:
        with open(f"{project_url}/{token_file}", 'rb') as token:
            credentials = pickle.load(token)
    except:
        print("No token... refreshing")

    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        else:
            try:
                conf = {}
                for conf_file in open(f"{project_url}/{client_secret_file}", 'rb'):
                    conf = json.loads(conf_file)
                
                flow = InstalledAppFlow.from_client_config(conf, scopes=scopes_array)

                flow.run_local_server(port=5001, prompt='consent',
                                    authorization_prompt_message='')
                credentials = flow.credentials

                with open(f"{project_url}/{token_file}", 'wb') as f:
                    pickle.dump(credentials, f)
            except:
                print("Config file missing")
    return credentials