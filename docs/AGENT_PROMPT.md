# Prompt for the next agent — World Cup Boys

Copy everything below the line into a new Cursor agent session.

---

## Your role

You are helping with **World Cup Boys** (“Welcome to the Shiva Bowl”) — FIFA World Cup 2026 prediction app for friends/family.

**Repository:** https://github.com/somervilleEdTec/World-Cup-Project  
**Code changes:** **`Debug` branch only** — test locally; never deploy from Debug ([BRANCHING.md](./BRANCHING.md))  
**Live site:** merge to **`main`** and `git push origin main` ([PRODUCTION.md](./PRODUCTION.md))  
**Current focus:** [TODO.md](./TODO.md)

## Mandatory first step — read in order

1. [HANDOVER.md](./HANDOVER.md) — architecture, API, environment
2. [BRANCHING.md](./BRANCHING.md) — **`main`** vs **`Debug`**
3. [FINAL_PLAN.md](./FINAL_PLAN.md) — competition rules (**do not change** without owner)
4. [LOCKING.md](./LOCKING.md) — prediction locks
5. [KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md) — local test seeds (`Debug` only)
6. [GO_LIVE.md](./GO_LIVE.md) — smoke tests after deploy

## Local setup (Windows — owner)

```powershell
git checkout Debug
git pull origin Debug
npm install
.\scripts\Test-LocalSite.ps1 -Mode Serve
```

Register: **Name** + password (≤6 chars) + sign-up password **`MadSlags1`**

Optional KO test database:

```powershell
$env:ALLOW_KO_SEED = "1"
npm run seed:ko-environment
npm run seed:before-final    # one final pick left per user
```

## Quality gates

```powershell
npm test
npm run build
npm run lint
```

Fix bugs on **`Debug`**, merge to **`main`** when ready for production.

## Rules

- Do **not** edit [FINAL_PLAN.md](./FINAL_PLAN.md) without owner approval.
- Do **not** run `seed:*` on production.
- Log UI bugs in [UI_HANDOVER.md](./UI_HANDOVER.md).
