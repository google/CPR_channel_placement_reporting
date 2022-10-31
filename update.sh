#!/bin/bash
#
# Copyright 2022 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# This is the main installation script for Product DSA in GCP environment.
# It installs a GAE Web App (using install-web.sh) and
# grant the GAE service account additional roles required for executing setup.
# Setup itself is executed from within the application (or via setup.sh).
COLOR='\033[0;36m' # Cyan
RED='\033[0;31m' # Red Color
NC='\033[0m' # No Color

PROJECT_ID=$(gcloud config get-value project 2> /dev/null)

git stash --include-untracked
git pull

# check the billing
BILLING_ENABLED=$(gcloud beta billing projects describe $PROJECT_ID --format="csv(billingEnabled)" | tail -n 1)
if [[ "$BILLING_ENABLED" = 'False' ]]
then
  echo -e "${RED}The project $PROJECT_ID does not have a billing enabled. Please activate billing${NC}"
  exit
fi

echo -e "${COLOR}Building app...${NC}"
cd frontend
NODE_VER=18
if [[ "$CLOUD_SHELL" == "true" ]]; then
  sudo su -c '. /usr/local/nvm/nvm.sh && nvm install $NODE_VER --lts'
  . /usr/local/nvm/nvm.sh && nvm use $NODE_VER
fi
export NG_CLI_ANALYTICS=ci
npm install --no-audit
npm install file-saver --save
npm install @types/file-saver --save-dev
npm run build
cd ..

cd backend/static
mkdir template
cd ..
cp template/authdone.html static/template/authdone.html

echo -e "${COLOR}Updating app on GAE...${NC}"
gcloud app deploy -q
cd ..


echo -e "\n${COLOR}App updated. URL is https://$PROJECT_ID.ew.r.appspot.com${NC}"