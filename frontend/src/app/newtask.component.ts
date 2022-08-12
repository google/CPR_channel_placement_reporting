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

import { finalize } from 'rxjs/operators';
import { FormGroup, FormBuilder, FormControl } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { PostService, ExcluderPromise } from './services/post.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { Observable, range } from 'rxjs';

@Component({
  selector: 'app-newtask',
  templateUrl: './newtask.component.html',
  styleUrls: ['./newtask.component.scss']
})
export class NewtaskComponent implements OnInit {
  formBuilder: any;
  gadsForm: FormGroup;
  loading: boolean = false;
  table_result: any;
  finalGadsFilter: string = "";
  orAndEnabled = false;
  conditionEnabled = true;
  no_data = false;
  exclude_count = 0;
  subs: any;
  isChecked:boolean = false;

  error_count = 0;
  gads_error = false;
  customer_id_error = false;
  yt_subscribers_error = false;
  yt_view_error = false;
  yt_video_error = false;
  yt_language_error = false;
  yt_country_error = false;

  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  reportDaysArray = [
    ["7", "last 7 days"],
    ["14", "last 14 days"],
    ["28", "last 28 days"],
    ["90", "last 3 months"],
    ["690", "last 690 TESTING"]
  ]
  scheduleArray = [
    ["0", "Do Not Schedule"],
    ["1", "every 1 hour"],
    ["2", "every 2 hours"],
    ["4", "every 4 hours"],
    ["12", "every 12 hours"],
    ["24", "every 1 day"],
    ["48", "every 2 days"]
  ];

  gadsFieldsArray = [
    ["metrics.impressions", "Impressions"],
    ["metrics.clicks", "Clicks"],
    ["metrics.ctr", "CTR"],
    ["metrics.cost_micros", "Cost"],
    ["metrics.average_cpm", "Avg. CPM"],
    ["metrics.conversions", "Conversions"],
    ["metrics.video_views", "Video Views"],
    ["metrics.video_view_rate", "Video View Rate"]
  ];

  gadsOperatorsArray = [
    ["<", "less than"],
    [">", "greater than"],
    ["<=", "less than or equal to"],
    [">=", "great than or equal to"],
    ["=", "equal to"],
    ["!=", "not equal to"]
  ];

  ytMetricOperatorsArray = [
    ["", "any"],
    ["<", "less than"],
    [">", "greater than"],
    ["<=", "less than or equal to"],
    [">=", "great than or equal to"],
    ["==", "equal to"],
    ["!=", "not equal to"]
  ];

  ytTextOperatorsArray = [
    ["", "any"],
    ["==", "equal to"],
    ["!=", "not equal to"]
  ];

  ytYesNoOperatorsArray = [
    ["", "any"],
    ["==False", "non-standard text"],
    ["==True", "standard text"]
  ];

  constructor(private snackbar: MatSnackBar, private service: PostService, private fb: FormBuilder) {
    this.gadsForm = this.fb.group({
      taskName: [''],
      gadsCustomerId: [''],
      daysAgo: [''],
      schedule: [''],
      gadsField: [''],
      gadsOperator: [''],
      gadsValue: [''],
      gadsFinalFilters: [''],
      ytSubscriberOperator: [''],
      ytSubscriberValue: [''],
      ytViewOperator: [''],
      ytViewValue: [''],
      ytVideoOperator: [''],
      ytVideoValue: [''],
      ytLanguageOperator: [''],
      ytLanguageValue: [''],
      ytCountryOperator: [''],
      ytCountryValue: [''],
      ytStandardCharValue: ['']
    });
   
    this.gadsForm.controls['daysAgo'].setValue(7);
    this.gadsForm.controls['schedule'].setValue(0);
  }


  ngOnInit(): void {

  }

  openSnackBar(message: string, button: string, type: string) {
    this.snackbar.open(message, button, {
      duration: 10000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
      panelClass: [type]
    });
  }

