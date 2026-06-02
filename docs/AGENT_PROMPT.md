# Prompt for the next agent

Copy everything below the line into a new Cursor agent session.

---

## Your role

You are taking over **World Cup Boys** (“Welcome to the Shiva Bowl”) — a FIFA World Cup 2026 prediction app for friends/family.

**Repository:** https://github.com/somervilleEdTec/World-Cup-Project  
**Branch:** `main` (all P0–P2 work merged; latest tag `v1.1.0`)  
**Primary task:** **UI debugging and polish** — the product owner has found UI issues while testing locally.

## Mandatory first step — do not skip

Read these files in order:

1. [docs/UI_HANDOVER.md](./UI_HANDOVER.md) — **start here** for UI work
2. [docs/HANDOVER.md](./HANDOVER.md) — architecture, API, features
3. [docs/FINAL_PLAN.md](./FINAL_PLAN.md) — competition rules (do not change without owner)
4. [docs/TODO.md](./TODO.md) — backlog

Then **message the product owner**:

> I’ve read the handover on `main`. I understand the next focus is **UI fixes** you found while testing.
>
> Please send your list of UI issues (page, what’s wrong, what you want instead). Screenshots are helpful.
>
> I won’t change the UI until you confirm the list (unless you say “start with mobile layout” etc.).

Wait for their reply. Then branch, fix, test, commit, push, open PR to `main`.

## Local setup (owner uses Windows)

**PowerShell** (repo root):

```powershell
git pull origin main
.\scripts\Test-LocalSite.ps1
.\scripts\Test-LocalSite.ps1 -Mode Serve
```

Browser: **http://localhost:8787/login**

**macOS/Linux:**

```bash
npm install && npm run migrate && npm test && npm run build
npm run server    # :8787 — serves API + built SPA
npm run dev       # :5173 — optional hot reload (needs API on :8787)
```

Admin: register in UI, then  
`sqlite3 data.db "UPDATE users SET is_admin = 1 WHERE email = 'you@example.com';"`

Optional: `FOOTBALL_DATA_TOKEN` in `.env` for sync/seed.

## What is already done (do not redo)

- P0/P1/P2: bracket engine, scoring, auth, Postgres/SQLite, migrations, deploy docs, integration tests, football-data sync/mapping
- **72 committed group picks** gate; server-side locks ([COMPLIANCE.md](./COMPLIANCE.md))
- **Group / Knockout tabs**; knockout only when official fixture confirmed
- **SVG flags** (`CountryFlag`, `public/flags/4x3/`)
- **Windows test script** `scripts/Test-LocalSite.ps1`
- **30 tests** passing

## Conventions

- Do not edit [docs/FINAL_PLAN.md](./FINAL_PLAN.md) without owner approval
- Cloud agent branches: `cursor/<descriptive-name>-21eb` (or owner preference)
- PR base: **`main`**
- Update [docs/UI_HANDOVER.md](./UI_HANDOVER.md) §5 when issues are fixed
- Do not edit Cursor artifact plans under `/opt/cursor/artifacts/plans/`

## Quality gates before PR

```bash
npm test
npm run build
```

Manual: two users, My Picks group flow, commit, Comparison, League Table.

---

*End of agent prompt.*
