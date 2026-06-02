# World Cup Boys — Agent TODO Tracker

> Sync with [HANDOVER.md](./HANDOVER.md) §10. Update status as work completes.

## Status legend

- `[ ]` Not started
- `[~]` Partial / scaffold only
- `[x]` Done (verify in app before marking)

---

## P0 — Correctness

- [ ] **Bracket engine** — FIFA 2026 group → R32 (+ 8 third-place slots); replace knockout placeholders
- [ ] **football-data match ID mapping** — internal `match_id` ↔ provider ID before writing results
- [ ] **Scoring: group position bonus** — compare predicted vs official standings from results
- [ ] **Scoring: tournament bonus** — supply real champion/runner-up/3rd/4th from final results
- [ ] **Dynamic KO fixtures** — populate KO matches from real qualifiers

## P1 — Product

- [~] Group wizard **accept/amend** per group (preview exists; gate not strict)
- [ ] Auth-protected routes + logout
- [ ] Comparison: pick any upcoming fixture in UI
- [ ] Public “How scoring works” page

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
| competition-rule-refactor | [~] |
| group-position-bonus | [~] |
| bonus-picks-page | [x] |
| ko-rolling-locks | [~] |
| draft-commit-safety | [x] |
| football-data-sync | [~] |

---

## Completed (handover baseline)

- [x] React/Vite app shell + 6 pages
- [x] SQLite + Express API
- [x] Auth register/login
- [x] Draft/commit prediction flow
- [x] Admin sync/override/recompute
- [x] Multi-user comparison API + UI
- [x] Unit tests (7) + build passing
