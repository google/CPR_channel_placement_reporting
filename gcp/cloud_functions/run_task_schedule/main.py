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
"""Handles running task."""

# pylint: disable=C0330, g-bad-import-order, g-multiple-import

import base64
import json

import functions_framework
from google.cloud.scheduler_v1 import CloudSchedulerClient, RunJobRequest
from googleapiclient.discovery import build


@functions_framework.cloud_event
def handle_event(cloud_event):
  """Handles running task."""
  event_data = cloud_event.data
  project_id = event_data['subscription'].split('/')[1]
  if not (location := _get_appengine_location(project_id)):
    raise ValueError('cannot determine appengine location')
  request_json = json.loads(
    base64.b64decode(event_data['message']['data']).decode()
  )
  task_id = request_json['task_id']
  parent = f'projects/{project_id}/locations/{location}'
  job_name = f'{parent}/jobs/{task_id}'
  request = RunJobRequest(name=job_name)
  CloudSchedulerClient().run_job(request)


def _get_appengine_location(project_id: str) -> str | None:
  service = build('appengine', 'v1')
  response = service.apps().get(appsId=project_id).execute()
  if not (location_id := response.get('locationId')):
    return None
  if location_id in ('europe-west', 'us-central'):
    location_id = location_id + '1'
  return location_id
