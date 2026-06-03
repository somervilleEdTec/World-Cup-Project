# Stress test & debug handover — next agent

**Last updated:** 2026-06-03  
**Repository:** https://github.com/somervilleEdTec/World-Cup-Project  
**Branches:** `main` (production) · `Debug` (development) — [BRANCHING.md](./BRANCHING.md)  
**Phase:** UI polish complete; **next priority:** prediction locking audit — [AGENT_PROMPT_LOCKING.md](./AGENT_PROMPT_LOCKING.md) · [LOCKING.md](./LOCKING.md)

**Start here:** [AGENT_PROMPT_LOCKING.md](./AGENT_PROMPT_LOCKING.md) (locking) · [AGENT_PROMPT.md](./AGENT_PROMPT.md) (general)

---

## 1. Your mission

1. **Stress-test** the app like a real group of friends on **Windows** (primary) and optionally macOS/Linux.
2. **Find bugs** — race conditions, wrong missing-picks messages, lock edge cases, mobile layout, API errors.
3. **Fix** with small PRs to `main`; run `npm test` + `npm run build` every time.
4. **Log findings** in [UI_HANDOVER.md](./UI_HANDOVER.md) §7 (stress-test log table).

**Do not change** [FINAL_PLAN.md](./FINAL_PLAN.md) competition rules without owner approval.

**Do not** revert intentional UX without owner sign-off (see §4).

---

## 2. Quick start (Windows — owner environment)

```powershell
cd C:\Users\tomso\World-Cup-Project
git restore .
git pull origin main
npm install
npm run db:purge          # fresh DB — only when you want a clean slate
.\scripts\Test-LocalSite.ps1 -Mode Serve
```

Browser: **http://localhost:8787/login**

**Register:** Name + password (1–6 chars) + sign-up password **`MadSlags1`** (override: `JOIN_PASSWORD` in `.env`).

**Admin** (after register):

```powershell
sqlite3 data.db "UPDATE users SET is_admin = 1 WHERE display_name = 'YourName';"
```

**Quality gates:**

```bash
npm test        # 66 tests (16 files)
npm run seed:ko-environment   # optional — see KO_ENVIRONMENT.md
npm run build
npm run lint    # optional
```

---

## 3. Current product behaviour (June 2026 — `main`)

### Auth

| Item | Behaviour |
|------|-----------|
| Login | **Name** + password (no email) |
| Password | 1–6 characters, no complexity rules |
| Sign-up | Requires join password **`MadSlags1`** |
| DB reset | `npm run db:purge` — drops all users/picks/results, recreates schema |

### Navigation

| Route | Purpose |
|-------|---------|
| `/` | Welcome + **rules** (scoring, locks, tie-breakers) |
| `/my-picks` | **My Predictions:** Tournament Results · Group Stage · R32 · R16 · QF · SF · Final / 3rd Place |
| `/league-table` | Leaderboard |
| `/comparison` | Multi-user fixture comparison |
| `/admin` | Sync, diagnostics, overrides (admin only) |

**No `/rules` route** — rules live on Welcome only.

**Mobile:** bottom nav 2×2 grid (Home · Predict · Table · Compare); desktop header nav.

**Terminology:** user-facing copy says **prediction** (not “pick”). Route remains `/my-picks`.

**Times:** all displayed kickoffs use **BST** (`formatKickoffBst`).

### My Picks — Tournament Results

- **Standalone** — no group picks required.
- **TeamSelect** dropdowns: teams **A–Z**, **flag + name** (`src/components/TeamSelect.tsx`).
- **Save tournament predictions** → writes `bonus_committed` immediately.
- When locked: four teams shown as text (no dropdowns).
- Locks at **first match kickoff** (global group lock).

### My Picks — Group Stage

- Scores **auto-save** (~450 ms debounce) → stored as **committed** picks.
- **No** per-match Save / Commit buttons.
- **Projected table** + **Actual table** (from official results when available).
- **Lock / Unlock group** — stored in `accepted_groups`; unlock blocked once any official result exists in that group ([LOCKING.md](./LOCKING.md)).
- **Previous / Next group** — flushes pending auto-save before navigating.

### My Predictions — Knockout (per-round tabs)

- **R32 / R16 / QF / SF / Final / 3rd Place** — each lists only confirmed fixtures for that round.
- Scores **auto-save** like group stage.
- When locked or past kickoff: prediction, official result, and **Points scored** shown as text (no spinners).
- Server requires **72 group predictions saved** before KO saves (unless tournament globally locked). See `pickLocks.ts`.

### My Predictions — header (all tabs)

**“You have the following missing predictions:”** lists:

- `Tournament Place: Winner` / `Runner-up` / `Third` / `Fourth`
- `Group A` … `Group L` (any incomplete group)
- `Knockout: R32 — Team vs Team` (confirmed fixtures without a pick)

Shows green “None — all current predictions are complete.” when empty.

### Comparison

- Fixture picker includes all matches with known teams (not only future kickoffs).
- **Group:** others’ predictions visible after tournament group lock (first kickoff).
- **Knockout:** others’ predictions visible **after that fixture’s kickoff** only.
- When results exist: green = exact score, amber = correct result only, red = wrong.
- Official result shown for the selected fixture.

### League Table

- Columns: Rank · Player · Exact Scores · Correct Results · Exact Group Positions · **Bonus Points** · **Points** (last column, bold).

### Removed UX (do not reintroduce without owner ask)

- Email login
- Rules tab / `RulesPage.tsx`
- Bottom **Review affected fixtures and Commit changes** panel
- **Accept group table** / **Amend** buttons
- “Group picks committed: 0/72” progress line
- Per-match **Save match** buttons

---

## 4. Stress-test playbook

