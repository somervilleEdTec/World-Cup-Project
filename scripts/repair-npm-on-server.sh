#!/usr/bin/env bash
# Recovery on production VM when npm ci / better-sqlite3 fails (corrupt node_modules).
# Run on the server: bash scripts/repair-npm-on-server.sh
set -euo pipefail

cd "$(dirname "$0")/.."
APP_ROOT="$(pwd)"

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

echo "==> Deep clean npm artifacts"
rm -rf node_modules
rm -rf "${HOME}/.cache/node-gyp" 2>/dev/null || true
npm cache clean --force

echo "==> npm ci (MAKEFLAGS=-j1)"
unset NODE_ENV
export MAKEFLAGS=-j1
export npm_config_jobs=1
npm ci

if [[ ! -f node_modules/better-sqlite3/src/better_sqlite3.cpp ]]; then
  echo "ERROR: better-sqlite3 package incomplete after npm ci (missing src/better_sqlite3.cpp)"
  exit 1
fi

if [[ ! -f node_modules/better-sqlite3/build/Release/better_sqlite3.node ]]; then
  echo "WARNING: better_sqlite3.node not found — running npm rebuild better-sqlite3"
  npm rebuild better-sqlite3
fi

echo "==> Verify toolchain can see devDependencies"
npx --no-install tsc --version
npx --no-install tsx --version

echo "==> repair-npm-on-server.sh finished OK — run: npm run migrate && npm run build"
