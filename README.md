


# CPR - Channel Placement Reporting

An Ads script solution which finds channel placements of some creteria.
Later an apps-script fetches metadata about these placements from YT API, then calls Google Ads API via REST to exclude channels at the account level. 


Clients want to easily detect YT placement channels which they care about. For example: low performance with high cost.
The tool reports all placements according to the client filters and shows some YT stats about each placement.
Helps the clients to make logical action regarding these channels.

</br>

# Project owners
- rsela@google.com
- tal@google.com
- dvirka@google.com
- Dev: 
- xingj@google.com
- eladb@google.com

</br>




## Disclaimer

**This is not an officially supported Google product.**
Copyright 2021 Google LLC. This solution, including any related sample code or data, is made available on an “as is,” “as available,” and “with all faults” basis, solely for illustrative purposes, and without warranty or representation of any kind. This solution is experimental, unsupported and provided solely for your convenience. Your use of it is subject to your agreements with Google, as applicable, and may constitute a beta feature as defined under those agreements.  To the extent that you make any data available to Google in connection with your use of the solution, you represent and warrant that you have all necessary and appropriate rights, consents and permissions to permit Google to use and process that data.  By using any portion of this solution, you acknowledge, assume and accept all risks, known and unknown, associated with its usage, including with respect to your deployment of any portion of this solution in your systems, or usage in connection with your business, if at all.


</br>

* [User Guide](https://docs.google.com/document/d/1NJWg1qfvxRiELdXGURPBgYUyPwdk26Nuxnxjf4k1EkY/edit?usp=sharing)

</br>



## Create a containing document
Create a copy of the spreadsheet [spreadsheet](https://docs.google.com/spreadsheets/d/1LOIr41kw7oSCRTLanWK6rb5cguHFWzns4pIP3ix32EE/copy)



## Secure the Ads API Dev Token
You'll need a Dev token for calling the Ads API. Follow the directions [here](https://developers.google.com/google-ads/api/docs/first-call/dev-token).
Create a Cloud Project
If you already have a GCP console for Ads API, you can use it.  Otherwise, create a new one following the directions [at](https://developers.google.com/google-ads/api/docs/first-call/oauth-cloud-project).

</br>
</br>


Once you have a project, enable the OAuth consent screen:

[spreadsheet](src/2022-05-16_23-53.png)


Enable Google Ads API:

[spreadsheet](src/2022-05-16_23-54.png)

Associate the Cloud Project with the Google Apps Script Project
Open the Apps Script editor:


[spreadsheet](src/2022-05-16_23-54_1.png)


Scroll down to Script Properties and set dev token by entering “dev_token” for Property and then pasting the value and click Save script properties: 

[spreadsheet](src/2022-05-16_23-55.png)

Set up spreadsheet
Duplicate the template tab and rename it to your 10 digit child account ID (no dashes). 
In the menu bar, click Activate script > Activate script:

[spreadsheet](src/2022-05-16_23-57.png)


We are aware of the fact that the script might notify the same placements day after day until their activity won't be included within the look back window- this is something we will try to address soon. Meanwhile you may adjust the lookback window and frequency so it won't spam too much (e.g 3 days & daily frequency) . 
 
Spreadsheet-code
Responsible for adding metadata to channels and automatically excluding them.
Note: Do not make changes (adding/deleting rows) to the output table when the script is running, as this may cause data output into the incorrect rows.
Fill it with a placement-id list in the dedicated column (by running the GAds script above). 


[spreadsheet](src/2022-05-16_23-56_2.png)

[spreadsheet](src/2022-05-16_23-56_1.png)



</br>


## License
Apache Version 2.0
See [LICENSE](LICENSE)
