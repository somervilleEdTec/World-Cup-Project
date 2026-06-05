#!/usr/bin/env bash
# On-VM monitor: detect public outage and auto-recover without user input.
# Installed via worldcup-monitor.timer (see scripts/ensure-monitor-timer.sh).
set -euo pipefail

cd "$(dirname "$0")/.."

PUBLIC="${PUBLIC_URL:-https://worldcup.dosums.uk}"
PORT="${PORT:-8787}"
STATE_DIR="${MONITOR_STATE_DIR:-/var/lib/worldcup-monitor}"
if ! mkdir -p "${STATE_DIR}" 2>/dev/null; then
  STATE_DIR="/tmp/worldcup-monitor-${USER:-ubuntu}"
  mkdir -p "${STATE_DIR}"
fi
FAILURES_FILE="${STATE_DIR}/consecutive-failures"
COOLDOWN_FILE="${STATE_DIR}/recovery-cooldown-until"
LOCK_FILE="${STATE_DIR}/recovery.lock"

CONSECUTIVE_FAILURES="${MONITOR_FAILURES_BEFORE_RECOVERY:-2}"
COOLDOWN_SEC="${MONITOR_RECOVERY_COOLDOWN_SEC:-900}"
LOG_TAG="worldcup-monitor"

public_ok() {
  local body
  body="$(curl -sf --max-time 15 "${PUBLIC}/api/health" 2>/dev/null || true)"
  [[ -n "${body}" ]] && printf '%s' "${body}" | grep -q '"ok":true'
}

local_ok() {
  curl -sf --max-time 10 "http://127.0.0.1:${PORT}/api/health" 2>/dev/null | grep -q '"ok":true'
}

tunnel_ok() {
  if systemctl list-unit-files cloudflared.service --no-legend 2>/dev/null | grep -q cloudflared.service; then
    [[ "$(systemctl is-active cloudflared.service 2>/dev/null || echo unknown)" == "active" ]]
    return
  fi
  command -v cloudflared >/dev/null 2>&1 && pgrep -x cloudflared >/dev/null 2>&1
}

read_failures() {
  cat "${FAILURES_FILE}" 2>/dev/null || echo 0
}

write_failures() {
  echo "$1" > "${FAILURES_FILE}"
}

in_cooldown() {
  [[ -f "${COOLDOWN_FILE}" ]] || return 1
  local until now
  until="$(cat "${COOLDOWN_FILE}")"
  now="$(date +%s)"
  [[ "${now}" -lt "${until}" ]]
}

set_cooldown() {
  echo "$(( $(date +%s) + COOLDOWN_SEC ))" > "${COOLDOWN_FILE}"
}

if public_ok; then
  write_failures 0
  rm -f "${COOLDOWN_FILE}" 2>/dev/null || true
  exit 0
fi

failures=$(( $(read_failures) + 1 ))
write_failures "${failures}"

echo "${LOG_TAG}: public health FAIL (${failures}/${CONSECUTIVE_FAILURES}) url=${PUBLIC}/api/health"
local_state="down"
tunnel_state="down"
if local_ok; then local_state="up"; fi
if tunnel_ok; then tunnel_state="up"; fi
echo "${LOG_TAG}: local_node=${local_state} cloudflared=${tunnel_state}"

if [[ "${failures}" -lt "${CONSECUTIVE_FAILURES}" ]]; then
  echo "${LOG_TAG}: waiting for ${CONSECUTIVE_FAILURES} consecutive failures before recovery"
  exit 0
fi

if in_cooldown; then
  echo "${LOG_TAG}: recovery cooldown active — skip (next attempt after $(date -d "@$(cat "${COOLDOWN_FILE}")" -u +%H:%M:%SZ 2>/dev/null || cat "${COOLDOWN_FILE}"))"
  exit 0
fi

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "${LOG_TAG}: recovery already running"
  exit 0
fi

echo "${LOG_TAG}: starting automated recovery"
set_cooldown

if bash scripts/recover-live-connectivity.sh; then
  write_failures 0
  rm -f "${COOLDOWN_FILE}" 2>/dev/null || true
  echo "${LOG_TAG}: recovery succeeded"
  exit 0
fi

echo "${LOG_TAG}: recovery failed — will retry after cooldown (${COOLDOWN_SEC}s)"
exit 1
