# Agent Handover — World Cup Boys

**Last updated:** 2026-06-05
**Repository:** https://github.com/somervilleEdTec/World-Cup-Project  
**Branches:** **`main`** (live deploy) · **`Debug`** (PC only) — [BRANCHING.md](./BRANCHING.md)  
**Live:** https://worldcup.dosums.uk — automated deploy active — [DEPLOY_CONTROL_PLANE.md](./DEPLOY_CONTROL_PLANE.md) · [PRODUCTION.md](./PRODUCTION.md)  
**Debug policy:** [DEBUG.md](./DEBUG.md) — local only, Test1–20/guest, no live API  
**Local debug:** [KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md)  
**Agent prompt:** [AGENT_PROMPT.md](./AGENT_PROMPT.md) · **Doc index:** [README.md](./README.md)

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

**World Cup Boys** — tagline **"World Cup Predictions"**

Friends-and-family prediction app for **FIFA World Cup 2026** (48 teams, 12 groups, 104 matches). Name/password auth, mobile-first UI, leaderboard from real results (football-data.org + admin override).

### Scoring (`src/lib/tournamentLogic.ts`, `src/lib/matchScoring.ts`)

| Rule | Points |
|------|--------|
| Group — correct W/D/L | +2 |
| Group — exact score bonus | +4 (total **6** when both) |
| Knockout — correct **advancing team** | +2 base (×1 R32/R16, ×1.5 QF, ×2 SF, ×3 final/3rd) |
| Knockout — exact **90-minute** score bonus | +4 base (same KO multiplier; ET/pens goals excluded) |
| Exact group finishing position (per team) | +1 |
| Preselected champion | +6 |
| Preselected runner-up | +5 |
| Preselected third place | +4 |
| Preselected fourth place | +3 |

### Locking (implemented — see [LOCKING.md](./LOCKING.md))

| What | When | Notes |
|------|------|--------|
| Tournament result picks | First match kickoff | `group_locked` / `shouldLockGroup` |
| Group-stage picks (global) | First match kickoff | Same |
| Per-group **Lock / Unlock** (user) | User toggles `accepted_groups` | Unlock blocked if **any** official result in that group |
| Group fixture with official result | When `results` row exists | That fixture cannot be edited |
| Each knockout fixture | Kickoff **or** official result | `isKnockoutFixtureLocked` |
| KO saves | Before global lock | Requires 72 committed group picks |

**Next work:** See [TODO.md](./TODO.md) and [GO_LIVE.md](./GO_LIVE.md) for QA checklist.

### Picks storage (June 2026 UX)

- **Match picks:** saved as `committed` via `POST /api/predictions/draft` (auto-save in UI).
- **Tournament picks:** `bonus_committed` via `POST /api/predictions/bonus`.
- **Locked groups:** `prediction_meta.accepted_groups` (JSON array of group letters).
- **Leaderboard / comparison:** use **committed** picks only.

---

## 3. Documentation index

See **[README.md](./README.md)** for the full map. Active docs:

| File | Role |
|------|------|
| [BRANCHING.md](./BRANCHING.md) | **`main`** vs **`Debug`** workflow |
| [PRODUCTION.md](./PRODUCTION.md) | Live ops, auto-deploy, wipe DB |
| [OUTAGE_RECOVERY.md](./OUTAGE_RECOVERY.md) | Site down / Cloudflare 530–1033 recovery |
| [DATA_PROTECTION.md](./DATA_PROTECTION.md) | Prediction preservation, retrieval archive, blocked destructive ops |
| [DATABASE_BACKUP.md](./DATABASE_BACKUP.md) | Operational + retrieval-only backups |
| [GO_LIVE.md](./GO_LIVE.md) | Smoke tests and in-tournament ops |
| [HANDOVER.md](./HANDOVER.md) | This file — architecture and API |
| [KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md) | Local test seeds (`Debug` only) |
| [LOCKING.md](./LOCKING.md) | Prediction lock specification |
| [FINAL_PLAN.md](./FINAL_PLAN.md) | Competition rules |
| [AGENT_PROMPT.md](./AGENT_PROMPT.md) | Agent session prompt |
| [UI_HANDOVER.md](./UI_HANDOVER.md) | UI map and bug log |
| [TODO.md](./TODO.md) | Backlog |

Historical docs: [archive/README.md](./archive/README.md)

---

## 4. Recent milestones (git)

| PR / area | Summary |
|-----------|---------|
| #22 | Knockout scoring hardened — advancing team +2, FT exact +4; no group W/D/L fallback |
| #23 | KO fixture API mapping uses stored official results; per-fixture unlock timing |
| #7 | Name auth, join password, `db:purge`, My Picks tabs, auto-save, projected table |
| #8 | Bonus save fix, table zeros, score clamp |
| #9 | Tournament standalone, TeamSelect flags, no commit panel |
| #10 | Rules on Welcome, mobile nav, remove Rules route |
| #11 | Lock group, missing picks list, debounced auto-save |
| KO-Environment → main | KO phase tabs, actual tables, comparison rules, BST, prediction copy |
| Debug 2026-06-03 | Per-group lock/unlock; results-based lock; API same-origin + autosave perf fix |

**Stack:** React 19, Vite 8, TypeScript, Express 5, better-sqlite3 / Postgres. Legacy Zustand: `src/lib/store.ts` (unused in production path).

---

## 5. Implemented features

### Core

