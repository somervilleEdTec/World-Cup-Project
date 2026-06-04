#!/usr/bin/env bash
# Run a remote command over SSH with retries (handshake/EOF flakes on Oracle VM).
# Usage: ci-ssh-exec.sh '<remote shell command>'
# Env: SSH_MAX_ATTEMPTS (default 3), SSH_RETRY_WAIT_SEC (default 45)
set -euo pipefail

remote_cmd="${1:-}"
if [[ -z "${remote_cmd}" ]]; then
  echo "Usage: $0 '<remote command>'"
  exit 1
fi

max_attempts="${SSH_MAX_ATTEMPTS:-3}"
retry_wait="${SSH_RETRY_WAIT_SEC:-45}"

for attempt in $(seq 1 "${max_attempts}"); do
  echo "=== SSH attempt ${attempt}/${max_attempts} ==="
  if ssh production-deploy "set -euo pipefail; ${remote_cmd}"; then
    echo "=== SSH succeeded on attempt ${attempt} ==="
    exit 0
  fi
  if [[ "${attempt}" -lt "${max_attempts}" ]]; then
    echo "SSH failed — waiting ${retry_wait}s before retry"
    sleep "${retry_wait}"
  fi
done

echo "ERROR: SSH failed after ${max_attempts} attempts"
exit 1
