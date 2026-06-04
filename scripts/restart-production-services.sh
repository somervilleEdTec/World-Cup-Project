#!/usr/bin/env bash
# Stop stray Node on :8787 and start official systemd units from this repo.
set -euo pipefail

cd "$(dirname "$0")/.."
PORT="${PORT:-8787}"

echo "==> Stopping stray processes on port ${PORT}"
if command -v lsof >/dev/null 2>&1; then
  mapfile -t pids < <(sudo lsof -t -i ":${PORT}" 2>/dev/null || true)
  if [[ "${#pids[@]}" -gt 0 ]]; then
    echo "Killing PIDs: ${pids[*]}"
    sudo kill "${pids[@]}" 2>/dev/null || true
    sleep 2
  fi
fi

echo "==> Enable and start systemd units"
sudo systemctl daemon-reload
sudo systemctl enable worldcup-jobs worldcup 2>/dev/null || true
sudo systemctl restart worldcup-jobs
sudo systemctl restart worldcup

sleep 2
systemctl is-active worldcup.service
systemctl is-active worldcup-jobs.service

echo "==> Health"
curl -sf "http://127.0.0.1:${PORT}/api/health" && echo ""
echo "==> Index JS"
curl -sf "http://127.0.0.1:${PORT}/" | grep -oE 'assets/index-[^"]+\.js' | head -1
echo ""
echo "Compare to: grep -o assets/index dist/index.html"
