#!/usr/bin/env bash
# Run on the production VM after deploy-production.sh (or from CI via SSH).
# Exits non-zero if the running app does not match the expected git commit.
set -euo pipefail

cd "$(dirname "$0")/.."
APP_ROOT="$(pwd)"

EXPECTED="${1:-}"
PORT="${PORT:-8787}"
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  PORT="${PORT:-8787}"
fi

if [[ -z "${EXPECTED}" ]]; then
  EXPECTED="$(git rev-parse HEAD 2>/dev/null || true)"
fi
if [[ -z "${EXPECTED}" ]]; then
  echo "ERROR: verify-production-deploy.sh requires expected commit SHA as argument or git HEAD."
  exit 1
fi

echo "==> Verify production deploy @ ${APP_ROOT}"
echo "==> Expected commit: ${EXPECTED}"

failures=0
note_fail() {
  echo "VERIFY_FAIL: $*"
  failures=$((failures + 1))
}

# --- built SPA on disk ---
if [[ ! -f dist/index.html ]]; then
  note_fail "dist/index.html missing — npm run build did not complete"
else
  built_js="$(grep -o 'assets/index-[^"]*\.js' dist/index.html | head -1 || true)"
  if [[ -z "${built_js}" ]]; then
    note_fail "dist/index.html has no assets/index-*.js reference"
  else
    echo "OK: dist references ${built_js}"
    if [[ ! -f "dist/${built_js}" ]]; then
      note_fail "dist/${built_js} file missing on disk"
    fi
  fi
fi

# --- local API health (systemd must be running) ---
health_json=""
if ! health_json="$(curl -sf --max-time 10 "http://127.0.0.1:${PORT}/api/health" 2>/dev/null)"; then
  note_fail "curl http://127.0.0.1:${PORT}/api/health failed — is worldcup.service running?"
else
  echo "OK: local health ${health_json}"
  if ! printf '%s' "${health_json}" | grep -q '"ok":true'; then
    note_fail "health ok !== true"
  fi
  if ! printf '%s' "${health_json}" | grep -qF "\"commit\":\"${EXPECTED}\""; then
    note_fail "health commit does not match expected ${EXPECTED} (check DEPLOY_COMMIT in .env and worldcup.service)"
  fi
  if ! grep -q 'tsx/dist/cli.mjs' /etc/systemd/system/worldcup.service 2>/dev/null; then
    note_fail "worldcup.service still uses npm run server — run scripts/restart-production-services.sh"
  fi
fi

# --- systemd (optional but informative) ---
if command -v systemctl >/dev/null 2>&1; then
  for unit in worldcup worldcup-jobs; do
    state="$(systemctl is-active "${unit}.service" 2>/dev/null || echo unknown)"
    if [[ "${state}" != "active" ]]; then
      note_fail "${unit}.service is not active (state=${state})"
    else
      echo "OK: ${unit}.service active"
    fi
  done
fi

# --- nginx (Cloudflare → origin) — required for public HTTPS ---
if ! command -v nginx >/dev/null 2>&1; then
  note_fail "nginx is not installed — Cloudflare cannot reach Node on :${PORT} (run scripts/ensure-production-nginx.sh)"
else
  nginx_state="$(systemctl is-active nginx.service 2>/dev/null || echo unknown)"
  if [[ "${nginx_state}" != "active" ]]; then
    note_fail "nginx.service is not active (state=${nginx_state}) — public URL will show Cloudflare 530"
  else
    echo "OK: nginx.service active"
    if curl -sf --max-time 10 -k "https://127.0.0.1/api/health" -H "Host: worldcup.dosums.uk" >/dev/null 2>&1; then
      echo "OK: nginx proxies /api/health to Node (HTTPS)"
    elif curl -sf --max-time 10 "http://127.0.0.1/api/health" -H "Host: worldcup.dosums.uk" >/dev/null 2>&1; then
      echo "OK: nginx proxies /api/health to Node (HTTP only — add TLS certs for :443)"
    else
      note_fail "nginx is active but local /api/health proxy check failed"
    fi
  fi
fi

# --- git HEAD on server ---
actual_head="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
if [[ "${actual_head}" != "${EXPECTED}" ]]; then
  note_fail "git HEAD ${actual_head} != expected ${EXPECTED}"
else
  echo "OK: git HEAD matches expected commit"
fi

# --- Cloudflare Tunnel (when Oracle blocks inbound :443) ---
if command -v cloudflared >/dev/null 2>&1; then
  if pgrep -x cloudflared >/dev/null 2>&1; then
    echo "OK: cloudflared process running"
  else
    note_fail "cloudflared installed but not running — public site shows Cloudflare 1033/530"
  fi
  for unit in cloudflared cloudflare-tunnel cf-tunnel; do
    if systemctl list-unit-files "${unit}.service" --no-legend 2>/dev/null | grep -q "${unit}.service"; then
      state="$(systemctl is-active "${unit}.service" 2>/dev/null || echo unknown)"
      if [[ "${state}" != "active" ]]; then
        note_fail "${unit}.service is not active (state=${state})"
      else
        echo "OK: ${unit}.service active"
      fi
    fi
  done
fi

if [[ "${failures}" -gt 0 ]]; then
  echo ""
  echo "ERROR: ${failures} verification check(s) failed."
  exit 1
fi

echo "==> All production deploy checks passed."
