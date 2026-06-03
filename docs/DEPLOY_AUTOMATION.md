# Automated deploy on push to `main` (live site only)

| Branch | GitHub Actions | Live website |
|--------|----------------|--------------|
| **`main`** | **deploy-main.yml** — test + SSH deploy | **Updated** on each push (when secrets configured) |
| **`Debug`** | **None** | **Never** updated — test on your PC only |

When you push to **`main`**, GitHub Actions runs tests, then SSHs to your production server and runs `scripts/deploy-production.sh` (must be on `main` branch on the server).

**Manual deploy:** SSH to the host, `cd` to app dir, ensure `git checkout main`, then `bash scripts/deploy-production.sh`.

**Debug:** See [DEBUG_BRANCH.md](./DEBUG_BRANCH.md) — do not deploy from Debug.

---

## One-time setup

### 1. Production server (first time)

Clone the app on the VPS (path must match `DEPLOY_PATH` later, e.g. `/opt/world-cup-boys`):

```bash
sudo mkdir -p /opt/world-cup-boys
sudo chown "$USER":"$USER" /opt/world-cup-boys
git clone https://github.com/somervilleEdTec/World-Cup-Project.git /opt/world-cup-boys
cd /opt/world-cup-boys
git checkout main
cp .env.example .env
# Edit .env: FOOTBALL_DATA_TOKEN, VITE_API_BASE_URL, JOIN_PASSWORD, NODE_ENV=production
npm install
bash scripts/deploy-production.sh
```

### 2. systemd (recommended)

```bash
sudo cp deploy/systemd/worldcup.service deploy/systemd/worldcup-jobs.service /etc/systemd/system/
# Edit User= and WorkingDirectory= if not /opt/world-cup-boys and www-data
sudo systemctl daemon-reload
sudo systemctl enable --now worldcup-jobs worldcup
```

Allow the deploy user to restart without a password (replace `deploy` with your SSH user):

```bash
sudo tee /etc/sudoers.d/worldcup-deploy <<'EOF'
deploy ALL=(root) NOPASSWD: /bin/systemctl restart worldcup, /bin/systemctl restart worldcup-jobs
EOF
sudo chmod 440 /etc/sudoers.d/worldcup-deploy
```

### 3. Deploy SSH key on the server

On your **laptop** (or a one-off machine):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/worldcup-deploy -N "" -C "github-actions-deploy"
```

Add the **public** key to the server:

```bash
ssh-copy-id -i ~/.ssh/worldcup-deploy.pub deploy@YOUR_SERVER_HOST
```

Test:

```bash
ssh -i ~/.ssh/worldcup-deploy deploy@YOUR_SERVER_HOST 'cd /opt/world-cup-boys && bash scripts/deploy-production.sh'
```

### 4. GitHub repository secrets (required for deploy to run)

In GitHub: **Settings → Secrets and variables → Actions → New repository secret**

If any required secret is missing, the workflow fails at **Check deploy secrets** with a clear list (not `missing server host`).

| Secret | Example | Required |
|--------|---------|----------|
| `DEPLOY_HOST` | `203.0.113.10` or `worldcup.example.com` | **Yes** — empty causes deploy failure |
| `DEPLOY_USER` | `deploy` or `ubuntu` | **Yes** |
| `DEPLOY_SSH_KEY` | Full private key file contents (`worldcup-deploy`) | **Yes** |
| `DEPLOY_PATH` | `/opt/world-cup-boys` | **Yes** |
| `DEPLOY_PORT` | `22` | No — omit to use SSH default port 22 |

Do **not** put `FOOTBALL_DATA_TOKEN` in GitHub secrets unless you prefer CI to inject it — keep secrets in the server `.env` only.

### 5. `.env` on the server (required)

```env
NODE_ENV=production
FOOTBALL_DATA_TOKEN=your_football_data_org_token
VITE_API_BASE_URL=https://your-public-domain.com
JOIN_PASSWORD=your_shared_signup_password
PORT=8787
```

`VITE_API_BASE_URL` must be your public HTTPS URL (same origin nginx proxies to `:8787`).

Optional:

```env
SYSTEMD_API_SERVICE=worldcup
SYSTEMD_JOBS_SERVICE=worldcup-jobs
```

---

## What runs on each push to `main`

Workflow file: `.github/workflows/deploy-main.yml` (not used for `Debug`).

1. **CI job** — `npm ci`, `npm test`, `npm run build` (smoke build on GitHub).
2. **Deploy job** — only if `github.ref == refs/heads/main` — SSH → `scripts/deploy-production.sh`:
   - `git pull origin main`
   - `npm ci`, `npm run migrate`, `npm run build` (with server `.env`)
   - `sudo systemctl restart worldcup-jobs worldcup` (if units exist)
   - `curl` health check on `http://127.0.0.1:8787/api/health`

View runs: GitHub → **Actions** → **Deploy main (production)**.

**Manual deploy:** Actions → **Deploy main (production)** → **Run workflow** (must run on **`main`** branch).

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Deploy job skipped / fails immediately | Run **Check deploy secrets** step — set all four required secrets |
| `missing server host` (old runs) | `DEPLOY_HOST` secret empty or not created |
| Permission denied (publickey) | `DEPLOY_SSH_KEY` is the **private** key; public key in `~/.ssh/authorized_keys` on server |
| `sudo: a password is required` | sudoers snippet for `systemctl restart` |
| Health check fails | `systemctl status worldcup`; nginx proxy to `127.0.0.1:8787` |
| Site old UI after deploy | `VITE_API_BASE_URL` in `.env` wrong; rebuild needs correct URL |
| No live scores | `FOOTBALL_DATA_TOKEN` in server `.env`; `worldcup-jobs` running |

---

## Related

- [DEPLOY.md](./DEPLOY.md) — nginx, Postgres, hosting  
- [DEPLOY_UPDATE.md](./DEPLOY_UPDATE.md) — manual pull steps (superseded by automation when secrets are set)  
- [BRANCHING.md](./BRANCHING.md) — `main` vs `Debug`
