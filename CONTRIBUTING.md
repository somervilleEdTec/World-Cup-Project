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

```powershell
cd C:\Users\tomso\World-Cup-Project
git checkout Debug
git pull origin Debug
Copy-Item .env.debug.example .env
npm install
npm run seed:debug
.\scripts\Test-LocalSite.ps1 -Mode Serve
```

Use your actual clone path if not `C:\Users\tomso\World-Cup-Project`. **Do not** run `git`/`npm` from Desktop.

- **`DEBUG_LOCAL=1`** — no football-data.org sync  
- **`RESULTS_MODE=none`** — matches default empty DB after **`npm run seed:debug`**  
- **`npm run seed:debug-random`** — optional random picks and group results  

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
