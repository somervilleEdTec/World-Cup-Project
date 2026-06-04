# World Cup Boys

**World Cup Predictions** — friends-and-family predictions for FIFA World Cup 2026.

**Live site:** https://worldcup.dosums.uk  
**Repository:** https://github.com/somervilleEdTec/World-Cup-Project

---

## Branches

| Branch | Use |
|--------|-----|
| **`main`** | Production — push updates the live site (GitHub Actions) |
| **`Debug`** | Development on your PC — **never** deploys live |

**All work on `Debug`** — push to `main` only when explicitly confirmed.  
**Debug policy:** **[docs/DEBUG.md](docs/DEBUG.md)** · Workflow: **[docs/BRANCHING.md](docs/BRANCHING.md)**

---

## Quick start (`Debug` on your PC)

### Windows (PowerShell)

```powershell
cd C:\Users\tomso\World-Cup-Project
git checkout Debug
git pull origin Debug
Copy-Item .env.debug.example .env
npm run seed:debug                          # Test1–Test20 / guest, no picks, no results
.\scripts\Test-LocalSite.ps1 -Mode Serve    # http://localhost:8787/login
```

Run all commands **inside the repo** (not from Desktop). If the clone is elsewhere, `cd` to that folder instead.

Test logins (after `npm run seed:debug`): **Test1** … **Test20** / **`guest`** (password **`guest`**; change on first login if required). Organiser uses bootstrap admin — see [docs/DEBUG.md](docs/DEBUG.md).

### macOS / Linux

```bash
git checkout Debug
cp .env.debug.example .env
npm install
npm run seed:debug
npm run server    # :8787 — no live football-data when DEBUG_LOCAL=1
npm run jobs      # locks only in debug mode
```

---

## Release to production (explicit confirmation only)

Do **not** push `main` unless the owner asks and confirms.

```bash
git checkout main
git merge Debug
npm test && npm run build
git push origin main
```

Ops: **[docs/PRODUCTION.md](docs/PRODUCTION.md)**

---

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL (optional); omit for SQLite `data.db` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Bootstrap organiser account |
| `FOOTBALL_DATA_TOKEN` | football-data.org API |
| `VITE_API_BASE_URL` | Frontend API origin (production: `https://worldcup.dosums.uk`) |
| `PORT` | API port (default `8787`) |

Copy `.env.example` to `.env`.

---

## Key docs

| Doc | Audience |
|-----|----------|
| [docs/BRANCHING.md](docs/BRANCHING.md) | **`main`** / **`Debug`** workflow |
| [docs/HANDOVER.md](docs/HANDOVER.md) | Architecture and API |
| [docs/PRODUCTION.md](docs/PRODUCTION.md) | Live server and deploy |
| [docs/FINAL_PLAN.md](docs/FINAL_PLAN.md) | Competition rules |
| [docs/AGENT_PROMPT.md](docs/AGENT_PROMPT.md) | Agent session prompt |

---

## Admin

```bash
sqlite3 data.db "UPDATE users SET is_admin = 1 WHERE display_name = 'YourName';"
```
