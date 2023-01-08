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
from gads_api import get_gads_mcc_ids, get_placement_data, get_youtube_data, append_youtube_data, get_channel_id_list, exclude_channels, get_gads_customer_ids, remove_channel_id_from_gads

YOUTUBE_CHANNEL_ID = 6


def remove_channel_id(credentials, config_file, customer_id: str, channel_type: str, channel_id: str) -> str:
    try:
        mcc_id = config_file.get('mcc_id')
        developer_token = config_file.get('dev_token')

        creds = json.loads(credentials.to_json())
        client = make_client(mcc_id, developer_token, creds)
        ga_service = client.get_service("GoogleAdsService")

        remove_channel_id_from_gads(
            client, ga_service, customer_id, channel_type, channel_id)

        return f"success"
    except ValueError:
        logging.info("Error on running channel removal!")


def run_auto_excluder(credentials, config_file, exclude_from_youtube: str, customer_id: str,
                      date_from: str, date_to: str, gads_data_youtube: str, gads_data_display: str, gads_filters: str, view_count: str, sub_count: str,
                      video_count: str, country: str, language: str, isEnglish: str, include_yt_data: bool, reporting: bool) -> dict:
    try:
        mcc_id = config_file.get('mcc_id')
        developer_token = config_file.get('dev_token')

        creds = json.loads(credentials.to_json())
        client = make_client(mcc_id, developer_token, creds)
        ga_service = client.get_service("GoogleAdsService")
        full_data_set = get_placement_data(
            client, ga_service, customer_id, date_from, date_to, gads_data_youtube, gads_data_display, gads_filters)
        pull_yt = True
        if not reporting and view_count == "" and sub_count == "" and video_count == "" and country == "" and language == "" and isEnglish == "":
            pull_yt = False

        if include_yt_data and pull_yt:
            channel_ids = []
            for value_per_placement in full_data_set["data"].values():
                placement_level_data_value_obj = value_per_placement['placement_level_data']
                if placement_level_data_value_obj.get('group_placement_view_placement_type') == YOUTUBE_CHANNEL_ID:
                    channel_ids.extend([placement_level_data_value_obj.get('group_placement_view_placement')])

            yt_data_from_api = get_youtube_data(credentials, channel_ids)

            full_data_set["data"] = append_youtube_data(
                full_data_set["data"], yt_data_from_api, view_count, sub_count, video_count, country, language, isEnglish)

        if exclude_from_youtube:
            exclude_channels(client, customer_id, get_channel_id_list(
                full_data_set["data"]))

        return full_data_set

    except ValueError:
        logging.info("Error on running Excluder!")


def run_manual_excluder(credentials, config_file, customer_id: str, exclusion_list_ids: list) -> str:
    try:
        if exclusion_list_ids:
            mcc_id = config_file.get('mcc_id')
            developer_token = config_file.get('dev_token')

            creds = json.loads(credentials.to_json())
            client = make_client(mcc_id, developer_token, creds)

            exclude_channels(client, customer_id, exclusion_list_ids)

            return f"{len(exclusion_list_ids)}"

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


def get_mcc_ids(credentials, config_file) -> list:

    creds = json.loads(credentials.to_json())
    developer_token = config_file.get('dev_token')
    mccs = []
    if developer_token:
        client = make_client("", developer_token, creds)
        mccs = get_gads_mcc_ids(client)

    return mccs
