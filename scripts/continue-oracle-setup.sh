#!/usr/bin/env bash
# Run on Oracle VM after .env is configured: sudo bash scripts/continue-oracle-setup.sh
set -euo pipefail

cd /opt/world-cup-boys

if [[ ! -f .env ]]; then
  echo "Missing .env — complete Step A first."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -z "${FOOTBALL_DATA_TOKEN:-}" ]]; then
  echo "FOOTBALL_DATA_TOKEN must be set in .env"
  exit 1
fi

export NODE_ENV="${NODE_ENV:-production}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://worldcup.dosums.uk}"

echo "==> npm install, db:purge, migrate, build..."
npm install
npm run db:purge
npm run migrate
npm run build

echo "==> systemd units..."
tee /etc/systemd/system/worldcup-jobs.service >/dev/null <<EOF
[Unit]
Description=World Cup Boys jobs
After=network.target
[Service]
Type=simple
WorkingDirectory=/opt/world-cup-boys
EnvironmentFile=/opt/world-cup-boys/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run jobs
Restart=on-failure
[Install]
WantedBy=multi-user.target
EOF

tee /etc/systemd/system/worldcup-server.service >/dev/null <<EOF
[Unit]
Description=World Cup Boys server
After=network.target worldcup-jobs.service
[Service]
Type=simple
WorkingDirectory=/opt/world-cup-boys
EnvironmentFile=/opt/world-cup-boys/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run server
Restart=on-failure
[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable worldcup-jobs worldcup-server
systemctl restart worldcup-jobs worldcup-server

sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8787/ || echo "000")
echo "HTTP check on :8787 => ${HTTP_CODE}"
systemctl status worldcup-server worldcup-jobs --no-pager || true

echo ""
echo "==> Step B & C done."
echo "==> Step D: run Cloudflare tunnel install from dashboard:"
echo "    sudo cloudflared service install <TOKEN>"
echo "    sudo systemctl start cloudflared"
echo ""
echo "==> Step F after register:"
echo "    sqlite3 /opt/world-cup-boys/data.db \"UPDATE users SET is_admin = 1 WHERE display_name = 'YourName';\""
