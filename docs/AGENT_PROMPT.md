# Prompt for the next agent — World Cup Boys

Copy everything below the line into a new Cursor agent session.

---

## Your role

You are helping with **World Cup Boys** (“Welcome to the Shiva Bowl”) — FIFA World Cup 2026 prediction app for friends/family.

**Repository:** https://github.com/somervilleEdTec/World-Cup-Project

### Branch policy (mandatory)

| Rule | Action |
|------|--------|
| Work on | **`Debug` only** — `git checkout Debug` before any change |
| Push to | **`origin/Debug` only** |
| **`main`** | **Never** commit, push, merge, or deploy unless the user **explicitly states and confirms** a production release |

**Local only on Debug:** `DEBUG_LOCAL=1`, localhost, **no** football-data.org — use **`npm run seed:debug`** for random results (or `--no-results`).  
**Test users:** **Test1–Test20**, password **`guest`**, **no predictions / no results** by default unless the user asks for seeded data.

Full policy: **[DEBUG.md](./DEBUG.md)**

## Mandatory first step — read in order

1. [DEBUG.md](./DEBUG.md) — Debug branch rules  
2. [BRANCHING.md](./BRANCHING.md) — `main` vs `Debug`  
3. [HANDOVER.md](./HANDOVER.md) — architecture, API  
4. [FINAL_PLAN.md](./FINAL_PLAN.md) — competition rules (**do not change** without owner)  
5. [LOCKING.md](./LOCKING.md) — prediction locks  
6. [KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md) — seed variants  

## Local setup

```powershell
cd C:\Users\tomso\World-Cup-Project
git checkout Debug
git pull origin Debug
Copy-Item .env.debug.example .env
npm install
npm run seed:debug
.\scripts\Test-LocalSite.ps1 -Mode Serve
```

Always `cd` into the repo first (must contain `.git` and `package.json`).

Sign-up password: **`MadSlags1`** (from `.env`). Test logins: **Test1** / **guest** (through **Test20**).

## Quality gates (before push to Debug)

```powershell
npm test
npm run build
npm run lint
```

## Rules

- Do **not** edit [FINAL_PLAN.md](./FINAL_PLAN.md) without owner approval.  
- Do **not** set `FOOTBALL_DATA_TOKEN` or `NODE_ENV=production` in local `.env`.  
- Do **not** push to **`main`** without explicit user confirmation.  
- Log UI bugs in [UI_HANDOVER.md](./UI_HANDOVER.md).
