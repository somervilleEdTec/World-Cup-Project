# Production environment — World Cup Boys (live)

**Last updated:** 2026-06-05  
**Status:** **Live and operational** — https://worldcup.dosums.uk (health `ok:true`, commit matches `main`).  
**Automated deploy:** **Active** — push to **`main`** → GitHub Actions + VM pull timer (`worldcup-deploy.timer`, every 3 min). See [DEPLOY_CONTROL_PLANE.md](./DEPLOY_CONTROL_PLANE.md).

---

## Operational summary

| Component | Status |
|-----------|--------|
| Public site | **https://worldcup.dosums.uk** |
| Oracle VM | `ubuntu@84.8.146.237` (`worldcup-boys`) |
| App on server | `/home/ubuntu/World-Cup-Project` on branch **`main`** |
| GitHub Actions secrets | `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_SSH_KEY` configured |
| Auto-deploy | Push to **`main`** → CI + VM pull timer → `deploy-production.sh` |
| Pull timer | `worldcup-deploy.timer` — enabled 2026-06-05 |
| **`Debug` branch** | Local PC only — **never** updates production |

**Day-to-day release:** merge to `main`, `git push origin main` — live site updates after a green Actions run. **Full pipeline:** [DEPLOY_CONTROL_PLANE.md](./DEPLOY_CONTROL_PLANE.md) (no SSH required for normal deploys).

**Local development:** work on **`Debug`**, test with `Test-LocalSite.ps1` / `npm test` — see [BRANCHING.md](./BRANCHING.md).

---

## Live infrastructure (owner)

| Item | Value |
|------|--------|
| **URL** | https://worldcup.dosums.uk |
| **Host** | Oracle Cloud VM `worldcup-boys` |
| **Public IP** | `84.8.146.237` |
| **SSH user** | `ubuntu` |
| **App path** | `/home/ubuntu/World-Cup-Project` |
| **API port (internal)** | `8787` (nginx → Node) |
| **OS** | Ubuntu 22.04 |

**Owner SSH from Windows (PowerShell):**

```powershell
ssh -i "C:\Users\tomso\Desktop\ssh-key-2026-06-02.key" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa ubuntu@84.8.146.237
```

**Oracle console access** (troubleshooting only): `oci-console` key + serial connection.

---

## Server `.env` (live — not in git)

On the VM at `/home/ubuntu/World-Cup-Project/.env`:

```env
FOOTBALL_DATA_TOKEN=<your football-data.org token>
NODE_ENV=production
VITE_API_BASE_URL=https://worldcup.dosums.uk
ADMIN_USERNAME=AdminTomsom
ADMIN_PASSWORD=<strong organiser password>
PORT=8787
```

- Do **not** set `ALLOW_KO_SEED=1` on production.
- SQLite default (`data.db` in project dir) is fine for ~10 friends.

---

## GitHub Actions — auto-deploy (configured)

Repository secrets are set (2026-06-03). To rotate keys, use **Settings → Secrets and variables → Actions**:

| Secret name | Value for this server |
|-------------|------------------------|
| `DEPLOY_HOST` | `84.8.146.237` |
| `DEPLOY_USER` | `ubuntu` |
| `DEPLOY_PATH` | `/home/ubuntu/World-Cup-Project` |
| `DEPLOY_SSH_KEY` | Full contents of `C:\Users\tomso\Desktop\ssh-key-2026-06-02.key` (private key, all lines) |

Optional: `DEPLOY_PORT` = `22`

**Do not** store `FOOTBALL_DATA_TOKEN` in GitHub — only in server `.env`.

Each push to **`main`** triggers **Deploy main (production)** automatically after CI passes. Manual re-run: **Actions → Deploy main (production) → Run workflow**.

**Typical duration:** CI ~2–3 minutes; SSH deploy ~5–15 minutes (first VM `npm ci` can take ~25 minutes). SSH step timeout is **50 minutes**. Later deploys skip `npm ci` when `package-lock.json` is unchanged. A **Node.js 20 deprecation** annotation on the job is informational only — it does not slow or fail the run. The workflow opts into Node 24 for Actions (`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`) and uses `setup-node@v5` with Node **22** for `npm test` / `npm run build`.

**Health check on server:** `curl -s http://127.0.0.1:8787/api/health` — returns `{ ok: true, commit: "<git-sha>" }` after deploy (`DEPLOY_COMMIT` in `.env`).

**`Debug` branch** never deploys — [BRANCHING.md](./BRANCHING.md).

---

## Auto-deploy (GitHub Actions)

