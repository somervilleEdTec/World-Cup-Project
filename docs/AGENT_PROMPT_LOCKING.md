# Prompt for the next agent — locking & compliance

Copy everything below the line into a new Cursor agent session when working on **prediction locks**, **comparison visibility**, or **FINAL_PLAN alignment**.

---

## Your role

You are helping with **World Cup Boys** locking behaviour: when picks freeze for all players vs per-user voluntary lock vs per-fixture knockout lock, and when Comparison shows others’ picks.

**Repository:** https://github.com/somervilleEdTec/World-Cup-Project  
**Branch:** `Debug` for changes · `main` for production ([BRANCHING.md](./BRANCHING.md))

## Mandatory first step — read in order

1. [docs/LOCKING.md](./LOCKING.md) — **lock trigger map**, resolved open questions, test pointers
2. [docs/FINAL_PLAN.md](./FINAL_PLAN.md) — competition rules (**do not change** without owner)
3. [docs/HANDOVER.md](./HANDOVER.md) — API routes, `prediction_meta`, jobs
4. [docs/COMPLIANCE.md](./COMPLIANCE.md) — checklist (update when behaviour changes)

## Task checklist (this session type)

- [ ] Map every lock trigger to FINAL_PLAN sections (table in LOCKING.md)
- [ ] Keep clear distinction: **tournament-wide** vs **per-user Lock group** vs **per-fixture KO**
- [ ] Do not reopen resolved items in LOCKING.md without owner (KO round buttons, one-result-freezes-group, etc.)
- [ ] Update tests + COMPLIANCE when code or policy changes; **FINAL_PLAN.md only with owner approval**
- [ ] Run `npm test` and `npm run build`

## Lock triggers (quick reference)

| Trigger | Scope |
|---------|--------|
| First tournament kickoff | All players — group picks + tournament bonus |
| `prediction_meta.group_locked` (via `runAutoLocks`) | All players — same as global kickoff in DB |
| `accepted_groups` / Lock group | **One user**, one group letter |
| KO fixture kickoff | All players — that fixture |
| Official KO result (code) | All players — that fixture (edit); comparison still kickoff-based |
| 72 group picks | Gate on KO **save** only |
| Comparison | Group after global lock; KO after fixture kickoff |

**Code:** `src/lib/pickLocks.ts`, `src/server/services/predictions.ts`, `src/lib/comparisonVisibility.ts`, `src/server/services/comparison.ts`

## Local setup (Linux / cloud agent)

```bash
git checkout Debug   # or your feature branch
npm install
ALLOW_KO_SEED=1 npm run seed:complete-teams
npm run server       # http://localhost:8787
```

- Login: **`Team1`** / password **`bender`** (users `Team1` … `Team10`)
- Optional: `npm run jobs` for lock pass + live sync
- Production seed guard: `ALLOW_KO_SEED=1` required when `NODE_ENV=production`

## Quality gates

```bash
npm test
npm run build
```

## Conventions

- User-facing word: **prediction** (DB state may still say `committed`)
- Do not edit [docs/FINAL_PLAN.md](./FINAL_PLAN.md) without owner approval
- Document owner-approved UX deltas in LOCKING.md and COMPLIANCE.md, not FINAL_PLAN

---

*End of locking agent prompt.*
