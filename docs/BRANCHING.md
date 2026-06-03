# Branches: `main` and `Debug`

**Last updated:** 2026-06-03

This repository uses **two branches only**. All other remote branches should be deleted.

| Branch | Purpose | Live site | GitHub Actions |
|--------|---------|-----------|----------------|
| **`main`** | Production code | **Yes** — https://worldcup.dosums.uk | [deploy-main.yml](../.github/workflows/deploy-main.yml) on every push |
| **`Debug`** | Development on your PC | **No** — never deploys | **None** |

---

## `Debug` — local development only

| Rule | Enforcement |
|------|-------------|
| No live deploy | `deploy-main.yml` triggers only on **`main`** |
| No production script on wrong branch | `scripts/deploy-production.sh` exits if not on **`main`** |
| No CI on push | Pushing **`Debug`** does not run workflows |
| Test locally | `npm test`, `npm run build`, `.\scripts\Test-LocalSite.ps1` (Windows) |

### Daily workflow (PC)

```powershell
git checkout Debug
git pull origin Debug
# edit…
npm test
npm run build
.\scripts\Test-LocalSite.ps1 -Mode Serve    # http://localhost:8787
git push origin Debug                       # does NOT change the live site
```

Optional local test data (**Debug** only):

```powershell
$env:ALLOW_KO_SEED = "1"
npm run seed:ko-environment
npm run seed:complete-teams
```

Local database: use `npm run db:purge` freely. See [KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md).

---

## `main` — production and live deploy

### Release flow (Debug → live)

```bash
git checkout main
git pull origin main
git merge Debug
npm test && npm run build
git push origin main
```

A green **Deploy main (production)** run updates https://worldcup.dosums.uk. See [PRODUCTION.md](./PRODUCTION.md).

**Never** run `scripts/deploy-production.sh` on the server unless the repo is on **`main`**.

### Production server database

- Empty DB for real users; `FOOTBALL_DATA_TOKEN` in `.env`
- **No** `seed:*` on production
- Wipe live data: [PRODUCTION.md](./PRODUCTION.md) § Wipe live database

---

## Fresh clone

```bash
git clone https://github.com/somervilleEdTec/World-Cup-Project.git
cd World-Cup-Project
git checkout Debug    # daily development
# or
git checkout main     # production server clone
```

---

## Documentation map

| Audience | Start here |
|----------|------------|
| Branch workflow | This file |
| Live operations (`main`) | [PRODUCTION.md](./PRODUCTION.md) · [GO_LIVE.md](./GO_LIVE.md) |
| Development (`Debug`) | [HANDOVER.md](./HANDOVER.md) · [KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md) |
| Competition rules | [FINAL_PLAN.md](./FINAL_PLAN.md) |
| Full doc index | [README.md](./README.md) |
