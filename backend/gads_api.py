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
import string
import sys
from os import getenv
from tokenize import String
from typing import List
import googleapiclient.errors

from googleapiclient.discovery import build
from firebase_server import fb_read_allowlist

is_localhost_run = False

API_SERVICE_NAME = "youtube"
API_VERSION = "v3"
MICRO_CONV = 1000000
ENGINE_SIZE = 1e6 if is_localhost_run else float(getenv('GAE_MEMORY_MB'))*0.95
MEMORY_WARNING = False


def get_placement_data(client, ga_service, customer_id: str,
                       date_from: str, date_to: str, gads_data_youtube: bool, gads_data_display: bool, conditions: str) -> dict:
    conditions_split = conditions.split(" OR ")
    if client:
        type_string = ""
        if gads_data_youtube and gads_data_display:
            type_string = '("YOUTUBE_CHANNEL", "WEBSITE")'
        elif gads_data_display:
            type_string = '("WEBSITE")'
        else:
            type_string = '("YOUTUBE_CHANNEL")'

        all_data_set = {}
        for condition in conditions_split:
            condition = condition.replace("(", "")
            condition = condition.replace(")", "")
            query = f"""
            SELECT
                ad_group.name,
                campaign.name,
                group_placement_view.resource_name,
                group_placement_view.placement_type,
                group_placement_view.display_name,
                group_placement_view.placement,
                group_placement_view.target_url,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.average_cpm,
                metrics.ctr,
                metrics.conversions,
                metrics.cost_per_conversion,
                metrics.view_through_conversions,
                metrics.video_views,
                metrics.video_view_rate,
                metrics.conversions_from_interactions_rate,
                metrics.average_cpc
            FROM group_placement_view
            WHERE
                campaign.status='ENABLED'
                AND group_placement_view.target_url != "youtube.com"
                AND group_placement_view.placement_type IN {type_string}
                AND group_placement_view.display_name != ""
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
                    row = row._pb
                    placement_name = row.group_placement_view.placement
                    if not placement_name in all_data_set:
                        all_data_set[placement_name] = {
                            'yt_data': {}, 'ad_group_placement_level_array': [], 'placement_level_data': {}}
                    #campaign, ad-group, metrics
                    all_data_set[placement_name]['ad_group_placement_level_array'].append({
                        'campaign_name': row.campaign.name,
                        'ad_group_name': row.ad_group.name,
                        'metrics_impressions': row.metrics.impressions,
                        'metrics_cost': row.metrics.cost_micros / MICRO_CONV,
                        'metrics_cost_per_conversion': row.metrics.cost_per_conversion / MICRO_CONV,
                        'metrics_conversions': row.metrics.conversions,
                        'metrics_view_through_conversions': row.metrics.view_through_conversions,
                        'metrics_video_views': row.metrics.video_views,
                        'metrics_video_view_rate': row.metrics.video_view_rate,
                        'metrics_clicks': row.metrics.clicks,
                        'metrics_average_cpm': row.metrics.average_cpm / MICRO_CONV,
                        'metrics_average_cpm': row.metrics.average_cpc / MICRO_CONV,
                        'metrics_ctr': row.metrics.ctr,
                        'metric_conversions_from_interactions_rate': row.metrics.conversions_from_interactions_rate
                    })
                    # placement metadata
                    all_data_set[placement_name]['placement_level_data'].update({
                        'group_placement_view_placement_type': row.group_placement_view.placement_type,
                        'group_placement_view_display_name': row.group_placement_view.display_name,
                        'group_placement_view_placement': row.group_placement_view.placement,
                        'group_placement_view_target_url': row.group_placement_view.target_url,
                        'excluded_already': False,
                        'exclude_from_account': True,
                        'allowlist': False})

                    if (sys.getsizeof(all_data_set)/1000000) > ENGINE_SIZE:
                        MEMORY_WARNING = True
                        all_data_set[placement_name]['placement_level_data'].update(
                            {'memory_warning': True})
                        break
                else:
                    continue
                break

            if all_data_set:
                # A negative criterion for exclusions at the customer level.
                query = f"""
                SELECT
                    customer_negative_criterion.type,
                    customer_negative_criterion.youtube_channel.channel_id,
                    customer_negative_criterion.placement.url
                FROM customer_negative_criterion
                WHERE customer_negative_criterion.type IN ("YOUTUBE_CHANNEL", "PLACEMENT")
                """
                search_request.query = query
                stream = ga_service.search_stream(search_request)
                for batch in stream:
                    for row in batch.results:
                        row = row._pb
                        if row.customer_negative_criterion.youtube_channel.channel_id in all_data_set.keys():
                            key = row.customer_negative_criterion.youtube_channel.channel_id
                        else:
                            key = row.customer_negative_criterion.placement.url
                        if key in all_data_set:
                            all_data_set[key]['placement_level_data'].update(
                                {'excluded_already': True})
                allowlist = fb_read_allowlist()
                if allowlist:
                    for channel in allowlist:
                        if channel in all_data_set.keys():
                            all_data_set[channel]['placement_level_data'].update(
                                {'allowlist': True})
        return {'data': all_data_set, 'dates': {'date_from': date_from, 'date_to': date_to}}


def get_youtube_data(credentials, channel_ids: list) -> list:
    '''Takes credentials and a list of YouTube channel IDs and
    returns a list of YouTube statistics for each channel ID
    '''
    ids_to_pass = ""
    yt_limit = 50  # max 50
    channel_ids_length = len(channel_ids)
    yt_items = []
    if channel_ids_length > 0:
        for i in range(int(channel_ids_length/yt_limit + 1)):
            ids_to_pass = ','.join(channel_ids[i*yt_limit:(i+1)*yt_limit])
            youtube = googleapiclient.discovery.build(
                API_SERVICE_NAME, API_VERSION, credentials=credentials)

            request = youtube.channels().list(
                part="id, statistics, brandingSettings",
                id=ids_to_pass
            )
            response = request.execute()

            if "items" in response:
                for item in response['items']:
                    yt_items.append(item)
            ids_to_pass = ""
    return yt_items


def exclude_channels(client, customer_id: str, channelsToRemove: List[dict]) -> _void:
    if len(channelsToRemove) > 0:
        exclude_operations = []
        try:
            for channel in channelsToRemove:
                if channel:
                    placement_criterion_op = client.get_type(
                        "CustomerNegativeCriterionOperation")
                    placement_criterion = placement_criterion_op.create
                    if channel[0] == 2:
                        placement_criterion.placement.url = channel[1]
                    else:
                        placement_criterion.youtube_channel.channel_id = channel[1]

                    exclude_operations.append(placement_criterion_op)

            customer_negative_criterion_service = client.get_service(
                "CustomerNegativeCriterionService")

            customer_negative_criterion_service.mutate_customer_negative_criteria(
                customer_id=customer_id,
                operations=exclude_operations
            )
        except Exception as e:
            print(f"channel that caused exception == {channel}")
            print("An exception occurred:", e)
            raise e


def remove_channel_id_from_gads(client, ga_service, customer_id: str, channel_type: str, channel_id: str):

    if channel_type == 2:
        type_to_use = "placement.url"
    else:
        type_to_use = "youtube_channel.channel_id"

    query = f"""
            SELECT
                customer_negative_criterion.id
            FROM customer_negative_criterion
            WHERE customer_negative_criterion.{type_to_use}='{channel_id}'
            """
    search_request = client.get_type("SearchGoogleAdsStreamRequest")
    search_request.customer_id = customer_id
    search_request.query = query
    stream = ga_service.search_stream(search_request)
    for batch in stream:
        for row in batch.results:
            row = row._pb
            criterion_id = row.customer_negative_criterion.id

            exclude_operations = []
            placement_criterion_op = client.get_type(
                "CustomerNegativeCriterionOperation")

            exclude_operations = []
            placement_criterion_op = client.get_type(
                "CustomerNegativeCriterionOperation")
            placement_criterion_op.remove = f"customers/{customer_id}/customerNegativeCriteria/{criterion_id}"
            exclude_operations.append(placement_criterion_op)

            customer_negative_criterion_service = client.get_service(
                "CustomerNegativeCriterionService")

            customer_negative_criterion_service.mutate_customer_negative_criteria(
                customer_id=customer_id,
                operations=exclude_operations
            )

def get_channel_id_list(full_data_set: dict, display_name=False) -> dict:
    ytList = []    
    for d in full_data_set.values():        
        if (d.get('exclude_from_account') and
                not d.get('excluded_already') and
                not d.get('allowlist')):
            if display_name:
                ytList.append((d.get('group_placement_view_placement_type'), d.get('group_placement_view_placement'), d.get('group_placement_view_display_name')))
            else:
                ytList.append((d.get('group_placement_view_placement_type'), d.get('group_placement_view_placement')))
    return ytList


def get_channel_id_name_list(full_data_set: dict) -> dict:
    return get_channel_id_list(full_data_set, display_name=True)


def append_youtube_data(
        full_data_set: dict, yt_data_from_api: dict, ytf_view_count: int,
        ytf_sub_count: int, ytf_video_count: int, ytf_country: string,
        ytf_language: string, ytf_isAscii: string) -> dict:
    """Method for appending YouTube statistics to the Google Ads data for exclusion

            This method will take the existing Google Ads data (full_data_set) and append
            the matching YouTube channel data (yt_data) so that there is one single
            dictionary with all Google Ads and YouTube data for presenting and excluding

            It also checks the filters for YouTube as it itterates through the records at
            the same time and if all provided criteria match, it is flagged as 'exclude'
        """
    for yd_data_entry in yt_data_from_api:
        filter_count = 0
        matches_count = 0

        filter_count, matches_count = update_yt_data_statistics(full_data_set, ytf_view_count,
                                                                yd_data_entry, 'statistics', 'viewCount', filter_count, matches_count)

        filter_count, matches_count = update_yt_data_statistics(full_data_set, ytf_sub_count,
                                                                yd_data_entry, 'statistics', 'subscriberCount', filter_count, matches_count)

        filter_count, matches_count = update_yt_data_statistics(full_data_set, ytf_video_count,
                                                                yd_data_entry, 'statistics', 'videoCount', filter_count, matches_count)

        filter_count, matches_count = update_yt_data_settings(full_data_set, ytf_country,
                                                              yd_data_entry, 'brandingSettings', 'channel', 'country', filter_count, matches_count)

        filter_count, matches_count = update_yt_data_settings(full_data_set, ytf_language,
                                                              yd_data_entry, 'brandingSettings', 'channel', 'defaultLanguage', filter_count, matches_count)

        full_data_set[yd_data_entry['id']]['placement_level_data'].update(
            {'asciiTitle': is_ascii_title(yd_data_entry['brandingSettings']['channel']['title'])})
        if ytf_isAscii:
            filter_count += 1
            if eval(is_ascii_title(yd_data_entry['brandingSettings']['channel']['title']) + ytf_isAscii):
                matches_count += 1

        # Does satisfies all yt filters
        full_data_set[yd_data_entry['id']]['placement_level_data'].update(
            {'exclude_from_account': (filter_count == matches_count)})

    full_data_set = filter_yt_matched_results(full_data_set)

    return full_data_set


def update_yt_data_statistics(full_data_set, user_yt_filter, yt_data_entry, yt_first_category, yt_data_second_category, filter_count, matches_count):
    yt_value = None
    if yt_data_entry[yt_first_category].get(yt_data_second_category):
        yt_value = yt_data_entry[yt_first_category][yt_data_second_category]
        full_data_set[yt_data_entry['id']]['yt_data'].update(
            {yt_data_second_category: yt_value})
    else:
        full_data_set[yt_data_entry['id']]['yt_data'].update(
            {yt_data_second_category: '-'})

        if user_yt_filter and yt_value:
            filter_count += 1
            if eval(f"{yt_value}{user_yt_filter}"):
                matches_count += 1
    return filter_count, matches_count


def update_yt_data_settings(full_data_set, user_yt_filter, entry, yt_first_category, yt_data_second_category, yt_data_third_category, filter_count, matches_count):
    yt_value = None
    if entry[yt_first_category][yt_data_second_category].get(yt_data_third_category):
        yt_value = entry[yt_first_category][yt_data_second_category][yt_data_third_category]
        full_data_set[entry['id']]['yt_data'].update(
            {yt_data_third_category: yt_value})

    else:
        full_data_set[entry['id']]['yt_data'].update(
            {yt_data_third_category: '-'})

    if user_yt_filter and yt_value:
        filter_count += 1
        if eval(f"'{yt_value}'{user_yt_filter}"):
            matches_count += 1
    return filter_count, matches_count


def filter_yt_matched_results(full_data_set: dict) -> dict:
    tempDict = dict()
    for (key, value) in full_data_set.items():
        if 'exclude_from_account' in value['placement_level_data'].keys():
            tempDict[key] = value
    return tempDict


def is_ascii_title(title: string) -> string:
    title = title.replace("–", "")  # special edge case for European Dash
    return str(title.isascii())


def get_gads_customer_ids(client, mcc_id) -> dict:
    if client:
        all_customer_ids = {}
        query = f"""
        SELECT
          customer_client.descriptive_name,
          customer_client.id
        FROM customer_client
        WHERE customer_client.level <= 1"""

        googleads_service = client.get_service("GoogleAdsService")

        response = googleads_service.search(
            customer_id=str(mcc_id), query=query
        )

        for googleads_row in response:
            customer_client = googleads_row.customer_client
            all_customer_ids[customer_client.id] = {
                'account_name': customer_client.descriptive_name,
                'id': customer_client.id
            }

    return all_customer_ids


def get_gads_mcc_ids(client) -> list:
    all_mcc_ids = []
    customer_service = client.get_service("CustomerService")

    accessible_customers = customer_service.list_accessible_customers()
    result_total = len(accessible_customers.resource_names)

    resource_names = accessible_customers.resource_names
    for resource_name in resource_names:
        all_mcc_ids.append(resource_name.split('/')[1])

    return all_mcc_ids
