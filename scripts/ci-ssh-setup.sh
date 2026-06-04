#!/usr/bin/env bash
# Configure ~/.ssh for GitHub Actions deploy/bootstrap/wipe jobs.
# Requires: DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY; optional DEPLOY_PORT (default 22).
set -euo pipefail

: "${DEPLOY_HOST:?DEPLOY_HOST required}"
: "${DEPLOY_USER:?DEPLOY_USER required}"
: "${DEPLOY_SSH_KEY:?DEPLOY_SSH_KEY required}"

port="${DEPLOY_PORT:-22}"

mkdir -p ~/.ssh
chmod 700 ~/.ssh
printf '%s\n' "${DEPLOY_SSH_KEY}" > ~/.ssh/deploy_key
chmod 600 ~/.ssh/deploy_key

if ! ssh-keyscan -p "${port}" -H "${DEPLOY_HOST}" >> ~/.ssh/known_hosts 2>/dev/null; then
  echo "WARNING: ssh-keyscan failed — continuing with accept-new"
fi

cat > ~/.ssh/config <<EOF
Host production-deploy
  HostName ${DEPLOY_HOST}
  User ${DEPLOY_USER}
  Port ${port}
  IdentityFile ~/.ssh/deploy_key
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
  ServerAliveInterval 30
  ServerAliveCountMax 20
  ConnectTimeout 30
  ConnectionAttempts 3
  HostKeyAlgorithms +ssh-rsa
  PubkeyAcceptedAlgorithms +ssh-rsa
EOF
chmod 600 ~/.ssh/config

echo "OK: SSH configured for ${DEPLOY_USER}@${DEPLOY_HOST}:${port}"
