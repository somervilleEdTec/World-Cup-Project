# Prediction locking — specification

> **Purpose:** Single reference for *when* picks lock, *who* is affected, and how that maps to [FINAL_PLAN.md](./FINAL_PLAN.md).  
> **Do not edit [FINAL_PLAN.md](./FINAL_PLAN.md)** without owner approval — this doc explains implementation and owner-resolved UX decisions.

**Implementation:** `src/lib/pickLocks.ts`, `src/server/services/predictions.ts`, `src/server/services/comparison.ts`, `src/lib/comparisonVisibility.ts`, `src/server/jobs.ts` (`runAutoLocks` every 30s).

---

## Three lock scopes (read this first)

| Scope | Who | Effect |
|-------|-----|--------|
| **Tournament-wide (all players)** | First tournament kickoff + `runAutoLocks` | Every user: group-stage match picks + tournament bonus locked; DB `group_locked = 1`. |
| **Per-user voluntary (one player)** | **Lock group** on My Predictions | That user only: matches in that group letter cannot be edited; stored in `prediction_meta.accepted_groups`. |
| **Per-fixture (all players)** | Each match’s kickoff (+ KO result rule below) | That fixture’s picks locked for everyone; other fixtures unchanged. |

Uncommitted draft rows are unused in the current UI (auto-save writes `committed` immediately). At lock time, only **committed** rows count for scoring, leaderboard, and comparison.

---

## Lock trigger map → FINAL_PLAN

