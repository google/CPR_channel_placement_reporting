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

gcp_install:
	@${SHELL} gcp/install.sh

gcp_update:
	@${SHELL} gcp/update.sh

gcp_install_full: | regenerate_hashes gcp_install
gcp_update_full: | regenerate_hashes gcp_update
