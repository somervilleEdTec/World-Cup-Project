# Prediction locking — specification

> **Last updated:** 2026-06-05 (KO fixture sync mapping, per-fixture unlock)  
> **FINAL_PLAN:** [FINAL_PLAN.md](./FINAL_PLAN.md) (owner-owned)  
> **Code:** `src/lib/pickLocks.ts`, `src/server/services/predictions.ts`, `src/lib/comparisonVisibility.ts`, `src/server/jobs.ts`

---

## Three scopes

| Scope | Who | Mechanism |
|-------|-----|-----------|
| **Tournament-wide** | All players | First tournament kickoff + `runAutoLocks` → `group_locked`; blocks all group picks + tournament bonus |
| **Per-user voluntary** | One player | **Lock group** / **Unlock group** → `prediction_meta.accepted_groups` |
| **Per-fixture** | All players | Kickoff time and/or official `results` row for that `match_id` |

Saves use **committed** picks only (UI auto-saves as `committed`). Draft rows are legacy.

---

## Lock trigger map → FINAL_PLAN

| Trigger | FINAL_PLAN | Edit lock | Comparison (others’ picks) |
|---------|------------|-----------|----------------------------|
| **15 min before first kickoff** | Group stage + bonus lock | All group + bonus for everyone (`group_locked` / `shouldLockGroup`) | Group picks visible after global lock |
| **Per-group Lock group** | Owner UX (not in original plan text) | That user cannot edit matches in that letter | Unchanged — still hidden until global group lock |
| **Per-group Unlock group** | Owner UX | Removes letter from `accepted_groups` if no official results in group | — |
| **Official result (one match)** | Implied integrity | That **fixture** cannot be edited; **unlock group** blocked if **any** match in group has a result | Group comparison still global-lock timing |
| **Group fixture kickoff** | Rolling per match in plan spirit | **Not enforced on save today** — only global first kickoff + result row per fixture (`isGroupFixtureLocked` exists for UI helpers but save path uses `assertMatchEditable` without per-group kickoff) | — |
| **15 min before KO kickoff** | Per-fixture KO lock | That KO fixture for everyone | Others’ KO picks visible from that lock time |
| **KO official result** | — | That fixture locked even before kickoff (sync/seed edge case) | Still kickoff-based for visibility |
| **72 group picks** | Completeness before KO | Blocks KO **saves** only until global lock | — |
| **KO fixture confirmed** | Real qualifiers | Blocks KO save until both teams known from **official** group or KO results (not user predictions). R32 group-fed slots unlock when feeding groups finish; third-place R32 slots need all 12 groups; R16+ unlock when feeder KO matches have FT results. | — |

---

## Resolved decisions (2026-06-03 debug sessions)

| Question | Decision |
|----------|----------|
| One result freezes whole group for everyone? | **No.** Only that fixture is uneditable; voluntary unlock blocked for the group if **any** result exists in the group. |
| Voluntary lock vs global lock? | Voluntary lock is per-user; global lock applies to everyone at first kickoff. |
| Unlock after user locked a group? | **Yes**, until official results exist in that group or global/tournament lock is active. |
| KO “Lock round” buttons? | **Not required** — automatic per-fixture lock at kickoff. |
| Comparison vs edit for KO? | **Reveal at kickoff**; edit may also stop when official result exists before kickoff. |
| Scoring on locked fixtures? | Uses last committed pick at lock/result time; see [FINAL_PLAN.md](./FINAL_PLAN.md) for point values and KO multipliers. |

---

## API

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/predictions/groups/:groupId/lock` | All 6 group scores required |
| POST | `/api/predictions/groups/:groupId/unlock` | Fails if `groupHasOfficialResults` |
| POST | `/api/system/locks/run` | Sets `group_locked` (jobs / admin) |

---

## Local verification

```bash
ALLOW_KO_SEED=1 npm run seed:complete-teams
npm run server    # http://localhost:8787 — Team1 / bender (admin)
```

See [KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md) (`seed:before-final` for final-pick scenario).

---

## Tests

| File | Coverage |
|------|----------|
| `src/__tests__/pickLocks.test.ts` | Global lock, results, unlock |
| `src/__tests__/comparisonVisibility.test.ts` | Group / KO visibility |
| `src/__tests__/lockingPolicy.test.ts` | Policy assertions vs this doc |
| `src/__tests__/knockoutFixtureAvailability.test.ts` | Per-fixture KO unlock, API mapping with stored results |
| `src/server/__tests__/api.integration.test.ts` | Lock/unlock API, 72 gate, global lock |

---

## Related

- [COMPLIANCE.md](./COMPLIANCE.md) — checklist  
- [AGENT_PROMPT.md](./AGENT_PROMPT.md) — agent session prompt  
- [AGENT_PROMPT_LOCKING.md](./AGENT_PROMPT_LOCKING.md) — locking audit (largely complete; use stress prompt next)
