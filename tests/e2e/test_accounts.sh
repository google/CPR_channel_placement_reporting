SCRIPT_PATH=$(readlink -f "$0" | xargs dirname)
if [ -f $SCRIPT_PATH/.env ]; then
  source $SCRIPT_PATH/.env
fi

get_mcc() {
  http --print b localhost:5000/api/accounts/mcc
}

update_mcc() {
  http --print b POST localhost:5000/api/accounts/mcc
}

get_customer_ids() {
  http --print b localhost:5000/api/accounts/customers
}
update_customer_ids() {
  http --print b POST localhost:5000/api/accounts/customers
}

get_mcc
get_customer_ids
update_mcc
update_customer_ids
get_mcc
get_customer_ids
