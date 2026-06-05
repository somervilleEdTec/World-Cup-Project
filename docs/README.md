# Documentation index

**Repository:** https://github.com/somervilleEdTec/World-Cup-Project  
**Branches:** **`main`** (live) · **`Debug`** (local only) — [BRANCHING.md](./BRANCHING.md)

---

## By branch

### `main` — production

| Doc | Description |
|-----|-------------|
| [BRANCHING.md](./BRANCHING.md) | Merge Debug → main; what deploys live |
| [DEPLOY_CONTROL_PLANE.md](./DEPLOY_CONTROL_PLANE.md) | **Automated deploy** — merge to `main`, CI, VM pull timer, verify health |
| [PRODUCTION.md](./PRODUCTION.md) | Live URL, VM, `.env`, auto-deploy, systemd, wipe DB |
| [DATA_PROTECTION.md](./DATA_PROTECTION.md) | **Prediction preservation** — blocked destructive ops, retrieval archive |
| [DATABASE_BACKUP.md](./DATABASE_BACKUP.md) | Operational backups + retrieval-only archive |
| [LAUNCH_RULES.md](./LAUNCH_RULES.md) | **Mandatory** live launch: wipe DB, admin-only organiser |
| [GO_LIVE.md](./GO_LIVE.md) | Smoke tests and in-tournament ops |

### `Debug` — development (default)

**Windows:** run all commands from `cd C:\Users\tomso\World-Cup-Project` (see [DEBUG.md](./DEBUG.md)).

| Doc | Description |
|-----|-------------|
| [DEBUG.md](./DEBUG.md) | **Start here** — local-only, Test1–20/guest, no live API |
| [BRANCHING.md](./BRANCHING.md) | Workflow; never push `main` without confirmation |
| [HANDOVER.md](./HANDOVER.md) | Architecture, API, file map, env vars |
| [KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md) | `npm run seed:debug` and variants |
| [LOCKING.md](./LOCKING.md) | Prediction lock specification |
| [UI_HANDOVER.md](./UI_HANDOVER.md) | UI surfaces and bug log |
| [AGENT_PROMPT.md](./AGENT_PROMPT.md) | Copy-paste prompt for agent sessions |
| [TODO.md](./TODO.md) | Backlog and current focus |

---

## Product and compliance

| Doc | Description |
|-----|-------------|
| [FINAL_PLAN.md](./FINAL_PLAN.md) | Locked competition rules (owner approval to change) |
| [COMPLIANCE.md](./COMPLIANCE.md) | Implementation vs FINAL_PLAN checklist |

---

## Archive

Historical handovers, launch notes, and superseded deploy guides: [archive/README.md](./archive/README.md)
