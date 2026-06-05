#!/usr/bin/env bash
# Recovery on production VM when npm ci / better-sqlite3 fails (corrupt node_modules).
# Run on the server: bash scripts/repair-npm-on-server.sh
set -euo pipefail

cd "$(dirname "$0")/.."
APP_ROOT="$(pwd)"

timer_was_active=0
if command -v systemctl >/dev/null 2>&1 && systemctl is-active worldcup-deploy.timer >/dev/null 2>&1; then
  echo "==> Stopping worldcup-deploy.timer during repair"
  timer_was_active=1
  sudo systemctl stop worldcup-deploy.timer
fi

echo "==> Repair npm native modules @ ${APP_ROOT}"

for cmd in python3 make g++ git; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "ERROR: missing ${cmd}. Run: sudo apt-get install -y build-essential python3 git"
    exit 1
  fi
done

echo "==> Disk space"
df -h "${APP_ROOT}" | tail -1
df -i "${APP_ROOT}" | tail -1

unset NODE_ENV
export MAKEFLAGS=-j1
export npm_config_jobs=1

sqlite_node="node_modules/better-sqlite3/build/Release/better_sqlite3.node"

node_modules_healthy() {
  [[ -f "${sqlite_node}" ]] \
    && [[ -f node_modules/tsx/dist/cli.mjs ]] \
    && [[ -f node_modules/xtend/mutable.js ]] \
    && npm ls xtend pg better-sqlite3 --depth=0 >/dev/null 2>&1
}

if [[ "${FORCE_NPM_REPAIR:-}" != "1" ]] && node_modules_healthy; then
  echo "==> node_modules integrity OK — skip reinstall"
else
  if [[ -f "${sqlite_node}" && "${FORCE_NPM_REPAIR:-}" != "1" ]]; then
    echo "==> Native modules present but dependency tree incomplete — reinstalling packages (keeping rebuild minimal)"
  else
    echo "==> Deep clean npm artifacts"
    rm -rf node_modules
    rm -rf "${HOME}/.cache/node-gyp" 2>/dev/null || true
    npm cache clean --force
  fi

  echo "==> npm ci --ignore-scripts"
  npm ci --ignore-scripts

  echo "==> npm rebuild better-sqlite3"
  npm rebuild better-sqlite3

  echo "==> postinstall (flag assets)"
  npm run postinstall
fi

if [[ ! -f node_modules/better-sqlite3/src/better_sqlite3.cpp ]]; then
  echo "ERROR: better-sqlite3 package incomplete (missing src/better_sqlite3.cpp)"
  exit 1
fi

if [[ ! -f "${sqlite_node}" ]]; then
  echo "ERROR: ${sqlite_node} missing after rebuild"
  exit 1
fi
echo "OK: ${sqlite_node}"

if ! node_modules_healthy; then
  echo "ERROR: node_modules still incomplete after repair (try: FORCE_NPM_REPAIR=1 bash scripts/repair-npm-on-server.sh)"
  exit 1
fi

echo "==> Verify toolchain can see devDependencies"
/usr/bin/node node_modules/tsx/dist/cli.mjs --version
npx --no-install tsc --version

lock_hash="$(sha256sum package-lock.json | awk '{print $1}')"
echo "${lock_hash}" > .deploy-deps-hash

if [[ "${timer_was_active}" -eq 1 ]]; then
  sudo systemctl start worldcup-deploy.timer 2>/dev/null || true
fi

echo "==> repair-npm-on-server.sh finished OK — run: npm run migrate && npm run build && bash scripts/deploy-production.sh"
