# FINAL_PLAN compliance checklist

Verified against [FINAL_PLAN.md](./FINAL_PLAN.md). **Last reviewed:** 2026-06-05 (KO scoring, fixture sync mapping). See [LOCKING.md](./LOCKING.md).

> **Note:** UI no longer uses a draft/commit panel. Match picks are written **committed** on save; tournament picks use **bonus_committed**. See [UI_HANDOVER.md](./UI_HANDOVER.md) for current behaviour.

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| Group + tournament lock at first kickoff | Done | `pickLocks.ts`, `runAutoLocks`, server rejects writes |
| Each KO fixture locks at its kickoff | Done | `assertMatchEditable` per fixture kickoff |
| Committed picks count at lock | Done | Scoring/leaderboard use `state = 'committed'`; UI saves committed directly |
| Group match scoring (+2 W/D/L, +4 exact) | Done | `matchScoring.ts`, `computeScore` |
| Knockout match scoring (+2 advancer, +4 FT exact) | Done | `matchScoring.ts` — no group W/D/L fallback in KO |
| +1 exact group-position scoring | Done | `computeScore`; only when all 6 group results exist |
| Tournament bonus scoring | Done | `bonus_committed` in `computeScore` |
| Comparison / leaderboard use committed only | Done | SQL `state = 'committed'` |
| Required pages | Done | Login, Welcome, My Picks, League, Comparison, Admin |
| Group lock / unlock (user) | Done | `POST .../groups/:id/lock` · `.../unlock` → `accepted_groups`; unlock blocked if group has official results |
| Group / fixture lock on official result | Done | `assertMatchEditable` + `assertGroupUnlockAllowed` in `pickLocks.ts` |
| All 72 group picks before KO saves | Done | `assertAllGroupPicksCommitted` in `saveDraftPick` for KO |
| Tournament picks standalone | Done | `setBonusDraft` → `bonus_committed`; no group gate |
| Knockout round multipliers (QF/SF/Final) | Done | `knockoutStageMultiplier.ts`, `matchScoring.ts` |
| Knockout only when officially confirmed | Done | `knockoutFixtureAvailability.ts` — per feeder group/KO timing |
| football-data sync + manual override | Done | `sync.ts`, admin routes; 90-min `fullTime` scores |
| KO API mapping from stored results | Done | `matchMapping.ts`, `sync.ts`, `fixtureSync.ts` pass `actuals` |
| Mapping diagnostics | Done | Admin API + `npm run diagnose:mappings` |
| Tie-breaker earliest commit | Done | `leaderboard.ts` sorts by `committed_at` |

**UX differences from original plan text (owner-approved):**

- No separate Rules route — rules on Welcome.
- No global “Commit changes” button — auto-save + Lock / Unlock group.
- Per-group unlock allowed until official results exist in that group.
- Tournament predictions do not require all groups accepted first.
- Auth uses **display name**, not email.
- **Comparison — knockout:** others’ predictions hidden until fixture kickoff (not visible pre-kickoff).
- User-facing label **prediction**; API/DB still use `committed` state naming.

**Tests:** 121 tests (`npm test`) — includes `matchScoring.test.ts`, `knockoutFixtureAvailability.test.ts`, lock/unlock integration tests.

**Deferred (P3):** OAuth, PWA, PDF export, E2E tests, production CORS hardening.
