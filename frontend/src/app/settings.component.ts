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

 import { ANALYZE_FOR_ENTRY_COMPONENTS, Component, OnInit } from '@angular/core';
 import { FormBuilder, FormGroup } from '@angular/forms';
 import { PostService, ReturnPromise } from './services/post.service';
 import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';

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
   hideAuth = true;
   mcc_list: any[] = [];
   dev_token_error = false;

   horizontalPosition: MatSnackBarHorizontalPosition = 'center';
   verticalPosition: MatSnackBarVerticalPosition = 'top';

   constructor(private snackbar: MatSnackBar, private fb: FormBuilder, private service: PostService) {
     this.settingsForm = this.fb.group({
       clientFile: [''],
       gadsDevToken: [''],
       gadsMccId: [''],
       emailAddress: [''],
       saveToDB: ['']
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


   validate_fields() {
    let error_count = 0;
    this.dev_token_error = false;
    if (this.settingsForm.controls['gadsDevToken'].value.length > 30) {
      this.dev_token_error = true;
      error_count++;
    }
     if (error_count == 0) { return true; }
    else {
      this.openSnackBar("Error in some of your fields. Please review and correct them", "Dismiss", "error-snackbar");
      return false;
    }
  }


  _parse_config(response: ReturnPromise) {
     let config = (Object.entries(response).find(([k, v]) => {
       if(k=='dev_token') {
         this.settingsForm.controls['gadsDevToken'].setValue(v);
         this.populate_mcc_ids();
       }
       if(k=='mcc_id') {
         this.settingsForm.controls['gadsMccId'].setValue(v);
       }
       if(k=='email_address') {
         this.settingsForm.controls['emailAddress'].setValue(v);
       }
     }));
   }

   async populate_mcc_ids()
   {
    this.subs = (await ((this.service.get_mcc_list())))
       .subscribe({
         next: (response: ReturnPromise) => this._populate_mcc_list(response),
         error: (err: any) => this.file_status="Unknown error!",
         complete: () => this.loading=false
       });
   }

   _populate_mcc_list(response: ReturnPromise)
   {
    this.mcc_list = Object.entries(response);
    this.mcc_list.sort((a, b) => (a.account_name.toLowerCase() > b.account_name.toLowerCase()) ? 1 : -1);
    this.loading=false;
   }

   async save_settings() {
     if (!this.validate_fields()) return;
     this.loading=true
     let mcc_id = this.settingsForm.controls['gadsMccId'].value;
     mcc_id = (mcc_id.replace(new RegExp('-', 'g'), '')).trim();
     this.settingsForm.controls['gadsMccId'].setValue(mcc_id);

     let dev_tok = this.settingsForm.controls['gadsDevToken'].value;
     dev_tok = dev_tok.trim();
     this.settingsForm.controls['gadsDevToken'].setValue(dev_tok);

     let formRawValue = {
       'dev_token': dev_tok,
       'mcc_id': mcc_id,
       'email_address': this.settingsForm.controls['emailAddress'].value,
       'save_to_db': this.settingsForm.controls['saveToDB'].value
     };

     this.subs = (await ((this.service.set_config(JSON.stringify(formRawValue)))))
       .subscribe({
         next: (response: ReturnPromise) => this._redirect(response),
         error: (err: any) => this.openSnackBar("Error updating settings", "Dismiss", "error-snackbar"),
         complete: () => this.loading=false
       });
   }

   async reauth() {
    this.loading=true
    this.subs = (await ((this.service.set_reauth())))
    .subscribe({
      next: (response: ReturnPromise) => this._redirect(response),
      error: (err: any) => this.openSnackBar("Error updating settings", "Dismiss", "error-snackbar"),
      complete: () => this.loading=false
    });
   }

   _redirect(response: ReturnPromise) {
    let url = response.toString();
    if(url.includes("http"))
    {
      this.hideAuth=false;
      window.open(url,'_blank');
    }
    else {
      this.openSnackBar("Config Saved!", "Dismiss", "success-snackbar");
      if(this.mcc_list.length == 0) {
        this.populate_mcc_ids();
      }
    }
   }

   async finish_auth() {
     var code=prompt("Please enter your authentication code","Authentication Code");
     this.loading=true;
     if(code!=null) {
       let codeRawValue = {
         'code': code,
         'dev_token': this.settingsForm.controls['gadsDevToken'].value,
         'mcc_id': '',
         'email_address': this.settingsForm.controls['emailAddress'].value
       }
       this.subs = (await ((this.service.finalise_auth(JSON.stringify(codeRawValue)))))
       .subscribe({
         next: (response: ReturnPromise) => this._auth_complete(response),
         error: (err: any) => this.openSnackBar("Error updating settings"+JSON.stringify(err), "Dismiss", "error-snackbar"),
         complete: () => this.loading=false
       });
       this.hideAuth = true;
     }
   }

   _auth_complete(response: ReturnPromise) {
      let resp = response.toString();
      if(resp=="error") {
        this.openSnackBar("Error creating credentials. Try running the process again and check you have not copied any additional spaces when pasting the code", "Dismiss", "error-snackbar")
      }
      else {
        this.openSnackBar("Auth Completed!", "Dismiss", "success-snackbar");
        this.populate_mcc_ids();
      }
   }

   async upload_file(event: any) {
     this.loading=true
     const file:File = event.target.files[0];
     // TODO: Are we sure we need this?
     // TODO: Fixed; add validation of a different type
     if (file && file.name.endsWith(".json")) {
         let fileContents = "";
         let fileReader = new FileReader();
         fileReader.onload = (e) => {
           fileContents = fileReader.result!.toString();
           this.complete_upload(fileContents);
         }
         fileReader.readAsText(file);

     }
     else {
       this.openSnackBar("File must be named 'client_secret_xxxxxxx.json' and be a valid client secret file", "Dismiss", "error-snackbar")
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

