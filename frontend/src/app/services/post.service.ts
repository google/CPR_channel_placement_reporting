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

export interface ExcluderPromise {
  response: string
}

@Injectable({
  providedIn: 'root'
})
export class PostService {

  private runExcluderUrl = 'http://127.0.0.1:5000/api/runAutoExcluder';
  private runManualUrl = 'http://127.0.0.1:5000/api/runManualExcluder';

  constructor(private httpClient: HttpClient) { }
  
  async run_auto_excluder(form_data_json: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    let cacheBuster = Date.now();
    return this.httpClient.post<ExcluderPromise>(this.runExcluderUrl + "?cb=" + cacheBuster, form_data_json, {headers: headers});
  }

  async run_manual_excluder(form_data_json: string) {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    let cacheBuster = Date.now();
    return this.httpClient.post<ExcluderPromise>(this.runManualUrl + "?cb=" + cacheBuster, form_data_json, {headers: headers});
  }

  
  
}
