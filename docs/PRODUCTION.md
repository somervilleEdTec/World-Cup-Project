# Production environment — World Cup Boys (live)

**Last updated:** 2026-06-03  
**Public site:** https://worldcup.dosums.uk  
**Automated deploy:** push to **`main`** → [DEPLOY_AUTOMATION.md](./DEPLOY_AUTOMATION.md)

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

**Oracle console access** (troubleshooting only): `oci-console` key + serial connection — see [DEPLOY_AUTOMATION.md](./DEPLOY_AUTOMATION.md).

---

## Server `.env` (live — not in git)

On the VM at `/home/ubuntu/World-Cup-Project/.env`:

```env
FOOTBALL_DATA_TOKEN=<your football-data.org token>
NODE_ENV=production
VITE_API_BASE_URL=https://worldcup.dosums.uk
JOIN_PASSWORD=<shared sign-up password>
PORT=8787
```

- Do **not** set `ALLOW_KO_SEED=1` on production.
- SQLite default (`data.db` in project dir) is fine for ~10 friends.

---

## GitHub Actions — enable auto-deploy

**Settings → Secrets and variables → Actions → Repository secrets** (four required):

| Secret name | Value for this server |
|-------------|------------------------|
| `DEPLOY_HOST` | `84.8.146.237` |
| `DEPLOY_USER` | `ubuntu` |
| `DEPLOY_PATH` | `/home/ubuntu/World-Cup-Project` |
| `DEPLOY_SSH_KEY` | Full contents of `C:\Users\tomso\Desktop\ssh-key-2026-06-02.key` (private key, all lines) |

Optional: `DEPLOY_PORT` = `22`

**Do not** store `FOOTBALL_DATA_TOKEN` in GitHub — only in server `.env`.

After secrets exist:

1. **Actions → Deploy main (production) → Run workflow** (branch `main`), or  
2. `git push origin main` — deploy runs automatically after CI passes.

**Debug branch** never deploys — [DEBUG_BRANCH.md](./DEBUG_BRANCH.md).

---

## First-time server setup (after clone)

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

TLS certificate must cover `worldcup.dosums.uk`. See [DEPLOY.md](./DEPLOY.md).

---

## Processes that must stay running

| Process | Command | Role |
|---------|---------|------|
| API + SPA | `npm run server` or `worldcup.service` | Serves app on :8787 |
| Jobs | `npm run jobs` or `worldcup-jobs.service` | Locks + football-data sync |

---

## Related

- [GO_LIVE.md](./GO_LIVE.md) — smoke tests before inviting friends  
- [BRANCHING.md](./BRANCHING.md) — `main` vs `Debug`  
- [LAUNCH_HANDOVER.md](./LAUNCH_HANDOVER.md) — registration launch checklist
