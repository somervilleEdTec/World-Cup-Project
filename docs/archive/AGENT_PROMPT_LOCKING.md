# Agent prompt — prediction locking (next session)

Copy everything below the line into a new Cursor agent session.

---

## Your role

You are auditing and refining **when predictions lock for all players** in **World Cup Boys** (FIFA World Cup 2026, friends-and-family pool). The owner wants a clear, consistent model: at what stage group picks, tournament bonus picks, and knockout picks become immutable, and how that aligns with [FINAL_PLAN.md](./FINAL_PLAN.md) and real tournament timing.

**Repository:** https://github.com/somervilleEdTec/World-Cup-Project  
**Branch:** Work on **`Debug`**; merge to **`main`** when rules are agreed and tested.

## Mandatory first step — read in order

1. [docs/HANDOVER.md](./HANDOVER.md) — §2 scoring, § locking table, API
2. [docs/FINAL_PLAN.md](./FINAL_PLAN.md) — authoritative competition rules (**do not change** without owner)
3. **`src/lib/pickLocks.ts`** — all lock predicates and assertions
4. **`src/server/services/predictions.ts`** — `saveDraftPick`, `setGroupAccepted`, `unlockGroupAccepted`, `runAutoLocks`
5. **`src/lib/comparisonVisibility.ts`** — when other players’ picks become visible
6. [docs/COMPLIANCE.md](./COMPLIANCE.md) — checklist vs FINAL_PLAN

## Local setup (Debug test DB)

```bash
git checkout Debug
git pull origin Debug
npm install
npm run build
ALLOW_KO_SEED=1 npm run seed:complete-teams   # Team1–Team10 / bender; all results + picks
npm run server
```

Open **http://localhost:8787/login** as **Team1** / **bender** (admin). Hard-refresh after rebuild.

## What is implemented today (2026-06-03)

Multiple **independent** lock layers apply. They can overlap; the strictest rule wins on save.

| Layer | Scope | Trigger | Server | UI |
|-------|--------|---------|--------|-----|
| **Global group lock** | All group + tournament bonus | First tournament kickoff (`shouldLockGroup`) or `prediction_meta.group_locked` after `runAutoLocks` | `assertMatchEditable`, `assertBonusEditable` | Calendar lock; tournament bonus disabled |
| **Per-group user lock** | One group letter | User **Lock group** → `accepted_groups` JSON | Rejects draft if group in `accepted_groups` | Plain score text; **Unlock** allowed only if no official results in that group |
| **Per-fixture kickoff** | One match | `kickoffReached(fixture.kickoff)` | `assertMatchEditable` | Inputs disabled; locked summary |
| **Official result** | One match | Row in `results` with `status = 'FINISHED'` | Blocks edit for that fixture; blocks **unlock** if any fixture in group has a result | Shows official result + points |
| **72-group gate** | Knockout saves only | Before first global lock: need 72 committed group picks | `assertAllGroupPicksCommitted` | Warning on KO tabs |
| **KO fixture confirmed** | Knockout pick target | Both teams known from official group/KO results | `assertKnockoutFixtureConfirmed` | Tab only lists confirmed fixtures |
| **Comparison visibility** | Other players’ picks | Group: after global group lock; KO: after fixture kickoff | `comparisonVisibility.ts` | Comparison page |

**API:** `POST /api/predictions/groups/:groupId/lock` · `POST /api/predictions/groups/:groupId/unlock` (blocked when group has any official result).

## Your mission — explore and propose

1. **Map every lock trigger** to user-visible behaviour and to [FINAL_PLAN.md](./FINAL_PLAN.md) wording. Note gaps (e.g. voluntary lock vs global lock vs results).
2. **Define “lock for all players”** explicitly:
   - Is it the same instant for everyone (server clock / first kickoff)?
   - Should **official results** lock picks even before kickoff time (currently yes for that fixture)?
   - Should a user **unlock** a group ever be allowed after any match in that group has kicked off but before FT?
3. **Knockout phases** — FINAL_PLAN says per-fixture kickoff lock; confirm no per-phase “Lock round” is required (UI has no KO lock button today).
4. **Comparison vs edit** — visibility rules may differ from edit rules; document and test both.
5. **Seed / production** — `seed:complete-teams` sets all results: verify UX matches live tournament mid-flight vs finished.
6. **Deliverable:** Update [COMPLIANCE.md](./COMPLIANCE.md) and HANDOVER locking table; add or extend tests in `pickLocks.test.ts` and `api.integration.test.ts`; only change [FINAL_PLAN.md](./FINAL_PLAN.md) with owner sign-off.

## Suggested test matrix

| Scenario | Edit group pick | Unlock group | Edit KO pick | See others’ group pick | See others’ KO pick |
|----------|-----------------|--------------|--------------|------------------------|---------------------|
| Before first kickoff, no user lock | ✓ | — | ✗ (72 gate) | Hidden | Hidden until kickoff |
| User locked group A, no results | ✗ in A | ✓ | ✗ | Hidden | — |
| Official result for g-a-1 only | ✗ g-a-1 | ✗ group A | — | — | — |
| After `runAutoLocks` / first kickoff | ✗ all group | ✗ | Per fixture | Visible | Per fixture |
| After fixture kickoff, no result yet | ✗ | ✗ | ✗ that fixture | Visible | Hidden until kickoff |

Run scenarios with `npm test` and manual checks on **http://localhost:8787**.

## Quality gates

```bash
npm test    # expect 66+ tests
npm run build
```

## Conventions

- Do not edit `/opt/cursor/artifacts/plans/`
- Log UI bugs in [UI_HANDOVER.md](./UI_HANDOVER.md) §7
- API client uses same-origin `/api` (see [HANDOVER.md](./HANDOVER.md) env table)

---

*End of locking agent prompt.*
