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

import { FormGroup, FormBuilder } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router'

import { PostService, ReturnPromise } from './services/post.service';
import { DialogService } from './services/dialog.service';
import { saveAs } from 'file-saver'

@Component({
  selector: 'app-newtask',
  templateUrl: './newtask.component.html',
  styleUrls: ['./newtask.component.scss']
})
export class NewtaskComponent implements OnInit {
  formBuilder: any;
  gadsForm: FormGroup;
  paginationForm: FormGroup;
  loading: boolean = false;
  table_result: any[] = [];
  customer_list: any[] = [];
  finalGadsFilter: string = "";
  orAndEnabled = false;
  conditionEnabled = true;
  no_data = false;
  exclude_count = 0;
  subs: any;
  isChecked: boolean = false;
  save_button = "Save Task";
  task_id: string = "";
  email_alerts: boolean =false;
  email_alerts_hidden: boolean = true;
  manual_cid: boolean = false;
  cid_choice: string = "Enter manually";
  revSort: string ="";
  include_youtube: boolean = true;

  error_count = 0;
  task_name_error = false;
  gads_error = false;
  gads_error_msg = "";
  gads_data_error = false;
  customer_id_error = false;
  lookback_error = false;
  from_lookback_error = false;
  gads_filter_error = false;
  yt_subscribers_error = false;
  yt_view_error = false;
  yt_video_error = false;
  yt_language_error = false;
  yt_country_error = false;
  memory_error = false;
  gads_filter_lock=true;
  gads_data_youtube: boolean = true;
  gads_data_display: boolean = true;

  pagination_start = 0;
  pagination_rpp = 10;
  excluded_only = false;

  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  pagination_values = [
    ["10"],
    ["25"],
    ["50"],
    ["100"],
    ["200"],
    ["500"]
  ];

  scheduleArray = [
    ["0", "Do not schedule"],
    ["1", "Every 1 hour"],
    ["2", "Every 2 hours"],
    ["4", "Every 4 hours"],
    ["12", "Every 12 hours"],
    ["24", "Every 1 day"],
    ["48", "Every 2 days"]
  ];

  gadsFieldsArray = [
    ["metrics.impressions", "Impressions"],
    ["metrics.clicks", "Clicks"],
    ["metrics.ctr", "CTR"],
    ["metrics.cost_micros", "Cost"],
    ["metrics.average_cpm", "Avg. CPM"],
    ["metrics.conversions", "Conversions"],
    ["metrics.cost_per_conversion", "CPA"],
    ["metrics.view_through_conversions", "View-Through Conversions"],
    ["metrics.video_views", "Video Views"],
    ["metrics.video_view_rate", "Video View Rate"]
  ];

