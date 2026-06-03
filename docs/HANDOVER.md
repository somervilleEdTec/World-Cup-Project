# Agent Handover — World Cup Boys

**Last updated:** 2026-06-02  
**Repository:** https://github.com/somervilleEdTec/World-Cup-Project  
**Branches:** `main` (production) · `Debug` (development) — see [BRANCHING.md](./BRANCHING.md)  
**Phase:** **Launch** — deploy live site for friend registration  
**Launch:** [docs/LAUNCH_HANDOVER.md](./LAUNCH_HANDOVER.md) · Prompt: [docs/AGENT_PROMPT_LAUNCH.md](./AGENT_PROMPT_LAUNCH.md)  
**Deploy:** [docs/DEPLOY.md](./DEPLOY.md) · **Go-live tests:** [docs/GO_LIVE.md](./GO_LIVE.md)  
**Local debug:** [docs/KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md) · [docs/FINAL_PREDICTION_HANDOVER.md](./FINAL_PREDICTION_HANDOVER.md)

**Next agent starts here:** [docs/LAUNCH_HANDOVER.md](./LAUNCH_HANDOVER.md) (public website + registration) · General dev: [docs/AGENT_PROMPT.md](./AGENT_PROMPT.md)

---

## 1. Purpose

This handover lets a new agent work without prior chat context:

- Product and **scoring rules** (see [FINAL_PLAN.md](./FINAL_PLAN.md) for authoritative rules)
- **Current UX** after June 2026 polish
- **Architecture**, API, and file map
- How to **run and test** (Windows + Unix)

**Do not edit** `/opt/cursor/artifacts/plans/`. Do not change [FINAL_PLAN.md](./FINAL_PLAN.md) without owner approval.

---

## 2. Product summary

**World Cup Boys** — **"Welcome to the Shiva Bowl"**

Friends-and-family prediction app for **FIFA World Cup 2026** (48 teams, 12 groups, 104 matches). Name/password auth, mobile-first UI, leaderboard from real results (football-data.org + admin override).

### Scoring (`src/lib/tournamentLogic.ts`)

| Rule | Points |
|------|--------|
| Correct W/D/L (any stage) | +2 base (×1 R32/R16, ×1.5 QF, ×2 SF, ×3 final/3rd) |
| Exact score bonus | +4 base (scaled by same KO multiplier) |
| Exact group finishing position (per team) | +1 |
| Preselected champion | +6 |
| Preselected runner-up | +5 |
| Preselected third place | +4 |
| Preselected fourth place | +3 |

### Locking (implemented)

| What | When |
|------|------|
| Tournament result picks | First match kickoff |
| Group-stage picks (global) | First match kickoff |
| Per-group **Lock group** (user) | One-way; blocks edits until global lock |
| Each knockout fixture | That fixture’s kickoff |

### Picks storage (June 2026 UX)

- **Match picks:** saved as `committed` via `POST /api/predictions/draft` (auto-save in UI).
- **Tournament picks:** `bonus_committed` via `POST /api/predictions/bonus`.
- **Locked groups:** `prediction_meta.accepted_groups` (JSON array of group letters).
- **Leaderboard / comparison:** use **committed** picks only.

---

## 3. Documentation index

| File | Role |
|------|------|
| [STRESS_TEST_HANDOVER.md](./STRESS_TEST_HANDOVER.md) | Stress test playbook (reference) |
| [KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md) | Local KO test seed (`npm run seed:ko-environment`) |
| [AGENT_PROMPT.md](./AGENT_PROMPT.md) | Copy-paste session prompt |
| [UI_HANDOVER.md](./UI_HANDOVER.md) | UI history + bug log table |
| [HANDOVER.md](./HANDOVER.md) | This file |
| [LAUNCH_HANDOVER.md](./LAUNCH_HANDOVER.md) | **Live site launch** (registration, deploy) |
| [AGENT_PROMPT_LAUNCH.md](./AGENT_PROMPT_LAUNCH.md) | Copy-paste prompt for launch agent |
| [BRANCHING.md](./BRANCHING.md) | Two-branch workflow (`main` + `Debug`) |
| [FINAL_PLAN.md](./FINAL_PLAN.md) | Locked competition rules |
| [TODO.md](./TODO.md) | Backlog |
| [DEPLOY.md](./DEPLOY.md) | Production |
| [GO_LIVE.md](./GO_LIVE.md) | Pre-launch checklist |
| [COMPLIANCE.md](./COMPLIANCE.md) | Plan compliance (partially lags UX) |

