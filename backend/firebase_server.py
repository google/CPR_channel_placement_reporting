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

import os
import pickle
import json
from datetime import date, datetime, timedelta
import time
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

date_format='%Y-%m-%d'

cred = credentials.ApplicationDefault()
firebase_admin.initialize_app(cred)
db = firestore.client()

COLLECTION_TASKS='tasks'
COLLECTION_CONFIG='config'


def fb_save_token(data) -> str:
    doc_ref = db.collection(COLLECTION_CONFIG).document('token')
    doc_ref.set({"token": data})

def fb_read_token():
    cs_ref = db.collection(COLLECTION_CONFIG).document('token')
    return (cs_ref.get().to_dict())['token']

def fb_save_client_secret(data) -> str:
    doc_ref = db.collection(COLLECTION_CONFIG).document('client_secret')
    doc_ref.set(data)
    return "Success"

def fb_read_client_secret():
    cs_ref = db.collection(COLLECTION_CONFIG).document('client_secret')
    return cs_ref.get().to_dict()


def fb_save_settings(data) -> str:
    doc_ref = db.collection(COLLECTION_CONFIG).document('settings')
    doc_ref.set({
        'dev_token': data['dev_token'],
        'mcc_id': data['mcc_id'],
        'email_address': data['email_address']
        })
    return "Success"

def fb_read_settings():
    config_ref = db.collection(COLLECTION_CONFIG).document('settings')
    return config_ref.get().to_dict()

def fb_save_task(data) -> str:
    date_created = date.today().strftime(date_format)
    task_id=""
    if data['task_id'] == "":
        task_id=int(round(time.time() * 1000))
        task_id=str(task_id)
    else:
        task_id=data['task_id']

    doc_ref = db.collection(COLLECTION_TASKS).document(task_id)
    doc_ref.set({
        'task_id': task_id,
        'task_name': data['task_name'],
        'customer_id': data['customer_id'],
        'days_ago': data['days_ago'],
        'schedule': data['schedule'],
        'gads_filter': data['gads_filter'],
        'yt_subscriber_operator': data['yt_subscriber_operator'],
        'yt_subscriber_value': data['yt_subscriber_value'],
        'yt_view_operator': data['yt_view_operator'],
        'yt_view_value': data['yt_view_value'],
        'yt_video_operator': data['yt_video_operator'],
        'yt_video_value': data['yt_video_value'],
        'yt_language_operator': data['yt_language_operator'],
        'yt_language_value': data['yt_language_value'],
        'yt_country_operator': data['yt_country_operator'],
        'yt_country_value': data['yt_country_value'],
        'yt_std_character': data['yt_std_character'],
        'date_created': date_created
    })
    return task_id

def fb_get_tasks_list() -> dict:
    tasks_ref = db.collection(COLLECTION_TASKS)
    tasks = tasks_ref.stream()
    task_list = {}
    for task in tasks:
        tmp = task.to_dict()
        task_list[tmp['task_id']]= {
          'task_id': tmp['task_id'],
          'task_name': tmp['task_name'],
          'customer_id': tmp['customer_id'],
          'schedule': tmp['schedule'],
          'date_created': tmp['date_created']
        }
    
    return task_list

def fb_get_task(task_id) -> dict:
    task_ref = db.collection(COLLECTION_TASKS).document(task_id)
    return task_ref.get().to_dict()

def fb_delete_task(task_id):
    db.collection(COLLECTION_TASKS).document(task_id).delete()


  
