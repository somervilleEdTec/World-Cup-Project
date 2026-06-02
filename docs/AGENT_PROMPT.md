# Prompt for the next agent

Copy everything below the line into a new Cursor Cloud Agent (or local agent) session. **The agent must ask the product owner for direction before writing code.**

---

## Your role

You are taking over **World Cup Boys** (“Welcome to the Shiva Bowl”) — a friends-and-family FIFA World Cup 2026 prediction web app.

Repository: https://github.com/somervilleEdTec/World-Cup-Project  
Branch with latest work: `cursor/world-cup-p0-complete-21eb`  
Draft PR: https://github.com/somervilleEdTec/World-Cup-Project/pull/2

## Mandatory first step — do not skip

**Before changing any code**, read these files:

1. [docs/HANDOVER.md](./HANDOVER.md) — architecture, API, what is done vs open
2. [docs/FINAL_PLAN.md](./FINAL_PLAN.md) — authoritative product rules
3. [docs/TODO.md](./TODO.md) — task tracker

Then **stop and prompt the product owner** with a short message like:

> I’ve read the handover. P0 (bracket engine, scoring, football-data mapping, dynamic KO) and P1 (auth, accept/amend, comparison picker, rules page) are marked complete on branch `cursor/world-cup-p0-complete-21eb` / PR #2.
>
> **What should we do next?** For example:
> - **A)** Merge PR #2 to `main` and cut a release tag  
> - **B)** P2 ops: Postgres + migrations  
> - **C)** P2 ops: production deploy (single VPS or Vercel + hosted DB)  
> - **D)** P2: API integration tests (Supertest)  
> - **E)** P2: Import real 2026 kickoffs from football-data.org  
> - **F)** Product tweaks (describe any rule or UX change)  
> - **G)** Something else (you specify)
>
> I won’t start implementation until you choose (or combine) options.

Wait for their reply. Only then create a branch, implement, test (`npm test`, `npm run build`), commit, push, and open/update a PR.

## What was completed (context for you)

- **Bracket engine** — `src/lib/bracketEngine.ts` + 495 third-place mappings (`src/data/thirdPlaceMappings.ts`)
- **Dynamic fixtures** — `getMatches(picks, results)` in `src/lib/matchResolver.ts`
- **Scoring** — fixed group-position bonus; tournament bonuses from `deriveFinalPlacings()`
- **Sync** — `match_external_ids` + `src/server/services/matchMapping.ts`
- **P1 UX** — protected routes, logout, group accept/amend, comparison fixture picker, `/rules` page
- **Tests** — 11 unit tests passing

## Local verification commands

```bash
npm install
npm test
npm run build
npm run server    # :8787
npm run dev       # :5173
```

Admin: register in UI, then `sqlite3 data.db "UPDATE users SET is_admin = 1 WHERE email = '...';"`

Optional: `FOOTBALL_DATA_TOKEN` for `npm run jobs` sync.

## Conventions

- Product rules: do not change [docs/FINAL_PLAN.md](./FINAL_PLAN.md) without owner approval
- Cloud agent branches: `cursor/<descriptive-name>-21eb`
- PR base: `main`
- Do not edit Cursor artifact plans under `/opt/cursor/artifacts/plans/`

## If the owner says “merge first”

1. Ensure PR #2 CI/local tests pass  
2. Merge to `main` (or help them review the diff)  
3. Confirm `docs/` on `main` matches handover after merge  

## If the owner picks P2 work

Follow priority order in [docs/TODO.md](./TODO.md) unless they reorder. Update HANDOVER.md and TODO.md when you finish a milestone.

---

*This prompt is maintained in-repo so every new session gets the same takeover ritual.*
