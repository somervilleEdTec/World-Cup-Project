#!/usr/bin/env bash
# First-time setup on Oracle Cloud Ubuntu 22.04 (Always Free E2.1.Micro).
# Run ON THE VM after SSH — not on Windows.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/somervilleEdTec/World-Cup-Project/main/scripts/setup-oracle-ubuntu.sh -o setup.sh
#   chmod +x setup.sh
#   sudo ./setup.sh
#
# Or clone the repo first and: sudo bash scripts/setup-oracle-ubuntu.sh

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/world-cup-boys}"
REPO="${REPO:-https://github.com/somervilleEdTec/World-Cup-Project.git}"
BRANCH="${BRANCH:-main}"
PUBLIC_URL="${PUBLIC_URL:-https://worldcup.dosums.uk}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run with sudo: sudo bash $0"
  exit 1
fi

echo "==> Installing Node 20, git, sqlite..."
apt-get update -qq
apt-get install -y -qq git curl ca-certificates sqlite3

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

echo "==> Installing cloudflared (for Cloudflare Tunnel)..."
mkdir -p /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-public-v2.gpg | tee /usr/share/keyrings/cloudflare-public-v2.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-public-v2.gpg] https://pkg.cloudflare.com/cloudflared any main' \
  | tee /etc/apt/sources.list.d/cloudflared.list
apt-get update -qq
apt-get install -y -qq cloudflared

echo "==> Cloning app to ${APP_DIR}..."
if [[ ! -d "${APP_DIR}/.git" ]]; then
  git clone --branch "${BRANCH}" "${REPO}" "${APP_DIR}"
else
  cd "${APP_DIR}"
  git fetch origin "${BRANCH}"
  git checkout "${BRANCH}"
  git pull origin "${BRANCH}"
fi

cd "${APP_DIR}"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo ""
  echo ">>> Edit ${APP_DIR}/.env before starting the app:"
  echo "    FOOTBALL_DATA_TOKEN=..."
  echo "    JOIN_PASSWORD=..."
  echo "    NODE_ENV=production"
  echo "    VITE_API_BASE_URL=${PUBLIC_URL}"
  echo ""
  read -r -p "Press Enter after you have run: sudo nano ${APP_DIR}/.env" _
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

export VITE_API_BASE_URL="${VITE_API_BASE_URL:-${PUBLIC_URL}}"
export NODE_ENV="${NODE_ENV:-production}"

if [[ -z "${FOOTBALL_DATA_TOKEN:-}" ]]; then
  echo "FOOTBALL_DATA_TOKEN is required in .env"
  exit 1
fi

echo "==> npm install, empty DB (once), migrate, build..."
npm install
npm run db:purge
npm run migrate
npm test
npm run build

echo "==> Installing systemd units..."
tee /etc/systemd/system/worldcup-jobs.service >/dev/null <<EOF
[Unit]
Description=World Cup Boys background jobs
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run jobs
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

tee /etc/systemd/system/worldcup-server.service >/dev/null <<EOF
[Unit]
Description=World Cup Boys API and frontend
After=network.target worldcup-jobs.service

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run server
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable worldcup-jobs worldcup-server
systemctl restart worldcup-jobs worldcup-server

echo ""
echo "==> App should be listening on http://127.0.0.1:8787"
echo "    systemctl status worldcup-server worldcup-jobs"
echo ""
echo "==> NEXT: install your tunnel (from Cloudflare Zero Trust deploy step), e.g.:"
echo "    cloudflared service install <TOKEN_FROM_CLOUDFLARE_DASHBOARD>"
echo "    systemctl start cloudflared"
echo ""
echo "==> Promote admin after you register on the site:"
echo "    sqlite3 ${APP_DIR}/data.db \"UPDATE users SET is_admin = 1 WHERE display_name = 'YourName';\""
echo ""
echo "Done."
