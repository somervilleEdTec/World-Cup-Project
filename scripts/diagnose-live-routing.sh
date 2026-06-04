#!/usr/bin/env bash
# Run on production VM to compare Node (:8787) vs public URL (nginx).
set -euo pipefail

cd "$(dirname "$0")/.." 2>/dev/null || true
PORT="${PORT:-8787}"
PUBLIC="${PUBLIC_URL:-https://worldcup.dosums.uk}"

echo "==> Local Node http://127.0.0.1:${PORT}"
curl -sf "http://127.0.0.1:${PORT}/api/health" && echo ""
curl -sf "http://127.0.0.1:${PORT}/" | grep -oE 'assets/index-[^"]+\.js' | head -1 || echo "(no js in index)"

echo ""
echo "==> Built dist/ on disk"
grep -oE 'assets/index-[^"]+\.js' dist/index.html 2>/dev/null | head -1 || echo "(no dist/index.html)"

echo ""
echo "==> Public ${PUBLIC}"
curl -sf "${PUBLIC}/api/health" && echo ""
curl -sf "${PUBLIC}/" | grep -oE 'assets/index-[^"]+\.js' | head -1 || echo "(no js in index)"

echo ""
echo "==> Who listens on :${PORT}"
if command -v ss >/dev/null 2>&1; then
  ss -tlnp 2>/dev/null | grep ":${PORT} " || echo "(nothing listening on ${PORT})"
fi
if command -v lsof >/dev/null 2>&1; then
  sudo lsof -i ":${PORT}" 2>/dev/null | head -5 || true
fi

echo ""
echo "==> systemd worldcup / worldcup-jobs"
for u in worldcup worldcup-jobs; do
  printf '%s: ' "${u}"
  systemctl is-active "${u}.service" 2>/dev/null || echo "unknown"
done
systemctl show worldcup.service -p WorkingDirectory -p EnvironmentFiles --no-pager 2>/dev/null || true

echo ""
echo "==> nginx server_name worldcup (if installed)"
if command -v nginx >/dev/null 2>&1; then
  sudo nginx -T 2>/dev/null | grep -E 'server_name|root |proxy_pass|8787' | head -40 || true
fi

echo ""
echo "If public JS != local JS, nginx is likely serving a stale static root."
echo "Fix: proxy ALL locations to :8787 — see deploy/nginx/worldcup.conf.example"
