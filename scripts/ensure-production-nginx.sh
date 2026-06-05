#!/usr/bin/env bash
# Install nginx on the production VM and proxy HTTPS → Node :8787.
# Cloudflare (DNS A record) needs something listening on :443 at the origin.
set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-8787}"
DOMAIN="${PUBLIC_DOMAIN:-worldcup.dosums.uk}"
NGINX_SITE="/etc/nginx/sites-available/worldcup"
NGINX_ENABLED="/etc/nginx/sites-enabled/worldcup"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
SSL_FULLCHAIN="${CERT_DIR}/fullchain.pem"
SSL_KEY="${CERT_DIR}/privkey.pem"

echo "==> ensure-production-nginx.sh (domain=${DOMAIN}, upstream=127.0.0.1:${PORT})"

install_nginx() {
  if command -v nginx >/dev/null 2>&1; then
    return 0
  fi
  echo "==> Installing nginx"
  if ! sudo -n true 2>/dev/null; then
    echo "ERROR: passwordless sudo required to install nginx."
    exit 1
  fi
  sudo -n apt-get update -qq
  sudo -n apt-get install -y -qq nginx
}

write_site_config() {
  local cert_fullchain="${SSL_FULLCHAIN}"
  local cert_key="${SSL_KEY}"

  if [[ ! -f "${cert_fullchain}" || ! -f "${cert_key}" ]]; then
    local fallback_dir="/etc/ssl/worldcup"
    cert_fullchain="${fallback_dir}/fullchain.pem"
    cert_key="${fallback_dir}/privkey.pem"
    echo "WARNING: no Let's Encrypt certs at ${CERT_DIR} — using origin self-signed cert for :443"
    sudo -n mkdir -p "${fallback_dir}"
    if [[ ! -f "${cert_fullchain}" || ! -f "${cert_key}" ]]; then
      sudo -n openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
        -keyout "${cert_key}" \
        -out "${cert_fullchain}" \
        -subj "/CN=${DOMAIN}" 2>/dev/null
    fi
  else
    echo "==> Using Let's Encrypt certs at ${CERT_DIR}"
  fi

  local ssl_extras=""
  if [[ -f /etc/letsencrypt/options-ssl-nginx.conf && "${cert_fullchain}" == "${SSL_FULLCHAIN}" ]]; then
    ssl_extras="
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;"
  fi

  sudo -n tee "${NGINX_SITE}" >/dev/null <<EOF
# Managed by scripts/ensure-production-nginx.sh — proxy all traffic to Node :${PORT}
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate ${cert_fullchain};
    ssl_certificate_key ${cert_key};${ssl_extras}

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

  sudo -n ln -sf "${NGINX_SITE}" "${NGINX_ENABLED}"
  if [[ -f /etc/nginx/sites-enabled/default ]]; then
    sudo -n rm -f /etc/nginx/sites-enabled/default
  fi
}

start_nginx() {
  if ! sudo -n nginx -t; then
    echo "ERROR: nginx config test failed."
    sudo -n nginx -t 2>&1 || true
    exit 1
  fi
  sudo -n systemctl enable nginx 2>/dev/null || true
  sudo -n systemctl restart nginx
  nginx_state="$(systemctl is-active nginx.service 2>/dev/null || echo unknown)"
  echo "nginx: ${nginx_state}"
  if [[ "${nginx_state}" != "active" ]]; then
    echo "ERROR: nginx failed to start."
    journalctl -u nginx -n 40 --no-pager 2>/dev/null || true
    exit 1
  fi
}

install_nginx
write_site_config
start_nginx

if curl -sf --max-time 10 -k "https://127.0.0.1/api/health" -H "Host: ${DOMAIN}" >/dev/null 2>&1; then
  echo "OK: nginx proxies https://${DOMAIN}/api/health → Node"
elif curl -sf --max-time 10 "http://127.0.0.1/api/health" -H "Host: ${DOMAIN}" >/dev/null 2>&1; then
  echo "OK: nginx proxies http://${DOMAIN}/api/health → Node (HTTPS may need certbot)"
else
  echo "ERROR: nginx is active but local proxy health check failed."
  exit 1
fi
