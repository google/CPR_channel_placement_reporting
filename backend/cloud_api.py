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

import math
from tokenize import String
from typing import List
from datetime import datetime
import googleapiclient.errors
from googleapiclient.discovery import build

CLOUD_VERSION='v1beta1'

def update_cloud_schedule(credentials, project_id, location, server, task_id, hours):
    now = datetime.now()
    minute = now.strftime("%M")
    hour = now.strftime("%H")
    
    if hours < 24:
        schedule=f"{minute} */{hours} * * *"
    else:
        days=math.floor(hours/24)
        schedule=f"{minute} {hour} */{days} * *"

    service = googleapiclient.discovery.build('cloudscheduler', CLOUD_VERSION, credentials=credentials)
    
    parent = f"projects/{project_id}/locations/{location}"
    job_name=f"{parent}/jobs/{task_id}"
    try:
        request = service.projects().locations().jobs().delete(name=job_name)
        request.execute()
    except:
        print("Schedule does not exist")

    if(hours > 0):
        print("Creating new schedule...")
        job_body = {
        "httpTarget": {
            "uri": f"{server}/api/runTaskFromTaskId",
            "httpMethod": "POST",
            "headers": {
                "task_id": task_id
            }
        },
        "timeZone": "Etc/UTC",
        "schedule": schedule,
        "name": job_name,
        "description": "CPR"
        }

        request = service.projects().locations().jobs().create(parent=parent, body=job_body)
        request.execute()

    return "Success"


def get_schedule_list(credentials, project_id, location, server) -> dict:
    job_list = {}
    parent = f"projects/{project_id}/locations/{location}"
    service = googleapiclient.discovery.build('cloudscheduler', CLOUD_VERSION, credentials=credentials)
    #try:
    i=0
    request = service.projects().locations().jobs().list(parent=parent)
    while True:
        response = request.execute()

        for job in response.get('jobs', []):
            job_list[i] = job
            i=i+1
        request = service.projects().locations().jobs().list_next(previous_request=request, previous_response=response)
        if request is None:
            break
    
    return job_list