| Branch | Workflow | Live site |
|--------|----------|-----------|
| **`main`** | [deploy-main.yml](../.github/workflows/deploy-main.yml) | Updates on each green run |
| **`Debug`** | [ci-debug.yml](../.github/workflows/ci-debug.yml) — test/build only | Never updated |

### What runs on push to `main`

1. **CI (GitHub)** — `npm ci`, `npm test`, `npm run build`
2. **Deploy (VM)** — within ~3 min, `worldcup-deploy.timer` runs `poll-deploy-from-github.sh` → `deploy-production.sh` (pull `main`, migrate, build, restart systemd, verify)
3. **Deploy (GitHub SSH)** — best-effort; verify step waits up to 30 min for public health

Manual re-run: **Actions → Deploy main (production) → Run workflow** (branch **`main`**).

**Verify from Windows:**

```powershell
curl https://worldcup.dosums.uk/api/health
```

### SSH key for `DEPLOY_SSH_KEY` secret

Paste the **entire** private key file (`ssh-key-2026-06-02.key`), including `-----BEGIN` through `-----END`. Not the `.pub` file, not a file path, no extra quotes.

Test from Windows:

```powershell
ssh -i "C:\Users\tomso\Desktop\ssh-key-2026-06-02.key" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa ubuntu@84.8.146.237 "curl -s http://127.0.0.1:8787/api/health"
```

### Deploy troubleshooting

| Symptom | Fix |
|---------|-----|
| **`ssh: handshake failed: EOF`** / **banner exchange timeout** | GitHub may not reach VM port 22. On VM once: `bash scripts/ensure-poll-deploy-timer.sh` (pull deploy every 3 min). Re-run **Deploy main** — verify waits up to 30 min. |
| **Cloudflare HTTP 530 / 1033** on public URL | **1033 = Cloudflare Tunnel down** — on VM: `sudo systemctl restart cloudflared` (or `bash scripts/ensure-production-cloudflared.sh`). If no tunnel: `bash scripts/restart-production-services.sh` (nginx → :8787). |
| `ssh.ParsePrivateKey: ssh: no key found` | Re-paste full private key into `DEPLOY_SSH_KEY` |
| Permission denied (publickey) | Private key in secret; matching public key on server |
| `tsx: not found` | `deploy-production.sh` unsets `NODE_ENV` during `npm ci` / build |
| `sudo: a password is required` | Install sudoers snippet below |
| Health check fails | `systemctl status worldcup`; nginx → `127.0.0.1:8787` |
| Old UI after deploy | Public site shows old `index-*.js` but VM `dist/` is new → **nginx** serving stale static `root` instead of proxying to `:8787`. Run `bash scripts/diagnose-live-routing.sh`; use [deploy/nginx/worldcup.conf.example](../deploy/nginx/worldcup.conf.example). |
| Health missing `commit` | Add `DEPLOY_COMMIT=$(git rev-parse HEAD)` to `.env`, `sudo systemctl restart worldcup`. Ensure code is current (`git pull`). |
| `worldcup.service` **inactive** but :8787 responds | Old manual `node`/`npm` process. Run `bash scripts/restart-production-services.sh`. |
| `worldcup` **active** but `Connection refused` on :8787 | Stale unit files or crash loop. `git pull`, `bash scripts/restart-production-services.sh`, read `journalctl -u worldcup -n 40`. |
| `better-sqlite3` / missing `better_sqlite3.cpp` on `npm ci` | Corrupt install. On VM: `FORCE_NPM_REPAIR=1 bash scripts/repair-npm-on-server.sh` (uses `npm ci --ignore-scripts` + rebuild; **10–25 min**). Then `bash scripts/deploy-production.sh`. |
| `Cannot find module 'xtend/mutable'` | Partial `node_modules` after failed `npm ci`. Run `repair-npm-on-server.sh` (do not skip reinstall). |
| Ran VM commands on Windows Desktop | Use `ssh ubuntu@84.8.146.237 "cd /home/ubuntu/World-Cup-Project && ..."` — `/home/ubuntu/...` is on the **server**, not your PC. |

---

## First-time server setup (completed 2026-06-03 — reference for rebuilds)

```bash
cd ~/World-Cup-Project
git checkout main
cp .env.example .env
nano .env          # see above
sudo apt-get update && sudo apt-get install -y build-essential python3
npm install
npm run migrate
npm run build
```

`better-sqlite3` compiles native code on the server (Node 20). Install **build-essential** once; deploy script uses `MAKEFLAGS=-j1` and retries after `rm -rf node_modules` if `npm ci` fails.

