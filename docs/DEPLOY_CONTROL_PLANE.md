# GitHub as the deployment control plane

**Last updated:** 2026-06-05  
**Production status:** **Live** — https://worldcup.dosums.uk/api/health returns `ok:true` with matching `commit`.  
**Outages:** see **[OUTAGE_RECOVERY.md](./OUTAGE_RECOVERY.md)** — Cloudflare **1033/530** is usually `cloudflared` down, not Node.

Production releases are **fully driven from GitHub**. You do not need to SSH to the Oracle VM for normal deploys — use **Actions** logs and re-runs.

---

## Architecture

```text
You / Cursor Agent → work on Debug → merge to main → git push origin main
        │
        ├─► GitHub Actions: Deploy main (production)
        │     1. ci      — npm ci, npm test, npm run build
        │     2. deploy  — SSH deploy (best-effort; optional if port 22 blocked)
        │     3. verify  — public /api/health must match github.sha (~30 min max)
        │
        └─► Oracle VM: worldcup-deploy.timer (every 3 min) — pull new commits
              worldcup-monitor.timer (every 2 min) — auto-recover outages
        │
        ▼
Cloudflare → cloudflared (outbound tunnel) → Node :8787
        │
        ▼
https://worldcup.dosums.uk
```

Oracle **does not expose inbound :443** to the internet. Public HTTPS depends on **`cloudflared.service`** staying active. See [OUTAGE_RECOVERY.md](./OUTAGE_RECOVERY.md).

| Branch | Workflow | Deploys live? |
|--------|----------|---------------|
| **`main`** | [deploy-main.yml](../.github/workflows/deploy-main.yml) | **Yes** — every push |
| **`Debug`** | [ci-debug.yml](../.github/workflows/ci-debug.yml) | **No** — test + build only |

On this server, **pull-based deploy** (`worldcup-deploy.timer`) is the reliable path when GitHub Actions cannot SSH inbound. Both paths run the same `scripts/deploy-production.sh`.

---

## Day-to-day release (automated — no SSH)

### 1. Develop on `Debug`

```powershell
cd C:\Users\tomso\World-Cup-Project
git checkout Debug
git pull origin Debug
# edit, test locally
npm test
git push origin Debug
```

Push to **`Debug`** runs **CI Debug** only — the live site does **not** change.

### 2. Release to production

When the owner confirms a live release:

```powershell
cd C:\Users\tomso\World-Cup-Project
git checkout main
git pull origin main
git merge Debug
git push origin main
```

Or merge a PR **`Debug` → `main`** on GitHub.

### 3. Confirm deploy

Within **~3–5 minutes** the VM pull timer deploys. GitHub **Deploy main** also runs CI and verifies public health.

**Check live (PowerShell):**

```powershell
curl https://worldcup.dosums.uk/api/health
```

Success: `{"ok":true,"commit":"<full-sha-matching-main>"}`

**Check GitHub:** Actions → **Deploy main (production)** → green **Verify live site**.

**Re-deploy same commit:** Actions → **Deploy main (production)** → **Run workflow** (branch `main`).

---

## What runs on the VM (`deploy-production.sh`)

| Step | Purpose |
|------|---------|
| Deploy lock + pause `worldcup-deploy.timer` | Prevents concurrent npm/deploy races |
| `git pull origin main` | Match GitHub `main` |
| `npm ci` (skipped when lockfile + deps OK) | Uses `--ignore-scripts` + `rebuild better-sqlite3` on failure |
| `npm run db:backup` | Retrieval archive (if predictions exist) + operational backup — **deploy aborts if this fails** |
| `npm run migrate` | Additive schema only — **blocked** if migration would destroy stored predictions ([DATA_PROTECTION.md](./DATA_PROTECTION.md)) |
| `npm run build` | SPA → `dist/` |
| `DEPLOY_COMMIT` in `.env` | `/api/health` reports commit |
| `ensure-monitor-timer.sh` | Health check every 2 min + auto-recovery on outage |
| `restart-production-services.sh` | `worldcup` + `worldcup-jobs`, nginx ensure, **cloudflared restart** |
| `verify-production-deploy.sh` | Fails if Node/tunnel/nginx/commit/dist checks fail |
| Resume `worldcup-deploy.timer` | Pull deploy enabled again |

Later deploys **skip `npm ci`** when `package-lock.json` is unchanged and `better_sqlite3.node`, `tsx`, and dependency integrity checks pass.

---

## VM commands vs your PC (important)

Paths like `/home/ubuntu/World-Cup-Project` and `bash scripts/...` run **on the Linux server**, not in Windows PowerShell on your Desktop.

**From Windows — SSH in:**

```powershell
ssh -i "C:\Users\tomso\Desktop\ssh-key-2026-06-02.key" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa ubuntu@84.8.146.237
```

**From Windows — one remote command:**

```powershell
ssh -i "C:\Users\tomso\Desktop\ssh-key-2026-06-02.key" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa ubuntu@84.8.146.237 "cd /home/ubuntu/World-Cup-Project && curl -s http://127.0.0.1:8787/api/health"
```

---

## One-time VM setup (already done on this server)

Bootstrap completed 2026-06-05. Reference for rebuilds:

