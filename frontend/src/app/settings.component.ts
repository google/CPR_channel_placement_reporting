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
import { PostService, ReturnPromise } from './services/post.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { TitleStrategy } from '@angular/router';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  loading: boolean = false;
  settingsForm: FormGroup;
  file_status="";
  subs: any;

  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  constructor(private snackbar: MatSnackBar, private fb: FormBuilder, private service: PostService) { 
    this.settingsForm = this.fb.group({
      clientFile: [''],
      gadsDevToken: [''],
      gadsMccId: [''],
      emailAddress: ['']
    });
  }

  ngOnInit(): void {
  }

  async ngAfterViewInit() {
    this.loading=true
    this.subs = (await ((this.service.get_config())))
      .subscribe({
        next: (response: ReturnPromise) => this._parse_config(response),
        error: (err: any) => this.file_status="Unknown error!",
        complete: () => this.loading=false
      });
  }

  _parse_config(response: ReturnPromise) {
    
    let config=Object.values(response)
    if(config[0]!="x") {
      this.settingsForm.controls['gadsDevToken'].setValue(config[0]);
      this.settingsForm.controls['gadsMccId'].setValue(config[1]);
      this.settingsForm.controls['emailAddress'].setValue(config[2]);
    }
  }

  async save_settings() {
    this.loading=true
    let formRawValue = {
      'dev_token': this.settingsForm.controls['gadsDevToken'].value,
      'mcc_id': this.settingsForm.controls['gadsMccId'].value,
      'email_address': this.settingsForm.controls['emailAddress'].value
    };

    this.subs = (await ((this.service.set_config(JSON.stringify(formRawValue)))))
      .subscribe({
        next: (response: ReturnPromise) => this.openSnackBar("Settins saved!", "Dismiss", "success-snackbar"),
        error: (err: any) => this.openSnackBar("Error updating settings", "Dismiss", "error-snackbar"),
        complete: () => this.loading=false
      });  
  }

  async upload_file(event: any) {
    this.loading=true
    const file:File = event.target.files[0];
    if (file && file.name=="client_secret.json") {
        let fileContents = "";
        let fileReader = new FileReader();
        fileReader.onload = (e) => {
          fileContents = fileReader.result!.toString();
          this.complete_upload(fileContents);
        }
        fileReader.readAsText(file);
        
    }
    else {
      this.openSnackBar("File must be named 'client_secret.json' and be a valid client secret file", "Dismiss", "error-snackbar")
      this.loading=false
    }
  }

  async complete_upload(fileContents: string) {
    this.subs = (await (((this.service.file_upload(fileContents)))))
          .subscribe({
            next: (response: ReturnPromise) => this.openSnackBar("File successfully uploaded and saved!", "Dismiss", "success-snackbar"),
            error: (err: any) => this.openSnackBar("Error uploading file. Make sure it is a .json file and try again", "Dismiss", "error-snackbar"),
            complete: () => this.loading=false
      });
  }

  openSnackBar(message: string, button: string, type: string) {
    this.snackbar.open(message, button, {
      duration: 10000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
      panelClass: [type]
    });
  }

}
