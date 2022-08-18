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
import { Observable } from 'rxjs';

export interface ReturnPromise {
  response: string
}

@Injectable({
  providedIn: 'root'
})
export class PostService {

  private baseUrl = 'http://127.0.0.1:5000';

  constructor(private httpClient: HttpClient) { }
  
  async run_auto_excluder(form_data_json: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    let cacheBuster = Date.now();
    return this.httpClient.post<ReturnPromise>(this.baseUrl + "/api/runAutoExcluder?cb=" + cacheBuster, form_data_json, {headers: headers});
  }

  async run_manual_excluder(form_data_json: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    let cacheBuster = Date.now();
    return this.httpClient.post<ReturnPromise>(this.baseUrl + "/api/runManualExcluder?cb=" + cacheBuster, form_data_json, {headers: headers});
  }

  async file_upload(form_data: FormData) {
    return this.httpClient.post<ReturnPromise>(this.baseUrl + "/api/fileUpload", form_data);
  }

  async get_config() {
    return this.httpClient.get<ReturnPromise>(this.baseUrl + "/api/getConfig");
  }

  async set_config(config_data: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return this.httpClient.post<ReturnPromise>(this.baseUrl + "/api/setConfig", config_data, {headers: headers});
  }

  async save_task(task_data: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return this.httpClient.post<ReturnPromise>(this.baseUrl + "/api/saveTask", task_data, {headers: headers});
  }

  async does_task_exist(task_name: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return this.httpClient.post<ReturnPromise>(this.baseUrl + "/api/doesTaskExist", task_name, {headers: headers});
  }

  async get_tasks_list() {
    return this.httpClient.get<ReturnPromise>(this.baseUrl + "/api/getTasksList");
  }

  async delete_task(file_name: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return this.httpClient.post<ReturnPromise>(this.baseUrl + "/api/deleteTask", file_name, {headers: headers});
  }

  async run_task_from_file(file_name: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return this.httpClient.post<ReturnPromise>(this.baseUrl + "/api/runTaskFromFile", file_name, {headers: headers});
  }

  async get_task(file_name: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return this.httpClient.post<ReturnPromise>(this.baseUrl + "/api/getTask", file_name, {headers: headers});
  }


}