  run_auto_excluder_form(auto_exclude: string) {
    if (this.validate_fields()) {
      this.loading = true;
      let formRawValue = {
        'excludeYt': auto_exclude,
        'gadsCustomerId': this.gadsForm.controls['gadsCustomerId'].value,
        'daysAgo': this.gadsForm.controls['daysAgo'].value,
        'gadsFinalFilters': this.finalGadsFilter,
        'ytSubscriberOperator': this.gadsForm.controls['ytSubscriberOperator'].value,
        'ytSubscriberValue': this.gadsForm.controls['ytSubscriberValue'].value,
        'ytViewOperator': this.gadsForm.controls['ytViewOperator'].value,
        'ytViewValue': this.gadsForm.controls['ytViewValue'].value,
        'ytVideoOperator': this.gadsForm.controls['ytVideoOperator'].value,
        'ytVideoValue': this.gadsForm.controls['ytVideoValue'].value,
        'ytLanguageOperator': this.gadsForm.controls['ytLanguageOperator'].value,
        'ytLanguageValue': this.gadsForm.controls['ytLanguageValue'].value,
        'ytCountryOperator': this.gadsForm.controls['ytCountryOperator'].value,
        'ytCountryValue': this.gadsForm.controls['ytCountryValue'].value,
        'ytStandardCharValue': this.gadsForm.controls['ytStandardCharValue'].value
      };

      this._call_auto_service(JSON.stringify(formRawValue), auto_exclude);
    }
  }

  run_manual_excluder_form() {
    let yt_exclusion_list = [];
    for (let data of this.table_result) {
      if (data.excludeFromYt == 'true') {
        yt_exclusion_list.push(data.group_placement_view_placement);
      }
    }
    if(yt_exclusion_list.length > 0) {
      let formRawValue = {
        'gadsCustomerId': this.gadsForm.controls['gadsCustomerId'].value,
        'ytExclusionList': yt_exclusion_list
      }
      this._call_manual_service(JSON.stringify(formRawValue));
    }
  }

  async _call_auto_service(formRawValue: string, auto_exclude: string) {
    this.loading = true;
    this.subs = (await this.service.run_auto_excluder(formRawValue))
      .subscribe({
        next: (response: ExcluderPromise) => this._call_auto_service_success(response, auto_exclude),
        error: (err) => this._call_service_error(),
        complete: () => console.log("Completed")
      });
  }

  async _call_manual_service(formRawValue: string) {
    this.loading = true;
    this.subs = (await this.service.run_manual_excluder(formRawValue))
      .subscribe({
        next: (response: ExcluderPromise) => this._call_manual_service_success(response),
        error: (err) => this._call_service_error(),
        complete: () => console.log("Completed")
      });
  }

  _call_manual_service_success(response: ExcluderPromise) {
    this.openSnackBar("Successfully excluded "+response+" YouTube channels", "Dismiss", "success-snackbar");
    this.loading = false;
  }

  _call_auto_service_success(response: ExcluderPromise, auto_exclude: string) {
    this.table_result = Object.values(response);
    if (this.table_result.length > 0) {
      this.no_data = false;
      this._run_exclude_count();
      if(auto_exclude=='true') {
        this.openSnackBar("Successfully excluded "+this.exclude_count+" YouTube channels", "Dismiss", "success-snackbar");
      }
    }
    else {
      this.no_data = true;
      this.exclude_count=0;
      this.openSnackBar("Successful run, but no data matches criteria", "Dismiss", "success-snackbar");
    }
    this.loading = false;
  }

  _call_service_error() {
    this.loading = false
    this.openSnackBar("Error retreiving data. Check Customer ID and credentials and try again", "Dismiss", "error-snackbar")
  }

  _run_exclude_count() {
    this.exclude_count=0;
    for (let data of this.table_result) {
      if (data.excludeFromYt == 'true') {
        this.exclude_count++;
      }
    }
  }
  excludeCheckChange(ytChannelId: string){
    //this.table_result[ytChannelId].excludeFromYt = 'False';
    for (let i in this.table_result) {
      if(this.table_result[i]['group_placement_view_placement'] == ytChannelId) {
        this.table_result[i]['excludeFromYt'] = String(!(this.table_result[i]['excludeFromYt'] == 'true'));
      }
    }
    this._run_exclude_count();
  }

