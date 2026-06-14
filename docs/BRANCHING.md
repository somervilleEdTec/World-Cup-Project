# Branches: `main` and `Debug`

**Last updated:** 2026-06-05

This repository uses **two branches only**: **`Debug`** and **`main`**. **Never create any other branch** (no `cursor/*`, no feature branches, no PR branches).

**Policy:** All work — including plans, fixes, and features — happens on **`Debug`**. When changes are **working and owner-approved**, merge **`Debug` → `main`** to deploy live. See **[DEBUG.md](./DEBUG.md)**.

| Branch | Purpose | Live site | GitHub Actions |
|--------|---------|-----------|----------------|
| **`main`** | Production code | **Yes** — https://worldcup.dosums.uk | [deploy-main.yml](../.github/workflows/deploy-main.yml) — deploy + verify |
| **`Debug`** | Development | **No** | [ci-debug.yml](../.github/workflows/ci-debug.yml) — test + build only |

See **[DEPLOY_CONTROL_PLANE.md](./DEPLOY_CONTROL_PLANE.md)** — GitHub owns deploys; SSH only for one-time bootstrap / `.env`.

---

## `Debug` — local development only

| Rule | Enforcement |
|------|-------------|
| **Never create new branches** | No `git checkout -b`, no `cursor/*`, no feature/PR branches — **`Debug` only** |
| No live deploy | `deploy-main.yml` triggers only on **`main`** |
| No production script on wrong branch | `scripts/deploy-production.sh` exits if not on **`main`** |
| CI on push | **`Debug`** runs [ci-debug.yml](../.github/workflows/ci-debug.yml) (no deploy) |
| Test locally | `npm test`, `npm run build`, `.\scripts\Test-LocalSite.ps1` (Windows) |

### Daily workflow (PC)

```powershell
cd C:\Users\tomso\World-Cup-Project
git checkout Debug
git pull origin Debug
# edit…
npm test
npm run build
.\scripts\Test-LocalSite.ps1 -Mode Serve    # http://localhost:8787
git push origin Debug                       # does NOT change the live site
```

All commands run **inside the repo** — not from `C:\Users\tomso\Desktop`.

Local environment (**Debug** only):

```powershell
cd C:\Users\tomso\World-Cup-Project
Copy-Item .env.debug.example .env
npm run seed:debug
npm run seed:debug-random
```

See **[DEBUG.md](./DEBUG.md)** · [KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md). Use `npm run db:purge` to reset locally.

---

## `main` — production and live deploy

### Release flow (Debug → live)

**Only after changes on `Debug` are tested and owner-approved:**

**Windows (PowerShell) — inside the repo:**

```powershell
cd C:\Users\tomso\World-Cup-Project
git checkout main
git pull origin main
git merge Debug
npm test
git push origin main
```

Within **~3–5 minutes** the VM pull timer deploys. GitHub **Deploy main (production)** runs CI and verifies https://worldcup.dosums.uk/api/health. **No SSH required.**

```powershell
curl https://worldcup.dosums.uk/api/health
```

See [DEPLOY_CONTROL_PLANE.md](./DEPLOY_CONTROL_PLANE.md) · [PRODUCTION.md](./PRODUCTION.md).

**Note:** Server paths (`/home/ubuntu/World-Cup-Project`, `bash scripts/...`) are for the **Oracle VM** via SSH — not your Windows Desktop.

**Never** run `scripts/deploy-production.sh` on the server unless the repo is on **`main`**.

### Production server database

- Empty DB for real users; `FOOTBALL_DATA_TOKEN` in `.env`
- **No** `seed:*` on production
- Wipe live data: [PRODUCTION.md](./PRODUCTION.md) § Wipe live database

---

## Fresh clone

```powershell
cd C:\Users\tomso
git clone https://github.com/somervilleEdTec/World-Cup-Project.git
cd C:\Users\tomso\World-Cup-Project
git checkout Debug
```

Or `git checkout main` for a production-server clone.

---

## Documentation map

| Audience | Start here |
|----------|------------|
| **Debug** (default) | [DEBUG.md](./DEBUG.md) · this file |
| Live operations (`main`) | [PRODUCTION.md](./PRODUCTION.md) · [GO_LIVE.md](./GO_LIVE.md) |
| Development (`Debug`) | [HANDOVER.md](./HANDOVER.md) · [KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md) |
| Competition rules | [FINAL_PLAN.md](./FINAL_PLAN.md) |
| Full doc index | [README.md](./README.md) |
