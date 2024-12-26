SCRIPT_PATH=$(readlink -f "$0" | xargs dirname)
if [ -f $SCRIPT_PATH/.env ]; then
  source $SCRIPT_PATH/.env
fi

get_tasks() {
  http --print b localhost:5000/api/tasks
}

create_task() {
  http --print b POST localhost:5000/api/tasks \
  	exclusion_rule='impressions > 1' \
  	customer_ids=$CPR_TEST_ACCOUNT \
  	from_days_ago=1 \
  	date_range=1 \
		exclusion_level='ACCOUNT' \
  	placement_types='MOBILE_APPLICATION,WEBSITE,YOUTUBE_CHANNEL' \
  	output='NOTIFY' \
  	name='test_task'
}

update_task() {
  http --print b POST localhost:5000/api/tasks/$task_id \
  	exclusion_rule='impressions > 1' \
  	customer_ids=$CPR_TEST_ACCOUNT \
  	from_days_ago=1 \
  	date_range=1 \
		exclusion_level='ACCOUNT' \
  	placement_types='MOBILE_APPLICATION,WEBSITE,YOUTUBE_CHANNEL' \
  	output='NOTIFY' \
  	name='new_test_task'
}

get_task() {
  http --print b localhost:5000/api/tasks/$task_id
}

run_task() {
  http --print b POST localhost:5000/api/tasks/$task_id:run \
		type="MANUAL"

}


get_task_executions() {
  http --print b localhost:5000/api/tasks/$task_id/executions
}

delete_task() {
  http --print b DELETE localhost:5000/api/tasks/$task_id
}

get_tasks
_task_id=`create_task`
task_id=`echo $_task_id | sed 's/"//g'`
sleep 1
get_task
update_task
get_task
run_task
get_task_executions
get_tasks
delete_task
