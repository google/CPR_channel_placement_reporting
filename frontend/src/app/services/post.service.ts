/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export interface ReturnPromise {
  response: string
}

@Injectable({
  providedIn: 'root'
})
export class PostService {


  constructor(private httpClient: HttpClient) {
  }


private apiPost<T>(url: string, params: string) {
  const headers = new HttpHeaders();
  headers.set('Content-Type', 'application/json; charset=utf-8');
  const cacheBuster = Date.now();
  return this.httpClient.post<ReturnPromise>(`/api/${url}?cb=${cacheBuster}`, params, {headers});
}

  async get_preview_result_for_specific_preview_task(form_data_json: string) {
      return this.apiPost("getResultsForSpecificPreviewTask", form_data_json);
  }

  async get_preview_tasks_table() {
      return this.apiPost("getPreviewTasksTable", "");
  }

  async preview_form(form_data_json: string) {
      return this.apiPost("asyncPreviewPlacements", form_data_json);
  }

  async run_manual_excluder(form_data_json: string) {
      return this.apiPost("runManualExcluder", form_data_json);
  }

  async file_upload(file_data: string) {
      return this.apiPost("fileUpload", file_data);
  }

  async get_config() {
    return this.httpClient.get<ReturnPromise>( "/api/getConfig");
  }

  async set_config(config_data: string) {
    return this.apiPost("setConfig", config_data);
  }

  async save_task(task_data: string) {
    return this.apiPost("saveTask", task_data);
  }

  async get_tasks_list() {
    return this.httpClient.get<ReturnPromise>( "/api/getTasksList");
  }

  async delete_task(task_id: string) {
    return this.apiPost("deleteTask", task_id);
  }

  async run_task_from_task_id(task_id: string) {
    return this.apiPost("runTaskFromTaskId", task_id);
  }

  async get_task(task_id: string) {
    return this.apiPost("getTask", task_id);
  }

  async finalise_auth(code: string) {
    return this.apiPost("finishAuth", code);
  }

  async set_reauth() {
    return this.httpClient.get<ReturnPromise>( "/api/setReauth");
  }

    async migrate_old_tasks() {
    return this.httpClient.get<ReturnPromise>( "/api/migrateOldTasks");
  }

  async get_customer_list() {
    return this.httpClient.get<ReturnPromise>( "/api/getCustomerIds");
  }

  async get_mcc_list() {
    return this.httpClient.get<ReturnPromise>("/api/getMccIds");
  }

  async refresh_mcc_list() {
    return this.apiPost("updateMccIds", "");
  }

  async add_to_allowlist(channel_id: string) {
    return this.apiPost("addToAllowlist", channel_id);
  }

  async remove_from_allowlist(channel_id: string) {
    return this.apiPost("removeFromAllowlist", channel_id);
  }
}
