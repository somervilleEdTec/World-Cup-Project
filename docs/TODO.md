# World Cup Boys — Agent TODO Tracker

> Sync with [HANDOVER.md](./HANDOVER.md). **P0–P2 complete**; **UI polish / debug** is the current focus ([UI_HANDOVER.md](./UI_HANDOVER.md)).  
> New agents: read [AGENT_PROMPT.md](./AGENT_PROMPT.md) and confirm issues with the owner before coding.

## Status legend

- `[ ]` Not started
- `[~]` Partial / in progress
- `[x]` Done (verify in app before marking)

---

## Current focus — UI / UX (owner-reported)

Track details in [UI_HANDOVER.md](./UI_HANDOVER.md) §5.

- [ ] Owner provides numbered UI issue list (+ screenshots)
- [ ] Reproduce each issue on `main` (Windows: `.\scripts\Test-LocalSite.ps1 -Mode Serve`)
- [ ] Fix and verify with owner
- [ ] Mobile / small-screen pass (if in scope)

---

## P0 — Correctness

- [x] Bracket engine + third-place mappings
- [x] football-data match ID mapping
- [x] Scoring (group position, tournament bonus)
- [x] Dynamic KO fixtures from results
- [x] Knockout only when fixture officially confirmed (UI + API)

## P1 — Product

- [x] Group accept/amend
- [x] Auth-protected routes + logout
- [x] Comparison fixture picker
- [x] Rules page
- [x] Group / Knockout tab separation on My Picks

## P2 — Ops

- [x] Postgres + migrations
- [x] Deploy docs ([DEPLOY.md](./DEPLOY.md), [GO_LIVE.md](./GO_LIVE.md))
- [x] API integration tests
- [x] football-data seed + sync
- [x] Windows local test script (`scripts/Test-LocalSite.ps1`)
- [x] SVG team flags (`flag-icons` → `public/flags/4x3/`)

## P3 — Later

- [ ] OAuth
- [ ] PWA / notifications
- [ ] PDF / share card export
- [ ] Visual regression tests (optional)

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

## Completed baseline

- [x] React/Vite + Express API + SQLite/Postgres
- [x] Leaderboard, comparison, admin sync
- [x] 30 automated tests (`npm test`)
