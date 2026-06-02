# Agent Handover — World Cup Boys

**Last updated:** 2026-06-02  
**Repository:** https://github.com/somervilleEdTec/World-Cup-Project  
**Active branch:** `cursor/world-cup-app-planning-4552`  
**Pull request:** https://github.com/somervilleEdTec/World-Cup-Project/pull/1  

---

## 1. Purpose of this document

This handover gives a **new agent** everything needed to resume work without re-reading the full conversation:

- What the product is and the **final locked rules**
- What has been **built** vs what is **still missing**
- How to **run and test** locally
- **Architecture** and file map
- **Progression timeline** (git + features)
- A prioritized **TODO backlog** with honest status

**Do not edit** Cursor plan artifacts in `/opt/cursor/artifacts/plans/` — treat **`docs/FINAL_PLAN.md`** as the in-repo product spec.

---

## 2. Product summary

**World Cup Boys** — tagline: **"Welcome to the Shiva Bowl"**

A friends-and-family prediction app for **FIFA World Cup 2026** (48 teams, 12 groups, 104 matches). Single global pool, email/password auth, mobile-first UI, live leaderboard driven by real results (football-data.org + manual admin override).

### Final scoring (implemented in `src/lib/tournamentLogic.ts`)

| Rule | Points |
|------|--------|
| Correct W/D/L (any stage) | +1 |
| Exact score bonus | +5 (6 total if exact) |
| Exact group finishing position (per team) | +2 |
| Preselected champion | +10 |
| Preselected runner-up | +8 |
| Preselected third place | +6 |
| Preselected fourth place | +4 |

### Locking rules (partially enforced)

| Phase | Lock trigger |
|-------|----------------|
| Group stage + bonus picks | First tournament kickoff (`FIRST_MATCH_KICKOFF` in `src/data/tournament.ts`) |
| Each knockout fixture | That fixture’s kickoff (rolling lock) |
| Commits | Only **committed** picks count; drafts ignored at lock |

### Knockout draws

If regulation is predicted as a draw in KO, user must pick **team to progress** (no ET/pen scoreline).

---

## 3. Plan documents in this repo

| File | Role |
|------|------|
| [docs/FINAL_PLAN.md](./FINAL_PLAN.md) | **Authoritative** final product rules (restructured competition) |
| [docs/PROJECT_PLAN.md](./PROJECT_PLAN.md) | Original exploratory plan (architecture ideas, earlier scoring proposals — **superseded** by FINAL_PLAN for rules) |
| [docs/HANDOVER.md](./HANDOVER.md) | This file — implementation status + agent TODOs |

---

## 4. Progression timeline (git)

| Commit | Summary |
|--------|---------|
| `fc52239` | Initial empty repo |
| `3f488a1` | Original `docs/PROJECT_PLAN.md` |
| `e606be4` | React/Vite scaffold, core pages, Zustand, scoring engine, tests |
| `b0c7339` | Typing/build fixes |
| `efc6e7d` | SQLite backend, Express API, schedulers, admin page, 48-team/104-match seed skeleton |
| `f71ed16` | Frontend wired to API; README |
| `7607243` | Multi-user Comparison API + Comparison page table |

**Current stack:** React 19 + Vite 8 + TypeScript + Express 5 + better-sqlite3 + Zustand (legacy, mostly superseded by API for picks).

---

## 5. What is implemented (honest assessment)

### Done or working at scaffold level

- [x] Branding: title **World Cup Boys**, tagline on header/login context
- [x] Flag + team name component (`TeamLabel`)
- [x] Mobile layout: desktop top nav + mobile bottom tabs
- [x] Pages: Login, Welcome, My Picks, League Table, Comparison, Admin
- [x] Auth: register/login, bearer token in `localStorage` (`wcb_token`)
- [x] SQLite schema: users, sessions, predictions (draft/committed), prediction_meta, results, sync_status
- [x] Prediction APIs: draft save, review, bonus draft, commit, state fetch
- [x] Lock scheduler job (`npm run jobs`) — group lock + KO kickoff checks every 30s
- [x] football-data.org fetch service + sync persistence + admin trigger
- [x] Admin: sync status, manual result override, recompute leaderboard
- [x] Leaderboard API from committed picks + results table
- [x] Comparison API: `GET /api/comparison/next`, `GET /api/comparison/:matchId`
- [x] Group wizard UI (A–L navigation), bonus dropdowns (all teams, repeats allowed)
- [x] Unit tests: `tournamentLogic.test.ts`, `comparisonVisibility.test.ts` (7 tests, passing)
- [x] `npm test` and `npm run build` pass

