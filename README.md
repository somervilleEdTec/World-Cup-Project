# World Cup Boys

**Welcome to the Shiva Bowl** — friends-and-family predictions for FIFA World Cup 2026.

**Live site:** https://worldcup.dosums.uk  
**Repository:** https://github.com/somervilleEdTec/World-Cup-Project

---

## Branches

| Branch | Use |
|--------|-----|
| **`main`** | Production — push updates the live site (GitHub Actions) |
| **`Debug`** | Development on your PC — **never** deploys live |

Full workflow: **[docs/BRANCHING.md](docs/BRANCHING.md)** · Doc index: **[docs/README.md](docs/README.md)**

---

## Quick start (`Debug` on your PC)

### Windows (PowerShell)

```powershell
git checkout Debug
git pull origin Debug
.\scripts\Test-LocalSite.ps1              # install, migrate, test, build
.\scripts\Test-LocalSite.ps1 -Mode Serve  # http://localhost:8787/login
```

Register with name + password (≤6 chars) + sign-up password **`MadSlags1`**.

### macOS / Linux

```bash
git checkout Debug
npm install
npm run migrate
npm test && npm run build
npm run server    # :8787
npm run jobs      # locks + football-data sync (optional token)
```

---

## Release to production

```bash
git checkout main
git merge Debug
npm test && npm run build
git push origin main
```

Ops runbook: **[docs/PRODUCTION.md](docs/PRODUCTION.md)**

---

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL (optional); omit for SQLite `data.db` |
| `JOIN_PASSWORD` | Sign-up gate (default `MadSlags1`) |
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
