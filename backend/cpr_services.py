from inspect import _void
import logging
import os
import json
import pickle
import string
from typing import List

from gads_make_client import make_client
from gads_api import get_placement_data, get_youtube_data, append_youtube_data, get_youtube_channel_id_list, exclude_youtube_channels
from credentials import get_oauth


config_file = 'config.pickle'

def run_excluder(exclude_from_youtube: str, customer_id: str, 
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
            full_data_set = get_placement_data(client, ga_service, customer_id, date_from, date_to, gads_filters)
            yt_data = get_youtube_data(credentials, [d.get('group_placement_view_placement') for d in full_data_set.values()])
            full_data_set = append_youtube_data(full_data_set, yt_data, view_count, sub_count, video_count, country, language, isEnglish)

            if exclude_from_youtube=="true":
                exclude_youtube_channels(client, customer_id, get_youtube_channel_id_list(full_data_set))

            logging.info("Data successfully combined!")
            return full_data_set
            
    except ValueError:
        logging.info("Error on running Excluder!")



    

