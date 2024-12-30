SHELL=/bin/bash
PYTHON=`which python`
.PHONY: build_dev

up:
	docker-compose up --build --no-deps

up_dev:
	docker-compose -f docker-compose-dev.yml up --build --no-deps

build:
	docker-compose up --build --no-deps

build_dev:
	docker-compose -f docker-compose-dev.yml up --build --no-deps

regenerate_hashes:
	@${PYTHON} `which pip-compile` --generate-hashes -r backend/requirements.in

compile:
	@uv pip compile backend/requirements.in --universal --output-file backend/requirements.txt

gcp_install:
	CPR_DEV_INSTALL=0 ${SHELL} gcp/install.sh deploy_app

gcp_install_dev:
	CPR_DEV_INSTALL=1 ${SHELL} gcp/install.sh deploy_app

gcp_update:
	@export CPR_DEV_INSTALL=0 && ${SHELL} gcp/update.sh

gcp_update_dev:
	@export CPR_DEV_INSTALL=1 && ${SHELL} gcp/update.sh

gcp_install_full: | regenerate_hashes gcp_install
gcp_update_full: | regenerate_hashes gcp_update
