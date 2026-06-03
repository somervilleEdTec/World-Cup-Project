# World Cup Boys — Agent TODO Tracker

> Sync with [HANDOVER.md](./HANDOVER.md).  
> **Current phase:** Go-live — [GO_LIVE.md](./GO_LIVE.md)

## Status legend

- `[ ]` Not started
- `[~]` Partial / in progress
- `[x]` Done

---

## Current focus

- [ ] **Prediction locking audit** — [AGENT_PROMPT_LOCKING.md](./AGENT_PROMPT_LOCKING.md) · [LOCKING.md](./LOCKING.md) — when picks lock for all players vs per-user vs per-fixture
- [x] Per-group lock/unlock + results-based edit lock (Debug, 2026-06-03)
- [x] API same-origin / autosave performance (Debug, 2026-06-03)

## Go-live

- [x] Stress test playbook ([STRESS_TEST_HANDOVER.md](./STRESS_TEST_HANDOVER.md))
- [x] KO-environment UX merged to `main` (predictions UI, comparison, seed script)
- [ ] Owner production deploy — one-time [DEPLOY_AUTOMATION.md](./DEPLOY_AUTOMATION.md) secrets + systemd; then auto on push to `main`
- [ ] `FOOTBALL_DATA_TOKEN` + `npm run jobs` during tournament
- [ ] Owner sign-off on [GO_LIVE.md](./GO_LIVE.md)

---

## Owner UI polish (complete)

- [x] Name-only auth + join password + `db:purge` (PR #7)
- [x] My Predictions tabs, auto-save, projected table (PR #7–#8)
- [x] Tournament standalone + TeamSelect flags (PR #9)
- [x] Welcome rules + mobile nav (PR #10)
- [x] Lock group + missing predictions list (PR #11)
- [x] KO tabs, actual tables, comparison rules, BST (KO-Environment → main)

---

## P0 — Correctness

- [x] Bracket engine + third-place mappings
- [x] football-data match ID mapping
- [x] Scoring (group position, tournament bonus)
- [x] Dynamic KO fixtures from results
- [x] Knockout only when officially confirmed

## P1 — Product

- [x] Auth-protected routes + logout
- [x] Comparison fixture picker + visibility rules
- [x] Rules on Welcome page
- [x] Per-round knockout tabs + group actual tables
- [x] Per-group lock + auto-save predictions

## P2 — Ops

- [x] Postgres + migrations
- [x] Deploy docs ([DEPLOY.md](./DEPLOY.md), [GO_LIVE.md](./GO_LIVE.md))
- [x] API integration tests (66 tests)
- [x] football-data seed + sync
- [x] Windows `scripts/Test-LocalSite.ps1`
- [x] SVG team flags
- [x] `npm run seed:ko-environment` for local KO testing

## P3 — Later

- [ ] OAuth
- [ ] PWA / notifications
- [ ] PDF / share card export
- [ ] Playwright / visual regression (optional)
- [ ] Production CORS / HTTPS hardening

---

*End of TODO.*
