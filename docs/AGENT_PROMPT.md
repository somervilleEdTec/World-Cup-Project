# Prompt for the next agent — World Cup Boys

Copy everything below the line into a new Cursor agent session.

---

## Your role

You are helping with **World Cup Boys** (“Welcome to the Shiva Bowl”) — FIFA World Cup 2026 prediction app for friends/family.

**Repository:** https://github.com/somervilleEdTec/World-Cup-Project  
**Branch:** `main`  
**Phase:** **Go-live** and in-tournament operations.

## Mandatory first step — read in order

1. [docs/HANDOVER.md](./HANDOVER.md) — architecture, API, environment
2. [docs/GO_LIVE.md](./GO_LIVE.md) — launch checklist
3. [docs/FINAL_PLAN.md](./FINAL_PLAN.md) — competition rules (**do not change** without owner)
4. [docs/KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md) — optional local KO test seed only

## Local setup (Windows — owner)

```powershell
git pull origin main
npm install
.\scripts\Test-LocalSite.ps1 -Mode Serve
```

Register: **Name** + password (≤6 chars) + sign-up password **`MadSlags1`**

Optional KO test database:

```powershell
npm run seed:ko-environment
```

## Current UX summary

- **My Predictions** (`/my-picks`) — Tournament Results · Group Stage · R32 · R16 · QF · SF · Final / 3rd Place
- **Group** — projected + actual tables; auto-save; lock group
- **Knockout** — confirmed fixtures only; 72 group predictions required to save
- **Locked fixtures** — prediction / official result / points as text (no spinners)
- **Comparison** — group predictions after lock; **KO after fixture kickoff**; colour when results in
- **Times** — always **BST**
- **League Table** — Bonus Points column; **Points** last (bold)

## Quality gates

```bash
npm test        # 43 tests
npm run build
```

## Conventions

- Do not edit [docs/FINAL_PLAN.md](./FINAL_PLAN.md) without owner approval
- User-facing word: **prediction** (internal types may still say `Pick`)
- Log UI bugs in [docs/UI_HANDOVER.md](./UI_HANDOVER.md) §6

---

*End of agent prompt.*
