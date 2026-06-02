# World Cup Boys — Agent TODO Tracker

> Sync with [HANDOVER.md](./HANDOVER.md). **P0 and P1 complete** as of PR #2 (`cursor/world-cup-p0-complete-21eb`, 2026-06-02).  
> New agents: read [AGENT_PROMPT.md](./AGENT_PROMPT.md) and confirm next steps with the owner before coding.

## Status legend

- `[ ]` Not started
- `[~]` Partial / scaffold only
- `[x]` Done (verify in app before marking)

---

## P0 — Correctness

- [x] **Bracket engine** — FIFA 2026 group → R32 (+ 8 third-place slots); replace knockout placeholders
- [x] **football-data match ID mapping** — internal `match_id` ↔ provider ID before writing results
- [x] **Scoring: group position bonus** — compare predicted vs official standings from results
- [x] **Scoring: tournament bonus** — supply real champion/runner-up/3rd/4th from final results
- [x] **Dynamic KO fixtures** — populate KO matches from real qualifiers

## P1 — Product

- [x] Group wizard **accept/amend** per group (preview exists; gate not strict)
- [x] Auth-protected routes + logout
- [x] Comparison: pick any upcoming fixture in UI
- [x] Public “How scoring works” page

## P2 — Ops

- [ ] Postgres + migrations
- [ ] Production deploy docs
- [ ] API integration tests
- [ ] Seed/import real fixtures from football-data.org

## P3 — Later

- [ ] OAuth
- [ ] PWA / notifications
- [ ] PDF / share card export

---

## Plan artifact todos (final plan)

| ID | Status |
|----|--------|
| competition-rule-refactor | [x] |
| group-position-bonus | [x] |
| bonus-picks-page | [x] |
| ko-rolling-locks | [x] |
| draft-commit-safety | [x] |
| football-data-sync | [x] |

---

## Completed (handover baseline)

- [x] React/Vite app shell + 6 pages
- [x] SQLite + Express API
- [x] Auth register/login
- [x] Draft/commit prediction flow
- [x] Admin sync/override/recompute
- [x] Multi-user comparison API + UI
- [x] Unit tests (7) + build passing
