SCRIPT_PATH=$(readlink -f "$0" | xargs dirname)
if [ -f $SCRIPT_PATH/.env ]; then
  source $SCRIPT_PATH/.env
fi
source $SCRIPT_PATH/assert.sh

run_preview() {
  http --print h POST localhost:5000/api/placements/preview \
  	exclusion_rule="$1" \
  	placement_types='MOBILE_APPLICATION,WEBSITE,YOUTUBE_CHANNEL' \
  	from_days_ago=2 \
  	date_range=2 \
  	exclude_and_notify='NOTIFY' \
  	customer_ids=$CPR_TEST_ACCOUNT
}

declare -a rules=(
  ''
  'impressions > 0'
  'clicks > 0'
  'clicks > 0,impressions > 0'
  'conversions > 0'
  'avg_cpc > 0.01' # returns nothing
  'clicks > 0,YOUTUBE_CHANNEL_INFO:title contains a'
  'clicks > 0,YOUTUBE_CHANNEL_INFO:videoCount > 1'
  'clicks > 0,WEBSITE_INFO:title contains a'
  'clicks > 0 OR impressions > 0' # not working correctly
  'cost > 0.001'
  'ctr > 0.1'
  'ad_group_name contains elad'
  'cost_per_conversion = 0'
  'cost_per_all_conversion = 0'
  'all_conversion_rate = 0'
  'conversions_from_interactions_rate = 0'
  'video_views = 0'
  'campaign_type = VIDEO'

)

for rule in "${rules[@]}"; do
  actual=`run_preview "$rule" | head -n 1 | wc -l`
  assert $actual 1 "$rule"
done