Use **2+ browser profiles** or incognito + normal (different users).

### A. Auth & accounts

- [ ] Register two users with same name (expect “name taken”)
- [ ] Wrong join password
- [ ] Login wrong password
- [ ] `npm run db:purge` then re-register
- [ ] Logout / refresh / still authenticated

### B. Tournament Results

- [ ] Save all four places without touching group stage
- [ ] Reload page — picks persist
- [ ] Change selection and save again
- [ ] Verify missing-picks list clears tournament lines

### C. Group Stage (per group)

- [ ] Enter scores — table updates only after input (not empty placeholders as 0-0)
- [ ] Scroll mouse wheel on score box — must not go negative or scramble table
- [ ] **Lock group** — inputs disabled; API rejects further edits
- [ ] **Unlock group** — works only before official results in that group
- [ ] After official result for one fixture — cannot edit that fixture or unlock group
- [ ] Navigate away and back — locked state persists
- [ ] Lock without all 6 scores (expect error)
- [ ] All 12 groups — missing list shows no `Group X` lines

### D. Knockout Stage

- [ ] Before 72 group picks: KO save blocked; missing list still shows KO lines if fixtures confirmed
- [ ] After 72 group picks: save KO score + draw + progression team
- [ ] Auto-save on progression dropdown

### E. Locks & time

- [ ] `POST /api/system/locks/run` with date after `FIRST_MATCH_KICKOFF` — group + tournament locked
- [ ] `npm run jobs` — auto lock pass (see `src/server/jobs.ts`)

### F. Leaderboard & comparison

- [ ] Two users, different picks — leaderboard order
- [ ] Comparison fixture picker
- [ ] Only **committed** picks count (drafts table should stay empty in normal flow)

### G. Admin (optional)

- [ ] Mapping diagnostics
- [ ] Manual result override → KO fixture appears when teams confirmed
- [ ] football-data sync (needs `FOOTBALL_DATA_TOKEN`)

### H. Mobile / layout

- [ ] Bottom nav readable, not squashed (375px width)
- [ ] TeamSelect dropdown scroll + flag alignment
- [ ] League table horizontal scroll

### I. Concurrency / stress

- [ ] Two tabs same user — edit same fixture in both
- [ ] Rapid score changes — debounced saves, no duplicate errors
- [ ] Two users saving same group simultaneously

---

## 5. Code map (where bugs hide)

| Area | Primary files |
|------|----------------|
| My Picks UI | `src/pages/MyPicksPage.tsx` |
| Missing picks logic | `src/lib/missingPicks.ts` |
| Predictions API | `src/server/services/predictions.ts` |
| Locks / gates | `src/lib/pickLocks.ts` |
| KO gating | `src/lib/knockoutFixtureAvailability.ts` |
| Auth | `src/server/services/auth.ts`, `src/pages/LoginPage.tsx` |
| Team picker | `src/components/TeamSelect.tsx` |
| Styles | `src/styles/app.css` |
| Integration tests | `src/server/__tests__/api.integration.test.ts` |

---

## 6. API quick reference (current)

| Method | Path | Body / notes |
|--------|------|----------------|
| POST | `/api/auth/register` | `{ displayName, password, joinPassword }` |
| POST | `/api/auth/login` | `{ displayName, password }` |
| GET | `/api/predictions/state` | Bearer — full state |
| POST | `/api/predictions/draft` | `{ matchId, homeScore, awayScore, progressingTeamId? }` — saves **committed** |
| POST | `/api/predictions/bonus` | `{ winnerTeamId, runnerUpTeamId, thirdTeamId, fourthTeamId }` — saves **bonus_committed** |
| POST | `/api/predictions/groups/:groupId/lock` | Locks group |
| POST | `/api/predictions/groups/:groupId/unlock` | Unlocks group (if no official results in group) |
| POST | `/api/predictions/commit` | Legacy — UI does not call |
| GET | `/api/leaderboard` | Public |
| POST | `/api/system/locks/run` | Manual lock job |

---

## 7. Known risks (watch during stress test)

1. **KO gate vs UX** — UI allows viewing KO tab before 72 group picks; saves fail server-side. Confirm messaging is clear.
2. **`accepted_groups`** — DB column name is legacy; means **locked groups**, not “accepted table preview”.
3. **Debounce auto-save** — rapid navigation may drop last edit; test blur/tab switch.
4. **Tournament bonus** — `bonus_committed` only; `bonus_draft` unused in UI flow.
5. **COMPLIANCE.md** — partially outdated on draft/commit; trust this doc + code.
6. **Third-place mappings** — 495 scenarios; wrong mapping = wrong KO teams after group results.
7. **No E2E browser tests** — all manual except Vitest unit/integration.

---

## 8. Reporting & PR conventions

- Branch: `Debug` for work; merge to `main` when stable ([BRANCHING.md](./BRANCHING.md))
- PR base: **`main`**
- Record bugs in [UI_HANDOVER.md](./UI_HANDOVER.md) §6 before/while fixing
- Tag owner on blocking rule questions; do not edit `FINAL_PLAN.md` alone

---

## 9. Related docs

| Doc | Use |
|-----|-----|
| [HANDOVER.md](./HANDOVER.md) | Architecture, scoring, env, full file map |
| [FINAL_PLAN.md](./FINAL_PLAN.md) | Locked competition rules |
| [DEPLOY.md](./DEPLOY.md) | Production |
| [GO_LIVE.md](./GO_LIVE.md) | Pre-launch checklist (update as you verify) |
| [COMPLIANCE.md](./COMPLIANCE.md) | Plan compliance (may lag UX) |
| [TODO.md](./TODO.md) | Backlog |

---

*End of stress-test handover.*