  gadsOperatorsArray = [
    ["<", "less than"],
    [">", "greater than"],
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
  task_exists: any;
  file_exists: any;

  constructor(private snackbar: MatSnackBar, private service: PostService, private fb: FormBuilder,
    private dialogService: DialogService, private route: ActivatedRoute) {
    this.gadsForm = this.fb.group({
      taskName: [''],
      gadsCustomerId: [''],
      fromDaysAgo: [''],
      lookbackDays: [''],
      schedule: [''],
      gadsDataYouTube: [''],
      gadsDataDisplay: [''],
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
      ytStandardCharValue: [''],
      emailAlerts: false,
      includeYouTube: true
    });

    this.gadsForm.controls['lookbackDays'].setValue(7);
    this.gadsForm.controls['fromDaysAgo'].setValue("0");
    this.gadsForm.controls['schedule'].setValue(0);

    this.paginationForm = this.fb.group({
      paginationValue: ['']
    });

    this.paginationForm.controls['paginationValue'].setValue(this.pagination_rpp);

  }

  ngOnInit(): void {
    this.task_id = "";
    this.route.queryParams
      .subscribe(params => {
        this.task_id = params['task'];
      }
      );

      this._populate_customer_list();
  }

  ngAfterViewInit(): void {
    
    if (this.task_id != undefined && this.task_id != "") {
      this._populate_task_load(this.task_id);
    }
  }

  async _populate_customer_list() {
    this.loading = true;
    this.gadsForm.controls['gadsCustomerId'].disable();
    (await this.service.get_customer_list())
      .subscribe({
        next: (response: ReturnPromise) => this._customer_list_populated(response),
        error: (err) => this._call_service_error(err),
        complete: () => console.log("Completed")
      });
  }

  async _customer_list_populated(response: ReturnPromise) {
    this.customer_list = Object.values(response);
    this.customer_list.sort((a, b) => (a.account_name.toLowerCase() > b.account_name.toLowerCase()) ? 1 : -1);

    this.gadsForm.controls['gadsCustomerId'].enable();
    this.loading = false;
  }

  async _populate_task_load(task_id: string) {
    this.loading = true;
    let task_id_json = { 'task_id': task_id };
    (await this.service.get_task(JSON.stringify(task_id_json)))
      .subscribe({
        next: (response: ReturnPromise) => this._populate_task_fields(response),
        error: (err) => this._call_service_error(err),
        complete: () => console.log("Completed")
      });
  }

  async _populate_task_fields(response: ReturnPromise) {

    let task_exists = (Object.entries(response).find(([k, v]) => {
      if (k == 'file_name') {
        this.task_id = v;
      }
      if (k == 'task_name') {
        this.gadsForm.controls['taskName'].setValue(v);
      }
      if (k == 'customer_id') {
        this.gadsForm.controls['gadsCustomerId'].setValue(v);
      }
      if (k == 'from_days_ago') {
        this.gadsForm.controls['fromDaysAgo'].setValue(v);
      }
      if (k == 'lookback_days') {
        this.gadsForm.controls['lookbackDays'].setValue(v);
      }
      else if(k == 'days_ago') { //To be backwards compatible for older tasks
        this.gadsForm.controls['lookbackDays'].setValue(v);
      }
      if (k == 'schedule') {
        this.gadsForm.controls['schedule'].setValue(v);
      }
      if (k == 'gads_filter') {
        this.finalGadsFilter = v;
        if(v != "") {
          this.conditionEnabled = false;
          this.orAndEnabled = true;
        }
      }
      if (k == 'yt_subscriber_operator') {
        this.gadsForm.controls['ytSubscriberOperator'].setValue(v);
      }
      if (k == 'yt_subscriber_value') {
        this.gadsForm.controls['ytSubscriberValue'].setValue(v);
      }
      if (k == 'yt_view_operator') {
        this.gadsForm.controls['ytViewOperator'].setValue(v);
      }
      if (k == 'yt_view_value') {
        this.gadsForm.controls['ytViewValue'].setValue(v);
      }
      if (k == 'yt_video_operator') {
        this.gadsForm.controls['ytVideoOperator'].setValue(v);
      }
      if (k == 'yt_video_value') {
        this.gadsForm.controls['ytVideoValue'].setValue(v);
      }
      if (k == 'yt_language_operator') {
        this.gadsForm.controls['ytLanguageOperator'].setValue(v);
      }
      if (k == 'yt_language_value') {
        this.gadsForm.controls['ytLanguageValue'].setValue(v);
      }
      if (k == 'yt_country_operator') {
        this.gadsForm.controls['ytCountryOperator'].setValue(v);
      }
      if (k == 'yt_country_value') {
        this.gadsForm.controls['ytCountryValue'].setValue(v);
      }
      if (k == 'yt_std_character') {
        this.gadsForm.controls['ytStandardCharValue'].setValue(v);
      }
      if (k == 'email_alerts') {
        this.gadsForm.controls['emailAlerts'].setValue(v);
      }
      if (k == 'include_youtube') {
        this.gadsForm.controls['includeYouTube'].setValue(v);
      }
      if (k == 'gads_data_youtube') {
        this.gadsForm.controls['gadsDataYouTube'].setValue(v);
      }
      if (k == 'gads_data_display') {
        this.gadsForm.controls['gadsDataDisplay'].setValue(v);
      }
    }));
    this.scheduleChange();
    this.loading = false;
  }

  openSnackBar(message: string, button: string, type: string) {
    let dur = 10000;
    if(type=="error-snackbar") { dur = 0; }
    this.snackbar.open(message, button, {
      duration: dur,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
      panelClass: [type]
    });
  }

  run_auto_excluder_form(auto_exclude: boolean) {
    if (this.validate_fields(false)) {
      this.pagination_start = 0;
      let formRawValue = {
        'excludeChannels': auto_exclude,
        'gadsCustomerId': this.gadsForm.controls['gadsCustomerId'].value,
        'fromDaysAgo': this.gadsForm.controls['fromDaysAgo'].value,
        'lookbackDays': this.gadsForm.controls['lookbackDays'].value,
        'gadsDataYouTube': this.gads_data_youtube,
        'gadsDataDisplay': this.gads_data_display,
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
        'ytStandardCharValue': this.gadsForm.controls['ytStandardCharValue'].value,
        'includeYouTubeData': this.include_youtube
      };
      if (this.finalGadsFilter == "") {
        this.dialogService.openConfirmDialog("WARNING: Are you sure you want to run with no Google Ads Filters?\n\nThis can take considerably longer on larger accounts and even run out of memory. It is advised to add filters for best results.")
          .afterClosed().subscribe(res => {
            if (res) {
              this.loading = true;
              this._call_auto_service(JSON.stringify(formRawValue), auto_exclude);
            }
          });
      }
      else {
        this.loading = true;
        this._call_auto_service(JSON.stringify(formRawValue), auto_exclude);
      }
    }
  }

  async _call_auto_service(formRawValue: string, auto_exclude: boolean) {
    this.loading = true;
    this.subs = (await this.service.run_auto_excluder(formRawValue))
      .subscribe({
        next: (response: ReturnPromise) => this._call_auto_service_success(response, auto_exclude),
        error: (err) => this._call_service_error(err),
        complete: () => console.log("Completed")
      });
  }

  _call_auto_service_success(response: ReturnPromise, auto_exclude: boolean) {    
    const raw_response = Object.values(response);
    const flattened_raw_response = [];
    for (const raw_data_row of raw_response){
      const account_level_data = raw_data_row["account_level_data"];
      const yt_data = raw_data_row["yt_data"];
      for (const ad_group_level_data of raw_data_row["ad_group_level_array"]){
        flattened_raw_response.push({...ad_group_level_data, ...account_level_data, ...yt_data});
      }
    }
    this.table_result = flattened_raw_response;
    if (this.table_result.length > 0) {
      this.sort_table("default");
     
      this.no_data = false;
      if (auto_exclude) {
        this._run_exclude_count(false);
        this.openSnackBar("Successfully excluded " + this.exclude_count + " placement(s)", "Dismiss", "success-snackbar");
      }
      this._run_exclude_count(auto_exclude);
    }
    else {
      this.no_data = true;
      this.exclude_count = 0;
      this.openSnackBar("Successful run, but no data matches criteria", "Dismiss", "success-snackbar");
    }
    this.loading = false;
  }


  sort_table(element: string) {
    if(element=="default") {
      this.table_result.sort((a, b) => (a.allowlist > b.allowlist) ? 1 : -1);
      this.table_result.sort((a, b) => (a.exclude_from_account > b.exclude_from_account) ? 1 : -1);
      this.table_result.sort((a, b) => (a.excluded_already > b.excluded_already) ? 1 : -1);
      this.revSort = "";
    }
    else if(this.revSort == element) {
      this.table_result.sort((a, b) => (a[element] > b[element]) ? 1 : -1);
      this.revSort = "";
    }
    else {
      this.table_result.sort((a, b) => (a[element] < b[element]) ? 1 : -1);
      this.revSort = element;
    }
  }

  run_manual_excluder_form() {
    let exclusion_list = [];
    for (let data of this.table_result) {
      if (data.exclude_from_account && !data.excluded_already && !data.allowlist) {
        exclusion_list.push([data.group_placement_view_placement_type, data.group_placement_view_placement]);
      }
    }
    if (exclusion_list.length > 0) {
      let formRawValue = {
        'gadsCustomerId': this.gadsForm.controls['gadsCustomerId'].value,
        'allExclusionList': exclusion_list
      }
      this._call_manual_service(JSON.stringify(formRawValue));
    }
  }

  async _call_manual_service(formRawValue: string) {
    this.loading = true;
    (await this.service.run_manual_excluder(formRawValue))
      .subscribe({
        next: (response: ReturnPromise) => this._call_manual_service_success(response),
        error: (err) => this._call_service_error(err),
        complete: () => console.log("Completed")
      });
  }

  _call_manual_service_success(response: ReturnPromise) {
    this._run_exclude_count(true);
    this.openSnackBar("Successfully excluded " + response + " placement(s)", "Dismiss", "success-snackbar");
    this.loading = false;
  }

  _call_service_error(err: ErrorEvent) {
    this.loading = false;
    this.openSnackBar("Error - This could be due to credential issues or filter issues. Check your credentials and any manual edits to your filters", "Dismiss", "error-snackbar");
  }


  async save_task() {
    let warning = "";
    if(this.finalGadsFilter == "" && this.gadsForm.controls['schedule'].value != "0") 
    {
      warning = "WARNING: Are you sure you want to schedule a task with no Google Ads Filters?\n\nThis can take considerably longer on larger accounts and even run out of memory. It is advised to add filters for best results.\n\n";
    }
    if (this.validate_fields(true)) {
      if (this.task_id != undefined && this.task_id != "") {
        this.dialogService.openConfirmDialog(warning+"Are you sure you want to update the current task with the new settings?\n\nThis will also update your schedule settings")
          .afterClosed().subscribe(res => {
            if (res) {
              this.loading = true;
              this._finalise_save_task(this.task_id);
            }
          });
      }
      else {
        this.dialogService.openConfirmDialog(warning+"Are you sure you want to save this task?\n\nThis will also create a schedule if you have selected a schedule setting")
          .afterClosed().subscribe(res => {
            if (res) {
              this.loading = true;
              this._finalise_save_task("");
            }
          });
      }
    }
  }

  async _finalise_save_task(task_id: string) {
    let formRawValue = {
      'task_id': task_id,
      'task_name': this.gadsForm.controls['taskName'].value,
      'customer_id': this.gadsForm.controls['gadsCustomerId'].value,
      'from_days_ago': this.gadsForm.controls['fromDaysAgo'].value,
      'lookback_days': this.gadsForm.controls['lookbackDays'].value,
      'schedule': this.gadsForm.controls['schedule'].value,
      'gads_data_youtube': this.gads_data_youtube,
      'gads_data_display': this.gads_data_display,
      'gads_filter': this.finalGadsFilter,
      'yt_subscriber_operator': this.gadsForm.controls['ytSubscriberOperator'].value,
      'yt_subscriber_value': this.gadsForm.controls['ytSubscriberValue'].value,
      'yt_view_operator': this.gadsForm.controls['ytViewOperator'].value,
      'yt_view_value': this.gadsForm.controls['ytViewValue'].value,
      'yt_video_operator': this.gadsForm.controls['ytVideoOperator'].value,
      'yt_video_value': this.gadsForm.controls['ytVideoValue'].value,
      'yt_language_operator': this.gadsForm.controls['ytLanguageOperator'].value,
      'yt_language_value': this.gadsForm.controls['ytLanguageValue'].value,
      'yt_country_operator': this.gadsForm.controls['ytCountryOperator'].value,
      'yt_country_value': this.gadsForm.controls['ytCountryValue'].value,
      'yt_std_character': this.gadsForm.controls['ytStandardCharValue'].value,
      'emailAlerts': this.gadsForm.controls['emailAlerts'].value,
      'includeYouTubeData': this.include_youtube
    };

    this._call_save_task_service(JSON.stringify(formRawValue));
  }

  async _call_save_task_service(taskFormValue: string) {
    (await this.service.save_task(taskFormValue))
      .subscribe({
        next: (response: ReturnPromise) => this._call_save_task_success(response),
        error: (err) => this.openSnackBar("Unknown error saving file", "Dismiss", "error-snackbar"),
        complete: () => this.loading = false
      });
  }
  
  async _call_save_task_success(response: ReturnPromise) {
    let schedule_text = "";
    if (this.gadsForm.controls['schedule'].value != "0") {
      schedule_text = " and scheduled to run every " + this.gadsForm.controls['schedule'].value + " hours";
    }
    else {
      schedule_text = " and removed any schedules that were running"
    }
    this.openSnackBar("Successfully saved task '" + this.gadsForm.controls['taskName'].value + "' ("
      + response + ")" + schedule_text, "Dismiss", "success-snackbar");
    this.task_id = "" + response;
    this.loading = false;
  }

  async _call_save_task_error() {
    this.loading = false;
    this.openSnackBar("Unable to save task", "Dismiss", "error-snackbar");
  }

  _run_exclude_count(edit_table: boolean) {
    this.exclude_count = 0;
    this.memory_error = false;
    for (let i in this.table_result) {
      if (this.table_result[i]['exclude_from_account'] && 
        !this.table_result[i]['excluded_already'] &&
        !this.table_result[i]['allowlist']) {
          this.exclude_count++;
          if(edit_table) {
            this.table_result[i]['excluded_already'] = true;
            this.exclude_count--;
          }
      }
      if (this.table_result[i]['memory_warning'] != null) {
        this.memory_error = true;
      }
    }
    //this.sort_table("default");
  }

  row_class(excluded_already: boolean, exclude_from_account: boolean, allowlist: boolean)
  {
    if(allowlist) {
      return "allowlisted";
    }
    if(excluded_already) {
      return "alreadyexcluded";
    }
    else if(exclude_from_account) {
      return "tobeexcluded";
    }
    else {
      return "";
    }
  }

  row_disabled(excluded_already: boolean, allowlist: boolean){
    if(excluded_already || allowlist) {
      return true;
    }
    else
    {
      return false;
    }
  }

  excludeCheckChange(ytChannelId: string) {
    for (let i in this.table_result) {
      if (this.table_result[i]['group_placement_view_placement'] == ytChannelId) {
        this.table_result[i]['exclude_from_account'] = !this.table_result[i]['exclude_from_account'];
      }
    }
    this._run_exclude_count(false);
  }

  validate_fields(full: boolean) {
    let error_count = 0;
    this.task_name_error = false;
    this.customer_id_error = false;
    this.lookback_error = false;
    this.gads_filter_error = false;
    this.yt_subscribers_error = false;
    this.yt_view_error = false;
    this.yt_video_error = false;
    this.yt_language_error = false;
    this.yt_country_error = false;
    this.from_lookback_error = false;
    this.gads_data_error = false;
    if (full) {
      if ((this.gadsForm.controls['taskName'].value).length == 0) {
        this.task_name_error = true;
        error_count++;
      }
    }
    let cus_id = this.gadsForm.controls['gadsCustomerId'].value;
    cus_id = cus_id.replace(new RegExp('-', 'g'), '');
    this.gadsForm.controls['gadsCustomerId'].setValue(cus_id);
    if (this.finalGadsFilter.endsWith("(") || this.finalGadsFilter.endsWith("AND")) {
      this.gads_filter_error = true;
      error_count++;
    }
    if (isNaN(Number(this.gadsForm.controls['lookbackDays'].value)) || this.gadsForm.controls['lookbackDays'].value=="" || Number(this.gadsForm.controls['lookbackDays'].value) >90) {
      this.lookback_error = true;
      error_count++;
    }
    if (isNaN(Number(this.gadsForm.controls['fromDaysAgo'].value)) || this.gadsForm.controls['fromDaysAgo'].value=="" || Number(this.gadsForm.controls['fromDaysAgo'].value) >90) {
      this.from_lookback_error = true;
      error_count++;
    }
    if (isNaN(Number(cus_id)) || cus_id == "") {
      this.customer_id_error = true;
      error_count++;
    }
    if(!this.gads_data_display && !this.gads_data_youtube)
    {
      this.gads_data_error = true;
      error_count++;
    }
    if (isNaN(Number(this.gadsForm.controls['ytSubscriberValue'].value)) 
    || (this.gadsForm.controls['ytSubscriberValue'].value !="" && this.gadsForm.controls['ytSubscriberOperator'].value == "")
    || (this.gadsForm.controls['ytSubscriberValue'].value =="" && this.gadsForm.controls['ytSubscriberOperator'].value != "")) {
      this.yt_subscribers_error = true;
      error_count++;
    }
    if (isNaN(Number(this.gadsForm.controls['ytViewValue'].value)) 
    || (this.gadsForm.controls['ytViewValue'].value !="" && this.gadsForm.controls['ytViewOperator'].value == "")
    || (this.gadsForm.controls['ytViewValue'].value =="" && this.gadsForm.controls['ytViewOperator'].value != "")) {
      this.yt_view_error = true;
      error_count++;
    }
    if (isNaN(Number(this.gadsForm.controls['ytVideoValue'].value)) 
    || (this.gadsForm.controls['ytVideoValue'].value !="" && this.gadsForm.controls['ytVideoOperator'].value == "")
    || (this.gadsForm.controls['ytVideoValue'].value =="" && this.gadsForm.controls['ytVideoOperator'].value != "")) {
      this.yt_video_error = true;
      error_count++;
    }
    if ((this.gadsForm.controls['ytLanguageValue'].value).length != 2 && this.gadsForm.controls['ytLanguageValue'].value != "" 
    || (this.gadsForm.controls['ytLanguageValue'].value !="" && this.gadsForm.controls['ytLanguageOperator'].value == "")
    || (this.gadsForm.controls['ytLanguageValue'].value =="" && this.gadsForm.controls['ytLanguageOperator'].value != "")) {
      this.yt_language_error = true;
      error_count++;
    }
    if ((this.gadsForm.controls['ytCountryValue'].value).length != 2 && this.gadsForm.controls['ytCountryValue'].value != "" 
    || (this.gadsForm.controls['ytCountryValue'].value !="" && this.gadsForm.controls['ytCountryOperator'].value == "")
    || (this.gadsForm.controls['ytCountryValue'].value =="" && this.gadsForm.controls['ytCountryOperator'].value != "")) {
      this.yt_country_error = true;
      error_count++;
    }
    if (error_count == 0) { return true; }
    else {
      this.openSnackBar("Error in some of your fields. Please review and correct them", "Dismiss", "error-snackbar");
      return false;
    }
  }

  gadsAddFilter() {
    this.gads_error = false;
    if (isNaN(Number(this.gadsForm.controls['gadsValue'].value))) {
      this.gads_error = true;
      this.gads_error_msg = "Needs to be a number";
    }
    else if (this.gadsForm.controls['gadsField'].value == "metrics.cost_per_conversion" &&
      (this.gadsForm.controls['gadsOperator'].value == "=" ||
        this.gadsForm.controls['gadsOperator'].value == "!=") &&
      this.gadsForm.controls['gadsValue'].value == 0) {
      this.gads_error = true;
      this.gads_error_msg = "Cannot use CPA=/!=0 (use Conversions)";
    }
    else if (this.gadsForm.controls['gadsField'].value != "" &&
      this.gadsForm.controls['gadsOperator'].value != "" &&
      this.gadsForm.controls['gadsValue'].value != "" &&
      this.conditionEnabled) {
      let finalValue = this.gadsForm.controls['gadsValue'].value;
      if (this.gadsForm.controls['gadsField'].value == "metrics.average_cpm" ||
        this.gadsForm.controls['gadsField'].value == "metrics.cost_micros" ||
        this.gadsForm.controls['gadsField'].value == "metrics.cost_per_conversion") {
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
    this.dialogService.openConfirmDialog("Are you sure you want to clear your current Google Ads filters?")
          .afterClosed().subscribe(res => {
            if (res) {
              this.conditionEnabled = true;
              this.orAndEnabled = false;
              this.finalGadsFilter = "";
              this.gads_filter_error = false;
            }
          });
  }


  pagination_next() {
    if (this.pagination_start + this.pagination_rpp < this.table_result.length) {
      this.pagination_start += this.pagination_rpp;
    }
  }
  pagination_prev() {
    if (this.pagination_start - this.pagination_rpp >= 0) {
      this.pagination_start -= this.pagination_rpp;
    }
  }

  paginationChange() {
    this.pagination_rpp = Number(this.paginationForm.controls['paginationValue'].value);
    this.pagination_start = 0;
  }

  scheduleChange() {
    if (this.gadsForm.controls['schedule'].value == "0") {
      this.save_button = "Save Task";
      this.email_alerts_hidden = true;
      this.email_alerts = false;
    }
    else {
      this.save_button = "Save and Schedule Task";
      this.email_alerts_hidden = false;
    }
  }

  duplicateTask() {
    this.task_id = "";
    this.gadsForm.controls['taskName'].setValue("");
  }

  switch_cid() {
    this.manual_cid =! this.manual_cid;
    if(this.manual_cid) {
      this.cid_choice="Pick from List";
    }
    else {
      this.cid_choice="Enter manually";
    }
  }

  unlockFilter()
  {
    this.gads_filter_lock = !this.gads_filter_lock;
  }

  downloadCSV()
  {
    let data = this.table_result;
    const header = Object.keys(data[0]);
    let csv = data.map(row => header.map(fieldName => JSON.stringify(row[fieldName])).join(','));
    csv.unshift(header.join(','));
    let csvArray = csv.join('\r\n');

    var blob = new Blob([csvArray], {type: 'text/csv' })
    saveAs(blob, "cpr_export.csv");
  }

  async addToAllowlist(channelType: string, channelId: string)
  {
    this.loading=true;
    let channel_id = { 'type': channelType, 'channel_id': channelId, 'gadsCustomerId': this.gadsForm.controls['gadsCustomerId'].value };
    (await this.service.add_to_allowlist(JSON.stringify(channel_id)))
      .subscribe({
        next: (response: ReturnPromise) => this.loading = false,
        error: (err) => this.openSnackBar("Unknown error adding to allowlist", "Dismiss", "error-snackbar"),
        complete: () => this.loading = false
      });

    for (let i in this.table_result) {
      if (this.table_result[i]['group_placement_view_placement'] == channelId) {
        this.table_result[i]['allowlist'] = true;
        this.table_result[i]['excluded_already'] = false;
      }
    }
    this._run_exclude_count(false);
  }

  async removeFromAllowlist(channelId: string)
  {
    let channel_id = { 'channel_id': channelId };
    (await this.service.remove_from_allowlist(JSON.stringify(channel_id)))
      .subscribe({
        next: (response: ReturnPromise) => this.loading = false,
        error: (err) => this.openSnackBar("Unknown error removing from allowlist", "Dismiss", "error-snackbar"),
        complete: () => this.loading = false
      });

    for (let i in this.table_result) {
      if (this.table_result[i]['group_placement_view_placement'] == channelId) {
        this.table_result[i]['allowlist'] = false;
      }
    }
    this._run_exclude_count(false);
  }

}
