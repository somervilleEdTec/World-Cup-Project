#!/usr/bin/env bash
# LIVE SITE ONLY — completely wipe SQLite/Postgres app data on the production host.
# Run manually on the VM or via .github/workflows/wipe-live-database.yml (workflow_dispatch).
set -euo pipefail

cd "$(dirname "$0")/.."
APP_ROOT="$(pwd)"

current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
if [[ "${current_branch}" != "main" ]]; then
  echo "ERROR: wipe-live-database.sh refuses to run on branch '${current_branch}' (main only)."
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Missing .env in ${APP_ROOT}"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

export NODE_ENV="${NODE_ENV:-production}"
SQLITE_PATH="${SQLITE_PATH:-data.db}"

unit_exists() {
  local state
  state="$(systemctl show -p LoadState --value "$1.service" 2>/dev/null || true)"
  [[ -n "${state}" && "${state}" != "not-found" ]]
}

api_unit="${SYSTEMD_API_SERVICE:-worldcup}"
jobs_unit="${SYSTEMD_JOBS_SERVICE:-worldcup-jobs}"

echo "==> Stopping app processes (release DB locks)"
if command -v systemctl >/dev/null 2>&1; then
  if unit_exists "${api_unit}"; then
    sudo systemctl stop "${api_unit}" || true
  fi
  if unit_exists "${jobs_unit}"; then
    sudo systemctl stop "${jobs_unit}" || true
  fi
else
  pkill -f "tsx src/server" 2>/dev/null || true
  sleep 2
fi

echo "==> Retrieval-only prediction archive (never used by app — manual recovery only)"
if ! npm run db:archive; then
  echo ""
  echo "ERROR: prediction archive failed — wipe aborted to protect stored predictions."
  echo "Alternative solutions:"
  echo "  1. Free disk space and retry."
  echo "  2. Copy backups/ manually before proceeding."
  echo "  3. Do not wipe — deploy code-only updates instead."
  exit 1
fi

echo "==> Purging database (users, predictions, sessions, results, kickoffs)"
CONFIRM_DESTROY_PREDICTIONS=yes npm run db:purge:live

echo "==> Ensuring bootstrap organiser admin (excluded from league table)"
npm run db:ensure-admin

echo "==> Verifying empty database"
if command -v sqlite3 >/dev/null 2>&1 && [[ -f "${SQLITE_PATH}" ]]; then
  for table in users predictions sessions results; do
    count="$(sqlite3 "${SQLITE_PATH}" "SELECT COUNT(*) FROM ${table};" 2>/dev/null || echo "missing")"
    echo "  ${table}: ${count}"
    if [[ "${count}" != "0" && "${count}" != "missing" ]]; then
      echo "ERROR: expected 0 rows in ${table}, got ${count}"
      exit 1
    fi
  done
else
  echo "  (sqlite3 or ${SQLITE_PATH} not found — purge completed; verify manually)"
fi

echo "==> Starting app processes"
if command -v systemctl >/dev/null 2>&1; then
  if unit_exists "${jobs_unit}"; then
    sudo systemctl start "${jobs_unit}"
  fi
  if unit_exists "${api_unit}"; then
    sudo systemctl start "${api_unit}"
  fi
else
  echo "    Restart manually: npm run jobs &  &&  npm run server"
fi

echo "==> Live database wipe finished at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "    Organiser admin was recreated (see ADMIN_USERNAME in .env). Add players via Admin → Players."
echo "    Launch rules: docs/LAUNCH_RULES.md"
