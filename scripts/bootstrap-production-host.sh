#!/usr/bin/env bash
# ONE-TIME (or rebuild) setup on the Oracle production VM.
# Run on the server: bash scripts/bootstrap-production-host.sh
# Does not deploy app code — prepares OS, build tools, systemd, sudoers snippet.
set -euo pipefail

cd "$(dirname "$0")/.."
APP_ROOT="$(pwd)"

echo "==> Bootstrap production host @ ${APP_ROOT}"

if [[ "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)" != "main" ]]; then
  echo "WARNING: not on branch main (current: $(git rev-parse --abbrev-ref HEAD 2>/dev/null))"
fi

echo "==> OS packages (build-essential for better-sqlite3)"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  build-essential \
  python3 \
  git \
  curl \
  nginx

if [[ ! -f .env ]]; then
  echo ""
  echo "NEXT: cp .env.example .env && nano .env"
  echo "  Required: FOOTBALL_DATA_TOKEN, VITE_API_BASE_URL=https://worldcup.dosums.uk, ADMIN_*"
fi

echo "==> systemd units (tsx direct ExecStart)"
if [[ -f deploy/systemd/worldcup.service ]]; then
  sudo cp deploy/systemd/worldcup.service deploy/systemd/worldcup-jobs.service /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable worldcup worldcup-jobs 2>/dev/null || true
  echo "OK: units installed (start after .env and npm ci)"
fi

echo "==> Passwordless deploy sudoers (GitHub Actions)"
bash scripts/ensure-deploy-sudoers.sh

echo "==> nginx reverse proxy (HTTPS → Node :8787)"
bash scripts/ensure-production-nginx.sh

echo "==> Pull-based deploy timer (when GitHub SSH to port 22 is blocked)"
bash scripts/ensure-poll-deploy-timer.sh

echo "==> Live site monitor + auto-recovery (every 2 min on VM)"
bash scripts/ensure-monitor-timer.sh

echo ""
echo "Bootstrap complete. Next steps:"
echo "  1. Create .env on this host (never commit secrets)"
echo "  2. npm ci && npm run migrate && npm run build"
echo "  3. sudo systemctl start worldcup-jobs worldcup"
echo "  4. Push to main on GitHub — deploy-main workflow owns future releases"
echo "See docs/DEPLOY_CONTROL_PLANE.md"
