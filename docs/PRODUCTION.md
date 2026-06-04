# Production environment — World Cup Boys (live)

**Last updated:** 2026-06-03  
**Status:** **Live and operational** — https://worldcup.dosums.uk  
**Automated deploy:** **Active** — every push to **`main`** runs [deploy-main.yml](../.github/workflows/deploy-main.yml) (see § Auto-deploy below)

---

## Operational summary

| Component | Status |
|-----------|--------|
| Public site | **https://worldcup.dosums.uk** |
| Oracle VM | `ubuntu@84.8.146.237` (`worldcup-boys`) |
| App on server | `/home/ubuntu/World-Cup-Project` on branch **`main`** |
| GitHub Actions secrets | `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_SSH_KEY` configured |
| Auto-deploy | Push to **`main`** → CI → SSH → `deploy-production.sh` |
| **`Debug` branch** | Local PC only — **never** updates production |

**Day-to-day release:** merge to `main`, `git push origin main` — live site updates after a green Actions run.

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

**Health check on server:** `curl -s http://127.0.0.1:8787/api/health` — returns `{ ok: true, commit: "<git-sha>" }` after deploy (`DEPLOY_COMMIT` in `.env`).

**`Debug` branch** never deploys — [BRANCHING.md](./BRANCHING.md).

---

## Auto-deploy (GitHub Actions)

| Branch | Workflow | Live site |
|--------|----------|-----------|
| **`main`** | [deploy-main.yml](../.github/workflows/deploy-main.yml) | Updates on each green run |
| **`Debug`** | None | Never updated |

### What runs on push to `main`

1. **CI** — `npm ci`, `npm test`, `npm run build`
2. **Deploy** — SSH → `scripts/deploy-production.sh`: pull `main`, `npm ci` (with dev deps), migrate, build, restart systemd, health check

Manual re-run: **Actions → Deploy main (production) → Run workflow** (on branch **`main`** only).

### SSH key for `DEPLOY_SSH_KEY` secret

Paste the **entire** private key file (`ssh-key-2026-06-02.key`), including `-----BEGIN` through `-----END`. Not the `.pub` file, not a file path, no extra quotes.

Test from Windows:

```powershell
ssh -i "C:\Users\tomso\Desktop\ssh-key-2026-06-02.key" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa ubuntu@84.8.146.237 "curl -s http://127.0.0.1:8787/api/health"
```

### Deploy troubleshooting

| Symptom | Fix |
|---------|-----|
| `ssh.ParsePrivateKey: ssh: no key found` | Re-paste full private key into `DEPLOY_SSH_KEY` |
| Permission denied (publickey) | Private key in secret; matching public key on server |
| `tsx: not found` | `deploy-production.sh` unsets `NODE_ENV` during `npm ci` / build |
| `sudo: a password is required` | Install sudoers snippet below |
| Health check fails | `systemctl status worldcup`; nginx → `127.0.0.1:8787` |
| Old UI after deploy | Fix `VITE_API_BASE_URL` in `.env` and redeploy |

---

## First-time server setup (completed 2026-06-03 — reference for rebuilds)

```bash
cd ~/World-Cup-Project
git checkout main
cp .env.example .env
nano .env          # see above
npm install
npm run migrate
npm run build
```

### systemd (recommended)

Edit `deploy/systemd/*.service` if needed: `User=ubuntu`, `WorkingDirectory=/home/ubuntu/World-Cup-Project`.

```bash
sudo cp deploy/systemd/worldcup.service deploy/systemd/worldcup-jobs.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now worldcup-jobs worldcup
```

Passwordless restart for GitHub deploy:

```bash
sudo tee /etc/sudoers.d/worldcup-deploy <<'EOF'
ubuntu ALL=(root) NOPASSWD: /bin/systemctl restart worldcup, /bin/systemctl restart worldcup-jobs
EOF
sudo chmod 440 /etc/sudoers.d/worldcup-deploy
```

### Manual deploy (same as CI)

```bash
cd ~/World-Cup-Project
bash scripts/deploy-production.sh
```

---

## nginx / HTTPS

Public traffic: **https://worldcup.dosums.uk** → proxy to **http://127.0.0.1:8787**.

TLS certificate must cover `worldcup.dosums.uk`. Typical nginx `proxy_pass http://127.0.0.1:8787;` for API and static assets.

**Login rate limit (recommended):** see `deploy/nginx/worldcup-rate-limit.conf.snippet` — limits `/api/auth/login` to ~10 requests/minute per IP.

**Database backups:** [DATABASE_BACKUP.md](./DATABASE_BACKUP.md) — `npm run db:backup`; runs automatically before each deploy.

---

## Wipe live database (empty start for friends)

**Before the real tournament:** follow **[LAUNCH_RULES.md](./LAUNCH_RULES.md)** — this wipe is **required once** before inviting players. The organiser admin is recreated automatically and is **excluded from the league table**.

**Warning:** Removes **all users**, predictions, sessions, and stored results. Schema is recreated empty; bootstrap admin is re-added via `npm run db:ensure-admin`. After restart, `npm run jobs` / server startup may **re-import kickoffs and finished scores** from football-data.org (expected on production).

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
npm run db:purge:live
# equivalent: CONFIRM_LIVE_DB_PURGE=yes npm run db:purge
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
