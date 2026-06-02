# Repository branches

**Last updated:** 2026-06-02

This repo uses **two branches only**:

| Branch | Purpose |
|--------|---------|
| **`main`** | Production-ready product. Deploy and tag releases from here. |
| **`Debug`** | Active development, bugfixes, and agent work. Merge into `main` when stable. |

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
| [HANDOVER.md](./HANDOVER.md) | Architecture, API, environment |
| [AGENT_PROMPT.md](./AGENT_PROMPT.md) | Copy-paste agent session prompt |
| [FINAL_PREDICTION_HANDOVER.md](./FINAL_PREDICTION_HANDOVER.md) | “One final prediction left” local seed |
| [KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md) | Local KO test seed |
| [STRESS_TEST_HANDOVER.md](./STRESS_TEST_HANDOVER.md) | Stress-test playbook |
| [GO_LIVE.md](./GO_LIVE.md) | Launch checklist |
| [DEPLOY.md](./DEPLOY.md) | Production deploy |

Work on **`Debug`**; merge doc updates to **`main`** with code.

---

## Local database

`data.db` is not in git. After switching branches, re-seed if needed:

```bash
npm run seed:before-final    # end-of-tournament debug scenario
npm run seed:ko-environment  # lighter KO entry test
```
