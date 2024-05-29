/**
 * Copyright 2024 Google LLC
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

import {
  FormGroup,
  FormBuilder,
  FormControl,
  Validators,
} from "@angular/forms";
import { Component, OnInit } from "@angular/core";
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from "@angular/material/snack-bar";
import { ActivatedRoute } from "@angular/router";
import { STEPPER_GLOBAL_OPTIONS } from "@angular/cdk/stepper";

import { PostService, ReturnPromise } from "./services/post.service";
import { DialogService } from "./services/dialog.service";
import { saveAs } from "file-saver";

interface Field {
  hidden?: boolean;
  value: string;
  view: string;
  type: string;
}

interface FieldGroup {
  disabled?: boolean;
  name: string;
  fields: Field[];
}

enum MetricType {
  Number = "numeric",
  String = "string",
}

enum FilterField {
  Operator,
  Value,
}

@Component({
  selector: "app-newtask",
  templateUrl: "./newtask.component.html",
  providers: [
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { showError: true },
    },
  ],
  styleUrls: ["./newtask.component.scss"],
})
export class NewtaskComponent implements OnInit {
  formBuilder: any;
  gadsForm: FormGroup;
  paginationForm: FormGroup;
  loading: boolean = false;
  column_headers: string[] = [];
  toggle_column_all_headers: any[] = [];
  table_result: any[] = [];
  customer_list: any[] = [];
  finalGadsFilter: string = "";
  orAndEnabled = false;
  conditionEnabled = true;
  no_data = false;
  exclude_count = 0;
  associated_count = 0;
  subs: any;
  isChecked: boolean = false;
  save_button = "Save Task";
  task_id: string = "";
  task_name: string = "";
  taskOutput: any[] = [];
  email_alerts_hidden: boolean = true;
  manual_cid: boolean = false;
  cid_choice: string = "Enter manually";
  revSort: string = "";

  error_count = 0;
  task_name_error = false;
  filter_operator_error = false;
  filter_operator_error_msg = "";
  filter_value_error = false;
  filter_value_error_msg = "";
  filter_extra_instructions = "";
  gads_data_error = false;
  customer_id_error = false;
  lookback_error = false;
  from_lookback_error = false;
  gads_filter_error = false;
  memory_error = false;
  gads_filter_lock = true;
  data_youtube_video: boolean = true;
  data_youtube_channel: boolean = true;
  data_display: boolean = true;
  data_mobile: boolean = true;

  pagination_start = 0;
  pagination_rpp = 10;
  excluded_only = false;
  filtersOpenState: boolean = true;

  date_from = "";
  date_to = "";

  isCheckAll: boolean = false;

  horizontalPosition: MatSnackBarHorizontalPosition = "center";
  verticalPosition: MatSnackBarVerticalPosition = "top";

  pagination_values = [["10"], ["25"], ["50"], ["100"], ["200"], ["500"]];

  exclusionLevelArray = [
    ["AD_GROUP", "Ad Group"],
    ["CAMPAIGN", "Campaign"],
    ["ACCOUNT", "Account"],
  ];
  defaultExclusionLevel = this.exclusionLevelArray[0][0];
  selectedExclusionLevel = this.exclusionLevelArray[0][0];

  taskOutputArray = [
    ["EXCLUDE", "Exclude"],
    ["NOTIFY", "Notify"],
    ["EXCLUDE_AND_NOTIFY", "Both"],
  ];

  scheduleArray = [
    ["0", "Do not schedule"],
    ["1", "Every 1 hour"],
    ["2", "Every 2 hours"],
    ["4", "Every 4 hours"],
    ["12", "Every 12 hours"],
    ["24", "Every 1 day"],
    ["48", "Every 2 days"],
  ];

  relevantMetricArray: string[][] = [];

  allMetricArray: FieldGroup[] = [
    {
      name: "Dimensions",
      fields: [
        {
          value: "GOOGLE_ADS_INFO:account_name",
          view: "Account Name",
          type: "string",
        },
        {
          value: "GOOGLE_ADS_INFO:campaign_name",
          view: "Campaign Name",
          type: "string",
        },
        {
          value: "GOOGLE_ADS_INFO:campaign_type",
          view: "Campaign Type",
          type: "string",
        },
        {
          value: "GOOGLE_ADS_INFO:campaign_sub_type",
          view: "Campaign Sub Type",
          type: "string",
        },
        {
          value: "GOOGLE_ADS_INFO:ad_group_name",
          view: "AdGroup Name",
          type: "string",
        },
      ],
    },
    {
      name: "Metrics",
      fields: [
        {
          value: "GOOGLE_ADS_INFO:impressions",
          view: "Impressions",
          type: "numeric",
        },
        { value: "GOOGLE_ADS_INFO:clicks", view: "Clicks", type: "numeric" },
        { value: "GOOGLE_ADS_INFO:ctr", view: "CTR", type: "numeric" },
        { value: "GOOGLE_ADS_INFO:cost", view: "Cost", type: "numeric" },
        { value: "GOOGLE_ADS_INFO:avg_cpm", view: "Avg. CPM", type: "numeric" },
        { value: "GOOGLE_ADS_INFO:avg_cpc", view: "Avg. CPC", type: "numeric" },
        { value: "GOOGLE_ADS_INFO:avg_cpv", view: "Avg. CPV", type: "numeric" },
        {
          value: "GOOGLE_ADS_INFO:conversions",
          view: "Conversions",
          type: "numeric",
        },
        {
          value: "GOOGLE_ADS_INFO:cost_per_conversion",
          view: "CPA",
          type: "numeric",
        },
        {
          value: "GOOGLE_ADS_INFO:view_through_conversions",
          view: "View-Through Conversions",
          type: "numeric",
        },
        {
          value: "GOOGLE_ADS_INFO:video_views",
          view: "Video Views",
          type: "numeric",
        },
        {
          value: "GOOGLE_ADS_INFO:video_view_rate",
          view: "Video View Rate",
          type: "numeric",
        },
        {
          value: "GOOGLE_ADS_INFO:conversions_from_interactions_rate",
          view: "Conversions Rate",
          type: "numeric",
        },
      ],
    },
    {
      name: "Conversion Split",
      fields: [
        {
          value: "GOOGLE_ADS_INFO:conversion_name",
          view: "Conversion Name",
          type: "string",
        },
        {
          value: "GOOGLE_ADS_INFO:cost_per_conversion_",
          view: "CPA for selected conversion(s)",
          type: "numeric",
        },
        {
          value: "GOOGLE_ADS_INFO:conversions_",
          view: "# of selected conversion(s)",
          type: "numeric",
        },
      ],
    },
    {
      name: "YouTube Video",
      fields: [
        { value: "YOUTUBE_VIDEO_INFO:title", view: "Title", type: "string" },
        {
          value: "YOUTUBE_VIDEO_INFO:description",
          view: "Description",
          type: "string",
        },
        {
          value: "YOUTUBE_VIDEO_INFO:viewCount",
          view: "Video Views",
          type: "numeric",
        },
        {
          value: "YOUTUBE_VIDEO_INFO:likeCount",
          view: "Likes",
          type: "numeric",
        },
        {
          value: "YOUTUBE_VIDEO_INFO:commentCount",
          view: "Comments",
          type: "numeric",
        },
        { value: "YOUTUBE_VIDEO_INFO:tags", view: "Tags", type: "string" },
        {
          value: "YOUTUBE_VIDEO_INFO:topicCategories",
          view: "Topics",
          type: "string",
        },
      ],
    },
    {
      name: "YouTube Channel",
      fields: [
        { value: "YOUTUBE_CHANNEL_INFO:title", view: "Title", type: "string" },
        {
          value: "YOUTUBE_CHANNEL_INFO:description",
          view: "Description",
          type: "string",
        },
        {
          value: "YOUTUBE_CHANNEL_INFO:subscriberCount",
          view: "Subscribers",
          type: "numeric",
        },
        {
          value: "YOUTUBE_CHANNEL_INFO:videoCount",
          view: "# of Videos",
          type: "numeric",
        },
        {
          value: "YOUTUBE_CHANNEL_INFO:viewCount",
          view: "Video Views",
          type: "numeric",
        },
        {
          value: "YOUTUBE_VIDEO_INFO:topicCategories",
          view: "Topics",
          type: "string",
        },
      ],
    },
    {
      name: "Website Content",
      fields: [
        { value: "WEBSITE_INFO:title", view: "Title", type: "string" },
        { value: "WEBSITE_INFO:keywords", view: "Keywords", type: "string" },
        {
          value: "WEBSITE_INFO:description",
          view: "Description",
          type: "string",
        },
      ],
    },
  ];

  metricsByTypeDict: { [key: string]: Set<string> } = {};

  numericOperators: Set<string | null> = new Set(["<", ">", "=", "!="]);
  stringOperators: Set<string | null> = new Set([
    "contains",
    "regexp",
    "=",
    "!=",
  ]);
  boolOperators: Set<string | null> = new Set(["has_latin_letters"]);

  gadsOperatorsArray = [
    ["<", "less than"],
    [">", "greater than"],
    ["=", "equal to"],
    ["!=", "not equal to"],
    ["contains", "contains"],
    ["regexp", "match regexp"],
    ["has_latin_letters", "has latin letters"],
  ];

  toggle_column_selected_headers: string[] = [];

  hidden_columns: any[] = [
    'Campaign Id',
    'Ad Group Id',
    'Criterion Id',
    'Customer Id',
    'Account Id',
    'Placement',    
    'Allowlisted',
    'Extra Info',
    'YT Is Processed',
    'YT Last Processed Time',
    'YT Country',
    'YT Id',
    'YT Placement',
    'Reason',
    'Url',
    'Matching Placement',
    'Keywords',
    'Interaction Rate',
    'Interactions',
    'Conversions From Interactions Rate',
    'All Conversions Rate',
    'YT Comment Count',
    'YT Default Audio Language',
    'YT Default Language',
    'YT Favourite Count',
    'YT Like Count',
    'YT Media For Kids',
    'YT Placement',
    'YT Tags',
  ];

  value_columns: any[] = [
    'Cost',
    'Avg CPC',
    'Avg CPM',
    'Avg CPV',
    'Video View Rate',
    'CTR',
    'Cost Per Conversion',
    'Cost Per All Conversion',
    'All Conversion Rate',
    'Interaction Rate',
    'Conversions From Interactions Rate',
  ];
  removeFromExtraInfo: any[] = ["processed"];

  toggle_column_selected_headers_by_default: any[] = [
    'Name',
    'Placement Type',
    'Identifier',
  ];

  task_exists: any;
  file_exists: any;

  selectedCidList = new FormControl([""], [Validators.required]);
  selectedSchedule = new FormControl("0");
  selectedExclusionLevelFormControl = new FormControl("AD_GROUP");
  selectedField = new FormControl("");
  selectedTaskOutput = new FormControl("EXCLUDE_AND_NOTIFY");
  selectedOperator = new FormControl("");
  selectedValue = new FormControl("");
  stepperErrorMessage: string = "Account is required.";

  constructor(
    private snackbar: MatSnackBar,
    private service: PostService,
    private fb: FormBuilder,
    private dialogService: DialogService,
    private route: ActivatedRoute
  ) {
    this.gadsForm = this.fb.group({
      taskName: ["", [Validators.required]],
      gadsCustomerId: [""],
      fromDaysAgo: [
        "",
        [Validators.required, Validators.min(0), Validators.max(90)],
      ],
      lookbackDays: [
        "",
        [Validators.required, Validators.min(0), Validators.max(90)],
      ],
      exclusionLevel: [""],
      task_output: [""],
      schedule: [""],
      gadsDataYouTubeChannel: [""],
      gadsDataYouTubeVideo: [""],
      gadsDataDisplay: [""],
      gadsDataMobile: [""],
      gadsField: [""],
      gadsOperator: [""],
      gadsValue: [""],
      gadsFinalFilters: [""],
      date_from: "",
      date_to: "",
    });

    this.gadsForm.controls["lookbackDays"].setValue(7);
    this.gadsForm.controls["fromDaysAgo"].setValue("0");
    this.selectedSchedule.setValue("0");

    this.fillUserVisibilColumnDropDown();

    this.paginationForm = this.fb.group({
      paginationValue: [""],
    });

    this.paginationForm.controls["paginationValue"].setValue(
      this.pagination_rpp
    );
    this.initMetricsByTypeDict();
  }

  private fillUserVisibilColumnDropDown() {
    this.toggle_column_selected_headers_by_default.forEach((column) => {
      this.toggle_column_selected_headers.push(column);
    });
  }

  initMetricsByTypeDict() {
    if (
      !this.metricsByTypeDict ||
      Object.keys(this.metricsByTypeDict).length == 0
    ) {
      this.allMetricArray.forEach((fieldGroup) => {
        fieldGroup.fields.forEach((field) => {
          if (!this.metricsByTypeDict[field.type]) {
            this.metricsByTypeDict[field.type] = new Set<string>();
          }
          this.metricsByTypeDict[field.type].add(field.value);
        });
      });
    }
  }

  ngOnInit(): void {
    this.task_id = "";
    this.route.queryParams.subscribe((params) => {
      this.task_id = params["task"];
    });

    this._populate_customer_list();
    this.selectedCidList.valueChanges.subscribe((value) => {
      if (value && value.length > 0) {
        this.gadsForm.patchValue({
          gadsCustomerId: value.join(","),
        });
        this.stepperErrorMessage = "";
      } else {
        this.stepperErrorMessage = "Account is required.";
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.task_id != undefined && this.task_id != "") {
      this._populate_task_load(this.task_id);
    }
  }

  compareFields(field1: Field, field2: Field): boolean {
    return field1 && field2 ? field1.value === field2.value : field1 === field2;
  }

  async _populate_customer_list() {
    this.loading = true;
    this.gadsForm.controls["gadsCustomerId"].disable();
    (await this.service.get_customer_list()).subscribe({
      next: (response: ReturnPromise) =>
        this._customer_list_populated(response),
      error: (err) => this._call_service_error(err),
      complete: () => console.log("Completed"),
    });
  }

  async _customer_list_populated(response: ReturnPromise) {
    this.customer_list = Object.values(response);
    this.customer_list.sort((a, b) =>
      a.account_name.toLowerCase() > b.account_name.toLowerCase() ? 1 : -1
    );

    this.gadsForm.controls["gadsCustomerId"].enable();
    this.loading = false;
  }

  async _populate_task_load(task_id: string) {
    this.loading = true;
    let task_id_json = {
      task_id: task_id,
    };
    (await this.service.get_task(JSON.stringify(task_id_json))).subscribe({
      next: (response: ReturnPromise) => this._populate_task_fields(response),
      error: (err) => this._call_service_error(err),
      complete: () => console.log("Completed"),
    });
  }

  async _populate_task_fields(response: ReturnPromise) {
    let task_exists = Object.entries(response).find(([k, v]) => {
      if (k == "file_name") {
        this.task_id = v;
      }
      if (k == "name") {
        this.gadsForm.controls["taskName"].setValue(v);
        this.task_name = v;
      }
      if (k == "customer_ids") {
        this.selectedCidList.setValue(v.split(","));
      }
      if (k == "from_days_ago") {
        this.gadsForm.controls["fromDaysAgo"].setValue(v);
      }
      if (k == "date_range") {
        this.gadsForm.controls["lookbackDays"].setValue(v);
      } else if (k == "date_range") {
        //To be backwards compatible for older tasks
        this.gadsForm.controls["lookbackDays"].setValue(v);
      }
      if (k == "exclusion_level") {
        this.selectedExclusionLevelFormControl.setValue(
          v.replace("ExclusionLevelEnum.", "")
        );
      }
      if (k == "output") {
        this.selectedTaskOutput.setValue(v.replace("TaskOutput.", ""));
      }
      if (k == "schedule") {
        // TODO: convert crontab to variable
        this.selectedSchedule.setValue(v);
      }
      if (k == "exclusion_rule") {
        this.finalGadsFilter = v;
        if (v != "") {
          this.conditionEnabled = false;
          this.orAndEnabled = true;
        }
      }
      if (k == "placement_types") {
        if (!v.includes("YOUTUBE_VIDEO")) {
          this.gadsForm.controls["gadsDataYouTubeVideo"].setValue(false);
        }
        if (!v.includes("YOUTUBE_CHANNEL")) {
          this.gadsForm.controls["gadsDataYouTubeChannel"].setValue(false);
        }
        if (!v.includes("MOBILE")) {
          this.gadsForm.controls["gadsDataMobile"].setValue(false);
        }
        if (!v.includes("WEBSITE")) {
          this.gadsForm.controls["gadsDataDisplay"].setValue(false);
        }
      }
    });
    this.scheduleChange();
    this.loading = false;
  }

  openSnackBar(message: string, button: string, type: string) {
    let dur = 10000;
    if (type == "error-snackbar") {
      dur = 0;
    }
    this.snackbar.open(message, button, {
      duration: dur,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
      panelClass: [type],
    });
  }

  previewPlacements() {
    if (this.validate_fields(false)) {
      this.pagination_start = 0;
      var placement_types = [];
      if (this.data_youtube_channel) {
        placement_types.push("YOUTUBE_CHANNEL");
      }
      if (this.data_youtube_video) {
        placement_types.push("YOUTUBE_VIDEO");
      }
      if (this.data_display) {
        placement_types.push("WEBSITE");
      }
      if (this.data_mobile) {
        placement_types.push("MOBILE_APPLICATION", "MOBILE_APP_CATEGORY");
      }
      let formRawValue = {
        customer_ids: this.selectedCidList.value,
        from_days_ago: this.gadsForm.controls["fromDaysAgo"].value,
        date_range: this.gadsForm.controls["lookbackDays"].value,
        exclusion_level: this.selectedExclusionLevelFormControl.value,
        exclusion_rule: this.finalGadsFilter,
        placement_types: placement_types.toString(),
      };
      if (this.finalGadsFilter == "") {
        this.dialogService
          .openConfirmDialog(
            "WARNING: Are you sure you want to run with no Google Ads Filters?\n\nThis can take considerably longer on larger accounts and even run out of memory. It is advised to add filters for best results."
          )
          .afterClosed()
          .subscribe((res) => {
            if (res) {
              this.loading = true;
              this._call_auto_service(JSON.stringify(formRawValue));
            }
          });
      } else {
        this.loading = true;
        this._call_auto_service(JSON.stringify(formRawValue));
      }
    }
  }

  async _call_auto_service(formRawValue: string) {
    this.loading = true;
    this.subs = (await this.service.preview_form(formRawValue)).subscribe({
      next: (response: ReturnPromise) =>
        this._call_auto_service_success(response),
      error: (err) => this._call_service_error(err),
      complete: () => console.log("Completed"),
    });
  }

  _call_auto_service_success(response: ReturnPromise) {
    const jsonResponse = JSON.parse(JSON.stringify(response));
    if (!jsonResponse.data) {
      this.handleEmptyTable(
        "Server error, please investigate the cloud logs",
        "error-snackbar"
      );
      return;
    }
    if (!jsonResponse.data) {
      this.handleEmptyTable(
        "Server error, please investigate the cloud logs",
        "error-snackbar"
      );
      return;
    }
    const dates = jsonResponse["dates"];
    this.date_from = dates["date_from"];
    this.date_to = dates["date_to"];
    const flatened_data = this.fromServerToUiTable(jsonResponse.data);
    this.table_result = flatened_data.rows;
    if (this.table_result.length > 0) {
      this.column_headers = flatened_data.headers;
      this.toggle_column_all_headers = this.column_headers.filter(
        (item) => !this.hidden_columns.includes(item)
      );
      this.toggle_column_all_headers.sort((a, b) =>
        a.toLowerCase() > b.toLowerCase() ? 1 : -1
      );
      this.sort_table("default");
      this.no_data = false;
    } else {
      this.handleEmptyTable(
        "Successful run, but no data matches criteria",
        "success-snackbar"
      );
    }
    this.loading = false;
  }

  fromServerToUiTable(originalRows: any): any {
    let maxKeys = 0;
    let keysOfMaxItem: string[] = [];
    const transformedRows: any[] = [];
    let transformedRow: { [key: string]: any } = { extra_info: [] };
    for (const rowIndex in originalRows) {
      const originalDataRow = originalRows[rowIndex];
      if (originalDataRow.extra_info === undefined) {
        transformedRow = { ...originalDataRow };
      } else {
        const firstKey = Object.keys(originalDataRow.extra_info)[0];
        const firstChild = originalDataRow.extra_info[firstKey];
        if (firstChild) {
          transformedRow = {
            ...originalDataRow,
            ...Object.fromEntries(
              Object.entries(firstChild)
                .filter(
                  ([key, _]) =>
                    !this.removeFromExtraInfo.includes(key.toLowerCase)
                )
                .map(([key, value]) => [`YT ${key}`, value])
            ),
          };
          // Remove the first child from extra_info
          delete transformedRow["extra_info"][firstKey];
        } else {
          transformedRow = { ...originalDataRow };
        }
      }
      transformedRows.push(transformedRow);

      // Check if the current item has more keys than the previous maximum
      const itemKeys = Object.keys(transformedRow);
      if (itemKeys.length > maxKeys) {
        maxKeys = itemKeys.length;
        keysOfMaxItem = itemKeys;
      }
    }
    return {
      rows: transformedRows,
      headers: keysOfMaxItem.map(convertToTitleCase),
    };
  }

  private handleEmptyTable(message: string, css_class: string) {
    this.no_data = true;
    this.exclude_count = 0;
    this.openSnackBar(message, "Dismiss", css_class);
    this.loading = false;
  }

  sort_table(element: string) {
    if (element == "default") {
      this.table_result.sort((a, b) => (a.allowlist > b.allowlist ? 1 : -1));
      this.table_result.sort((a, b) =>
        a.exclude_from_account > b.exclude_from_account ? 1 : -1
      );
      this.table_result.sort((a, b) =>
        a.excluded_already > b.excluded_already ? 1 : -1
      );
      this.revSort = "";
    } else if (this.revSort == element) {
      this.table_result.sort((a, b) => (a[element] > b[element] ? 1 : -1));
      this.revSort = "";
    } else {
      this.table_result.sort((a, b) => (a[element] < b[element] ? 1 : -1));
      this.revSort = element;
    }
  }

  runManualExcludeForm() {
    let exclusion_list: Object[][] = [];
    for (let data of this.table_result) {
      if (
        data.exclude_from_account &&
        !data.excluded_already &&
        !data.allowlist
      ) {
        exclusion_list.push(Object.values(data));
      }
    }
    if (exclusion_list.length > 0) {
      if (
        (this.data_youtube_video || this.data_youtube_channel) &&
        this.selectedExclusionLevelFormControl.value != "ACCOUNT"
      ) {
        this.dialogService
          .openConfirmDialog(
            "For now, CPR tool can exclude video placements at an account level only (regardless of 'success' indication). Do you wish to proceed?"
          )
          .afterClosed()
          .subscribe((res) => {
            if (res) {
              this.manualExcludeConfirmed(exclusion_list);
            }
          });
      } else {
        this.manualExcludeConfirmed(exclusion_list);
      }
    }
  }

  manualExcludeConfirmed(exclusion_list: Object[][]) {
    let formRawValue = {
      customer_ids: this.selectedCidList.value,
      header: this.column_headers.map((header) => this.toSnakeCase(header)),
      placements: exclusion_list,
      exclusion_level: this.selectedExclusionLevelFormControl.value,
    };
    this._call_manual_service(JSON.stringify(formRawValue));
  }

  toSnakeCase(header: string): string {
    return header.toLowerCase().replace(/\s+/g, "_");
  }

  //the call to the server
  async _call_manual_service(formRawValue: string) {
    this.loading = true;
    (await this.service.run_manual_excluder(formRawValue)).subscribe({
      next: (response: ReturnPromise) =>
        this._call_manual_service_success(response),
      error: (err) => this._call_service_error(err),
      complete: () => console.log("Completed"),
    });
  }

  _call_manual_service_success(response: ReturnPromise) {
    this._run_exclude_count(true);
    let exclusion_result = Object.entries(response).find(([k, v]) => {
      if (k == "excluded_placements") {
        this.exclude_count = v;
      }
      if (k == "associated_with_list_placements") {
        this.associated_count = v;
      }
    });
    if (this.exclude_count) {
      this.openSnackBar(
        "Successfully excluded " + this.exclude_count + " placement(s)",
        "Dismiss",
        "success-snackbar"
      );
    }
    if (this.associated_count) {
      this.openSnackBar(
        this.associated_count +
          " placement(s) weren't excluded but associated with negative exclusion list",
        "Dismiss",
        "success-snackbar"
      );
    }
    this.loading = false;
  }

  _call_service_error(err: ErrorEvent) {
    this.loading = false;
    this.openSnackBar(
      `Error - ${err.error}`,
      "Dismiss",
      "error-snackbar"
    );
  }

  async save_task() {
    let warning = "";
    if (this.finalGadsFilter == "" && this.selectedSchedule.value != "0") {
      warning =
        "WARNING: Are you sure you want to schedule a task with no Google Ads Filters?\n\nThis can take considerably longer on larger accounts and even run out of memory. It is advised to add filters for best results.\n\n";
    }
    if (this.validate_fields(true)) {
      if (this.task_id != undefined && this.task_id != "") {
        this.dialogService
          .openConfirmDialog(
            warning +
              "Are you sure you want to update the current task with the new settings?\n\nThis will also update your schedule settings"
          )
          .afterClosed()
          .subscribe((res) => {
            if (res) {
              this.loading = true;
              this._finalise_save_task(this.task_id);
            }
          });
      } else {
        this.dialogService
          .openConfirmDialog(
            warning +
              "Are you sure you want to save this task?\n\nThis will also create a schedule if you have selected a schedule setting"
          )
          .afterClosed()
          .subscribe((res) => {
            if (res) {
              this.loading = true;
              this._finalise_save_task(this.task_id);
            }
          });
      }
    }
  }

  async _finalise_save_task(task_id: string) {
    var placement_types = [];
    if (this.data_youtube_video) {
      placement_types.push("YOUTUBE_VIDEO");
    }
    if (this.data_youtube_channel) {
      placement_types.push("YOUTUBE_CHANNEL");
    }
    if (this.data_display) {
      placement_types.push("WEBSITE");
    }
    if (this.data_mobile) {
      placement_types.push("MOBILE_APPLICATION", "MOBILE_APP_CATEGORY");
    }
    let formRawValue = {
      task_id: task_id,
      name: this.gadsForm.controls["taskName"].value,
      customer_ids: this.selectedCidList.value?.join(","),
      exclusion_rule: this.finalGadsFilter,
      output: this.selectedTaskOutput.value,
      from_days_ago: this.gadsForm.controls["fromDaysAgo"].value,
      date_range: this.gadsForm.controls["lookbackDays"].value,
      exclusion_level: this.selectedExclusionLevelFormControl.value,
      schedule: this.selectedSchedule.value,
      placement_types: placement_types.toString(),
    };

    this._call_save_task_service(JSON.stringify(formRawValue));
  }

  async _call_save_task_service(taskFormValue: string) {
    (await this.service.save_task(taskFormValue)).subscribe({
      next: (response: ReturnPromise) => this._call_save_task_success(response),
      error: (err) =>
        this.openSnackBar(
          "Unknown error saving file",
          "Dismiss",
          "error-snackbar"
        ),
      complete: () => (this.loading = false),
    });
  }

  async _call_save_task_success(response: ReturnPromise) {
    let schedule_text = "";
    if (this.gadsForm.controls["schedule"].value) {
      schedule_text =
        " and scheduled to run every " +
        this.gadsForm.controls["schedule"].value +
        " hours";
    }
    const task_name = this.gadsForm.controls["taskName"].value;
    this.openSnackBar(
      "Successfully saved task '" +
        task_name +
        "' (" +
        response +
        ")" +
        schedule_text,
      "Dismiss",
      "success-snackbar"
    );
    this.task_id = "" + response;
    this.task_name = task_name;
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
      if (
        this.table_result[i]["exclude_from_account"] &&
        !this.table_result[i]["excluded_already"] &&
        !this.table_result[i]["allowlist"]
      ) {
        this.exclude_count++;
        if (edit_table) {
          this.table_result[i]["excluded_already"] = true;
          this.exclude_count--;
        }
      }
      if (this.table_result[i]["memory_warning"] != null) {
        this.memory_error = true;
      }
    }
    //this.sort_table("default");
  }

  row_class(
    excluded_already: boolean,
    exclude_from_account: boolean,
    allowlist: boolean
  ) {
    if (allowlist) {
      return "allowlisted";
    }
    if (excluded_already) {
      return "alreadyexcluded";
    } else if (exclude_from_account) {
      return "tobeexcluded";
    } else {
      return "";
    }
  }

  toggleCheckAll(value: boolean) {
    for (let i in this.table_result) {
      this.table_result[i]["exclude_from_account"] = value;
    }
    this._run_exclude_count(false);
  }

  excludeCheckChange(placementName: string, exclude_from_account: boolean) {
    for (let i in this.table_result) {
      if (this.table_result[i]["placement"] == placementName) {
        this.table_result[i]["exclude_from_account"] = !exclude_from_account;
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
    this.from_lookback_error = false;
    this.gads_data_error = false;
    if (full) {
      if (this.gadsForm.controls["taskName"].value.length == 0) {
        this.task_name_error = true;
        error_count++;
      }
    }
    let cus_id = this.selectedCidList.value?.join(",");
    this.gadsForm.controls["gadsCustomerId"].setValue(cus_id);
    if (
      this.finalGadsFilter.endsWith("(") ||
      this.finalGadsFilter.endsWith("AND")
    ) {
      this.gads_filter_error = true;
      error_count++;
    }
    if (
      isNaN(Number(this.gadsForm.controls["lookbackDays"].value)) ||
      this.gadsForm.controls["lookbackDays"].value == "" ||
      Number(this.gadsForm.controls["lookbackDays"].value) > 90
    ) {
      this.lookback_error = true;
      error_count++;
    }
    if (
      isNaN(Number(this.gadsForm.controls["fromDaysAgo"].value)) ||
      this.gadsForm.controls["fromDaysAgo"].value == "" ||
      Number(this.gadsForm.controls["fromDaysAgo"].value) > 90
    ) {
      this.from_lookback_error = true;
      error_count++;
    }
    if (cus_id == "") {
      this.customer_id_error = true;
      error_count++;
    }
    if (
      !this.data_display &&
      !this.data_youtube_video &&
      !this.data_youtube_channel &&
      !this.data_mobile
    ) {
      this.gads_data_error = true;
      error_count++;
    }
    if (!this.validateFinalFilter()) {
      this.filtersOpenState = true;
      this.openSnackBar(
        'Error in some of your filters. Please correct the red highlighted fields.',
        'Dismiss',
        'error-snackbar'
      );
      error_count++;
    }
    if (error_count == 0) {
      return true;
    } else {
      return false;
    }
  }

  gadsAddFilter() {
    this.clearHintsAndErrors("allFilterErrors");
    let selected_field = this.selectedField.value ?? "";
    let operator = this.selectedOperator.value ?? "";
    let field_value = this.selectedValue.value ?? "";

    if (this.validateOperatorAndThenValue()) {
      this.fixFilterSyntax(selected_field, operator, field_value);
      this.addToDropDownIfNew(selected_field);
    }
  }

  private addToDropDownIfNew(selected_field: string) {
    const filterTitle = convertToTitleCase(selected_field.split(":")[1]);
    const newItem = selected_field.toLowerCase().includes("youtube")
      ? `YT ${filterTitle}`
      : filterTitle;

    if (!this.toggle_column_selected_headers.includes(newItem)) {
      this.toggle_column_selected_headers.push(newItem);
    }
  }

  showError(feild: FilterField, msg: string) {
    if (feild == FilterField.Operator) {
      this.filter_operator_error = true;
      this.filter_operator_error_msg = msg;
    } else {
      this.filter_value_error = true;
      this.filter_value_error_msg = msg;
    }
  }

  validateFinalFilter() {
    let result = true;
    const hasConversions = this.containsExactSubstring(
      this.finalGadsFilter,
      "GOOGLE_ADS_INFO:conversions_"
    );
    const hasCostPerConversion = this.finalGadsFilter.includes(
      "cost_per_conversion"
    );
    const hasConversionName = this.finalGadsFilter.includes("conversion_name");
    if ((hasConversions || hasCostPerConversion) && !hasConversionName) {
      result = false;
      this.filter_extra_instructions =
        "If 'conversion split metrics' are specified, please include 'Conversion Name'.";
    } else if (hasConversionName && !(hasConversions || hasCostPerConversion)) {
      result = false;
      this.filter_extra_instructions =
        'If "Conversion Name" is specified, please include ' +
        "related metric (# of selected conversions, CPA for " +
        "selected conversion(s), etc.).";
    }
    return result;
  }

  containsExactSubstring(mainString: string, substring: string): boolean {
    const substringIndex = mainString.indexOf(substring);
    if (substringIndex === -1) {
      return false;
    }
    // Check if the substring is an exact match or part of a larger word
    const isExactMatchBefore =
      substringIndex === 0 || !mainString[substringIndex - 1].match(/\w/);
    const isExactMatchAfter =
      substringIndex + substring.length === mainString.length ||
      !mainString[substringIndex + substring.length].match(/\w/);

    return isExactMatchBefore && isExactMatchAfter;
  }

  validateOperatorAndThenValue() {
    let result = true;
    this.clearHintsAndErrors("allFilterErrors");
    if (!this.validateOperator()) {
      result = false;
    } else if (!this.validateValue()) {
      result = false;
    }
    return result;
  }

  validateOperator() {
    let isValid = true;

    let selected_field = this.selectedField.value ?? "";
    let operator = this.selectedOperator.value ?? "";

    if (this.metricsByTypeDict[MetricType.Number].has(selected_field)) {
      if (!this.numericOperators.has(operator)) {
        this.showError(
          FilterField.Operator,
          "Not compatible with the selected field"
        );
        isValid = false;
      }
    } else if (this.metricsByTypeDict[MetricType.String].has(selected_field)) {
      if (
        !(
          this.stringOperators.has(operator) || this.boolOperators.has(operator)
        )
      ) {
        this.showError(
          FilterField.Operator,
          "Not compatible with the selected field"
        );
        isValid = false;
      } else if (this.boolOperators.has(operator)) {
        this.filter_extra_instructions = "Please enter True/False as a value";
      }
    }
    return isValid;
  }

  validateValue() {
    let isValid = true;

    let selected_field = this.selectedField.value ?? "";
    let operator = this.selectedOperator.value ?? "";
    let field_value = this.selectedValue.value ?? "";

    if (this.metricsByTypeDict[MetricType.Number].has(selected_field)) {
      if (isNaN(Number(field_value))) {
        this.showError(FilterField.Value, "Should be numeric");
        isValid = false;
      }
    } else if (this.boolOperators.has(operator)) {
      const lowerCaseValue = field_value.toLowerCase();
      if (!(lowerCaseValue === "true" || lowerCaseValue === "false")) {
        this.showError(FilterField.Value, "Should be True/False");
        isValid = false;
      }
    } else if (this.metricsByTypeDict[MetricType.String].has(selected_field)) {
      if (Number(field_value)) {
        this.showError(FilterField.Value, "Please type in not just digits");
        isValid = false;
      }
    }
    return isValid;
  }

  clearHintsAndErrors(controlName: string) {
    switch (controlName) {
      case "allFilterErrors": {
        this.filter_extra_instructions = "";
        this.filter_operator_error_msg = "";
        this.filter_operator_error = false;
        this.filter_value_error_msg = "";
        this.filter_value_error = false;
        break;
      }
      case "selectedOperator": {
        this.filter_operator_error_msg = "";
        this.filter_operator_error = false;
        break;
      }
      case "selectedValue": {
        this.filter_value_error_msg = "";
        this.filter_value_error = false;
        break;
      }
    }
  }

  private fixFilterSyntax(
    selected_field: string,
    operator: string,
    field_value: string
  ) {
    if (
      selected_field != "" &&
      operator != "" &&
      field_value != "" &&
      this.conditionEnabled
    ) {
      let finalValue = field_value;
      if (!this.finalGadsFilter.endsWith("(") && this.finalGadsFilter != "") {
        this.finalGadsFilter += " ";
      }
      this.finalGadsFilter +=
        selected_field + " " + operator + " " + finalValue;
      if (
        this.finalGadsFilter.includes(") OR (") &&
        !this.finalGadsFilter.endsWith(")")
      ) {
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
      } else {
        if (this.finalGadsFilter.endsWith(")")) {
          this.finalGadsFilter = this.finalGadsFilter.slice(
            0,
            this.finalGadsFilter.length - 1
          );
        }
        this.finalGadsFilter += " AND";
      }
      this.conditionEnabled = true;
      this.orAndEnabled = false;
    }
  }

  clearFilter() {
    this.dialogService
      .openConfirmDialog(
        "Are you sure you want to clear your current Google Ads filters?"
      )
      .afterClosed()
      .subscribe((res) => {
        if (res) {
          this.conditionEnabled = true;
          this.orAndEnabled = false;
          this.finalGadsFilter = "";
          this.gads_filter_error = false;
          this.toggle_column_selected_headers =
            this.toggle_column_selected_headers_by_default;
        }
      });
  }

  pagination_next() {
    if (
      this.pagination_start + this.pagination_rpp <
      this.table_result.length
    ) {
      this.pagination_start += this.pagination_rpp;
    }
  }
  pagination_prev() {
    if (this.pagination_start - this.pagination_rpp >= 0) {
      this.pagination_start -= this.pagination_rpp;
    }
  }

  paginationChange() {
    this.pagination_rpp = Number(
      this.paginationForm.controls["paginationValue"].value
    );
    this.pagination_start = 0;
  }

  onToggleChange(toggleName: string, groupName: string): void {
    const fieldGroupToAdd = this.allMetricArray.find(
      (group) => group.name === groupName
    );
    if (!fieldGroupToAdd) {
      return;
    }
    fieldGroupToAdd.disabled = !this.gadsForm.controls[toggleName].value;
  }

  onExclusionLevelChange(exclusionLevel: string) {
    const exclusion_level = exclusionLevel.toLowerCase();
    this.allMetricArray.forEach((group) => {
      group.fields.forEach((field) => {
        switch (exclusion_level) {
          case "account":
            if (
              field.view.toLowerCase().includes("campaign") ||
              field.view.toLowerCase().includes("adgroup")
            ) {
              field.hidden = true;
            }
            break;
          case "campaign":
            if (field.view.toLowerCase().includes("campaign")) {
              field.hidden = false;
            }
            if (field.view.toLowerCase().includes("adgroup")) {
              field.hidden = true;
            }
            break;
          case "ad group":
          default:
            field.hidden = false;
            break;
        }
      });
    });
  }

  scheduleChange() {
    if (this.selectedSchedule.value == "0") {
      this.save_button = "Save Task";
      this.email_alerts_hidden = true;
      this.taskOutput = ["EXCLUDE_AND_NOTIFY", "Both"];
    } else {
      this.save_button = "Save and Schedule Task";
      this.email_alerts_hidden = false;
    }
  }

  duplicateTask() {
    this.task_id = "";
    this.gadsForm.controls["taskName"].setValue("");
  }

  switch_cid() {
    this.manual_cid = !this.manual_cid;
    if (this.manual_cid) {
      this.cid_choice = "Pick from List";
    } else {
      this.cid_choice = "Enter manually";
    }
  }

  unlockFilter() {
    this.gads_filter_lock = !this.gads_filter_lock;
  }

  downloadCSV() {
    let data = this.table_result;
    const header = Object.keys(data[0]);
    let csv = data.map((row) =>
      header.map((fieldName) => JSON.stringify(row[fieldName])).join(",")
    );
    csv.unshift(header.join(","));
    let csvArray = csv.join("\r\n");

    var blob = new Blob([csvArray], {
      type: "text/csv",
    });
    saveAs(blob, "cpr_export.csv");
  }

  async addToAllowlist(
    placementType: string,
    placementName: string,
    accountId: string
  ) {
    this.loading = true;
    let placement_id = {
      type: placementType,
      name: placementName,
      account_id: accountId,
    };
    (
      await this.service.add_to_allowlist(JSON.stringify(placement_id))
    ).subscribe({
      next: (response: ReturnPromise) => (this.loading = false),
      error: (err) =>
        this.openSnackBar(
          "Unknown error adding to allowlist",
          "Dismiss",
          "error-snackbar"
        ),
      complete: () => (this.loading = false),
    });

    for (let i in this.table_result) {
      if (this.table_result[i]["placement"] == placementName) {
        this.table_result[i]["allowlist"] = true;
        this.table_result[i]["excluded_already"] = false;
      }
    }
    this._run_exclude_count(false);
  }

  async removeFromAllowlist(
    placementType: string,
    placementName: string,
    accountId: string
  ) {
    let placement_id = {
      type: placementType,
      name: placementName,
      account_id: accountId,
    };
    (
      await this.service.remove_from_allowlist(JSON.stringify(placement_id))
    ).subscribe({
      next: (response: ReturnPromise) => (this.loading = false),
      error: (err) =>
        this.openSnackBar(
          "Unknown error removing from allowlist",
          "Dismiss",
          "error-snackbar"
        ),
      complete: () => (this.loading = false),
    });

    for (let i in this.table_result) {
      if (this.table_result[i]["placement"] == placementName) {
        this.table_result[i]["allowlist"] = false;
      }
    }
    this._run_exclude_count(false);
  }

  unsorted(a: any, b: any): number {
    return 0;
  }
  formatNumber(val: any, pct: boolean = false): any {
    if (typeof val === "number") {
      if (Math.floor(val) == val) {
        return val;
      } else {
        if (pct) {
          return Math.round(val * 100 * 10) / 10 + "%";
        } else {
          return Math.round(val * 10) / 10;
        }
        return;
      }
    } else {
      return val;
    }
  }
  togglePanel() {
    this.filtersOpenState = !this.filtersOpenState;
  }
}

function convertToTitleCase(input: string): string {
  let result = input.replace(/_/g, " ");
  // Add space before a middle capital letter if there isn't already
  result = result.replace(/([a-z])([A-Z])/g, "$1 $2");
  // Capitalize first letter of each word
  result = result.toLowerCase().replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
  result = result.replace(/\b(yt)\s/gi, "YT ");
  return renameCpvHeaders(result);
}

function renameCpvHeaders(input: string): string {
  const regex = /\b(cpv|cpm|cpc|ctr)\b/gi;
  return input.toLowerCase().trim() === 'name'
    ? 'Identifier'
    : input.replace(regex, (_, capturedMatch) => capturedMatch.toUpperCase());
}
