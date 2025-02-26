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

import { Component, OnInit } from '@angular/core';
import { PostService, ReturnPromise } from './../services/post.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit {
  nowString = '';
  observeMode = true;

  constructor(private service: PostService) {}
  ngOnInit(): void {
    this.getMode();
  }

  async getMode() {
    (await this.service.getBackendInfo()).subscribe({
      next: (response: ReturnPromise) => this.parseMode(response),
    });
  }
  async parseMode(response: ReturnPromise) {
    Object.entries(response).find(([k, v]) => {
      if (k === 'is_observe_mode') {
        this.observeMode = v;
      }
    });
  }
}
