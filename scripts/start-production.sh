#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Missing .env — copy .env.example and set FOOTBALL_DATA_TOKEN."
  exit 1
fi

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
