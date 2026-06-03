# Repository branches

**Last updated:** 2026-06-03

This repo uses **two branches only**:

| Branch | Purpose | Live website | GitHub Actions |
|--------|---------|--------------|----------------|
| **`main`** | Production code and live deploy | **Yes** — https://worldcup.dosums.uk updates on push | `deploy-main.yml` (test + deploy) |
| **`Debug`** | Development on your PC | **No** — never deploys | **None** — test locally only |

Historical `cursor/*` branches have been removed.

**Full Debug rules:** [DEBUG_BRANCH.md](./DEBUG_BRANCH.md)  
**Live site:** https://worldcup.dosums.uk — [PRODUCTION.md](./PRODUCTION.md) · **Deploy:** [DEPLOY_AUTOMATION.md](./DEPLOY_AUTOMATION.md)

---

## Workflow

### Day-to-day development (your PC — `Debug`)

```bash
git checkout Debug
git pull origin Debug
# … edit …
npm test
npm run build
# Windows: .\scripts\Test-LocalSite.ps1 -Mode Serve  →  http://localhost:8787
git add -A && git commit -m "Describe change"
git push origin Debug
```

**Pushing `Debug` does not run deploy and does not change the live site.**

Optional test data (Debug only, local DB):

```bash
ALLOW_KO_SEED=1 npm run seed:ko-environment
ALLOW_KO_SEED=1 npm run seed:complete-teams
```

### Release to live site (`main` only)

```bash
git checkout main
git pull origin main
git merge Debug
npm test && npm run build
git push origin main
```

GitHub Actions then deploys to the production server (requires secrets in [DEPLOY_AUTOMATION.md](./DEPLOY_AUTOMATION.md)).

**Never** run `scripts/deploy-production.sh` on the server unless the repo is on **`main`**.

---

## Fresh clone

```bash
git clone https://github.com/somervilleEdTec/World-Cup-Project.git
cd World-Cup-Project
git checkout Debug         # daily dev
# or
git checkout main          # production / live server clone
```

---

## Documentation

| Doc | Use |
|-----|-----|
| [PRODUCTION.md](./PRODUCTION.md) | **Live** — worldcup.dosums.uk, VM, GitHub secrets |
| [DEBUG_BRANCH.md](./DEBUG_BRANCH.md) | **Debug = local only, no live deploy** |
| [DEPLOY_AUTOMATION.md](./DEPLOY_AUTOMATION.md) | Auto-deploy on push to **`main`** |
| [LAUNCH_HANDOVER.md](./LAUNCH_HANDOVER.md) | Live website launch |
| [HANDOVER.md](./HANDOVER.md) | Architecture, API |
| [AGENT_PROMPT.md](./AGENT_PROMPT.md) | Dev agent prompt |
| [STRESS_TEST_HANDOVER.md](./STRESS_TEST_HANDOVER.md) | Stress-test playbook |

Work on **`Debug`**; merge to **`main`** when ready for production.

---

## Local database

`data.db` is **not** in git.

### On `main` (production server)

- Empty DB for real users; `FOOTBALL_DATA_TOKEN` in `.env`
- **No** `seed:*` scripts on production
- Deploy via GitHub Actions or `bash scripts/deploy-production.sh` on **`main`**

### On `Debug` (your PC)

- Use seeds and `npm run db:purge` freely for local testing
- See [KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md)
