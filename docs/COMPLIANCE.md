# FINAL_PLAN compliance checklist

Verified against [FINAL_PLAN.md](./FINAL_PLAN.md). **Last reviewed:** 2026-06-02 (post UI polish PRs #7–#11).

> **Note:** UI no longer uses a draft/commit panel. Match picks are written **committed** on save; tournament picks use **bonus_committed**. See [STRESS_TEST_HANDOVER.md](./STRESS_TEST_HANDOVER.md) for current behaviour.

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| Group + tournament lock at first kickoff | Done | `pickLocks.ts`, `runAutoLocks`, server rejects writes |
| Each KO fixture locks at its kickoff | Done | `assertMatchEditable` per fixture kickoff |
| Committed picks count at lock | Done | Scoring/leaderboard use `state = 'committed'`; UI saves committed directly |
| +2 exact group-position scoring | Done | `computeScore`; only when all 6 group results exist |
| Tournament bonus scoring | Done | `bonus_committed` in `computeScore` |
| Comparison / leaderboard use committed only | Done | SQL `state = 'committed'` |
| Required pages | Done | Login, Welcome, My Picks, League, Comparison, Admin |
| Group lock (user) | Done | `POST .../groups/:id/lock` → `accepted_groups` |
| All 72 group picks before KO saves | Done | `assertAllGroupPicksCommitted` in `saveDraftPick` for KO |
| Tournament picks standalone | Done | `setBonusDraft` → `bonus_committed`; no group gate |
| Knockout only when officially confirmed | Done | `knockoutFixtureAvailability.ts` |
| football-data sync + manual override | Done | `sync.ts`, admin routes |
| Mapping diagnostics | Done | Admin API + `npm run diagnose:mappings` |
| Tie-breaker earliest commit | Done | `leaderboard.ts` sorts by `committed_at` |

**UX differences from original plan text (owner-approved):**

- No separate Rules route — rules on Welcome.
- No global “Commit changes” button — auto-save + Lock group.
- Tournament picks do not require all groups accepted first.
- Auth uses **display name**, not email.

**Deferred (P3):** OAuth, PWA, PDF export, E2E tests, production CORS hardening.
