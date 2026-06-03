# World Cup Boys

**Welcome to the Shiva Bowl.**

Friends-and-family prediction app for FIFA World Cup 2026 (48 teams, 12 groups, knockout bracket through the final).

## Branches

| Branch | Purpose |
|--------|---------|
| **`main`** | Production-ready release |
| **`Debug`** | Active development (merge to `main` when stable) |

See **[docs/BRANCHING.md](docs/BRANCHING.md)**.

## Live site (production)

**Production URL:** https://worldcup.dosums.uk  
**Testing URL:** https://world-cup-project.pages.dev (Cloudflare Pages — keep for deploy/UI tests; set `VITE_API_BASE_URL=https://worldcup.dosums.uk` on Pages)

**Next agent (before inviting friends):**

1. **[docs/POST_DEPLOY_HANDOVER.md](docs/POST_DEPLOY_HANDOVER.md)** — **start here** (GO_LIVE, admin, ops)  
2. **[docs/AGENT_PROMPT_POST_DEPLOY.md](docs/AGENT_PROMPT_POST_DEPLOY.md)** — copy-paste post-deploy agent prompt  
3. **[docs/DEPLOY_ORACLE_CLOUDFLARE.md](docs/DEPLOY_ORACLE_CLOUDFLARE.md)** — Oracle VM + Cloudflare Tunnel  

## Launching from scratch?

1. **[docs/LAUNCH_HANDOVER.md](docs/LAUNCH_HANDOVER.md)** — full deploy playbook  
2. **[docs/AGENT_PROMPT_LAUNCH.md](docs/AGENT_PROMPT_LAUNCH.md)** — launch agent prompt  
3. **[docs/DEPLOY.md](docs/DEPLOY.md)** · **[docs/GO_LIVE.md](docs/GO_LIVE.md)** — hosting and smoke tests  

## New agent? (development & debug)

1. **[docs/HANDOVER.md](docs/HANDOVER.md)** — architecture and API  
2. **[docs/AGENT_PROMPT.md](docs/AGENT_PROMPT.md)** — copy-paste prompt for a dev session  
3. **[docs/FINAL_PREDICTION_HANDOVER.md](docs/FINAL_PREDICTION_HANDOVER.md)** — end-of-tournament local debug  
4. **[docs/KO_ENVIRONMENT.md](docs/KO_ENVIRONMENT.md)** · **[docs/STRESS_TEST_HANDOVER.md](docs/STRESS_TEST_HANDOVER.md)** — test seeds and playbook  
5. **[docs/UI_HANDOVER.md](docs/UI_HANDOVER.md)** — completed UI work + bug log  
6. **[docs/TODO.md](docs/TODO.md)** — task tracker  

Product rules: **[docs/FINAL_PLAN.md](docs/FINAL_PLAN.md)**

## Quick start

### Windows (PowerShell) — recommended

```powershell
cd C:\Users\tomso\World-Cup-Project   # your clone path
git pull origin main
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned   # once, if scripts are blocked
.\scripts\Test-LocalSite.ps1                          # install, migrate, test, build
.\scripts\Test-LocalSite.ps1 -Mode Serve              # http://localhost:8787/login
```

- **`-Mode Dev`** — API on :8787 + Vite on :5173 (hot reload)  

**Fresh database (main / production):** `npm run db:purge` then set `FOOTBALL_DATA_TOKEN` in `.env` for live results from football-data.org

**Local test data (Debug only):** `ALLOW_KO_SEED=1 npm run seed:ko-environment` — see [docs/KO_ENVIRONMENT.md](docs/KO_ENVIRONMENT.md)

**Register:** Name + password (≤6 chars) + sign-up password **`MadSlags1`**

### macOS / Linux

```bash
npm install
npm run migrate
npm run server    # API + built SPA on :8787
npm run jobs      # locks + football-data sync (optional token)
npm run dev       # frontend dev on :5173 (optional)
```

```bash
npm test          # unit + integration tests
npm run build
```

Go-live: **[docs/GO_LIVE.md](docs/GO_LIVE.md)** · Production: **[docs/DEPLOY.md](docs/DEPLOY.md)**

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL (production); omit for SQLite `data.db` |
| `JOIN_PASSWORD` | Sign-up password gate (default `MadSlags1`) |
| `FOOTBALL_DATA_TOKEN` | football-data.org API token |
| `VITE_API_BASE_URL` | Frontend API base (default `http://localhost:8787`) |
| `PORT` | API port (default `8787`) |

## Admin

After registering in the UI:

```bash
sqlite3 data.db "UPDATE users SET is_admin = 1 WHERE display_name = 'YourName';"
```

## Key features (current `main`)

- **Tournament Results** — standalone top-four picks with flag dropdowns; locks at first kickoff
- **Group Stage** — auto-save scores, projected league table, **Lock group** (one-way)
- **Knockout Stage** — only officially confirmed fixtures; auto-save; 72 group picks required to save
- **Missing picks** summary on My Picks (all tabs)
- Name/password auth; rules on **Welcome** page
- FIFA 2026 bracket engine; football-data sync; leaderboard & comparison
- **SVG team flags**; mobile-friendly bottom navigation

## Docs index

| File | Description |
|------|-------------|
| [docs/STRESS_TEST_HANDOVER.md](docs/STRESS_TEST_HANDOVER.md) | **Stress test & debug (current)** |
| [docs/AGENT_PROMPT.md](docs/AGENT_PROMPT.md) | Prompt for the next agent |
| [docs/HANDOVER.md](docs/HANDOVER.md) | Technical handover |
| [docs/UI_HANDOVER.md](docs/UI_HANDOVER.md) | UI history + bug log |
| [docs/TODO.md](docs/TODO.md) | Backlog |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Production deployment |
| [docs/GO_LIVE.md](docs/GO_LIVE.md) | Pre-launch checklist |
| [docs/COMPLIANCE.md](docs/COMPLIANCE.md) | Plan compliance |
| [docs/FINAL_PLAN.md](docs/FINAL_PLAN.md) | Locked competition rules |

## Regenerate third-place mappings

If FIFA updates Annex C:

```bash
node scripts/generate-third-place-map.mjs
```

**Repository:** https://github.com/somervilleEdTec/World-Cup-Project · **Branch:** `main`
