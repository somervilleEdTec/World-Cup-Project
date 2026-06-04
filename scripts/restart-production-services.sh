#!/usr/bin/env bash
# Stop stray Node on :8787 and start official systemd units from this repo.
set -euo pipefail

cd "$(dirname "$0")/.."
PORT="${PORT:-8787}"

echo "==> restart-production-services.sh (repo $(git rev-parse --short HEAD 2>/dev/null || echo unknown))"

if [[ ! -x node_modules/.bin/tsx ]]; then
  echo "ERROR: node_modules/.bin/tsx missing. Run: unset NODE_ENV && npm ci"
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

echo "==> Install systemd units from repo (tsx direct — not npm run)"
sudo cp deploy/systemd/worldcup.service deploy/systemd/worldcup-jobs.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable worldcup-jobs worldcup 2>/dev/null || true
sudo systemctl restart worldcup-jobs
sudo systemctl restart worldcup

sleep 3
for u in worldcup worldcup-jobs; do
  printf '%s: ' "${u}"
  systemctl is-active "${u}.service" 2>/dev/null || true
done

if ! curl -sf --max-time 10 "http://127.0.0.1:${PORT}/api/health" >/dev/null; then
  echo ""
  echo "ERROR: nothing healthy on port ${PORT}."
  echo "Installed unit ExecStart:"
  grep ExecStart /etc/systemd/system/worldcup.service 2>/dev/null || true
  echo "Recent worldcup logs:"
  journalctl -u worldcup -n 50 --no-pager 2>/dev/null || true
  exit 1
fi

echo "==> Health"
curl -sf "http://127.0.0.1:${PORT}/api/health" && echo ""
echo "==> Index JS"
curl -sf "http://127.0.0.1:${PORT}/" | grep -oE 'assets/index-[^"]+\.js' | head -1
echo ""
echo "Compare to: grep -o assets/index dist/index.html"
