#!/usr/bin/env bash
# Enable pull-based deploy timer (fallback when GitHub → VM SSH is blocked).
set -euo pipefail

cd "$(dirname "$0")/.."

chmod +x scripts/poll-deploy-from-github.sh

sudo cp deploy/systemd/worldcup-deploy.service deploy/systemd/worldcup-deploy.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable worldcup-deploy.timer
sudo systemctl start worldcup-deploy.timer

echo "OK: worldcup-deploy.timer active"
systemctl list-timers worldcup-deploy.timer --no-pager
