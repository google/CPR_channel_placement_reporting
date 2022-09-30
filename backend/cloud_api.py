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

import logging
import math
from datetime import datetime
import googleapiclient.errors

CLOUD_VERSION='v1beta1'

def update_cloud_schedule(credentials, project_id, location, task_id, hours):
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
        logging.info("Schedule does not exist")

    if(hours > 0):
        job_body = {

        "app_engine_http_target": {
            "http_method": "GET",
            "relativeUri": f"/api/runTaskFromScheduler/{task_id}"
        },
        "timeZone": "Etc/UTC",
        "schedule": schedule,
        "name": job_name,
        "description": "CPR"
        }
        

        request = service.projects().locations().jobs().create(parent=parent, body=job_body)
        request.execute()

    return "Success"


def get_schedule_list(credentials, project_id, location) -> dict:
    job_list = {}
    parent = f"projects/{project_id}/locations/{location}"
    service = googleapiclient.discovery.build('cloudscheduler', CLOUD_VERSION, credentials=credentials)

    i=0
    request = service.projects().locations().jobs().list(parent=parent)
    while True:
        response = request.execute()
        for job in response.get('jobs', []):
            if job.get('description')=="CPR":
                job_list[i] = job
                i=i+1
        request = service.projects().locations().jobs().list_next(previous_request=request, previous_response=response)
        if request is None:
            break
    return job_list

