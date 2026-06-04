#!/usr/bin/env bash
# LIVE SITE ONLY — run on the production host from the `main` branch.
# Never run from `Debug`. GitHub Actions calls this only after push to `main`.
set -euo pipefail

cd "$(dirname "$0")/.."
APP_ROOT="$(pwd)"

current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
if [[ "${current_branch}" != "main" ]]; then
  echo "ERROR: deploy-production.sh refuses to run on branch '${current_branch}'."
  echo "       Live deploys use main only. Merge Debug → main, then deploy."
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Missing .env in ${APP_ROOT} — copy .env.example and set FOOTBALL_DATA_TOKEN, VITE_API_BASE_URL."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -z "${FOOTBALL_DATA_TOKEN:-}" ]]; then
  echo "FOOTBALL_DATA_TOKEN is required in .env for live results."
  exit 1
fi

export PORT="${PORT:-8787}"
# Set after npm ci/build — sourcing .env may set NODE_ENV=production, which makes npm skip devDependencies.
PRODUCTION_NODE_ENV="${NODE_ENV:-production}"

echo "==> Deploy World Cup Boys @ ${APP_ROOT}"
echo "==> Git: $(git rev-parse --short HEAD) on $(git branch --show-current)"

git fetch origin main
git checkout main
git pull --ff-only origin main

echo "==> npm ci (install devDependencies — tsx/vite needed for migrate, build, server)"
# NODE_ENV=production in .env makes npm ci omit devDependencies on older npm (--include=dev may not apply).
(
  unset NODE_ENV
  npm ci
)

if [[ -f "${SQLITE_PATH:-data.db}" ]] || [[ -n "${DATABASE_URL:-}" ]]; then
  echo "==> database backup (before migrate)"
  npm run db:backup || echo "WARNING: backup failed — continuing deploy"
else
  echo "==> skip database backup (no database file yet)"
fi

echo "==> migrate"
npm run migrate

echo "==> build"
if [[ -z "${VITE_API_BASE_URL:-}" ]]; then
  echo "WARNING: VITE_API_BASE_URL not set in .env — frontend may call wrong API origin."
  (
    unset NODE_ENV
    npm run build
  )
else
  echo "VITE_API_BASE_URL=${VITE_API_BASE_URL}"
  (
    unset NODE_ENV
    npm run build
  )
fi

export NODE_ENV="${PRODUCTION_NODE_ENV}"

unit_exists() {
  local state
  state="$(systemctl show -p LoadState --value "$1.service" 2>/dev/null || true)"
  [[ -n "${state}" && "${state}" != "not-found" ]]
}

restart_systemd() {
  local api_unit="${SYSTEMD_API_SERVICE:-worldcup}"
  local jobs_unit="${SYSTEMD_JOBS_SERVICE:-worldcup-jobs}"
  if ! command -v systemctl >/dev/null 2>&1; then
    return 1
  fi
  local restarted=0
  if unit_exists "${jobs_unit}"; then
    echo "==> restart ${jobs_unit}"
    sudo systemctl restart "${jobs_unit}"
    restarted=1
  fi
  if unit_exists "${api_unit}"; then
    echo "==> restart ${api_unit}"
    sudo systemctl restart "${api_unit}"
    restarted=1
  fi
  [[ "${restarted}" -eq 1 ]]
}

if restart_systemd; then
  echo "==> systemd services restarted"
else
  echo "==> No systemd units found (worldcup / worldcup-jobs)."
  echo "    Install units from deploy/systemd/ or restart manually:"
  echo "    npm run jobs &  &&  npm run server"
fi

echo "==> health check"
sleep 2
curl -sf "http://127.0.0.1:${PORT}/api/health" | head -c 200
echo ""
echo "==> Deploy finished at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