```bash
cd /home/ubuntu/World-Cup-Project
git checkout main && git pull origin main
bash scripts/bootstrap-production-host.sh   # build tools, systemd, sudoers, pull timer
# create .env (FOOTBALL_DATA_TOKEN, VITE_API_BASE_URL, ADMIN_*)
FORCE_NPM_REPAIR=1 bash scripts/repair-npm-on-server.sh
npm run migrate && npm run build
bash scripts/deploy-production.sh
```

### GitHub Actions bootstrap (no SSH on your PC)

**Actions → Bootstrap production host (manual) → Run workflow** with input `BOOTSTRAP_PRODUCTION`.

### Pull-based deploy timer

```bash
bash scripts/ensure-poll-deploy-timer.sh
```

Runs `scripts/poll-deploy-from-github.sh` every **3 minutes** when `origin/main` is ahead of the VM.

---

## Outage recovery (site down / HTTP 530 / error 1033)

**Start here:** [OUTAGE_RECOVERY.md](./OUTAGE_RECOVERY.md)

**Fastest path (no SSH):** Actions → **Deploy main (production)** → **Run workflow** (`main`).

**One-liner SSH (owner):**

```powershell
ssh -i "C:\Users\tomso\Desktop\ssh-key-2026-06-02.key" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa ubuntu@84.8.146.237 "cd /home/ubuntu/World-Cup-Project && git pull origin main && bash scripts/restart-production-services.sh"
```

Typical cause: **`cloudflared` stopped** while Node on `:8787` was still healthy.

---

## Recovery (rare — SSH once)

### Corrupt `node_modules` / `better-sqlite3`

```powershell
ssh -i "C:\Users\tomso\Desktop\ssh-key-2026-06-02.key" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa ubuntu@84.8.146.237 "sudo systemctl stop worldcup-deploy.timer && cd /home/ubuntu/World-Cup-Project && git pull origin main && FORCE_NPM_REPAIR=1 bash scripts/repair-npm-on-server.sh && npm run migrate && npm run build && bash scripts/deploy-production.sh"
```

`repair-npm-on-server.sh` uses `npm ci --ignore-scripts` then `npm rebuild better-sqlite3` (avoids flaky postinstall on small VMs). **`npm rebuild better-sqlite3` can take 10–25 minutes with little output** — do not interrupt.

### Service down but deps OK

```bash
bash scripts/restart-production-services.sh
```

---

## Debugging failed deploys (in GitHub)

| Failed step | Where to look |
|-------------|----------------|
| **Test and build** | Job log: Vitest, TypeScript, ESLint |
| **Deploy over SSH** | May fail if port 22 blocked — pull timer may still deploy |
| **Verify live site** | Health JSON; compare `commit` to workflow SHA |

| Symptom | Fix |
|---------|-----|
| **`ssh: handshake failed: EOF`** / **banner timeout** | Normal on this VM. Ensure `worldcup-deploy.timer` is active; re-run workflow or wait ~3 min after push. |
| **HTTP 530 + 1033** | **`cloudflared` down** — re-run **Deploy main** or `sudo systemctl restart cloudflared` on VM ([OUTAGE_RECOVERY.md](./OUTAGE_RECOVERY.md)) |
| **HTTP 530/502** (no 1033) | `bash scripts/restart-production-services.sh` on VM |
| **SSH OK + DEPLOY_OK but verify 530** | Tunnel not running — check deploy log for `cloudflared: active` |
| **`better-sqlite3` / corrupt `node_modules`** | `FORCE_NPM_REPAIR=1 bash scripts/repair-npm-on-server.sh` |
| **`sudo: a password is required`** | `bash scripts/ensure-deploy-sudoers.sh` |
| **Health commit mismatch** | `bash scripts/deploy-production.sh` |

---

## Secrets (GitHub → Settings → Actions)

| Secret | Purpose |
|--------|---------|
| `DEPLOY_HOST` | `84.8.146.237` |
| `DEPLOY_USER` | `ubuntu` |
| `DEPLOY_PATH` | `/home/ubuntu/World-Cup-Project` |
| `DEPLOY_SSH_KEY` | Full private key file |

**Not in GitHub:** `FOOTBALL_DATA_TOKEN`, `ADMIN_PASSWORD` — only in server `.env`.

---

## Agent / Cursor workflow

Cloud agents should:

1. Edit on **`Debug`**, push → wait for **CI Debug** green.
2. Merge to **`main`** and push when the user confirms production release.
3. Wait for **Deploy main** → green **Verify live site**; confirm `curl https://worldcup.dosums.uk/api/health` commit matches merge SHA.
4. If the site is down (**530 / 1033**): follow [OUTAGE_RECOVERY.md](./OUTAGE_RECOVERY.md) — re-run **Deploy main** first; SSH only if that fails.
5. **Do not** ask the owner to SSH for routine releases. SSH only for bootstrap, `.env`, `repair-npm-on-server.sh`, or tunnel recovery after re-run deploy.

---

## Related docs

- [OUTAGE_RECOVERY.md](./OUTAGE_RECOVERY.md) — 530/1033 triage and fast restore  
- [PRODUCTION.md](./PRODUCTION.md) — VM details, tunnel, nginx, wipe DB  
- [BRANCHING.md](./BRANCHING.md) — `main` vs `Debug`  
- [DEBUG.md](./DEBUG.md) — local policy
