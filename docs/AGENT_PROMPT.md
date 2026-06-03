# Prompt for the next agent — World Cup Boys

Copy everything below the line into a new Cursor agent session.

---

## Your role

You are helping with **World Cup Boys** (“Welcome to the Shiva Bowl”) — FIFA World Cup 2026 prediction app for friends/family.

**Repository:** https://github.com/somervilleEdTec/World-Cup-Project  
**Branch:** **`Debug` only** for code changes — test on the owner’s PC; **never** deploy from Debug ([DEBUG_BRANCH.md](./DEBUG_BRANCH.md))  
**Live site:** merge to **`main`** and `git push origin main` — that is the only branch that updates production ([DEPLOY_AUTOMATION.md](./DEPLOY_AUTOMATION.md))  
**Phase:** Development and in-tournament fixes. For **live launch**, use [docs/AGENT_PROMPT_LAUNCH.md](./AGENT_PROMPT_LAUNCH.md) instead.

**Next session:** Use [docs/AGENT_PROMPT_STRESS_TEST.md](./AGENT_PROMPT_STRESS_TEST.md) for full stress / environment / debug QA. Locking reference: [docs/LOCKING.md](./LOCKING.md).

## Mandatory first step — read in order

1. [docs/HANDOVER.md](./HANDOVER.md) — architecture, API, environment
2. [docs/GO_LIVE.md](./GO_LIVE.md) — smoke-test checklist (post-deploy)
3. [docs/FINAL_PLAN.md](./FINAL_PLAN.md) — competition rules (**do not change** without owner)
4. [docs/KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md) — optional local KO test seed only
5. **[docs/FINAL_PREDICTION_HANDOVER.md](./FINAL_PREDICTION_HANDOVER.md)** — if debugging “one final prediction left” scenario

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
npm run seed:ko-environment
```

**Final-prediction debug scenario** (all results through 3rd place; each user still needs the final):

```powershell
npm run seed:before-final
```

Read [docs/FINAL_PREDICTION_HANDOVER.md](./FINAL_PREDICTION_HANDOVER.md).

## Current UX summary

- **My Predictions** (`/my-picks`) — Tournament Results · Group Stage · R32 · R16 · QF · SF · Final / 3rd Place
- **Group** — projected + actual tables; auto-save; lock / unlock group (unlock blocked after official results in group)
- **Knockout** — confirmed fixtures only; 72 group predictions required to save
- **Locked fixtures** — prediction / official result / points as text (no spinners)
- **Comparison** — group predictions after lock; **KO after fixture kickoff**; colour when results in
- **Times** — always **BST**
- **League Table** — Bonus Points column; **Points** last (bold)

## Quality gates

```bash
npm test
npm run build
```

## Conventions

- **Do not** add GitHub Actions that deploy from `Debug`
- **Do not** run `scripts/deploy-production.sh` except on production host checked out to **`main`**
- Do not edit [docs/FINAL_PLAN.md](./FINAL_PLAN.md) without owner approval
- User-facing word: **prediction** (internal types may still say `Pick`)
- Log UI bugs in [docs/UI_HANDOVER.md](./UI_HANDOVER.md) §6

---

*End of agent prompt.*
