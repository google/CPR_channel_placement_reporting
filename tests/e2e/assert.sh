RED='\033[0;31m'
COLOR='\033[0;36m' # Cyan
NC='\033[0m' # No color

success() {
  local name=${1:""}
  echo -e "${COLOR}Pass: $name${NC}"
}
failure() {
  local name=${1:""}
  echo -e "${RED}Failed: $name${NC}"
}
assert() {
  local left="$1"
  local right="$2"
  local name="${3:""}"
  if [ "$left" == "$right" ]; then
    success "$name"
    return 0
  else
    failure "$name"
    return 1
  fi
}