### systemd (recommended)

Edit `deploy/systemd/*.service` if needed: `User=ubuntu`, `WorkingDirectory=/home/ubuntu/World-Cup-Project`.

```bash
sudo cp deploy/systemd/worldcup.service deploy/systemd/worldcup-jobs.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now worldcup-jobs worldcup
```

Units use **`/usr/bin/node`** + **`node_modules/tsx/dist/cli.mjs`** (not `npm run server`) so production starts reliably under systemd.

Passwordless **systemctl / cp / kill / lsof / apt-get** for GitHub deploy (required):

```bash
bash scripts/bootstrap-production-host.sh
# or after git pull:
bash scripts/ensure-deploy-sudoers.sh
```

Snippet: [deploy/sudoers/worldcup-deploy](../deploy/sudoers/worldcup-deploy) → `/etc/sudoers.d/worldcup-deploy`.

Each `deploy-production.sh` run also installs current systemd units and runs `restart-production-services.sh` (not `npm run server`).

### Manual deploy (same as CI)

```bash
cd ~/World-Cup-Project
bash scripts/deploy-production.sh
```

---

## nginx / HTTPS

Public traffic: **https://worldcup.dosums.uk** → proxy to **http://127.0.0.1:8787**.

TLS certificate must cover `worldcup.dosums.uk`. **All** paths (`/` and `/api`) must `proxy_pass http://127.0.0.1:8787;` — Node serves `dist/` + API. Do **not** set `root /var/www/...` for the SPA or deploys will not update the public site. Example: [deploy/nginx/worldcup.conf.example](../deploy/nginx/worldcup.conf.example).

**Login rate limit (recommended):** see `deploy/nginx/worldcup-rate-limit.conf.snippet` — limits `/api/auth/login` to ~10 requests/minute per IP.

**Database backups:** [DATABASE_BACKUP.md](./DATABASE_BACKUP.md) — `npm run db:backup`; runs automatically before each deploy. **Data protection:** [DATA_PROTECTION.md](./DATA_PROTECTION.md) — deploy aborts if predictions would be destroyed.

---

## Wipe live database (empty start for friends)

**Before the real tournament:** follow **[LAUNCH_RULES.md](./LAUNCH_RULES.md)** — this wipe is **required once** before inviting players. The organiser admin is recreated automatically and is **excluded from the league table**.

**Warning:** Removes **all users**, predictions, sessions, and stored results. A retrieval archive is written first (`npm run db:archive`); if that fails, the wipe **aborts**. Requires explicit confirmation flags when predictions exist — see [DATA_PROTECTION.md](./DATA_PROTECTION.md).

**Preferred (GitHub):** Actions → **Wipe live database (manual)** → Run workflow → set input `confirm` to **`WIPE_LIVE_DATABASE`**. Uses the same deploy SSH secrets; pulls `main`, runs `scripts/wipe-live-database.sh`, verifies row counts, restarts systemd.

**Or on the VM** (not from the deploy workflow on push):

```bash
cd ~/World-Cup-Project
git pull --ff-only origin main
bash scripts/wipe-live-database.sh
```

Manual steps equivalent to the script:

```bash
sudo systemctl stop worldcup worldcup-jobs 2>/dev/null || true
npm run db:archive
CONFIRM_LIVE_DB_PURGE=yes CONFIRM_DESTROY_PREDICTIONS=yes npm run db:purge:live
sudo systemctl start worldcup-jobs worldcup 2>/dev/null || true
```

Verify empty:

```bash
sqlite3 data.db "SELECT COUNT(*) FROM users;"
# expect 0
```

Recreate the bootstrap organiser after a wipe:

```bash
npm run db:ensure-admin
```

Log in as `ADMIN_USERNAME`, then add players via **Admin → Players**.

**Never** run `db:purge` / `db:purge:live` from CI/deploy scripts. **`Debug`** local DB: use `npm run db:purge` without `--confirm-live` when `NODE_ENV` is not `production`.

---

## Processes that must stay running

| Process | Command | Role |
|---------|---------|------|
| API + SPA | `npm run server` or `worldcup.service` | Serves app on :8787 |
| Jobs | `npm run jobs` or `worldcup-jobs.service` | Locks + football-data sync |

---

## Related

- [BRANCHING.md](./BRANCHING.md) — `main` vs `Debug`  
- [GO_LIVE.md](./GO_LIVE.md) — smoke tests before inviting friends  
- [README.md](./README.md) — full documentation index
