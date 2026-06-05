# World Cup Boys — Agent TODO Tracker

> Sync with [HANDOVER.md](./HANDOVER.md).  
> **Current phase:** **Live** — https://worldcup.dosums.uk · auto-deploy from `main` · [PRODUCTION.md](./PRODUCTION.md)

## Status legend

- `[ ]` Not started
- `[~]` Partial / in progress
- `[x]` Done

---

## Current focus

- [ ] **Prediction locking audit** — [AGENT_PROMPT_LOCKING.md](./AGENT_PROMPT_LOCKING.md) · [LOCKING.md](./LOCKING.md) — when picks lock for all players vs per-user vs per-fixture
- [x] Per-group lock/unlock + results-based edit lock (Debug, 2026-06-03)
- [x] Knockout scoring — advancing team +2, FT exact +4 (PR #22, 2026-06-05)
- [x] KO fixture sync mapping + per-fixture unlock from stored results (PR #23, 2026-06-05)
- [x] Official FIFA kickoffs for all 104 fixtures + BST display audit (2026-06-05)
- [x] Predict page kickoffs from server API; stale DB kickoff repair on startup (2026-06-05)
- [x] Organiser hidden from leaderboard/comparison even if is_admin flag missing (2026-06-05)
- [x] Touch score inputs — clear on focus for touch devices (2026-06-05)
- [x] Expanded test suite — 180 tests (fixture schedule audit, kickoff/touch tests, 2026-06-05)
- [x] API same-origin / autosave performance (Debug, 2026-06-03)

## Go-live

- [x] Stress test playbook (archived — see [GO_LIVE.md](./GO_LIVE.md))
- [x] KO-environment UX merged to `main` (predictions UI, comparison, seed script)
- [x] Production VM + app at `/home/ubuntu/World-Cup-Project` ([PRODUCTION.md](./PRODUCTION.md))
- [x] Live site https://worldcup.dosums.uk (nginx → Node :8787)
- [x] GitHub Actions secrets + auto-deploy on push to `main`
- [x] Server `.env` (`VITE_API_BASE_URL`, `FOOTBALL_DATA_TOKEN`, `NODE_ENV=production`)
- [ ] Ongoing: `npm run jobs` / `worldcup-jobs` during tournament; friend registration smoke test ([GO_LIVE.md](./GO_LIVE.md))
- [ ] Optional: formal systemd units + sudoers for deploy restarts ([PRODUCTION.md](./PRODUCTION.md))

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
- [x] Scoring (group W/D/L; KO advancing team + FT exact; group position, tournament bonus)
- [x] Dynamic KO fixtures from results — per-feeder-group / per-feeder-KO unlock
- [x] Knockout only when officially confirmed
- [x] KO API mapping uses stored official results during sync

## P1 — Product

- [x] Auth-protected routes + logout
- [x] Comparison fixture picker + visibility rules
- [x] Rules on Welcome page
- [x] Per-round knockout tabs + group actual tables
- [x] Per-group lock + auto-save predictions

## P2 — Ops

- [x] Postgres + migrations
- [x] Deploy docs ([PRODUCTION.md](./PRODUCTION.md), [GO_LIVE.md](./GO_LIVE.md))
- [x] Official group-stage kickoffs (FIFA UTC static + football-data override)
- [x] API integration tests (166 tests)
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
