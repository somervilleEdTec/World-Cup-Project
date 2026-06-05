#!/usr/bin/env bash
# Pull-based production deploy when GitHub Actions cannot SSH inbound (Oracle NSG).
# Run via systemd timer worldcup-deploy.timer — see deploy/systemd/.
set -euo pipefail

cd "$(dirname "$0")/.."
APP_ROOT="$(pwd)"

current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
if [[ "${current_branch}" != "main" ]]; then
  echo "poll-deploy: not on main (${current_branch}) — skip"
  exit 0
fi

if [[ ! -f .env ]]; then
  echo "poll-deploy: missing .env — skip"
  exit 0
fi

echo "==> poll-deploy-from-github @ ${APP_ROOT} ($(date -u +%Y-%m-%dT%H:%M:%SZ))"

git fetch origin main
remote_head="$(git rev-parse origin/main)"
local_head="$(git rev-parse HEAD)"

if [[ "${remote_head}" == "${local_head}" ]]; then
  echo "poll-deploy: already at origin/main ${local_head:0:12} — nothing to do"
  exit 0
fi

echo "poll-deploy: origin/main ${remote_head:0:12} ahead of HEAD ${local_head:0:12} — deploying"
export EXPECTED_COMMIT="${remote_head}"
bash scripts/deploy-production.sh
