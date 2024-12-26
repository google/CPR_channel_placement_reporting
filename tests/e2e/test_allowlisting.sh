SCRIPT_PATH=$(readlink -f "$0" | xargs dirname)
if [ -f $SCRIPT_PATH/.env ]; then
  source $SCRIPT_PATH/.env
fi
add_to_allowlisting() {
  http --print b POST localhost:5000/api/placements/allowlist \
  	type='WEBSITE' \
  	name='example.com' \
  	account_id=$CPR_TEST_ACCOUNT
}

get_allowlisting() {
  http --print b localhost:5000/api/placements/allowlist
}

remove_from_allowlisting() {
  http --print b DELETE localhost:5000/api/placements/allowlist \
  	type='WEBSITE' \
  	name='example.com' \
  	account_id=$CPR_TEST_ACCOUNT
}

add_to_allowlisting
get_allowlisting
remove_from_allowlisting
