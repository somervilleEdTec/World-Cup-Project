# FINAL_PLAN compliance checklist

Verified against [FINAL_PLAN.md](./FINAL_PLAN.md). **Last reviewed:** 2026-06-03 (locking map + policy tests).

> **Note:** UI no longer uses a draft/commit panel. Match picks are written **committed** on save; tournament picks use **bonus_committed**. See [STRESS_TEST_HANDOVER.md](./STRESS_TEST_HANDOVER.md) for current behaviour.  
> **Locking detail:** [LOCKING.md](./LOCKING.md) maps every trigger to FINAL_PLAN (global kickoff, per-group lock, per-fixture KO, 72-gate, comparison visibility).

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| Group + tournament lock at first kickoff | Done | `pickLocks.ts`, `runAutoLocks`, server rejects writes |
| Each KO fixture locks at its kickoff | Done | `assertMatchEditable` per fixture kickoff |
| KO fixture locked when official result exists | Done | `isKnockoutFixtureLocked` (edit only; see LOCKING.md) |
| Committed picks count at lock | Done | Scoring/leaderboard use `state = 'committed'`; UI saves committed directly |
| +2 exact group-position scoring | Done | `computeScore`; only when all 6 group results exist |
| Tournament bonus scoring | Done | `bonus_committed` in `computeScore` |
| Comparison / leaderboard use committed only | Done | SQL `state = 'committed'` |
| Comparison — group after global lock | Done | `group_locked` in DB or first kickoff time |
| Comparison — KO after fixture kickoff | Done | `comparisonVisibility.ts` (kickoff only, not result-only) |
| Required pages | Done | Login, Welcome, My Picks, League, Comparison, Admin |
| Group lock (user, voluntary) | Done | `POST .../groups/:id/lock` → `accepted_groups` |
| All 72 group picks before KO saves | Done | `assertAllGroupPicksCommitted` in `saveDraftPick` for KO |
| Tournament picks standalone | Done | `setBonusDraft` → `bonus_committed`; no group gate |
| Knockout only when officially confirmed | Done | `knockoutFixtureAvailability.ts` |
| football-data sync + manual override | Done | `sync.ts`, admin routes |
| Mapping diagnostics | Done | Admin API + `npm run diagnose:mappings` |
| Tie-breaker earliest commit | Done | `leaderboard.ts` sorts by `committed_at` |
| No per-round KO “lock round” buttons | Done (out of scope) | Auto per-fixture lock only — [LOCKING.md](./LOCKING.md) |

**UX differences from original plan text (owner-approved):**

- No separate Rules route — rules on Welcome.
- No global “Commit changes” button — auto-save + Lock group.
- Tournament predictions do not require all groups accepted first.
- Auth uses **display name**, not email.
- **Comparison — knockout:** others’ predictions hidden until fixture kickoff (not visible pre-kickoff).
- **Per-group Lock group:** blocks that user’s edits only; does not affect other players or comparison timing.
- **One group result does not freeze whole group** for all players — global first kickoff only.
- User-facing label **prediction**; API/DB still use `committed` state naming.

**Tests:** `pickLocks.test.ts`, `comparisonVisibility.test.ts`, `lockingPolicy.test.ts`, `api.integration.test.ts` (global lock + 72 gate).

**Deferred (P3):** OAuth, PWA, PDF export, E2E tests, production CORS hardening.