  validate_fields() {
    this.error_count = 0;
    this.customer_id_error = false;
    this.yt_subscribers_error = false;
    this.yt_view_error = false;
    this.yt_video_error = false;
    this.yt_language_error = false;
    this.yt_country_error = false;

    let cus_id = this.gadsForm.controls['gadsCustomerId'].value;
    cus_id = cus_id.replace(new RegExp('-', 'g'), '');
    this.gadsForm.controls['gadsCustomerId'].setValue(cus_id);
    if (isNaN(Number(cus_id)) || cus_id == "") {
      this.customer_id_error = true;
      this.error_count++;
    }
    if (isNaN(Number(this.gadsForm.controls['ytSubscriberValue'].value))) {
      this.yt_subscribers_error = true;
      this.error_count++;
    }
    if (isNaN(Number(this.gadsForm.controls['ytViewValue'].value))) {
      this.yt_view_error = true;
      this.error_count++;
    }
    if (isNaN(Number(this.gadsForm.controls['ytVideoValue'].value))) {
      this.yt_video_error = true;
      this.error_count++;
    }
    if ((this.gadsForm.controls['ytLanguageValue'].value).length != 2 && this.gadsForm.controls['ytLanguageValue'].value != "") {
      this.yt_language_error = true;
      this.error_count++;
    }
    if ((this.gadsForm.controls['ytCountryValue'].value).length != 2 && this.gadsForm.controls['ytCountryValue'].value != "") {
      this.yt_country_error = true;
      this.error_count++;
    }
    if (this.error_count == 0) { return true; }
    else {
      this.openSnackBar("Error in some of your fields. Please review and correct them", "Dismiss", "error-snackbar");
      return false;
    }
  }

  gadsAddFilter() {
    this.gads_error = false;
    if (isNaN(Number(this.gadsForm.controls['gadsValue'].value))) {
      this.gads_error = true;
    }
    else if (this.gadsForm.controls['gadsField'].value != "" &&
      this.gadsForm.controls['gadsOperator'].value != "" &&
      this.gadsForm.controls['gadsValue'].value != "" &&
      this.conditionEnabled) {
      let finalValue = this.gadsForm.controls['gadsValue'].value;
      if (this.gadsForm.controls['gadsField'].value == "metrics.average_cpm" || this.gadsForm.controls['gadsField'].value == "metrics.cost_micros") {
        finalValue = finalValue * 1000000;
      }
      if (!this.finalGadsFilter.endsWith("(") && this.finalGadsFilter != "") {
        this.finalGadsFilter += " ";
      }
      this.finalGadsFilter += this.gadsForm.controls['gadsField'].value + this.gadsForm.controls['gadsOperator'].value + finalValue;
      if (this.finalGadsFilter.includes(") OR (") && !this.finalGadsFilter.endsWith(")")) {
        this.finalGadsFilter += ")";
      }
      this.conditionEnabled = false;
      this.orAndEnabled = true;
    }

  }

  gadsAddOrAnd(andOr: string) {
    if (this.orAndEnabled) {
      if (andOr == "OR") {
        if (!this.finalGadsFilter.startsWith("(")) {
          this.finalGadsFilter = "(" + this.finalGadsFilter + ")";
        }
        this.finalGadsFilter += " OR (";
      }
      else {
        if (this.finalGadsFilter.endsWith(")")) {
          this.finalGadsFilter = this.finalGadsFilter.slice(0, this.finalGadsFilter.length - 1);
        }
        this.finalGadsFilter += " AND";
      }
      this.conditionEnabled = true;
      this.orAndEnabled = false;
    }
  }

  clearFilter() {
    this.conditionEnabled = true;
    this.orAndEnabled = false;
    this.finalGadsFilter = "";
  }
}
