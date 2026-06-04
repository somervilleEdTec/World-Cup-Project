#!/usr/bin/env bash
# Ensure passwordless sudo for deploy scripts (idempotent).
set -euo pipefail

cd "$(dirname "$0")/.."
TARGET="/etc/sudoers.d/worldcup-deploy"
SOURCE="deploy/sudoers/worldcup-deploy"

if [[ ! -f "${SOURCE}" ]]; then
  echo "ERROR: missing ${SOURCE}"
  exit 1
fi

if sudo -n true 2>/dev/null; then
  sudo cp "${SOURCE}" "${TARGET}"
  sudo chmod 440 "${TARGET}"
  echo "OK: installed ${TARGET}"
else
  echo "WARNING: passwordless sudo not available — run: bash scripts/bootstrap-production-host.sh"
  exit 1
fi
