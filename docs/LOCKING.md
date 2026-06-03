# Prediction locking — reference

**Last updated:** 2026-06-03  
**Code:** `src/lib/pickLocks.ts`, `src/server/services/predictions.ts`, `src/lib/comparisonVisibility.ts`  
**Next agent:** [AGENT_PROMPT_LOCKING.md](./AGENT_PROMPT_LOCKING.md)

This document describes **implemented** behaviour. [FINAL_PLAN.md](./FINAL_PLAN.md) remains the owner-approved rules spec; gaps between plan text and code should be resolved in a dedicated locking audit (see agent prompt above).

---

## Lock layers (strictest wins on save)

### 1. Global group-stage lock

- **When:** Real time ≥ first tournament match kickoff (`getFirstMatchKickoff()`), or `prediction_meta.group_locked = 1` after `runAutoLocks()` (also run from `npm run jobs` and KO seeds).
- **Effect:** No group-stage or tournament bonus edits for any user.
- **Messages:** `Group-stage predictions are locked.` / `Tournament bonus predictions are locked.`

### 2. Per-group voluntary lock (`accepted_groups`)

- **When:** User taps **Lock group** on My Predictions → group letter appended to `prediction_meta.accepted_groups` (JSON array).
- **Effect:** That user cannot save drafts for matches in that group (server checks `accepted_groups`).
- **Unlock:** `POST /api/predictions/groups/:groupId/unlock` removes the letter **only if** no official result exists for any match in that group.
- **UI:** Locked group shows scores as plain text; **Unlock group** disabled when `groupHasOfficialResults`.

### 3. Per-fixture kickoff

- **Group:** Each group match locks at its own kickoff (in addition to global lock at first kickoff).
- **Knockout:** Each KO fixture locks at its kickoff (`isKnockoutFixtureLocked`).
- **UI:** Inputs disabled; locked summary with prediction (and result/points when available).

### 4. Official result (`results` table, `FINISHED`)

- **When:** Admin override, football-data sync, or seed script inserts a result.
- **Effect:**
  - Cannot change prediction for **that** match (`assertMatchEditable` + official result check).
  - Cannot **unlock** a group that has **any** finished match in that group (`assertGroupUnlockAllowed`).
- **Knockout:** Same as kickoff lock path — result implies locked for edits.

### 5. Knockout-only gates (not “locks” but block saves)

| Gate | Rule |
|------|------|
| 72 group picks | All 72 group predictions committed before first global lock, to save any KO pick |
| Fixture confirmed | KO match must appear in `buildConfirmedKnockoutFixtures(results)` |

---

## Comparison visibility (may differ from edit rules)

| Stage | Others’ predictions visible |
|-------|----------------------------|
| Group | After global group lock (first kickoff / `group_locked`) |
| Knockout | After that fixture’s kickoff |

See `src/lib/comparisonVisibility.ts`.

---

## API

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/predictions/groups/:groupId/lock` | Requires all 6 group scores saved |
| POST | `/api/predictions/groups/:groupId/unlock` | Fails if group has any official result |
| POST | `/api/system/locks/run` | Sets `group_locked`; use in tests / jobs |

---

## Open questions (for next agent)

1. Should **any** official result in a group freeze **all six** fixtures in that group for edits, or only fixtures with results? *(Today: only fixtures with a result row; other fixtures in the same group stay editable unless user-locked or global-locked.)*
2. Should voluntary **Lock group** persist through unlock after partial results, or is results-based lock sufficient?
3. Align comparison visibility with edit locks at kickoff vs at FT.
4. Per-phase KO “Lock round” buttons — product not implemented; confirm not required.

---

*End of locking reference.*
