#!/bin/bash
# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


SCRIPT_PATH=$(readlink -f "$0" | xargs dirname)
COLOR='\033[0;36m' # Cyan
RED='\033[0;31m' # Red Color
NC='\033[0m' # No Color

SETTING_FILE="./settings.ini"
PROJECT_ID=$(gcloud config get-value project 2> /dev/null)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID | grep projectNumber | sed "s/.* '//;s/'//g")
PROJECT_ALIAS=$(git config -f $SETTING_FILE config.name)
CF_REGION=$(git config -f $SETTING_FILE functions.region)
USER_EMAIL=$(gcloud config get-value account 2> /dev/null)
SERVICE_ACCOUNT=$PROJECT_ID@appspot.gserviceaccount.com

check_billing_enabled() {
	BILLING_ENABLED=$(gcloud beta billing projects describe $PROJECT_ID --format="csv(billingEnabled)" | tail -n 1)
	if [[ "$BILLING_ENABLED" = 'False' ]]
	then
			echo -e "${RED}The project $PROJECT_ID does not have a billing enabled. Please activate billing${NC}"
				exit
	fi
}

deploy_cloud_functions() {
	echo -e "${COLOR}Deploying cloud functions...${NC}"
	_deploy_cf "create_update_task_schedule" "${PROJECT_ALIAS}_task_created"
	_deploy_cf "delete_task_schedule" "${PROJECT_ALIAS}_task_deleted"
}

_deploy_cf() {
	CF_NAME=$1
	TOPIC=$2
	gcloud functions deploy "${PROJECT_ALIAS}_${CF_NAME}" \
		--trigger-topic=$TOPIC \
		--entry-point=handle_event \
		--runtime=python311 \
		--timeout=540s \
		--region=$CF_REGION \
		--quiet \
		--gen2 \
		--source=./cloud_functions/$CF_NAME
	echo -e "${COLOR}\tCloud function $CF_NAME is deployed.${NC}"
}

create_topics() {
	echo -e "${COLOR}Creating PubSub topics...${NC}"
	for topic in "task_created" "task_deleted"; do
		_create_topic "${PROJECT_ALIAS}_${topic}"
	done
}

_create_topic() {
	TOPIC=$1
	TOPIC_EXISTS=$(gcloud pubsub topics list --filter="name=projects/'$PROJECT_ID'/topics/'$TOPIC'" --format="get(name)")
	if [[ ! -n $TOPIC_EXISTS ]]; then
		gcloud pubsub topics create $TOPIC
		echo -e "${COLOR}\tTopic $TOPIC is created.${NC}"
	fi
}

enable_api() {
	echo -e "${COLOR}Enabling APIs...${NC}"
	gcloud services enable appengine.googleapis.com
	gcloud services enable iap.googleapis.com
	gcloud services enable cloudresourcemanager.googleapis.com
	gcloud services enable iamcredentials.googleapis.com
	gcloud services enable cloudbuild.googleapis.com
	gcloud services enable firestore.googleapis.com
	gcloud services enable googleads.googleapis.com
	gcloud services enable youtube.googleapis.com
	gcloud services enable cloudscheduler.googleapis.com
}

deploy_app() {
	echo -e "${COLOR}Deploying app to GAE...${NC}"
	gcloud app deploy $SCRIPT_PATH/../backend/app.yaml -q
}

build_frontend() {
	echo -e "${COLOR}Building app...${NC}"
	cd ../frontend
	NODE_VER=18
	if [[ "$CLOUD_SHELL" == "true" ]]; then
			sudo su -c '. /usr/local/nvm/nvm.sh && nvm install $NODE_VER --lts'
				. /usr/local/nvm/nvm.sh && nvm use $NODE_VER
	fi
	export NG_CLI_ANALYTICS=ci
	npm install --no-audit
	npm run build
	cd ..
	cd backend/static
	mkdir img
	cd ..
	cp img/gtechlogo.png static/img/gtechlogo.png
}

create_datastore() {
	DB_NAME=channel-placement-excluder
	DB_EXISTS=$(gcloud firestore databases list --filter="name=projects/'$PROJECT_ID'/databases/'$DB_NAME'" --format="get(name)")
	if [[ ! -n $DB_EXISTS ]]; then
		echo -e "\n${COLOR}Creating Datastore...${NC}"
		gcloud firestore databases create \
			--database=$DB_NAME \
			--location=eur3 \
			--type=datastore-mode
	else
		echo -e "\n${COLOR}Datastore exists.${NC}"
	fi
}

update_permissions() {
	# Grant GAE service account with the Service Account Token Creator role so it could create GCS signed urls
	gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:$SERVICE_ACCOUNT --role=roles/iam.serviceAccountTokenCreator
	gcloud projects add-iam-policy-binding $PROJECT_ID \
		--member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
		--role="roles/cloudscheduler.jobRunner"
	gcloud projects add-iam-policy-binding $PROJECT_ID \
		--member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
		--role="roles/editor"
}

create_oauth_for_iap() {
	# create OAuth client for IAP
	echo -e "${COLOR}Creating OAuth client for IAP...${NC}"
	gcloud iap oauth-clients create projects/$PROJECT_NUMBER/brands/$PROJECT_NUMBER \
	--display_name=iap \
	--format=json
	# --format=json 2> /dev/null |\
	# 	python3 -c "import sys, json; res=json.load(sys.stdin); i = res['name'].rfind('/'); print(res['name'][i+1:]); print(res['secret'])" \
	# 		> .oauth
		# Now in .oauth file we have two line, first client id, second is client secret
	lines=()
	while IFS= read -r line; do lines+=("$line"); done < .oauth
	IAP_CLIENT_ID=${lines[0]}
	IAP_CLIENT_SECRET=${lines[1]}
	TOKEN=$(gcloud auth print-access-token)
	echo -e "${COLOR}Enabling IAP for App Engine...${NC}"
	curl -X PATCH -H "Content-Type: application/json" \
		-H "Authorization: Bearer $TOKEN" \
		--data "{\"iap\": {\"enabled\": true, \"oauth2ClientId\": \"$IAP_CLIENT_ID\", \"oauth2ClientSecret\": \"$IAP_CLIENT_SECRET\"} }" \
		"https://appengine.googleapis.com/v1/apps/$PROJECT_ID?alt=json&update_mask=iap"
	echo -e "${COLOR}Granting user $USER_EMAIL access to the app through IAP...${NC}"
	gcloud iap web add-iam-policy-binding --resource-type=app-engine --member="user:$USER_EMAIL" --role='roles/iap.httpsResourceAccessor'
}

print_welcome_message() {
	echo -e "\n${COLOR}Done! Please verify the install at https://$PROJECT_ID.ew.r.appspot.com${NC}"

}


deploy_all() {
	check_billing_enabled
	enable_api
	build_frontend
	deploy_app
	create_topics
	deploy_cloud_functions
	create_datastore
	create_oauth_for_iap
	update_permissions
	print_welcome_message
}


_list_functions() {
	# list all functions in this file not starting with "_"
	declare -F | awk '{print $3}' | grep -v "^_"
}


if [[ $# -eq 0 ]]; then
	_list_functions
else
	for i in "$@"; do
		if declare -F "$i" > /dev/null; then
			"$i"
			exitcode=$?
			if [ $exitcode -ne 0 ]; then
				echo "Breaking script as command '$i' failed"
				exit $exitcode
			fi
		else
			echo -e "\033[0;31mFunction '$i' does not exist.\033[0m"
		fi
	done
fi
