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
import logging
from typing import List

from gads_make_client import make_client
from gads_api import get_gads_mcc_ids, get_placement_data, get_youtube_data, append_youtube_data, get_youtube_channel_id_list, exclude_youtube_channels, get_gads_customer_ids

def run_auto_excluder(credentials, config_file, exclude_from_youtube: str, customer_id: str, 
    date_from: str, date_to: str, gads_filters: str,
    view_count: str, sub_count: str, video_count: str, 
    country: str, language: str, isEnglish: str, include_yt_data: bool) -> dict:
    try:
        mcc_id = config_file.get('mcc_id')
        developer_token = config_file.get('dev_token')
        
        creds = json.loads(credentials.to_json())
        client = make_client(mcc_id, developer_token, creds)
        ga_service = client.get_service("GoogleAdsService")
        full_data_set = get_placement_data(client, ga_service, customer_id, date_from, date_to, gads_filters)
        
        if include_yt_data:
            yt_data = get_youtube_data(credentials, [d.get('group_placement_view_placement') for d in full_data_set.values()])
            full_data_set = append_youtube_data(full_data_set, yt_data, view_count, sub_count, video_count, country, language, isEnglish)

        if exclude_from_youtube == 'true': #value is text so needs to be checked explicitly
            exclude_youtube_channels(client, customer_id, get_youtube_channel_id_list(full_data_set))
        return full_data_set
            
    except ValueError:
        logging.info("Error on running Excluder!")

def run_manual_excluder(credentials, config_file, customer_id: str, yt_channel_ids: list) -> str:
    try:
        if yt_channel_ids:
            mcc_id = config_file.get('mcc_id')
            developer_token = config_file.get('dev_token')
            
            creds = json.loads(credentials.to_json())
            client = make_client(mcc_id, developer_token, creds)

            exclude_youtube_channels(client, customer_id, yt_channel_ids)

            return f"{len(yt_channel_ids)}"
            
    except ValueError:
        logging.info("Error on running Excluder!")


def get_customer_ids(credentials, config_file) -> dict:
    try:
        mcc_id = config_file.get('mcc_id')
        developer_token = config_file.get('dev_token')
        creds = json.loads(credentials.to_json())
        client = make_client(mcc_id, developer_token, creds)

        return get_gads_customer_ids(client, mcc_id)
            
    except ValueError:
        logging.info("Error on running Excluder!")


def get_mcc_ids(credentials,config_file) -> list:

    creds = json.loads(credentials.to_json())
    developer_token = config_file.get('dev_token')
    mccs = []
    if developer_token:
        client = make_client("", developer_token, creds)
        mccs = get_gads_mcc_ids(client)

    return mccs

    

