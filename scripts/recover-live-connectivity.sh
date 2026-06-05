#!/usr/bin/env bash
# Lightweight recovery when public health fails but Node may still be up.
# Used by monitor-live-site.sh before a full restart-production-services.sh.
set -euo pipefail

cd "$(dirname "$0")/.."

PUBLIC="${PUBLIC_URL:-https://worldcup.dosums.uk}"
PORT="${PORT:-8787}"

public_ok() {
  local body http_code
  body="$(curl -sf --max-time 15 "${PUBLIC}/api/health" 2>/dev/null || true)"
  [[ -n "${body}" ]] && printf '%s' "${body}" | grep -q '"ok":true'
}

local_ok() {
  curl -sf --max-time 10 "http://127.0.0.1:${PORT}/api/health" 2>/dev/null | grep -q '"ok":true'
}

echo "==> recover-live-connectivity.sh"

if public_ok; then
  echo "OK: public health already good — nothing to do"
  exit 0
fi

if local_ok; then
  echo "Local Node OK; restarting Cloudflare Tunnel"
  bash scripts/ensure-production-cloudflared.sh
  sleep 8
  if public_ok; then
    echo "OK: public health restored after cloudflared restart"
    exit 0
  fi
  echo "Public still down after tunnel restart — escalating to full service restart"
fi

bash scripts/restart-production-services.sh

sleep 8
if public_ok; then
  echo "OK: public health restored after full service restart"
  exit 0
fi

echo "ERROR: public health still failing after recovery"
exit 1
