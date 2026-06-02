# Prompt for the next agent — stress testing & debugging

Copy everything below the line into a new Cursor agent session.

---

## Your role

You are taking over **World Cup Boys** (“Welcome to the Shiva Bowl”) — FIFA World Cup 2026 prediction app for friends/family.

**Repository:** https://github.com/somervilleEdTec/World-Cup-Project  
**Branch:** `main`  
**Primary task:** **Stress testing, regression testing, and bug fixes** before go-live with ~10 friends.

The product owner completed a **UI/UX polish pass** (PRs #7–#11). Your job is to **break it, fix it, and harden it** — not to rebuild features.

## Mandatory first step — read in order

1. [docs/STRESS_TEST_HANDOVER.md](./STRESS_TEST_HANDOVER.md) — **start here** (playbook + current behaviour)
2. [docs/HANDOVER.md](./HANDOVER.md) — architecture, API, environment
3. [docs/FINAL_PLAN.md](./FINAL_PLAN.md) — competition rules (**do not change** without owner)
4. [docs/UI_HANDOVER.md](./UI_HANDOVER.md) — completed owner UI work + stress-test log table

Then run locally, execute the stress-test checklist, log issues in UI_HANDOVER §6, fix with PRs to `main`.

## Local setup (Windows — owner)

```powershell
git pull origin main
npm install
npm run db:purge              # optional fresh start
.\scripts\Test-LocalSite.ps1 -Mode Serve
```

Browser: **http://localhost:8787/login**

Register: **Name** + password (≤6 chars) + sign-up password **`MadSlags1`**

Admin:

```powershell
sqlite3 data.db "UPDATE users SET is_admin = 1 WHERE display_name = 'YourName';"
```

**macOS/Linux:**

```bash
npm install && npm run migrate && npm test && npm run build
npm run server    # :8787
npm run jobs      # optional — locks + sync
```

## Current UX summary (do not “fix” back without owner)

- **Tournament Results** tab — standalone; flag dropdowns; save → locked at first kickoff
- **Group Stage** — auto-save scores; **Lock group** (one-way); league-style projected table
- **Knockout** — auto-save; only confirmed fixtures; needs 72 group picks server-side
- **Missing picks** list on all My Picks tabs
- **Welcome** page has rules; **no** Rules nav tab
- **No** email auth; **no** commit / Accept / Amend UI

## Quality gates before every PR

```bash
npm test        # 36 tests
npm run build
```

Manual: 2 users, all three My Picks tabs, lock a group, leaderboard, comparison, mobile width ~375px.

## Conventions

- Do not edit [docs/FINAL_PLAN.md](./FINAL_PLAN.md) without owner approval
- Cloud agent branches: `cursor/<descriptive-name>-efbb`
- PR base: **`main`**
- Update [docs/UI_HANDOVER.md](./UI_HANDOVER.md) §6 with bugs found/fixed
- Do not edit Cursor artifact plans under `/opt/cursor/artifacts/plans/`

---

*End of agent prompt.*
