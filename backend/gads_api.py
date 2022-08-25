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
import operator
import string
from tokenize import String
from typing import List
import googleapiclient.errors

from googleapiclient.discovery import build

api_service_name = "youtube"
api_version = "v3"
micro_conv = 1000000
def get_placement_data(client, ga_service, customer_id: str, 
date_from: str, date_to: str, conditions: str) -> dict:
    conditions_split = conditions.split(" OR ")
    if client:
        all_data_set = {}
        for condition in conditions_split:
            condition = condition.replace("(", "")
            condition = condition.replace(")", "")
            query = f"""
            SELECT
                group_placement_view.placement_type,
                group_placement_view.display_name,
                group_placement_view.placement,
                group_placement_view.target_url,
                metrics.impressions,
                metrics.cost_micros,
                metrics.conversions,
                metrics.video_views,
                metrics.video_view_rate,
                metrics.clicks,
                metrics.average_cpm,
                metrics.ctr
            FROM group_placement_view
            WHERE
                group_placement_view.placement_type IN ("YOUTUBE_CHANNEL")
                AND campaign.advertising_channel_type = "VIDEO"
            AND segments.date BETWEEN '{date_from}' AND '{date_to}'
            """
            if condition:
                query += f" AND {condition}"

            search_request = client.get_type("SearchGoogleAdsStreamRequest")
            search_request.customer_id = customer_id

            search_request.query = query
            stream = ga_service.search_stream(search_request)
            for batch in stream:
                for row in batch.results:
                    all_data_set[row.group_placement_view.placement] = {
                        'group_placement_view_placement_type': row.group_placement_view.placement_type,
                        'group_placement_view_display_name': row.group_placement_view.display_name,
                        'group_placement_view_placement': row.group_placement_view.placement,
                        'group_placement_view_target_url': row.group_placement_view.target_url,
                        'metrics_impressions': row.metrics.impressions,
                        'metrics_cost_micros': row.metrics.cost_micros / micro_conv,
                        'metrics_conversions': row.metrics.conversions,
                        'metrics_video_views': row.metrics.video_views,
                        'metrics_video_view_rate': row.metrics.video_view_rate,
                        'metrics_clicks': row.metrics.clicks,
                        'metrics_average_cpm': row.metrics.average_cpm / micro_conv,
                        'metrics_ctr': row.metrics.ctr
                    }
        return all_data_set


def get_youtube_data(credentials, channel_ids: list) -> list:
    '''Takes credentials and a list of YouTube channel IDs and
    returns a list of YouTube statistics for each channel ID
    '''
    ids_to_pass = ""
    yt_limit = 40 #can be put up to 50
    channel_ids_length = len(channel_ids)
    yt_items = []
    if channel_ids_length > 0:
        for i in range(int(channel_ids_length/yt_limit +1)):
            ids_to_pass = ','.join(channel_ids[i*yt_limit:(i+1)*yt_limit])
                
            youtube = googleapiclient.discovery.build(
                api_service_name, api_version, credentials=credentials)

            request = youtube.channels().list(
                part="id, statistics, brandingSettings",
                id=ids_to_pass
            )
            response = request.execute()
            
            for item in response['items']:
                yt_items.append(item)
            ids_to_pass = ""

    return yt_items


def exclude_youtube_channels(client, customer_id: str, channelsToRemove: list) -> _void:
    if len(channelsToRemove) > 0:
        exclude_operations=[]
        for channel in channelsToRemove:
            if channel:
                placement_criterion_op = client.get_type("CustomerNegativeCriterionOperation")
                placement_criterion = placement_criterion_op.create
                placement_criterion.youtube_channel.channel_id = channel
                exclude_operations.append(placement_criterion_op)

        customer_negative_criterion_service = client.get_service("CustomerNegativeCriterionService")

        response = (
            customer_negative_criterion_service.mutate_customer_negative_criteria(
                customer_id=customer_id,
                operations=exclude_operations
            )
        )


def get_youtube_channel_id_list(full_data_set: dict) -> dict:
    ytList = [d.get('group_placement_view_placement') for d in full_data_set.values() if d.get('excludeFromYt') == 'true']
    return ytList



def append_youtube_data(
    full_data_set: dict, yt_data: dict, ytf_view_count: int, 
    ytf_sub_count: int, ytf_video_count: int, ytf_country: string, 
    ytf_language: string, ytf_isAscii: string) -> dict:

    """Method for appending YouTube statistics to the Google Ads data for exclusion
        
            This method will take the existing Google Ads data (full_data_set) and append
            the matching YouTube channel data (yt_data) so that there is one single
            dictionary with all Google Ads and YouTube data for presenting and excluding
            
            It also checks the filters for YouTube as it itterates through the records at
            the same time and if all provided criteria match, it is flagged as 'exclude'
        """

    for entry in yt_data:
        filter_count = 0
        matches_count = 0
        if entry['statistics'].get('viewCount'):
            full_data_set[entry['id']].update({'viewCount': entry['statistics']['viewCount']})
            if ytf_view_count:
                filter_count += 1
                if eval(entry['statistics']['viewCount'] + " " + ytf_view_count): 
                    matches_count += 1

        if entry['statistics'].get('subscriberCount'):
            full_data_set[entry['id']].update({'subscriberCount': entry['statistics']['subscriberCount']})
            if ytf_sub_count:
                filter_count += 1
                if eval(entry['statistics']['subscriberCount'] + " " + ytf_sub_count):
                    matches_count += 1

        if entry['statistics'].get('videoCount'):
            full_data_set[entry['id']].update({'videoCount': entry['statistics']['videoCount']})
            if ytf_video_count:
                filter_count += 1
                if eval(entry['statistics']['videoCount'] + " " + ytf_video_count):
                    matches_count += 1
        
        if entry['brandingSettings']['channel'].get('country'):
            full_data_set[entry['id']].update({'country': entry['brandingSettings']['channel']['country']})
        else:
            full_data_set[entry['id']].update({'country': '-'})
        if ytf_country:
            filter_count += 1
            if eval(f"'{full_data_set[entry['id']].get('country')}'{ytf_country}"):
                matches_count += 1

        if entry['brandingSettings']['channel'].get('defaultLanguage'):
            full_data_set[entry['id']].update({'language': entry['brandingSettings']['channel']['defaultLanguage']})
        else:
            full_data_set[entry['id']].update({'language': '-'})
        if ytf_language:
            filter_count += 1
            if eval(f"'{full_data_set[entry['id']].get('language')}'{ytf_language}"):
                matches_count += 1


        full_data_set[entry['id']].update({'asciiTitle': is_ascii_title(entry['brandingSettings']['channel']['title'])})
        if ytf_isAscii:
                filter_count += 1
                if eval(is_ascii_title(entry['brandingSettings']['channel']['title']) + ytf_isAscii):
                    matches_count += 1

        if(filter_count == matches_count):
            full_data_set[entry['id']].update({'excludeFromYt': 'true'})
        else:
            full_data_set[entry['id']].update({'excludeFromYt': 'false'})

    full_data_set = _is_yt_data(full_data_set)

    return full_data_set


def _is_yt_data(full_data_set: dict) -> dict:
    tempDict = dict()
    yt_key='excludeFromYt'
    for (key, value) in full_data_set.items():
        if yt_key in value.keys():
            tempDict[key] = value
    
    return tempDict



def is_ascii_title(title: string) -> string:
    return str(title.isascii())

