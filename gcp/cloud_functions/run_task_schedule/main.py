from typing import Optional

import base64
import functions_framework
from googleapiclient.discovery import build
from google.cloud.scheduler_v1 import (CloudSchedulerClient, RunJobRequest)
from google.protobuf import field_mask_pb2
import functions_framework
import json


@functions_framework.cloud_event
def handle_event(cloud_event):
    event_data = cloud_event.data
    project_id = event_data["subscription"].split("/")[1]
    location = get_appengine_location(project_id)
    if not location:
        raise ValueError("cannot determine appengine location")
    request_json = json.loads(
        base64.b64decode(event_data["message"]["data"]).decode())
    task_id = request_json['task_id']

    parent = f"projects/{project_id}/locations/{location}"
    job_name = f"{parent}/jobs/{task_id}"
    client = CloudSchedulerClient()
    run_job(client= client, job_name=job_name)

def get_appengine_location(project_id: str) -> Optional[str]:
    service = build('appengine', 'v1')
    response = service.apps().get(appsId=project_id).execute()
    if not (location_id := response.get("locationId")):
        return None
    if location_id in ("europe-west", "us-central"):
        location_id = location_id + '1'
    return location_id

def run_job(client: CloudSchedulerClient, job_name: str) -> None:
    request = RunJobRequest(name=job_name)
    client.run_job(request)
