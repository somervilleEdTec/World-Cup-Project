#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Missing .env — copy .env.example and set FOOTBALL_DATA_TOKEN."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -z "${FOOTBALL_DATA_TOKEN:-}" ]]; then
  echo "FOOTBALL_DATA_TOKEN is required for production (live results from football-data.org)."
  exit 1
fi

export NODE_ENV="${NODE_ENV:-production}"

npm install
npm run migrate
npm run build

echo "Starting jobs scheduler in background..."
npm run jobs &
JOBS_PID=$!

cleanup() {
  kill "$JOBS_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting API + frontend on :8787 (jobs pid=$JOBS_PID)"
npm run server
