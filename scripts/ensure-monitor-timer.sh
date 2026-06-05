#!/usr/bin/env bash
# Enable on-VM health monitor + auto-recovery timer.
set -euo pipefail

echo "==> ensure-monitor-timer.sh"

sudo -n mkdir -p /var/lib/worldcup-monitor
sudo -n chown ubuntu:ubuntu /var/lib/worldcup-monitor

sudo cp deploy/systemd/worldcup-monitor.service deploy/systemd/worldcup-monitor.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable worldcup-monitor.timer
sudo systemctl start worldcup-monitor.timer

echo "OK: worldcup-monitor.timer active"
systemctl list-timers worldcup-monitor.timer --no-pager