### Partially implemented / needs hardening

- [ ] **FIFA 2026 bracket engine** — knockout fixtures are **placeholders**, not derived from group results or official R32 mapping
- [ ] **Group wizard accept/amend** — preview table exists; explicit per-group “Accept / Amend” step not fully isolated
- [ ] **Dynamic KO population** — KO teams/fixtures do not update from real results/qualifiers
- [ ] **football-data.org ID mapping** — sync stores provider match IDs; internal IDs are `g-a-1`, `r32-1`, etc. — **not mapped**
- [ ] **Tournament bonus scoring** — `computeScore` needs real `finalPlacings` from tournament end; leaderboard currently passes `undefined` for final placings
- [ ] **Group position bonus** — logic exists but `actualPositions` derivation in `computeScore` is fragile (see code comment in handover risks)
- [ ] **Auth guards** — no protected routes; API returns 401 but UI does not redirect
- [ ] **Admin role** — `users.is_admin` must be set manually in DB
- [ ] **Multi-user Comparison** — KO visibility shows committed picks before kickoff by design; confirm with product owner if KO should hide until lock
- [ ] **Zustand store** (`src/lib/store.ts`) — legacy client-only path; prefer API

### Not started

- [ ] Production deployment (Vercel + hosted DB or single VPS)
- [ ] Postgres migration (SQLite is dev-friendly only)
- [ ] OAuth (Google/Apple)
- [ ] E2E / integration tests for API
- [ ] Official 2026 fixture import from football-data (all kickoffs/venues)
- [ ] Route to select Comparison match (`matchId` query) in UI
- [ ] Seed script / migration runner on server start

---

