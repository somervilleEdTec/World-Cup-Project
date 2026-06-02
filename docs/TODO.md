# World Cup Boys — Agent TODO Tracker

> Sync with [HANDOVER.md](./HANDOVER.md).  
> **Current phase:** Stress testing & debugging — [STRESS_TEST_HANDOVER.md](./STRESS_TEST_HANDOVER.md)  
> New agents: read [AGENT_PROMPT.md](./AGENT_PROMPT.md).

## Status legend

- `[ ]` Not started
- `[~]` Partial / in progress
- `[x]` Done

---

## Current focus — stress test & debug

- [ ] Run full checklist in [STRESS_TEST_HANDOVER.md](./STRESS_TEST_HANDOVER.md) §4
- [ ] Two-user + mobile (~375px) pass on `main`
- [ ] Log all bugs in [UI_HANDOVER.md](./UI_HANDOVER.md) §6
- [ ] Fix critical/high bugs with PRs to `main`
- [ ] Update [GO_LIVE.md](./GO_LIVE.md) checklist from findings
- [ ] Owner sign-off for go-live

---

## Owner UI polish (complete)

- [x] Name-only auth + join password + `db:purge` (PR #7)
- [x] My Picks tabs, auto-save, projected table, spacing (PR #7–#8)
- [x] Tournament standalone + TeamSelect flags (PR #9)
- [x] Welcome rules + mobile nav (PR #10)
- [x] Lock group + missing picks list (PR #11)

---

## P0 — Correctness

- [x] Bracket engine + third-place mappings
- [x] football-data match ID mapping
- [x] Scoring (group position, tournament bonus)
- [x] Dynamic KO fixtures from results
- [x] Knockout only when fixture officially confirmed

## P1 — Product

- [x] Auth-protected routes + logout
- [x] Comparison fixture picker
- [x] Rules on Welcome page (no separate Rules route)
- [x] Group / Knockout / Tournament tabs on My Picks
- [x] Per-group lock + auto-save picks

## P2 — Ops

- [x] Postgres + migrations
- [x] Deploy docs ([DEPLOY.md](./DEPLOY.md), [GO_LIVE.md](./GO_LIVE.md))
- [x] API integration tests (36 tests total)
- [x] football-data seed + sync
- [x] Windows `scripts/Test-LocalSite.ps1`
- [x] SVG team flags

## P3 — Later

- [ ] OAuth
- [ ] PWA / notifications
- [ ] PDF / share card export
- [ ] Playwright / visual regression (optional)
- [ ] Production CORS / HTTPS hardening

---

## Plan artifact todos (final plan)

| ID | Status |
|----|--------|
| competition-rule-refactor | [x] |
| group-position-bonus | [x] |
| bonus-picks-page | [x] |
| ko-rolling-locks | [x] |
| draft-commit-safety | [x] (server; UI uses direct commit) |
| football-data-sync | [x] |

---

## Completed baseline

- [x] React/Vite + Express API + SQLite/Postgres
- [x] Leaderboard, comparison, admin sync
- [x] **36** automated tests (`npm test`)
