#!/usr/bin/env bash
# LIVE SITE ONLY — run on the production host from the `main` branch.
# Never run from `Debug`. GitHub Actions calls this only after push to `main`.
set -euo pipefail

cd "$(dirname "$0")/.."
APP_ROOT="$(pwd)"

DEPLOY_LOCK="/tmp/worldcup-deploy.lock"
exec 200>"${DEPLOY_LOCK}"
if ! flock -w 600 200; then
  echo "ERROR: another deploy is already running (lock ${DEPLOY_LOCK})."
  exit 1
fi

timer_was_active=0
if command -v systemctl >/dev/null 2>&1 && systemctl is-active worldcup-deploy.timer >/dev/null 2>&1; then
  timer_was_active=1
  sudo -n systemctl stop worldcup-deploy.timer 2>/dev/null || true
fi
cleanup_deploy() {
  if [[ "${timer_was_active}" -eq 1 ]]; then
    sudo -n systemctl start worldcup-deploy.timer 2>/dev/null || true
  fi
}
trap cleanup_deploy EXIT

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
      if sudo -n apt-get update -qq && sudo -n apt-get install -y -qq build-essential python3; then
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
  if npm ci; then
    return 0
  fi
  echo "==> npm ci failed — retry with --ignore-scripts + rebuild better-sqlite3"
  rm -rf node_modules/better-sqlite3/build 2>/dev/null || true
  npm ci --ignore-scripts
  npm rebuild better-sqlite3
  npm run postinstall
}

lock_hash="$(sha256sum package-lock.json | awk '{print $1}')"
skip_ci=0
if [[ -f node_modules/tsx/dist/cli.mjs \
  && -f node_modules/better-sqlite3/build/Release/better_sqlite3.node \
  && -f node_modules/xtend/mutable.js \
  && -f .deploy-deps-hash \
  && "$(cat .deploy-deps-hash)" == "${lock_hash}" ]] \
  && npm ls xtend pg better-sqlite3 --depth=0 >/dev/null 2>&1; then
  echo "==> npm ci skipped (package-lock.json unchanged, deps integrity OK)"
  skip_ci=1
fi

if [[ "${skip_ci}" -eq 0 ]]; then
  echo "==> npm ci (install devDependencies — tsx/vite needed for migrate, build, server)"
  verify_native_build_prereqs
  if run_npm_ci; then
    echo "${lock_hash}" > .deploy-deps-hash
  else
    echo "==> npm ci still failed — deep clean and final retry"
    rm -rf node_modules
    rm -rf "${HOME}/.cache/node-gyp" 2>/dev/null || true
    npm cache clean --force
    if ! run_npm_ci; then
      echo "ERROR: npm ci failed after clean retry."
      echo "  On the VM run: bash scripts/repair-npm-on-server.sh"
      echo "  Ensure: sudo apt-get install -y build-essential python3 && df -h ."
      exit 1
    fi
    echo "${lock_hash}" > .deploy-deps-hash
  fi
fi

if [[ ! -f node_modules/better-sqlite3/src/better_sqlite3.cpp ]]; then
  echo "ERROR: better-sqlite3 install incomplete (missing src). Run scripts/repair-npm-on-server.sh"
  exit 1
fi

if [[ ! -f node_modules/tsx/dist/cli.mjs ]]; then
  echo "ERROR: tsx missing after npm ci (devDependencies). Run: unset NODE_ENV && npm ci"
  exit 1
fi
if ! /usr/bin/node node_modules/tsx/dist/cli.mjs --version >/dev/null 2>&1; then
  echo "ERROR: node cannot execute tsx — check npm ci completed on this host."
  exit 1
fi
echo "OK: tsx runtime ready"

if [[ -f "${SQLITE_PATH:-data.db}" ]] || [[ -n "${DATABASE_URL:-}" ]]; then
  echo "==> retrieval-only prediction archive + operational backup (before migrate)"
  if ! npm run db:backup; then
    echo ""
    echo "ERROR: database backup/archive failed — deploy aborted to protect stored predictions."
    echo "Alternative solutions:"
    echo "  1. Free disk space on the VM and re-run deploy."
    echo "  2. Run manually on VM: npm run db:archive && npm run db:backup"
    echo "  3. Fix permissions on prediction-archive-retrieval-only/ and backups/"
    exit 1
  fi
else
  echo "==> skip database backup (no database file yet)"
fi

echo "==> migrate (blocked automatically if migration would destroy predictions)"
if ! npm run migrate; then
  echo ""
  echo "ERROR: migrate failed or was blocked — deploy aborted to protect stored predictions."
  echo "See docs/DATA_PROTECTION.md for alternative solutions."
  exit 1
fi

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

echo "==> systemd + port 8787 (install units, kill stray processes, start services)"
if command -v systemctl >/dev/null 2>&1; then
  if sudo -n true 2>/dev/null; then
    bash scripts/ensure-deploy-sudoers.sh
    bash scripts/ensure-poll-deploy-timer.sh
    echo "==> Live site monitor + auto-recovery timer"
    bash scripts/ensure-monitor-timer.sh
    bash scripts/restart-production-services.sh
  else
    echo "ERROR: deploy needs passwordless sudo for systemctl/cp/kill."
    echo "  Run once on VM: bash scripts/bootstrap-production-host.sh"
    exit 1
  fi
else
  echo "WARNING: no systemctl — start server manually"
fi

expected_verify="${EXPECTED_COMMIT:-${deploy_head}}"
echo "==> Verify deploy (commit ${expected_verify})"
bash scripts/verify-production-deploy.sh "${expected_verify}"

echo "DEPLOY_OK commit=${expected_verify} asset=$(grep -o 'assets/index-[^"]*\.js' dist/index.html | head -1)"
echo "==> Deploy finished at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