---

## 4. Recent milestones (git)

| PR / area | Summary |
|-----------|---------|
| #7 | Name auth, join password, `db:purge`, My Picks tabs, auto-save, projected table |
| #8 | Bonus save fix, table zeros, score clamp |
| #9 | Tournament standalone, TeamSelect flags, no commit panel |
| #10 | Rules on Welcome, mobile nav, remove Rules route |
| #11 | Lock group, missing picks list, debounced auto-save |
| KO-Environment → main | KO phase tabs, actual tables, comparison rules, BST, prediction copy |

**Stack:** React 19, Vite 8, TypeScript, Express 5, better-sqlite3 / Postgres. Legacy Zustand: `src/lib/store.ts` (unused in production path).

---

## 5. Implemented features

### Core

- [x] Bracket engine + **495** third-place mappings (`src/lib/bracketEngine.ts`, `scripts/generate-third-place-map.mjs`)
- [x] Dynamic KO fixtures (`src/lib/matchResolver.ts`)
- [x] Group standings + scoring (`src/lib/groupStandings.ts`, `src/lib/tournamentLogic.ts`)
- [x] football-data mapping (`src/server/services/matchMapping.ts`, `sync.ts`)
- [x] Official KO gating (`src/lib/knockoutFixtureAvailability.ts`)

### App & UX (current)

- [x] Pages: Login, Welcome (with rules), **My Predictions**, League Table, Comparison, Admin
- [x] Auth: **display name** + password; join password; sessions
- [x] My Predictions: **Tournament Results · Group Stage · R32 · R16 · QF · SF · Final / 3rd Place**
- [x] Auto-save match scores; **Lock group**; missing predictions list (`src/lib/missingPicks.ts`)
- [x] Group **projected** + **actual** standings tables; locked fixtures show prediction / result / points as text
- [x] Comparison: colour-coded accuracy when results in; group predictions after lock; **KO after fixture kickoff**
- [x] All kickoff times shown in **BST** (`src/lib/formatDateTime.ts`)
- [x] `TeamSelect` — flags + alphabetical teams
- [x] SVG flags (`CountryFlag`, `public/flags/4x3/`)
- [x] **43 tests**; `npm run build`; Windows `scripts/Test-LocalSite.ps1`; `npm run seed:ko-environment`

### Ops / partial

- [ ] Admin role — manual SQL after register (`display_name`, not email)
- [x] Live football-data — `FOOTBALL_DATA_TOKEN` required on production; server + `npm run jobs` sync from api.football-data.org
- [ ] Production — Postgres + [DEPLOY.md](./DEPLOY.md)
- [ ] E2E browser tests — none

### P3 not started

OAuth, PWA, PDF export

---

## 6. Architecture

```text
Browser (Vite React SPA) — src/pages/*, src/components/*, apiClient
        │ HTTP :8787
Express — src/server/index.ts (auth, predictions, leaderboard, comparison, admin)
        │
SQLite (dev) / PostgreSQL (prod)
        predictions, prediction_meta, users, sessions, results, match_external_ids, …

Jobs: src/server/jobs.ts (locks, sync poll)
```

### Key files

| Path | Purpose |
|------|---------|
| `src/pages/MyPicksPage.tsx` | Phase tabs, auto-save, lock, projected/actual tables |
| `src/components/FixturePickCard.tsx` | Fixture UI; locked text + points |
| `src/components/GroupStandingsTable.tsx` | Group projected/actual tables |
| `src/lib/missingPicks.ts` | Missing predictions list for header |
| `src/lib/matchScoring.ts` | Per-fixture points (+2 / +4) |
| `src/lib/comparisonVisibility.ts` | When others’ predictions are visible |
| `src/lib/formatDateTime.ts` | BST kickoff formatting |
| `src/components/TeamSelect.tsx` | Flag + name picker |
| `scripts/seed-ko-environment.ts` | `npm run seed:ko-environment` |
| `src/server/services/predictions.ts` | Saves, locks, bonus |
| `src/server/services/auth.ts` | Register / login |
| `src/lib/pickLocks.ts` | Lock rules, 72-group gate |
| `src/lib/knockoutFixtureAvailability.ts` | Confirmed KO fixtures |
| `scripts/purge-database.ts` | `npm run db:purge` |

