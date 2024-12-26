SCRIPT_PATH=$(readlink -f "$0" | xargs dirname)
if [ -f $SCRIPT_PATH/.env ]; then
  source $SCRIPT_PATH/.env
fi

get_config() {
  http --print b localhost:5000/api/configs
}

update_config() {
  http --print b POST localhost:5000/api/configs \
    email_address='a@example.com'
}
get_config
update_config
get_config
