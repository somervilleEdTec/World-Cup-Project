#!/usr/bin/env bash
# Restart Cloudflare Tunnel (cloudflared) when the site uses error 1033 / HTTP 530.
# Tunnel traffic is outbound from the VM — Oracle NSG often blocks inbound :443 entirely.
set -euo pipefail

echo "==> ensure-production-cloudflared.sh"

found=0
for unit in cloudflared cloudflare-tunnel cf-tunnel; do
  if systemctl list-unit-files "${unit}.service" --no-legend 2>/dev/null | grep -q "${unit}.service"; then
    found=1
    echo "==> Restart ${unit}.service"
    sudo -n systemctl restart "${unit}.service"
    state="$(systemctl is-active "${unit}.service" 2>/dev/null || echo unknown)"
    echo "${unit}: ${state}"
    if [[ "${state}" != "active" ]]; then
      echo "ERROR: ${unit}.service failed to start."
      journalctl -u "${unit}" -n 40 --no-pager 2>/dev/null || true
      exit 1
    fi
    break
  fi
done

if [[ "${found}" -eq 0 ]]; then
  if command -v cloudflared >/dev/null 2>&1; then
    if pgrep -x cloudflared >/dev/null 2>&1; then
      echo "OK: cloudflared process running (no systemd unit)"
      pgrep -a cloudflared | head -3 || true
    else
      echo "ERROR: cloudflared is installed but not running — site will show Cloudflare 1033/530."
      echo "  Start tunnel: sudo systemctl start cloudflared"
      echo "  Or: cloudflared tunnel run <name>"
      ls -la /etc/cloudflared/ ~/.cloudflared/ 2>/dev/null || true
      exit 1
    fi
  else
    echo "NOTE: cloudflared not installed — assuming public DNS A record → nginx :443"
  fi
fi
