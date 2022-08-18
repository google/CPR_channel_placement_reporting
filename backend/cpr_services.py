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

from inspect import _void
import logging
import os
import json
import pickle
from typing import List

from gads_make_client import make_client
from gads_api import get_placement_data, get_youtube_data, append_youtube_data, get_youtube_channel_id_list, exclude_youtube_channels
from credentials import get_oauth


config_file = 'config.pickle'

def run_auto_excluder(exclude_from_youtube: str, customer_id: str, 
    date_from: str, date_to: str, gads_filters: str,
    view_count: str, sub_count: str, video_count: str, 
    country: str, language: str, isEnglish: str):
    try:
        if os.path.exists(config_file):
            with open(config_file, 'rb') as token:
                config = pickle.load(token)

            mcc_id = config.get('mcc_id')
            developer_token = config.get('dev_token')
            
            credentials = get_oauth()
            creds = json.loads(credentials.to_json())
            client = make_client(mcc_id, developer_token, creds)
            ga_service = client.get_service("GoogleAdsService")
            logging.info("Getting GAds data...")
            full_data_set = get_placement_data(client, ga_service, customer_id, date_from, date_to, gads_filters)
            logging.info("Getting YouTube data...")
            yt_data = get_youtube_data(credentials, [d.get('group_placement_view_placement') for d in full_data_set.values()])
            logging.info("Blending data...")
            full_data_set = append_youtube_data(full_data_set, yt_data, view_count, sub_count, video_count, country, language, isEnglish)
            
            if exclude_from_youtube=="true":
                logging.info("Excluding channels...")
                exclude_youtube_channels(client, customer_id, get_youtube_channel_id_list(full_data_set))

            logging.info("Data successfully combined!")
            return full_data_set
            
    except ValueError:
        logging.info("Error on running Excluder!")

def run_manual_excluder(customer_id: str, yt_channel_ids: list):
    try:
        if(yt_channel_ids):
            if os.path.exists(config_file):
                with open(config_file, 'rb') as token:
                    config = pickle.load(token)

                mcc_id = config.get('mcc_id')
                developer_token = config.get('dev_token')
                
                credentials = get_oauth()
                creds = json.loads(credentials.to_json())
                client = make_client(mcc_id, developer_token, creds)

                exclude_youtube_channels(client, customer_id, yt_channel_ids)

                logging.info("Data successfully excluded!")
                return f"{len(yt_channel_ids)}"
            
    except ValueError:
        logging.info("Error on running Excluder!")



    

