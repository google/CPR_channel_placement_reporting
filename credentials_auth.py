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

import hashlib
import json
import os
import logging
import pickle
import re
import sys
from tokenize import String
from urllib.parse import unquote
import webbrowser

import hashlib
import socket

from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow, Flow
from flask import redirect
from firebase_server import fb_read_client_secret, fb_save_token, fb_read_token

scopes_array = [
                    'https://www.googleapis.com/auth/cloud-platform',
                    'https://www.googleapis.com/auth/youtube.readonly',
                    'https://www.googleapis.com/auth/adwords'
                ]

#_SERVER = "ben-test-project-355509.ew.r.appspot.com"
_SERVER="localhost"
_PORT = 5000
_REDIRECT_URI = f"http://{_SERVER}:{_PORT}/authdone"

flow: Flow

def get_oauth():
    credentials = None
    try:
        credentials = pickle.loads(fb_read_token())
    except:
        logging.info("No token... refreshing") 

    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        else:
                conf = fb_read_client_secret()

                flow = Flow.from_client_config(conf, scopes=scopes_array)
                flow.redirect_uri = _REDIRECT_URI

                passthrough_val = hashlib.sha256(os.urandom(1024)).hexdigest()

                authorization_url = flow.authorization_url(
                access_type="offline",
                state=passthrough_val,
                prompt="consent",
                include_granted_scopes="true"
                )

                webbrowser.open_new(authorization_url[0])

    else:
        return credentials


def finish_auth(code: str):
    #try:
        flow.fetch_token(code=code)
        credentials = flow.credentials

        fb_save_token(pickle.dumps(credentials))

    #except:
     #   print("Error on auth code!")