## 6. Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  Browser (Vite React SPA)                               │
│  src/pages/*  src/components/*  src/services/apiClient  │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP :8787 (VITE_API_BASE_URL)
┌──────────────────────────▼──────────────────────────────┐
│  Express API — src/server/index.ts                      │
│  auth | predictions | leaderboard | comparison | admin  │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  SQLite — data.db (created at runtime, gitignored)      │
└─────────────────────────────────────────────────────────┘

Scheduler: src/server/jobs.ts (locks + sync poll)
Domain logic: src/lib/tournamentLogic.ts, comparisonVisibility.ts
Seed data: src/data/tournament.ts (48 teams, 104 matches)
```

### Key files

| Path | Purpose |
|------|---------|
| `src/server/index.ts` | All HTTP routes |
| `src/server/db.ts` | Schema bootstrap |
| `src/server/services/predictions.ts` | Draft/commit/locks persistence |
| `src/server/services/comparison.ts` | Multi-user comparison |
| `src/server/services/leaderboard.ts` | Points aggregation |
| `src/server/services/sync.ts` | football-data ingest |
| `src/server/services/auth.ts` | Register/login/sessions |
| `src/lib/tournamentLogic.ts` | Scoring, standings, validation |
| `src/data/tournament.ts` | Teams + matches seed |
| `src/pages/MyPicksPage.tsx` | Main prediction UX |
| `src/pages/ComparisonPage.tsx` | Next-match comparison table |

---

## 7. API reference (quick)

Base URL: `http://localhost:8787` (override with `VITE_API_BASE_URL`)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/auth/register` | No | `{ email, password, displayName }` |
| POST | `/api/auth/login` | No | Returns `{ token, user }` |
| GET | `/api/predictions/state` | Bearer | Full draft/committed state |
| POST | `/api/predictions/draft` | Bearer | Save match pick draft |
| POST | `/api/predictions/review/:matchId` | Bearer | Mark fixture reviewed |
| POST | `/api/predictions/bonus` | Bearer | Bonus four-tuple |
| POST | `/api/predictions/commit` | Bearer | Promote drafts → committed |
| GET | `/api/leaderboard` | No | All users ranked |
| GET | `/api/comparison/next` | Bearer | Next fixture + all picks |
| GET | `/api/comparison/:matchId` | Bearer | Specific fixture |
| POST | `/api/system/locks/run` | No | Manual lock pass |
| GET | `/api/admin/sync-status` | Admin | |
| POST | `/api/admin/sync/run` | Admin | Needs `FOOTBALL_DATA_TOKEN` |
| POST | `/api/admin/results/override` | Admin | Manual FT result |
| POST | `/api/admin/leaderboard/recompute` | Admin | |

**Auth header:** `Authorization: Bearer <token>`

---

## 8. Local development

```bash
npm install

# Terminal 1 — API
npm run server

# Terminal 2 — schedulers (locks + sync)
export FOOTBALL_DATA_TOKEN=your_token_here   # optional for sync
npm run jobs

# Terminal 3 — frontend
npm run dev
```

Open app (Vite default): http://localhost:5173

**Create admin user:** register via UI, then:

```bash
sqlite3 data.db "UPDATE users SET is_admin = 1 WHERE email = 'you@example.com';"
```

**Quality gates:**

```bash
npm test
npm run build
```

---

## 9. Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `FOOTBALL_DATA_TOKEN` | For live sync | football-data.org `X-Auth-Token` |
| `VITE_API_BASE_URL` | No | Frontend → API (default `http://localhost:8787`) |
| `PORT` | No | API port (default `8787`) |

---

## 10. Prioritized TODO for next agent

Use this order. Mark items in [docs/TODO.md](./TODO.md) as you go.

### P0 — Correctness (blocks real tournament use)

1. **Bracket engine** — Implement FIFA 2026 group → R32 mapping (8 third-place slots). Replace `placeholderKo()` in `tournament.ts`. File: new `src/lib/bracketEngine.ts` + tests.
2. **Fixture ID mapping** — Table `match_external_ids (internal_id, provider, provider_id)`; map football-data responses to internal `match_id` before writing `results`.
3. **Scoring fixes** — Pass real `finalPlacings` into leaderboard; fix group-position scoring to compare predicted standings vs **official results** standings (not the buggy actuals→picks conversion in `computeScore`).
4. **Dynamic knockout fixtures** — When real results update group standings, regenerate available KO matches and team slots.

### P1 — Product completeness

5. **Group accept/amend flow** — After each group entry, force preview + explicit Accept before advancing; block “Next Group” until accepted.
6. **Auth UX** — Protected routes; redirect to `/login`; show logged-in user; logout.
7. **Comparison match picker** — Dropdown of upcoming fixtures calling `/api/comparison/:matchId`.
8. **Rules page** — Static page explaining scoring + lock rules (from FINAL_PLAN).

### P2 — Operations

9. **Postgres + migrations** — Prisma or drizzle; don’t rely on SQLite in production.
10. **Deploy** — Document single-host (API serves `dist/`) or split deploy.
11. **Integration tests** — Supertest against API with temp DB.
12. **Import script** — `scripts/seed-from-football-data.ts` for real kickoffs.

### P3 — Nice to have

13. OAuth, PWA manifest, push notifications, PDF export (from original PROJECT_PLAN).

---

## 11. Plan todo checklist (from final plan artifact)

These were the plan tool todos; **implementation status** as of handover:

| Plan todo ID | Plan intent | Status |
|--------------|-------------|--------|
| `competition-rule-refactor` | Group hard-lock + rolling KO locks | **Scaffold done** — needs real bracket |
| `group-position-bonus` | +2 per exact group position | **Code done** — verify vs real results |
| `bonus-picks-page` | Winner/runner-up/3rd/4th dropdowns | **Done** in My Picks |
| `ko-rolling-locks` | Per-fixture lock + countdown UI | **Scaffold done** |
| `draft-commit-safety` | Draft vs commit + review enforcement | **Done** in API |
| `football-data-sync` | Live results drive leaderboard | **Scaffold done** — ID mapping missing |

---

## 12. Known risks / bugs to watch

1. **`computeScore` group positions** — `actualPositions` built from `actuals` via incorrect cast; likely wrong when results partial. Rewrite using `computeGroupPositions(groupId, picksFromResults)`.
2. **Knockout placeholder teams** — R32 matches use arbitrary team IDs; comparisons and picks may not reflect user’s group predictions.
3. **No HTTPS / CORS** — fine for local dev; configure for production.
4. **Password hashing** — pbkdf2 in `auth.ts` is OK for friends app; consider bcrypt for production.
5. **`data.db` local only** — not in git; each environment starts empty unless seeded.

---

## 13. Suggested first session for a new agent

1. Read [docs/FINAL_PLAN.md](./FINAL_PLAN.md) (10 min).
2. `npm install && npm test && npm run build`.
3. Run server + dev; register two users; commit picks; open Comparison and League Table.
4. Pick **one P0 item** (recommend: fixture ID mapping OR bracket engine).
5. Add tests first, then implement; commit on `cursor/world-cup-app-planning-4552` or new `cursor/<task>-4552` branch per cloud agent rules.

---

## 14. Contacts / conventions

- Branch naming (cloud agent): `cursor/<descriptive-name>-4552`
- PR base: `main`
- Do **not** modify Cursor plan files in artifacts; update `docs/FINAL_PLAN.md` only if product rules change (with owner approval).

---

*End of handover.*