| Trigger | FINAL_PLAN anchor | Applies to | Edit lock | Comparison visibility |
|---------|-------------------|------------|-----------|------------------------|
| **Global / first kickoff** | Group stage: “At first kickoff, group-stage predictions auto-lock”; bonus “Locked with group-stage lock” | All users, all group matches + tournament bonus | `shouldLockGroup(now)` → `assertMatchEditable` / `assertBonusEditable`; `runAutoLocks` sets `group_locked` | **Group:** others’ picks visible when `group_locked` in DB **or** simulated time ≥ first kickoff ([Comparison visibility](#comparison-visibility)) |
| **Per-group Lock group** | Not in FINAL_PLAN (owner-approved UX) | **Current user only** for that group letter | `accepted_groups` includes group → save rejected for those matches | **Unchanged** — still hidden until tournament-wide group lock |
| **Per-fixture kickoff (KO)** | “Rolling lock per fixture: each KO match auto-locks at its own kickoff” | All users, that `match_id` | `kickoffReached(match.kickoff)` in `assertMatchEditable` | **KO:** others’ picks visible after **that fixture’s kickoff** (kickoff time only, not result-only) |
| **Official result (KO)** | Plan text is kickoff-based; **implementation extension** | All users, that KO fixture | `isKnockoutFixtureLocked` also true when `actual` exists (e.g. early result sync / seed) | **Does not** reveal others’ picks before kickoff — visibility uses kickoff only |
| **Official result (group)** | N/A — group lock is global kickoff, not per-result | — | A finished group match **does not** lock other group picks early | — |
| **72-group KO gate** | Implied by “all group-stage predictions … before” KO play; enforced as save gate | User attempting KO save | `assertAllGroupPicksCommitted` before first global lock; blocks KO **saves** only | Does not affect comparison |
| **Comparison visibility** | “Group: after first kickoff”; “KO: after that fixture’s kickoff” | Read-only social feature | Independent of whether *you* can still edit (e.g. voluntary group lock) | `canViewOthersPicks` + `getMatchComparison` |

---

## Global kickoff (all players)

- **Clock:** `getFirstMatchKickoff()` (DB override `match_kickoffs` when synced, else static tournament data).
- **On save:** `isGroupLocked(meta.group_locked, now)` blocks group matches and tournament bonus.
- **Background:** `runAutoLocks` (server start, `npm run jobs`, `POST /api/system/locks/run`) sets `prediction_meta.group_locked = 1` for every user when `shouldLockGroup(now)`.
- **FINAL_PLAN:** § Group Stage, § Preselected Tournament Outcome Picks, § Group-stage lock.

---

## Per-user voluntary: Lock group

- **UI:** My Predictions → Group Stage → **Lock group** (one-way per letter A–L).
- **API:** `POST /api/predictions/groups/:groupId/lock` → `setGroupAccepted` → appends to `accepted_groups`.
- **Requires:** All six matches in that group have a saved pick for that user.
- **Does not:** Lock other users, lock tournament bonus, lock knockout, or show others’ picks on Comparison.
- **After global lock:** API returns “Group-stage predictions are locked.”
- **Column name:** `accepted_groups` is legacy naming; treat as **locked_groups**.

**Resolved (owner):** One official result in a group does **not** freeze the whole group for everyone — only global first kickoff (or that user’s voluntary lock for their own picks).

---

## Per-fixture knockout lock (all players)

- **Edit:** Locked at fixture kickoff **or** when an official result exists for that fixture (`pickLocks.isKnockoutFixtureLocked`).
- **Other KO fixtures:** Remain editable until their own kickoff/result rule.
- **FINAL_PLAN:** § Knockout Stage, § Knockout lock.

**Resolved (owner):** No per-round **“Lock round”** buttons (R32, R16, etc.). Knockout locking is **automatic per fixture** at kickoff only; voluntary KO round locks are **out of scope**.

---

## 72-group knockout save gate

- **Rule:** All **72** group-stage committed picks required before saving any knockout pick (while group phase is not globally locked).
- **Where:** `assertAllGroupPicksCommitted` in `saveDraftPick` when `isKnockout(match)`.
- **Not gated:** Tournament bonus (`POST /api/predictions/bonus`) — owner-approved UX.
- **UI:** My Predictions shows count (e.g. `12/72`) when KO tab is visible but saves fail server-side.
- **FINAL_PLAN:** Aligns with group-stage completeness before knockout predictions; not a separate “lock” but a **precondition to save**.

---

## Comparison visibility

| Phase | Others’ committed picks visible when |
|-------|--------------------------------------|
| Group | `group_locked` on any user in DB **or** `now >= first tournament kickoff` |
| Knockout | `now >= that fixture’s kickoff` |

**Resolved (owner):**

- **Comparison vs edit:** Visibility follows kickoff (and DB group flag for group phase). **Edits** for KO can also stop when a result is stored before kickoff (sync/seed edge case); **comparison still waits for kickoff** so pre-kickoff picks stay private.
- Current user always sees their own pick in comparison responses (`hidden` only applies to other players).

**FINAL_PLAN:** § Comparison visibility.

---

## Jobs and manual lock pass

| Entry | Behaviour |
|-------|-----------|
| `npm run jobs` | Every 30s: `runAutoLocks`; every 2 min: results sync |
| Server startup | One `runAutoLocks` + optional football-data sync |
| `POST /api/system/locks/run` | Admin/manual same as job lock pass |

`runAutoLocks` does **not** set per-group `accepted_groups`; it only flips global `group_locked` and marks committed KO picks `reviewed` after kickoff.

---

## Open questions — resolved (do not re-litigate without owner)

| Question | Decision |
|----------|----------|
| Does one group match result freeze the whole group? | **No** for all players. Global lock is first kickoff only. Voluntary lock is per user per group. |
| Comparison vs edit timing for KO? | **Reveal at kickoff.** Edit may also block when official result exists (implementation). |
| KO “lock round” buttons? | **No** — per-fixture auto lock only. |
| Does voluntary group lock hide picks on Comparison? | **No** — tournament-wide group lock (or first kickoff time) controls group comparison. |
| Draft vs committed at lock? | **Committed only** counts; UI auto-commits on save. |

---

## Local verification

```bash
npm install
ALLOW_KO_SEED=1 npm run seed:complete-teams
npm run server   # http://localhost:8787
```

Log in: **`Team1`** / **`bender`** (also `Team2` … `Team10`). Full tournament results + predictions seeded; group phase locked in DB at simulated post-tournament time.

Other seeds: [KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md), [FINAL_PREDICTION_HANDOVER.md](./FINAL_PREDICTION_HANDOVER.md).

---

## Tests and compliance

| Area | File |
|------|------|
| Lock helpers | `src/__tests__/pickLocks.test.ts` |
| Comparison visibility | `src/__tests__/comparisonVisibility.test.ts`, `src/__tests__/lockingPolicy.test.ts` |
| API locks / 72 gate | `src/server/__tests__/api.integration.test.ts` |
| Checklist | [COMPLIANCE.md](./COMPLIANCE.md) |

---

## Related docs

- [FINAL_PLAN.md](./FINAL_PLAN.md) — product rules (owner-owned)
- [AGENT_PROMPT_LOCKING.md](./AGENT_PROMPT_LOCKING.md) — copy-paste session prompt for locking work
- [HANDOVER.md](./HANDOVER.md) — architecture index
