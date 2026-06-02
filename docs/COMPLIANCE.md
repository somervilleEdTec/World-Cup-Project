# FINAL_PLAN compliance checklist

Verified against [FINAL_PLAN.md](./FINAL_PLAN.md) acceptance criteria (functional v1, 2026-06-02).

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| Group + bonus lock at first kickoff | Done | `pickLocks.ts`, `runAutoLocks`, server rejects writes |
| Each KO fixture locks at its kickoff | Done | `assertMatchEditable` per fixture kickoff |
| Uncommitted drafts ignored at lock | Done | `commitDraft` only promotes editable drafts; scoring uses committed |
| +2 exact group-position scoring | Done | `computeScore`; only when all 6 group results exist |
| Tournament bonus scoring | Done | `computeScore` + `bonus_committed` |
| Comparison / leaderboard use committed only | Done | SQL `state = 'committed'` |
| Required pages | Done | `App.tsx` routes |
| Required messaging (plan strings) | Done | `MyPicksPage`, `WelcomePage` |
| Draft/commit + NeedsReview | Done | `affectedMatches`, review before commit |
| Group accept/amend | Done | `accepted_groups` in DB + API |
| Bonus after all groups accepted | Done | Server gate in `setBonusDraft` |
| Tie-breaker #5 earliest commit | Done | `leaderboard.ts` sorts by `committed_at` |
| football-data sync + manual override | Done | `sync.ts`, admin routes |
| Real kickoffs (optional) | Ops | `npm run seed:fixtures` |

**Deferred (P3 / UI pass):** OAuth, PWA, PDF export, visual/layout polish, production CORS hardening.
