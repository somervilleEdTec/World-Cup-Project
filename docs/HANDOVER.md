# Agent Handover — World Cup Boys

**Last updated:** 2026-06-02  
**Repository:** https://github.com/somervilleEdTec/World-Cup-Project  
**Active branch:** `cursor/world-cup-p0-complete-21eb`  
**Pull request:** https://github.com/somervilleEdTec/World-Cup-Project/pull/2 (draft)  
**Prior PR:** https://github.com/somervilleEdTec/World-Cup-Project/pull/1 (planning scaffold, superseded for implementation)

---

## 1. Purpose of this document

This handover gives a **new agent** everything needed to resume work without re-reading prior conversations:

- What the product is and the **final locked rules**
- What has been **built** vs what is **still missing**
- How to **run and test** locally
- **Architecture** and file map
- **Progression timeline** (git + features)
- A prioritized **TODO backlog** ([docs/TODO.md](./TODO.md))

**Start here for takeover:** [docs/AGENT_PROMPT.md](./AGENT_PROMPT.md) — includes instructions to **ask the product owner for next steps before coding**.

**Do not edit** Cursor plan artifacts in `/opt/cursor/artifacts/plans/`. Treat **`docs/FINAL_PLAN.md`** as the in-repo product spec.

---

## 2. Product summary

**World Cup Boys** — tagline: **"Welcome to the Shiva Bowl"**

A friends-and-family prediction app for **FIFA World Cup 2026** (48 teams, 12 groups, 104 matches). Single global pool, email/password auth, mobile-first UI, live leaderboard driven by real results (football-data.org + manual admin override).

### Final scoring (`src/lib/tournamentLogic.ts`)

| Rule | Points |
|------|--------|
| Correct W/D/L (any stage) | +1 |
| Exact score bonus | +5 (6 total if exact) |
| Exact group finishing position (per team) | +2 |
| Preselected champion | +10 |
| Preselected runner-up | +8 |
| Preselected third place | +6 |
| Preselected fourth place | +4 |

