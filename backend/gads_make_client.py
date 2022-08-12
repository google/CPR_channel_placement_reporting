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
from google.ads.googleads.client import GoogleAdsClient

def make_client(mcc_id, developer_token, credentials: json) -> GoogleAdsClient:
    creds = {
        "developer_token": developer_token,
        "refresh_token": credentials["refresh_token"],
        "client_id": credentials["client_id"],
        "client_secret": credentials["client_secret"],
        "use_proto_plus": True
    }
    google_ads_client = GoogleAdsClient.load_from_dict(creds)
    if mcc_id != "":
        google_ads_client.login_customer_id = mcc_id
    return google_ads_client


    
