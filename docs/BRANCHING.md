# Repository branches

**Last updated:** 2026-06-03

This repo uses **two branches only**:

| Branch | Purpose |
|--------|---------|
| **`main`** | Production-ready product. **Empty database** — no test users or fake results. Official scores come from **football-data.org** via `FOOTBALL_DATA_TOKEN`. |
| **`Debug`** | Active development, bugfixes, and agent work. May use `npm run seed:*` for local test data. Merge into `main` when stable. |

Historical `cursor/*` and feature branches have been removed. All current documentation lives on both branches.

---

## Workflow

### Day-to-day development

```bash
git checkout Debug
git pull origin Debug
# … edit, test …
git add -A && git commit -m "Describe change"
git push origin Debug
```

When a change is ready for production:

```bash
git checkout main
git pull origin main
git merge Debug
npm test && npm run build
git push origin main
```

### Fresh clone

```bash
git clone https://github.com/somervilleEdTec/World-Cup-Project.git
cd World-Cup-Project
git checkout main          # stable
# or
git checkout Debug         # latest dev (usually same as main until new commits land on Debug)
```

---

## Documentation

All docs under `docs/` are maintained on **both** branches:

| Doc | Use |
|-----|-----|
| [LAUNCH_HANDOVER.md](./LAUNCH_HANDOVER.md) | **Live website launch** (registration) |
| [AGENT_PROMPT_LAUNCH.md](./AGENT_PROMPT_LAUNCH.md) | Launch agent session prompt |
| [HANDOVER.md](./HANDOVER.md) | Architecture, API, environment |
| [AGENT_PROMPT.md](./AGENT_PROMPT.md) | Dev agent session prompt |
| [FINAL_PREDICTION_HANDOVER.md](./FINAL_PREDICTION_HANDOVER.md) | “One final prediction left” local seed |
| [KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md) | Local KO test seed |
| [STRESS_TEST_HANDOVER.md](./STRESS_TEST_HANDOVER.md) | Stress-test playbook |
| [AGENT_PROMPT_STRESS_TEST.md](./AGENT_PROMPT_STRESS_TEST.md) | **Next agent** — stress / environment QA |
| [LOCKING.md](./LOCKING.md) | Prediction lock specification |
| [GO_LIVE.md](./GO_LIVE.md) | Launch checklist |
| [DEPLOY.md](./DEPLOY.md) | Production deploy |
| [DEPLOY_AUTOMATION.md](./DEPLOY_AUTOMATION.md) | Auto-deploy on push to `main` (GitHub Actions) |

Work on **`Debug`**; merge doc updates to **`main`** with code.

---

## Local database

`data.db` is **not** in git and is **never** committed.

### On `main` (production-style)

```bash
npm run db:purge              # empty users, picks, and results
# Set FOOTBALL_DATA_TOKEN in .env
npm run migrate
npm run jobs                  # locks + live football-data.org sync (every 2 min)
npm run server                # also bootstraps kickoffs + results on start
```

Or: `./scripts/start-production.sh` (requires token; sets `NODE_ENV=production`).

Register users in the app — do **not** run `seed:ko-environment` on main unless you are intentionally testing on Debug.

### On `Debug` (local test data)

```bash
ALLOW_KO_SEED=1 npm run seed:before-final
ALLOW_KO_SEED=1 npm run seed:ko-environment
```

See [KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md) and [FINAL_PREDICTION_HANDOVER.md](./FINAL_PREDICTION_HANDOVER.md).
