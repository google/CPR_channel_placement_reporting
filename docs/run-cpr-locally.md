# How to run Channel Placement Excluder locally

## Prerequisites

## Install

### Run in containers

1. Build frontend

```
./gcp/install.sh build_frontend
```

2. Start containers

```
docker compose up -d
```

It will create 3 services:

* `cpr_backend` - main application to perform exclusions and save tasks
* `cpr_scheduler` - execute tasks based on the schedule
* `cpr_db` - database to store

Open [http://localhost:5000](http://localhost:5000) and start using Channel Placement Excluder.

### Run locally

