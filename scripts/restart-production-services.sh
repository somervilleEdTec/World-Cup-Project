#!/usr/bin/env bash
# Stop stray Node on :8787 and start official systemd units from this repo.
set -euo pipefail

cd "$(dirname "$0")/.."
PORT="${PORT:-8787}"

echo "==> restart-production-services.sh (repo $(git rev-parse --short HEAD 2>/dev/null || echo unknown))"

if [[ ! -f node_modules/tsx/dist/cli.mjs ]]; then
  echo "ERROR: node_modules/tsx missing. Run: unset NODE_ENV && npm ci"
  exit 1
fi
if ! /usr/bin/node node_modules/tsx/dist/cli.mjs --version >/dev/null 2>&1; then
  echo "ERROR: /usr/bin/node cannot run tsx. Run: unset NODE_ENV && npm ci"
  exit 1
fi

if [[ ! -f node_modules/better-sqlite3/build/Release/better_sqlite3.node ]]; then
  echo "ERROR: better_sqlite3 native module missing. Run: bash scripts/repair-npm-on-server.sh"
  exit 1
fi

echo "==> Stopping stray processes on port ${PORT}"
if command -v lsof >/dev/null 2>&1; then
  mapfile -t pids < <(sudo lsof -t -i ":${PORT}" 2>/dev/null || true)
  if [[ "${#pids[@]}" -gt 0 ]]; then
    echo "Killing PIDs: ${pids[*]}"
    sudo kill "${pids[@]}" 2>/dev/null || true
    sleep 2
  fi
fi

echo "==> Install systemd units (node + tsx/cli.mjs — not npm run)"
sudo cp deploy/systemd/worldcup.service deploy/systemd/worldcup-jobs.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl reset-failed worldcup.service worldcup-jobs.service 2>/dev/null || true
sudo systemctl enable worldcup-jobs worldcup 2>/dev/null || true
sudo systemctl stop worldcup worldcup-jobs 2>/dev/null || true
sleep 1
sudo systemctl start worldcup-jobs
sudo systemctl start worldcup

echo "==> Effective unit:"
systemctl show worldcup.service -p ExecStart --no-pager

for u in worldcup worldcup-jobs; do
  printf '%s: ' "${u}"
  systemctl is-active "${u}.service" 2>/dev/null || true
done

health_ok=0
for attempt in 1 2 3 4 5 6; do
  sleep 5
  if curl -sf --max-time 10 "http://127.0.0.1:${PORT}/api/health" >/dev/null; then
    health_ok=1
    break
  fi
  echo "Health check attempt ${attempt}/6 — waiting for :${PORT}"
done

if [[ "${health_ok}" -ne 1 ]]; then
  echo ""
  echo "ERROR: nothing healthy on port ${PORT}."
  echo "Installed unit ExecStart:"
  grep ExecStart /etc/systemd/system/worldcup.service 2>/dev/null || true
  echo "Recent worldcup logs:"
  journalctl -u worldcup -n 50 --no-pager 2>/dev/null || true
  exit 1
fi

echo "==> nginx (public HTTPS → :${PORT})"
bash scripts/ensure-production-nginx.sh

echo "==> Cloudflare Tunnel (cloudflared — fixes 1033/530 when NSG blocks inbound)"
bash scripts/ensure-production-cloudflared.sh

echo "==> Health"
curl -sf "http://127.0.0.1:${PORT}/api/health" && echo ""
echo "==> Index JS"
curl -sf "http://127.0.0.1:${PORT}/" | grep -oE 'assets/index-[^"]+\.js' | head -1
echo ""
echo "Compare to: grep -o assets/index dist/index.html"
