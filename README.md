# World Cup Boys

**Welcome to the Shiva Bowl.**

Friends-and-family prediction app for FIFA World Cup 2026 (48 teams, 12 groups, knockout bracket through the final).

## New agent?

1. Read **[docs/AGENT_PROMPT.md](docs/AGENT_PROMPT.md)** — includes instructions to confirm next steps with the owner before coding.
2. Read **[docs/HANDOVER.md](docs/HANDOVER.md)** — full implementation status and architecture.
3. Task tracker: **[docs/TODO.md](docs/TODO.md)**

Product rules (source of truth): **[docs/FINAL_PLAN.md](docs/FINAL_PLAN.md)**

## Quick start

```bash
npm install
npm run server    # API on :8787
npm run jobs      # locks + football-data sync (optional token)
npm run dev       # frontend on :5173
```

```bash
npm test          # 11 unit tests
npm run build
```

Log in at `/login`. Routes except login require authentication.

## Environment

| Variable | Purpose |
|----------|---------|
| `FOOTBALL_DATA_TOKEN` | football-data.org API token (sync + jobs) |
| `VITE_API_BASE_URL` | Frontend API base (default `http://localhost:8787`) |
| `PORT` | API port (default `8787`) |

## Admin

After registering in the UI:

```bash
sqlite3 data.db "UPDATE users SET is_admin = 1 WHERE email = 'you@example.com';"
```

## Branch / PR

| Item | Link |
|------|------|
| Latest feature branch | `cursor/world-cup-p0-complete-21eb` |
| Draft PR (P0 + P1 complete) | https://github.com/somervilleEdTec/World-Cup-Project/pull/2 |
| Earlier planning PR | https://github.com/somervilleEdTec/World-Cup-Project/pull/1 |

## Key features (current)

- Group-stage and knockout predictions with draft/commit and rolling KO locks
- FIFA 2026 bracket engine with official third-place scenario mappings
- Leaderboard with group-position and tournament bonus scoring
- football-data.org result sync (with internal match ID mapping)
- Comparison view across players; rules page at `/rules`

## Docs index

| File | Description |
|------|-------------|
| [docs/AGENT_PROMPT.md](docs/AGENT_PROMPT.md) | Copy-paste prompt for the next agent |
| [docs/HANDOVER.md](docs/HANDOVER.md) | Technical handover |
| [docs/TODO.md](docs/TODO.md) | Backlog (P0/P1 done; P2+ open) |
| [docs/FINAL_PLAN.md](docs/FINAL_PLAN.md) | Locked competition rules |
| [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) | Original exploration (superseded for rules) |

## Regenerate third-place mappings

If FIFA updates Annex C:

```bash
node scripts/generate-third-place-map.mjs
```