- [x] Bracket engine + **495** third-place mappings (`src/lib/bracketEngine.ts`, `scripts/generate-third-place-map.mjs`)
- [x] Dynamic KO fixtures (`src/lib/matchResolver.ts`)
- [x] Group standings + scoring (`src/lib/groupStandings.ts`, `src/lib/tournamentLogic.ts`)
- [x] football-data mapping + KO sync with stored results (`matchMapping.ts`, `sync.ts`, `fixtureSync.ts`)
- [x] Official KO gating — per-fixture unlock from feeder group/KO results (`knockoutFixtureAvailability.ts`)

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
- [x] **121 tests**; `npm run build`; Windows `scripts/Test-LocalSite.ps1`; `npm run seed:ko-environment`; `npm run seed:complete-teams`

### Ops / partial

- [ ] Bootstrap admin via `ADMIN_*` env or `npm run db:ensure-admin`
- [x] Live football-data — `FOOTBALL_DATA_TOKEN` required on production; server + `npm run jobs` sync from api.football-data.org
- [ ] Production — see [PRODUCTION.md](./PRODUCTION.md)
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
| `src/lib/matchScoring.ts` | Per-fixture points — group W/D/L; KO advancing team + FT exact |
| `src/lib/comparisonVisibility.ts` | When others’ predictions are visible |
| `src/lib/formatDateTime.ts` | BST kickoff formatting |
| `src/components/TeamSelect.tsx` | Flag + name picker |
| `scripts/seed-ko-environment.ts` | `npm run seed:ko-environment` |
| `src/server/services/predictions.ts` | Saves, locks, bonus |
| `src/server/services/auth.ts` | Admin creates players; login; password change |
| `src/lib/pickLocks.ts` | Lock rules, 72-group gate |
| `src/lib/knockoutFixtureAvailability.ts` | Confirmed KO fixtures |
| `scripts/purge-database.ts` | `npm run db:purge` |

**Removed:** `src/pages/RulesPage.tsx` (rules on Welcome).

---

## 7. API reference

Base: `http://localhost:8787` · Auth: `Authorization: Bearer <token>`

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/login` | `{ displayName, password }` |
| POST | `/api/auth/change-password` | Bearer — first-login password change |
| GET | `/api/auth/me` | Bearer |
| GET/POST | `/api/admin/players` | Admin — list / create players |
| GET | `/api/predictions/state` | Bearer — includes `officialResults`, `confirmedKnockoutFixtures` |
| POST | `/api/predictions/draft` | Saves **committed** match pick |
| POST | `/api/predictions/bonus` | Saves **bonus_committed** |
| POST | `/api/predictions/groups/:groupId/lock` | Per-group lock (`accepted_groups`) |
| POST | `/api/predictions/groups/:groupId/unlock` | Unlock group (blocked if official results in group) |
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
npm test              # full Vitest suite (integration + unit)
npm run seed:ko-environment   # optional local KO test DB (see KO_ENVIRONMENT.md)
ALLOW_KO_SEED=1 npm run seed:complete-teams   # Team1–10 / bender, full tournament (Debug)
npm run build
npm run db:purge      # reset local SQLite data
```

---

## 9. Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL (production) |
| `SQLITE_PATH` | SQLite file (default `data.db`) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Bootstrap organiser account (created on migrate / server start) |
| `FOOTBALL_DATA_TOKEN` | football-data.org |
| `VITE_API_BASE_URL` | API base (default **same-origin** `/api`; Vite proxies to :8787 in dev) |
| `PORT` | API port (default `8787`) |

---

## 10. Next agent priorities

1. **Prediction locking audit** — [AGENT_PROMPT_LOCKING.md](./AGENT_PROMPT_LOCKING.md) + [LOCKING.md](./LOCKING.md): define at what stage picks lock **for all players**; align code, comparison visibility, and [FINAL_PLAN.md](./FINAL_PLAN.md).
2. Owner go-live on production ([GO_LIVE.md](./GO_LIVE.md)).
3. Keep `npm run jobs` + football-data sync during tournament.
4. On **`main`**: empty DB + `FOOTBALL_DATA_TOKEN` only — never run KO seed scripts in production.
5. On **`Debug`**: `cd C:\Users\tomso\World-Cup-Project`, `Copy-Item .env.debug.example .env`, `npm run seed:debug` (users only). Optional: `npm run seed:debug-random`. See [DEBUG.md](./DEBUG.md).
6. Log new issues in [UI_HANDOVER.md](./UI_HANDOVER.md) §7.

---

## 11. Known risks

1. Third-place mappings from Wikipedia Annex C — regenerate if FIFA errata.
2. KO kickoff times approximate in static data.
3. football-data team name aliases may miss fixtures.
4. **72 KO gate** vs friendly UX — saves blocked until 72 group picks committed.
5. Auto-save debounce — last edit may be lost on fast navigation.
6. No HTTPS/CORS in dev — configure for production.
7. `COMPLIANCE.md` may describe old draft/commit UI — trust code and [UI_HANDOVER.md](./UI_HANDOVER.md).

---

## 12. Conventions

- **Branches:** **`Debug` only** for work — **never create new branches**; merge to **`main`** when stable and owner-approved ([BRANCHING.md](./BRANCHING.md))
- No PR branches — merge **`Debug` → `main`** directly when releasing
- Update [UI_HANDOVER.md](./UI_HANDOVER.md) §6 when fixing UI bugs

---

*End of handover.*
