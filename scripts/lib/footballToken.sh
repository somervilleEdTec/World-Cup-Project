# Resolve football-data.org token — FOOTBALL_DATA_TOKEN preferred, FOOTBALL_API_KEY as alias.
resolve_football_data_token() {
  if [[ -z "${FOOTBALL_DATA_TOKEN:-}" && -n "${FOOTBALL_API_KEY:-}" ]]; then
    export FOOTBALL_DATA_TOKEN="$FOOTBALL_API_KEY"
  fi
}

require_football_data_token() {
  resolve_football_data_token
  if [[ -z "${FOOTBALL_DATA_TOKEN:-}" ]]; then
    echo "FOOTBALL_DATA_TOKEN or FOOTBALL_API_KEY is required for live results from football-data.org."
    return 1
  fi
}
