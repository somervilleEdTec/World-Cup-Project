# GitHub as the deployment control plane

**Last updated:** 2026-06-04

Production releases are **fully driven from GitHub**. You do not need to SSH to the Oracle VM for normal deploys or debugging failed releases — use **Actions** logs and re-runs.

---

## Architecture

```text
Cursor Cloud Agent (or you) → push/merge to main on GitHub
        │
        ▼
GitHub Actions: Deploy main (production)
  1. ci job     — npm ci, npm test, npm run build (ubuntu-latest)
  2. deploy job — SSH → scripts/deploy-production.sh on VM
  3. verify     — curl https://worldcup.dosums.uk/api/health must match github.sha
        │
        ▼
https://worldcup.dosums.uk
```

| Branch | Workflow | Deploys live? |
|--------|----------|---------------|
| **`main`** | [deploy-main.yml](../.github/workflows/deploy-main.yml) | **Yes** — every green push |
| **`Debug`** | [ci-debug.yml](../.github/workflows/ci-debug.yml) | **No** — test + build only |

---

## Day-to-day (no SSH)

1. Work on **`Debug`** (local or cloud workspace); push → **CI Debug** runs automatically.
2. When ready for live: merge **`Debug` → `main`** (PR or merge).
3. Push **`main`** (or merge on GitHub) → **Deploy main** runs.
4. Open **Actions** → latest run:
   - Red **ci** → fix tests/build in repo, push again.
   - Red **Deploy over SSH** → read SSH log (`npm ci`, `better-sqlite3`, `.env`, sudo).
   - Red **Verify live site** → deploy script ran but public health ≠ `github.sha` (systemd/nginx).

**Re-deploy same commit:** Actions → **Deploy main (production)** → **Run workflow** (branch `main`).

---

## One-time VM setup (then GitHub owns deploys)

Only needed for a **new** server or rebuild. Two options:

### A. Manual SSH (once)

```bash
cd /home/ubuntu/World-Cup-Project
git checkout main
git pull origin main
bash scripts/bootstrap-production-host.sh
# create .env (FOOTBALL_DATA_TOKEN, VITE_API_BASE_URL, ADMIN_*)
npm ci && npm run migrate && npm run build
sudo systemctl start worldcup-jobs worldcup
```

### B. GitHub Actions (no SSH on your PC)

**Actions → Bootstrap production host (manual) → Run workflow**

- Input confirm: `BOOTSTRAP_PRODUCTION`
- Uses same `DEPLOY_*` secrets as deploy
- Installs `build-essential`, systemd units, and **passwordless sudo** for deploy (`deploy/sudoers/worldcup-deploy`)

Then create **`.env` on the VM once** (secrets stay off GitHub). See [PRODUCTION.md](./PRODUCTION.md).

### C. Existing VM — one SSH command for sudoers (if deploy fails on sudo)

```bash
cd /home/ubuntu/World-Cup-Project && git pull origin main && bash scripts/ensure-deploy-sudoers.sh
```

(Enter sudo password once if prompted.) After that, GitHub deploys manage systemd automatically.

---

## What runs on the VM (`deploy-production.sh`)

| Step | Purpose |
|------|---------|
| `git pull origin main` | Match GitHub `main` |
| `npm ci` (+ retry after `rm -rf node_modules`) | Install deps; `MAKEFLAGS=-j1` for `better-sqlite3`; verifies **tsx** present |
| `npm run migrate` | Schema |
| `npm run build` | SPA → `dist/` |
| `DEPLOY_COMMIT` in `.env` | `/api/health` reports commit |
| `restart-production-services.sh` | Kills stray :8787, installs systemd units (`node` + `tsx/cli.mjs`), starts services |
| `verify-production-deploy.sh` | Fails deploy if health/commit/dist/systemd wrong |

If verify fails, the SSH step fails → the **whole workflow is red** → the public health step does not pass.

---

## Debugging failed deploys (in GitHub)

| Failed step | Where to look |
|-------------|----------------|
| **Test and build** | Job log: Vitest, TypeScript, ESLint |
| **Deploy over SSH** | Log tail: `VERIFY_FAIL`, `npm error`, `ERROR: better-sqlite3`, missing `.env` |
| **Verify live site** | Health JSON in log; compare `commit` to commit SHA at top of workflow |

Common fixes (push to `main` after code fix, or re-run workflow):

- **`better-sqlite3` / `sqlite3.o.d.raw` / `better_sqlite3.cpp: No such file`** — corrupt `node_modules`. On VM: `bash scripts/repair-npm-on-server.sh` (after `build-essential`). Deploy also deep-cleans npm cache on retry.
- **`sudo: a password is required`** — run `bootstrap-production-host.sh` for sudoers.
- **Health commit mismatch** — deploy finished but service not restarted; check `systemctl status worldcup`.
- **Missing `FOOTBALL_DATA_TOKEN` in .env`** — SSH once to edit `.env` (not in GitHub secrets by design).

---

## Secrets (GitHub → Settings → Actions)

| Secret | Purpose |
|--------|---------|
| `DEPLOY_HOST` | e.g. `84.8.146.237` |
| `DEPLOY_USER` | `ubuntu` |
| `DEPLOY_PATH` | `/home/ubuntu/World-Cup-Project` |
| `DEPLOY_SSH_KEY` | Full private key file |

**Not in GitHub:** `FOOTBALL_DATA_TOKEN`, `ADMIN_PASSWORD` — only in server `.env`.

---

## Agent / Cursor workflow

Cloud agents should:

1. Edit on **`Debug`**, push → wait for **CI Debug** green.
2. Merge to **`main`** and push (with owner permission for production).
3. Rely on **Deploy main** + public health check — **do not** ask the owner to SSH unless bootstrap or `.env` is missing.

---

## Related docs

- [PRODUCTION.md](./PRODUCTION.md) — VM details, nginx, wipe DB  
- [BRANCHING.md](./BRANCHING.md) — `main` vs `Debug`  
- [DEBUG.md](./DEBUG.md) — local policy (optional; CI replaces most PC testing)
