from typing import Dict, Optional

import base64
from datetime import datetime
import functions_framework
from googleapiclient.discovery import build
from google.cloud.scheduler_v1 import (CloudSchedulerClient, GetJobRequest,
                                       UpdateJobRequest)
from google.protobuf import field_mask_pb2
import functions_framework
from google.cloud.scheduler_v1.types import Job
import json
import logging
import math


@functions_framework.cloud_event
def handle_event(cloud_event):
    event_data = cloud_event.data
    project_id = event_data["subscription"].split("/")[1]
    location = get_appengine_location(project_id)
    if not location:
        raise ValueError("cannot determine appengine location")
    request_json = json.loads(
        base64.b64decode(event_data["message"]["data"]).decode())
    schedule = request_json['schedule']
    task_name = request_json['task_name']
    task_id = request_json['task_id']

    now = datetime.now()
    minute = now.strftime("%M")
    hour = now.strftime("%H")

    if int(schedule) < 24:
        schedule = f"{minute} */{schedule} * * *"
    else:
        days = math.floor(int(schedule) / 24)
        schedule = f"{minute} {hour} */{days} * *"

    parent = f"projects/{project_id}/locations/{location}"
    job_name = f"{parent}/jobs/{task_id}"
    job_body = {
        "app_engine_http_target": {
            "http_method": "GET",
            "relative_uri": f"/api/runTaskFromScheduler/{task_id}"
        },
        "time_zone": "Etc/UTC",
        "schedule": schedule,
        "name": job_name,
        "description": "CPR"
    }

    client = CloudSchedulerClient()
    if job := get_job(client, job_name):
        update_job(client, job, job_body)
    else:
        create_job(client, parent, job_body)


def get_appengine_location(project_id: str) -> Optional[str]:
    service = build('appengine', 'v1')
    response = service.apps().get(appsId=project_id).execute()
    if not (location_id := response.get("locationId")):
        return None
    if location_id in ("europe-west", "us-central"):
        location_id = location_id + '1'
    return location_id


def get_job(client: CloudSchedulerClient, job_name: str) -> Optional[Job]:
    request = GetJobRequest(name=job_name)
    try:
        job = client.get_job(request=request)
        return job
    except Exception:
        return None


def update_job(client: CloudSchedulerClient, job: Job, job_dict: Dict[str, str]) -> None:
    job.schedule = job_dict.get("schedule")
    update_mask = field_mask_pb2.FieldMask(paths=['schedule'])
    request = UpdateJobRequest(job=job, update_mask=update_mask)
    client.update_job(request)


def create_job(client: CloudSchedulerClient, parent: str,
               job_dict: Dict[str, str]) -> Job:
    job = Job(**job_dict)
    return client.create_job(parent=parent, job=job)