### Locking rules (implemented)

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
| [docs/FINAL_PLAN.md](./FINAL_PLAN.md) | **Authoritative** final product rules |
| [docs/PROJECT_PLAN.md](./PROJECT_PLAN.md) | Original exploratory plan — **superseded** by FINAL_PLAN for rules |
| [docs/HANDOVER.md](./HANDOVER.md) | This file — implementation status |
| [docs/TODO.md](./TODO.md) | Task tracker (P0/P1 marked complete as of PR #2) |
| [docs/AGENT_PROMPT.md](./AGENT_PROMPT.md) | Copy-paste prompt for the next agent session |

---

## 4. Progression timeline (git)

| Commit / milestone | Summary |
|--------------------|---------|
| `fc52239` | Initial empty repo |
| `3f488a1` | `docs/PROJECT_PLAN.md` |
| `e606be4`–`7607243` | React/Vite scaffold, API, comparison (PR #1 branch) |
| `7c43f6c` | **P0 + P1 complete:** bracket engine, 495 third-place mappings, sync ID mapping, scoring fixes, auth, rules page, comparison picker |

**Current stack:** React 19 + Vite 8 + TypeScript + Express 5 + better-sqlite3. Zustand in `src/lib/store.ts` is legacy; production path uses API.

---

## 5. What is implemented

### Core (tournament-ready logic)

- [x] **Bracket engine** — `src/lib/bracketEngine.ts`: FIFA R32→Final tree, third-place resolution via **495** Annex C mappings (`src/data/thirdPlaceMappings.ts`, regenerate with `node scripts/generate-third-place-map.mjs`)
- [x] **Dynamic knockout fixtures** — `src/lib/matchResolver.ts` → `getMatches(picks, results)` resolves team IDs from group picks and/or `results` table
- [x] **Group standings** — `src/lib/groupStandings.ts` (shared by scoring and bracket)
- [x] **Scoring** — Group-position bonus uses `picksFromActuals()`; tournament bonuses via `deriveFinalPlacings()` in leaderboard
- [x] **football-data.org mapping** — `match_external_ids` table + `src/server/services/matchMapping.ts`; sync resolves provider IDs to internal `g-*` / `r32-*` IDs

### App shell & UX

- [x] Pages: Login, Welcome, My Picks, League Table, Comparison, **Rules**, Admin
- [x] **Protected routes** + logout + display name (`ProtectedRoute`, `wcb_display_name` in localStorage)
- [x] Group wizard with **Accept / Amend** before “Next Group”
- [x] Comparison fixture dropdown + `?matchId=` + `GET /api/comparison/fixtures`
- [x] Draft/commit flow, rolling KO locks, admin sync/override/recompute
- [x] **11 unit tests** passing; `npm run build` passes

### Still manual / partial

- [ ] **Admin role** — set `users.is_admin = 1` in SQLite after register
- [ ] **Real fixture kickoffs** — group KO kickoffs are approximate ISO dates; import from football-data still P2
- [ ] **football-data live sync** — needs valid `FOOTBALL_DATA_TOKEN` and matching team names in API responses
- [ ] **Zustand store** — legacy client-only path; prefer API
- [ ] **Production** — SQLite only; no deploy docs yet (P2)

### Not started (see TODO P2–P3)

- [ ] Postgres + migrations
- [ ] Production deployment documentation
- [ ] API integration tests (Supertest)
- [ ] OAuth, PWA, PDF export

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
│  SQLite — data.db (runtime, gitignored)                   │
│  tables: users, sessions, predictions, results,         │
│          match_external_ids, sync_status                  │
└─────────────────────────────────────────────────────────┘

Scheduler: src/server/jobs.ts (locks + sync poll)

Domain:
  src/lib/groupStandings.ts   — group tables
  src/lib/bracketEngine.ts    — KO bracket + final placings
  src/lib/matchResolver.ts    — getMatches(picks, results)
  src/lib/tournamentLogic.ts  — scoring, locks, validation
  src/lib/comparisonVisibility.ts

Data:
  src/data/tournament.ts           — teams + 72 group matches
  src/data/thirdPlaceMappings.ts   — 495 FIFA third-place scenarios (generated)
```

### Key files

| Path | Purpose |
|------|---------|
| `src/lib/bracketEngine.ts` | R32–Final derivation, `deriveFinalPlacings` |
| `src/lib/matchResolver.ts` | `getMatches()` — group + resolved KO |
| `src/lib/groupStandings.ts` | Points/GD/GF standings per group |
| `src/server/services/matchMapping.ts` | Provider ID ↔ internal match ID |
| `src/server/services/sync.ts` | football-data ingest |
| `src/server/services/leaderboard.ts` | Points aggregation |
| `src/server/services/predictions.ts` | Draft/commit/locks |
| `src/server/services/comparison.ts` | Multi-user comparison |
| `src/pages/MyPicksPage.tsx` | Group wizard + KO picks |
| `src/pages/RulesPage.tsx` | Scoring / lock rules (UI) |
| `scripts/generate-third-place-map.mjs` | Regenerate Annex C mappings from Wikipedia |

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
| GET | `/api/comparison/fixtures` | Bearer | Upcoming fixtures list |
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
export FOOTBALL_DATA_TOKEN=your_token_here   # optional
npm run jobs

# Terminal 3 — frontend
npm run dev
```

Open http://localhost:5173 — unauthenticated users redirect to `/login`.

**Create admin user:** register via UI, then:

```bash
sqlite3 data.db "UPDATE users SET is_admin = 1 WHERE email = 'you@example.com';"
```

**Quality gates:**

```bash
npm test    # 11 tests
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

**P0 and P1 are complete** as of PR #2. See [docs/TODO.md](./TODO.md).

### P2 — Operations (recommended next)

1. **Postgres + migrations** — replace SQLite for production
2. **Deploy docs** — single host (API serves `dist/`) or split Vercel + DB
3. **Integration tests** — Supertest with temp DB
4. **Import script** — `scripts/seed-from-football-data.ts` for real kickoffs and provider IDs

### P3 — Later

OAuth, PWA manifest, notifications, PDF export (see [docs/PROJECT_PLAN.md](./PROJECT_PLAN.md)).

**Before starting:** read [docs/AGENT_PROMPT.md](./AGENT_PROMPT.md) and confirm priorities with the product owner.

---

## 11. Plan todo checklist (final plan)

| Plan todo ID | Status |
|--------------|--------|
| `competition-rule-refactor` | [x] |
| `group-position-bonus` | [x] |
| `bonus-picks-page` | [x] |
| `ko-rolling-locks` | [x] |
| `draft-commit-safety` | [x] |
| `football-data-sync` | [x] (mapping + name resolution; live API depends on token) |

---

## 12. Known risks / bugs to watch

1. **Third-place mappings** — sourced from Wikipedia Annex C table; regenerate if FIFA publishes errata (`node scripts/generate-third-place-map.mjs`).
2. **KO kickoff times** — approximate in code; leaderboard locks use these ISO strings.
3. **football-data team names** — aliases in `matchMapping.ts`; add names if sync skips fixtures.
4. **No HTTPS / CORS** — configure for production.
5. **`data.db` local only** — not in git; each environment starts empty unless seeded.
6. **Partial group results** — group-position scoring only counts groups where all 6 results exist in `results` table.

---

## 13. Suggested first session for a new agent

1. Read [docs/AGENT_PROMPT.md](./AGENT_PROMPT.md) and **ask the owner what to do next** (do not assume).
2. Read [docs/FINAL_PLAN.md](./FINAL_PLAN.md).
3. `git checkout cursor/world-cup-p0-complete-21eb` (or `main` after merge).
4. `npm install && npm test && npm run build`.
5. Smoke-test: two users, group picks, accept groups, commit, check KO teams and Comparison.

---

## 14. Conventions

- Branch naming (cloud agent): `cursor/<descriptive-name>-21eb`
- PR base: `main`
- Update `docs/FINAL_PLAN.md` only if product rules change (with owner approval).

---

*End of handover.*
