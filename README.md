# World Cup Boys

**Welcome to the Shiva Bowl.**

Friends-and-family prediction app for FIFA World Cup 2026.

## New agent?

Start here: **[docs/HANDOVER.md](docs/HANDOVER.md)**

- Product rules: [docs/FINAL_PLAN.md](docs/FINAL_PLAN.md)
- Task tracker: [docs/TODO.md](docs/TODO.md)
- Original exploration: [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md)

## Quick start

```bash
npm install
npm run server    # API on :8787
npm run jobs      # locks + football-data sync (optional token)
npm run dev       # frontend
```

```bash
npm test
npm run build
```

## Environment

| Variable | Purpose |
|----------|---------|
| `FOOTBALL_DATA_TOKEN` | football-data.org API token |
| `VITE_API_BASE_URL` | Frontend API base (default `http://localhost:8787`) |

## Branch / PR

Active development: `cursor/world-cup-app-planning-4552` → PR #1 on `main`.
