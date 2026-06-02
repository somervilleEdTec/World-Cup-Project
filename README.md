# World Cup Boys

**Welcome to the Shiva Bowl.**

Friends-and-family prediction app for FIFA World Cup 2026 (48 teams, 12 groups, knockout bracket through the final).

## New agent? (UI debug handoff)

1. **[docs/UI_HANDOVER.md](docs/UI_HANDOVER.md)** — current priority: owner-reported UI fixes  
2. **[docs/AGENT_PROMPT.md](docs/AGENT_PROMPT.md)** — copy-paste prompt; ask owner for issue list before coding  
3. **[docs/HANDOVER.md](docs/HANDOVER.md)** — architecture and API  
4. **[docs/TODO.md](docs/TODO.md)** — task tracker  

Product rules (source of truth): **[docs/FINAL_PLAN.md](docs/FINAL_PLAN.md)**

## Quick start

### Windows (PowerShell) — recommended for local testing

```powershell
cd C:\Users\tomso\World-Cup-Project   # your clone path
git pull origin main
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned   # once, if scripts are blocked
.\scripts\Test-LocalSite.ps1                          # install, migrate, test, build, smoke API
.\scripts\Test-LocalSite.ps1 -Mode Serve              # run site at http://localhost:8787/login
```

- **`-Mode Dev`** — API on :8787 + Vite on :5173 (hot reload) until you press Enter  

### macOS / Linux

```bash
npm install
npm run migrate
npm run server    # API + built SPA on :8787
npm run jobs      # locks + football-data sync (optional token)
npm run dev       # frontend dev on :5173 (optional)
```

```bash
npm test          # 30 tests
npm run build
```

Go-live: **[docs/GO_LIVE.md](docs/GO_LIVE.md)** · Production: **[docs/DEPLOY.md](docs/DEPLOY.md)**

Import kickoffs (optional):

```bash
FOOTBALL_DATA_TOKEN=your_token npm run seed:fixtures
```

Log in at `/login`. Routes except login require authentication.

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL (production); omit for SQLite `data.db` |
| `FOOTBALL_DATA_TOKEN` | football-data.org API token (sync, jobs, seed) |
| `VITE_API_BASE_URL` | Frontend API base (default `http://localhost:8787`) |
| `PORT` | API port (default `8787`) |

## Admin

After registering in the UI:

```bash
sqlite3 data.db "UPDATE users SET is_admin = 1 WHERE email = 'you@example.com';"
```

## Releases

| Tag | Notes |
|-----|--------|
| `v1.0.0` | Functional go-live (P0–P2) |
| `v1.1.0` | Knockout gating, SVG flags, Windows `Test-LocalSite.ps1`, UI handover docs |

**Branch:** `main` — https://github.com/somervilleEdTec/World-Cup-Project

## Key features

- Group-stage and knockout predictions with draft/commit and rolling KO locks
- **Group / Knockout tabs** — knockout picks only when official results confirm both teams
- FIFA 2026 bracket engine with official third-place scenario mappings
- Leaderboard with group-position and tournament bonus scoring
- football-data.org result sync (with internal match ID mapping)
- **SVG team flags** (not emoji)
- Comparison view across players; rules page at `/rules`

## Docs index

| File | Description |
|------|-------------|
| [docs/UI_HANDOVER.md](docs/UI_HANDOVER.md) | **UI debug handover (current)** |
| [docs/AGENT_PROMPT.md](docs/AGENT_PROMPT.md) | Prompt for the next agent |
| [docs/HANDOVER.md](docs/HANDOVER.md) | Technical handover |
| [docs/TODO.md](docs/TODO.md) | Backlog |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Production deployment |
| [docs/GO_LIVE.md](docs/GO_LIVE.md) | Pre-launch checklist |
| [docs/COMPLIANCE.md](docs/COMPLIANCE.md) | Plan compliance notes |
| [docs/FINAL_PLAN.md](docs/FINAL_PLAN.md) | Locked competition rules |

## Regenerate third-place mappings

If FIFA updates Annex C:

```bash
node scripts/generate-third-place-map.mjs
```
