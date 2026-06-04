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
deploy_head="$(git rev-parse HEAD)"
remote_head="$(git rev-parse origin/main)"
if [[ "${deploy_head}" != "${remote_head}" ]]; then
  echo "ERROR: HEAD (${deploy_head}) != origin/main (${remote_head}) after pull."
  exit 1
fi
echo "==> Deploying commit ${deploy_head}"

verify_native_build_prereqs() {
  local missing=0
  for cmd in python3 make g++; do
    if ! command -v "${cmd}" >/dev/null 2>&1; then
      echo "  MISSING: ${cmd}"
      missing=1
    fi
  done
  if [[ "${missing}" -ne 0 ]]; then
    echo "==> Attempting passwordless install of build-essential (bootstrap sudoers)"
    if sudo -n true 2>/dev/null; then
      if sudo -n apt-get update -qq && sudo -n DEBIAN_FRONTEND=noninteractive apt-get install -y -qq build-essential python3; then
        echo "==> build-essential installed"
        missing=0
      fi
    fi
  fi
  if [[ "${missing}" -ne 0 ]]; then
    echo ""
    echo "ERROR: better-sqlite3 needs native compile tools on the VM."
    echo "  Run once: bash scripts/bootstrap-production-host.sh"
    echo "  Or: sudo apt-get update && sudo apt-get install -y build-essential python3"
    exit 1
  fi
  local free_kb
  free_kb="$(df -Pk . | awk 'NR==2 {print $4}')"
  if [[ "${free_kb}" -lt 512000 ]]; then
    echo "WARNING: less than 500 MB free disk in ${APP_ROOT} — npm ci may fail."
  fi
}

run_npm_ci() {
  # NODE_ENV=production in .env makes npm ci omit devDependencies on older npm.
  unset NODE_ENV
  # Single-job compile avoids sqlite3.o.d.raw races on small VMs.
  export MAKEFLAGS=-j1
  export npm_config_jobs=1
  npm ci
}

echo "==> npm ci (install devDependencies — tsx/vite needed for migrate, build, server)"
verify_native_build_prereqs
if ! run_npm_ci; then
  echo "==> npm ci failed — removing node_modules and retrying once"
  rm -rf node_modules
  run_npm_ci
fi

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

built_js="$(grep -o 'assets/index-[^"]*\.js' dist/index.html | head -1 || true)"
if [[ -z "${built_js}" ]]; then
  echo "ERROR: dist/index.html missing built JS asset reference."
  exit 1
fi
echo "==> Built SPA entry: ${built_js}"

export NODE_ENV="${PRODUCTION_NODE_ENV}"

if grep -q '^DEPLOY_COMMIT=' .env 2>/dev/null; then
  sed -i "s/^DEPLOY_COMMIT=.*/DEPLOY_COMMIT=${deploy_head}/" .env
else
  echo "DEPLOY_COMMIT=${deploy_head}" >> .env
fi

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

expected_verify="${EXPECTED_COMMIT:-${deploy_head}}"
echo "==> Verify deploy (commit ${expected_verify})"
sleep 2
bash scripts/verify-production-deploy.sh "${expected_verify}"

echo "DEPLOY_OK commit=${expected_verify} asset=$(grep -o 'assets/index-[^"]*\.js' dist/index.html | head -1)"
echo "==> Deploy finished at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
