# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Handles updating task schedule."""

# pylint: disable=C0330, g-bad-import-order, g-multiple-import

import base64
import json
import math
from datetime import datetime

import functions_framework
from google.cloud.scheduler_v1 import (
  CloudSchedulerClient,
  GetJobRequest,
  UpdateJobRequest,
)
from google.cloud.scheduler_v1.types import AppEngineRouting, Job
from google.protobuf import field_mask_pb2
from googleapiclient.discovery import build


@functions_framework.cloud_event
def handle_event(cloud_event):
  """Handles updating task schedule."""
  event_data = cloud_event.data
  project_id = event_data['subscription'].split('/')[1]
  if not (location := _get_appengine_location(project_id)):
    raise ValueError('cannot determine appengine location')
  request_json = json.loads(
    base64.b64decode(event_data['message']['data']).decode()
  )
  schedule = request_json['schedule']
  task_id = request_json['task_id']
  service = request_json.get('appengine_service', 'default')

  now = datetime.now()
  minute = now.strftime('%M')
  hour = now.strftime('%H')

  if int(schedule) < 24:
    schedule = f'{minute} */{schedule} * * *'
  else:
    days = math.floor(int(schedule) / 24)
    schedule = f'{minute} {hour} */{days} * *'

  parent = f'projects/{project_id}/locations/{location}'
  job_name = f'{parent}/jobs/{task_id}'
  job_body = {
    'app_engine_http_target': {
      'http_method': 'GET',
      'relative_uri': f'/api/tasks/{task_id}/scheduled_run',
      'app_engine_routing': AppEngineRouting(service=service),
    },
    'time_zone': 'Etc/UTC',
    'schedule': schedule,
    'name': job_name,
    'description': 'CPR',
  }

  client = CloudSchedulerClient()
  if job := _get_job(client, job_name):
    _update_job(client, job, job_body)


def _get_appengine_location(project_id: str) -> str | None:
  service = build('appengine', 'v1')
  response = service.apps().get(appsId=project_id).execute()
  if not (location_id := response.get('locationId')):
    return None
  if location_id in ('europe-west', 'us-central'):
    location_id = location_id + '1'
  return location_id


def _get_job(client: CloudSchedulerClient, job_name: str) -> Job | None:
  try:
    return client.get_job(request=GetJobRequest(name=job_name))
  except Exception:
    return None


def _update_job(
  client: CloudSchedulerClient, job: Job, job_dict: dict[str, str]
) -> None:
  job.schedule = job_dict.get('schedule')
  update_mask = field_mask_pb2.FieldMask(paths=['schedule'])
  request = UpdateJobRequest(job=job, update_mask=update_mask)
  client.update_job(request)
