# CPR - Channel Placement Excluder

## Problem statement

There are a number of “spam/bot” and poor performing channels on YouTube, causing customers to spends large amounts of money on YouTube video campaigns on channels that do not drive results.

Clients need a solution that can quickly and automatically keep on top of poor performing channels or potential “spam/bot” channels and exclude them from their entire account on a regular basis.

## Solution

A Google Cloud based solution for excluding YouTube channels at an account level, based on a set of criteria defined by the client. A client can select a set of filters within their Google Ads data (such as low conversions, high CPMs or no traffic etc.) and then apply a set of YouTube filters against channel statistic (such as subscriber count, video views, language etc.) and exclude specific channels that do not meet the performance requirements.

The tool will display all the merged data, exclusions available and can be scheduled to automatically run the process on a regular basis to keep up with any new channels or campaigns that fall outside of the required performance.


## Deliverable (implementation)

Web application that can be used for performing ad-hoc placement exclusions as well as scheduling tasks.

## Deployment

### Prerequisites

1. [A Google Ads Developer token](https://developers.google.com/google-ads/api/docs/first-call/dev-token#:~:text=A%20developer%20token%20from%20Google,SETTINGS%20%3E%20SETUP%20%3E%20API%20Center.)

1. A GCP project with billing account attached
1. Credentials for Google Ads API access - `google-ads.yaml`.
   See details here - https://github.com/google/ads-api-report-fetcher/blob/main/docs/how-to-authenticate-ads-api.md \
   Normally you need OAuth2 credentials (Client ID, Client Secret), a Google Ads developer token and a refresh token.
1. API Key to access YouTube Data API -  more at [Setting up API keys](https://support.google.com/googleapi/answer/6158862?hl=en).
1. Access to repository configured. In order to clone this repository you need
	to do the following:

	*   Visit https://professional-services.googlesource.com/new-password and
			login with your account. Once authenticated please copy all lines in box
			and paste them in the terminal.

### Installation

The primary installation method deploys CPR into Google Cloud.
The procedure automates deploying all required components to the Cloud.

> For local deployment please refer to [local deployment guide](docs/run-cpr-locally.md).
1. First you need to clone the repo in Cloud Shell:

```
git clone https://professional-services.googlesource.com/solutions/cpr_placement_excluder
```

1. Go to the repo folder: `cd cpr_placement_excluder/`

> To try latest version of Channel Placement Excluder switch to `v2` branch (`git checkout --track origin/v2`)

1. Optionally put your `google-ads.yaml` there or be ready to provide all Ads API credentials

1. Optionally adjust settings in `gcp/settings.ini`

1. Export YouTube API key - `export YOUTUBE_DATA_API_KEY=<YOUR_API_KEY>`

1. Run installation:

```
./gcp/install.sh
```

> You can update the existing installation by running `./gcp/update.sh`

### Usage

After Google cloud installation is completed, you'll be presented with a URL when Channel Placement Exclusion is running.

Alternatively you can open `default` services in [Appengine Services](https://corp.google.com/appengine/services) to access the application.

## Disclaimer
This is not an officially supported Google product.