**Removed:** `src/pages/RulesPage.tsx` (rules on Welcome).

---

## 7. API reference

Base: `http://localhost:8787` · Auth: `Authorization: Bearer <token>`

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/register` | `{ displayName, password, joinPassword }` |
| POST | `/api/auth/login` | `{ displayName, password }` |
| GET | `/api/predictions/state` | Bearer — includes `officialResults`, `confirmedKnockoutFixtures` |
| POST | `/api/predictions/draft` | Saves **committed** match pick |
| POST | `/api/predictions/bonus` | Saves **bonus_committed** |
| POST | `/api/predictions/groups/:groupId/lock` | One-way group lock |
| POST | `/api/predictions/groups/:groupId/accept` | Legacy alias → lock |
| POST | `/api/predictions/commit` | Legacy; UI unused |
| GET | `/api/leaderboard` | Public |
| GET | `/api/comparison/*` | Bearer |
| POST | `/api/admin/*` | Admin |
| POST | `/api/system/locks/run` | Manual lock pass |

---

## 8. Local development

### Windows (owner-tested)

```powershell
cd C:\Users\tomso\World-Cup-Project
git pull origin main
.\scripts\Test-LocalSite.ps1
.\scripts\Test-LocalSite.ps1 -Mode Serve
```

Fresh database: `npm run db:purge`

### macOS / Linux

```bash
npm install && npm run migrate
npm run server    # :8787
npm run jobs      # optional
npm run dev       # :5173 optional
```

### Admin

```bash
sqlite3 data.db "UPDATE users SET is_admin = 1 WHERE display_name = 'YourName';"
```

### Quality gates

```bash
npm test              # 43 tests
npm run seed:ko-environment   # optional local KO test DB (see KO_ENVIRONMENT.md)
npm run build
npm run db:purge      # reset local SQLite data
```

---

## 9. Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL (production) |
| `SQLITE_PATH` | SQLite file (default `data.db`) |
| `JOIN_PASSWORD` | Sign-up gate (default `MadSlags1`) |
| `FOOTBALL_DATA_TOKEN` | football-data.org |
| `VITE_API_BASE_URL` | API base (default `http://localhost:8787`) |
| `PORT` | API port (default `8787`) |

---

## 10. Next agent priorities

1. Owner go-live on production ([GO_LIVE.md](./GO_LIVE.md)).
2. Keep `npm run jobs` + football-data sync during tournament.
3. On **`main`**: empty DB + `FOOTBALL_DATA_TOKEN` only — never run KO seed scripts in production.
4. On **`Debug`**: `ALLOW_KO_SEED=1 npm run seed:ko-environment` for local KO/regression testing.
5. Log new issues in [UI_HANDOVER.md](./UI_HANDOVER.md) §6.

---

## 11. Known risks

1. Third-place mappings from Wikipedia Annex C — regenerate if FIFA errata.
2. KO kickoff times approximate in static data.
3. football-data team name aliases may miss fixtures.
4. **72 KO gate** vs friendly UX — saves blocked until 72 group picks committed.
5. Auto-save debounce — last edit may be lost on fast navigation.
6. No HTTPS/CORS in dev — configure for production.
7. `COMPLIANCE.md` may describe old draft/commit UI — trust code + STRESS_TEST_HANDOVER.

---

## 12. Conventions

- **Branches:** `Debug` for work; merge to `main` when stable ([BRANCHING.md](./BRANCHING.md))
- PRs (if used): base `main`, head `Debug`
- Update [UI_HANDOVER.md](./UI_HANDOVER.md) §6 when fixing UI bugs

---

*End of handover.*
