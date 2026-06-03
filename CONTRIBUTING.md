# Contributing

## Branches — strict policy

| Branch | Who uses it | Push policy |
|--------|-------------|-------------|
| **`Debug`** | **All** day-to-day development | **Default** — commit and push here only |
| **`main`** | Production / live site | **Only** when the owner **explicitly asks and confirms** a release |

**Agents and contributors:** do **not** push to **`main`**, merge to **`main`**, or trigger production deploys unless the user clearly requests and confirms that step.

See **[docs/DEBUG.md](docs/DEBUG.md)** and **[docs/BRANCHING.md](docs/BRANCHING.md)**.

---

## Debug local setup

```bash
git checkout Debug
cp .env.debug.example .env
npm install
npm run seed:debug          # Test1–Test20 / guest, random results
.\scripts\Test-LocalSite.ps1 -Mode Serve   # Windows → http://localhost:8787
```

- **`DEBUG_LOCAL=1`** — no football-data.org sync  
- **`RESULTS_MODE=none`** — no results until seeded; use **`npm run seed:debug`** for random results  
- **`npm run seed:debug -- --no-results`** — users and picks only  

---

## Before you push to `Debug`

```bash
npm test
npm run build
npm run lint
```

---

## Production release (owner-confirmed only)

```bash
git checkout main
git merge Debug
npm test && npm run build
git push origin main
```

Ops: [docs/PRODUCTION.md](docs/PRODUCTION.md)
