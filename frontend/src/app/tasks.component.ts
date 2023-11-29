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
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import cronstrue from 'cronstrue';
import { DialogService } from './services/dialog.service';
import { PostService, ReturnPromise } from './services/post.service';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit {

  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  loading: boolean = false;
  task_table_data: any[] = [];
  no_data:boolean=false;

  paginationForm: FormGroup;
  pagination_start = 0;
  pagination_rpp = 10;

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

  constructor(private snackbar: MatSnackBar, private fb: FormBuilder, private service: PostService, private dialogService: DialogService) {

    this.paginationForm = this.fb.group({
      paginationValue: ['']
    });

    this.paginationForm.controls['paginationValue'].setValue(this.pagination_rpp);
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.updateTable();
  }

  async updateTable() {
    this.loading=true;
    (await this.service.get_tasks_list())
      .subscribe({
        next: (response: ReturnPromise) => this._fill_table_success(response),
        error: (err) => this._fill_table_error(),
        complete: () => console.log("Completed")
      });
  }

  async _fill_table_success(response: ReturnPromise) {
    this.task_table_data=Object.values(response).filter((task) => task.status.replace("TaskStatus.", "") == "ACTIVE");
    if(this.task_table_data.length > 0) {
      this.no_data=false;
    }
    else{
      this.no_data=true;
    }
    this.loading = false;
  }

  async _fill_table_error() {
    this.loading = false;
    this.openSnackBar("Not able to retrieve list of tasks. Make sure you have provided the details in Settings and Authenticated with Google Ads", "Dismiss", "error-snackbar");
  }


  async runNow(file_name:string, task_name:string){
    this.dialogService.openConfirmDialog(`Are you sure you want to run the task '`+task_name+`' (`+file_name+`) now?

    This will add any exclusions to your account and be an addition run to any upcoming schedules`)
        .afterClosed().subscribe(res => {
          if(res) {
            this._continue_run_task(file_name);
          }
        });
  }

  async _continue_run_task(task_id:string) {
    this.loading = true;
    let task_id_json = { 'id': task_id };
    (await this.service.run_task_from_task_id(JSON.stringify(task_id_json)))
      .subscribe({
        next: (response: ReturnPromise) => this._run_task_from_file_success(response),
        error: (err) => this._run_task_from_file_error(),
        complete: () => console.log("Completed")
      });
  }

  async _run_task_from_file_success(response: ReturnPromise) {
    this.loading = false;
    if(Number(response) > 0) {
      this.openSnackBar("Successfully excluded " + response + " placement(s)", "Dismiss", "success-snackbar");
    } else {
      this.openSnackBar("No placements were excluded", "Dismiss", "success-snackbar");
    }
  }

  async _run_task_from_file_error() {
    this.loading = false;
    this.openSnackBar("Permission error: Check you have Authenticated in settings and that you have the correct permissions to the account and your Customer ID/MCC IDs are correct. If you have just changed your permissions in Google Ads, go back to Settings and click 'Save / Reauthenticate' to update permissions and try again", "Dismiss", "error-snackbar");
  }


  async deleteNow(task_id:string, task_name:string){
    this.dialogService.openConfirmDialog(`Are you sure you want to delete '`+task_name+`' (`+task_id+`)?

    This will also delete any schedules for this task`)
        .afterClosed().subscribe(res => {
          if(res) {
            this._continue_task_delete(task_id);
          }
        });
  }

  async _continue_task_delete(task_id:string) {
    this.loading = true;
    let task_id_json = { 'task_id': task_id };
    (await this.service.delete_task(JSON.stringify(task_id_json)))
      .subscribe({
        next: (response: ReturnPromise) => this._delete_task_success(response),
        error: (err) => this._delete_task_error(),
        complete: () => console.log("Completed")
      });
  }

  async _delete_task_success(response: ReturnPromise) {
    this.loading = false;
    this.openSnackBar("'"+response+"' task was successfully deleted!", "Dismiss", "success-snackbar");
    this.updateTable();
  }

  async _delete_task_error() {
    this.loading = false;
    this.openSnackBar("Unknown error deleting task", "Dismiss", "error-snackbar");
  }

  openSnackBar(message: string, button: string, type: string) {
    this.snackbar.open(message, button, {
      duration: 10000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
      panelClass: [type]
    });
  }

  pagination_next() {
    if (this.pagination_start + this.pagination_rpp < this.task_table_data.length) {
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

  getScheduleValue(index:string) {
    for(let sch of this.scheduleArray) {
      if(sch[0]==index) {
        return sch[1];
      }
    }
    return cronstrue.toString(index);
  }
  localizeDate(date:string) {
    return date.split(" ")[0]
  }
}
