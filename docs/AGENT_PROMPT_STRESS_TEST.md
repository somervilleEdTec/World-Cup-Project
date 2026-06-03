# Agent prompt — stress test, environment & debug (next session)

Copy everything below the line into a new Cursor agent session.

---

## Your role

Run a **thorough end-to-end QA** of **World Cup Boys** after the **2026-06-03** merge to `main` / `Debug`: locking, scoring, league table, comparison, admin sync, and mobile layout. Fix bugs on **`Debug`** (local PC only), merge to **`main`** to update live (auto-deploy), and log findings. **Never** deploy from `Debug` — [DEBUG_BRANCH.md](./DEBUG_BRANCH.md).

**Repository:** https://github.com/somervilleEdTec/World-Cup-Project  
**Branches:** **`main`** and **`Debug`** only — they should match after your session starts.

## Mandatory first step — read in order

1. [docs/STRESS_TEST_HANDOVER.md](./STRESS_TEST_HANDOVER.md) — playbook + matrices  
2. [docs/LOCKING.md](./LOCKING.md) — lock layers and resolved decisions  
3. [docs/HANDOVER.md](./HANDOVER.md) — API, env, file map  
4. [docs/FINAL_PLAN.md](./FINAL_PLAN.md) — rules (**do not change** without owner)  
5. [docs/GO_LIVE.md](./GO_LIVE.md) — smoke checklist (also run against production URL if deployed)  
6. [docs/UI_HANDOVER.md](./UI_HANDOVER.md) §6–7 — log every bug you find

## Local environment setup

```bash
git checkout Debug
git pull origin Debug
npm install
npm test && npm run build
```

### Scenario A — full tournament (locking + comparison + league)

```bash
ALLOW_KO_SEED=1 npm run seed:complete-teams
npm run server    # terminal 1 — http://localhost:8787
npm run jobs      # terminal 2 — locks + football-data sync (optional token)
```

Login: **Team1** / **bender** (admin). Also spot-check **Team2** … **Team10**.

### Scenario B — one final pick left

```bash
npm run db:purge
ALLOW_KO_SEED=1 npm run seed:before-final
npm run server
```

See [FINAL_PREDICTION_HANDOVER.md](./FINAL_PREDICTION_HANDOVER.md).

### Scenario C — fresh DB (production-like)

```bash
npm run db:purge
# FOOTBALL_DATA_TOKEN in .env if testing live sync
npm run server
npm run jobs
```

Register a new user; do **not** run seeds.

## What changed in 2026-06-03 (focus regression areas)

| Area | Verify |
|------|--------|
| **Scoring** | Group W/D/L +2, exact +4; position +1; bonus 6/5/4/3; KO multipliers QF 1.5×, SF 2×, Final/3rd 3× |
| **League table** | Category columns + **Points** last; numeric columns centered |
| **Lock / Unlock group** | Toggle; unlock disabled when official results in group; plain scores when locked |
| **Official results** | Cannot edit fixture with result; cannot unlock affected group |
| **API** | Same-origin `/api` (no footer JSON parse errors); autosave responsive |
| **Comparison** | Group after global lock; KO after fixture kickoff; colour when results in |
| **72 gate** | KO save blocked with clear message until 72 group picks |
| **Admin** | Mapping diagnostics 72/72; full sync; result override |

## Test matrix (manual + automated)

Run `npm test` (expect **71** tests in **17** files) before and after fixes.

| # | Flow | Pass criteria |
|---|------|----------------|
| 1 | Register + login | Join password works; session persists |
| 2 | Tournament bonus | Saves without 72 group picks |
| 3 | Group auto-save | Debounce; scores persist on tab change |
| 4 | Lock group A | Cannot edit A; can edit B; unlock restores A (no results) |
| 5 | Admin result on g-a-1 | Cannot edit g-a-1; cannot unlock group A |
| 6 | 72 gate | KO tab warning; save fails until 72 group picks |
| 7 | KO confirmed fixture | Save works with 72 picks; unconfirmed rejected |
| 8 | Comparison group | Others hidden before global lock; visible after |
| 9 | Comparison KO | Others hidden before kickoff; visible after |
| 10 | League table | Points match expected for seeded users |
| 11 | Mobile nav | Bottom nav 2×2; no horizontal overflow |
| 12 | Production deploy | Owner URL loads; `npm run jobs` running on host |

## Production deploy (after fixes)

On the production host ([DEPLOY.md](./DEPLOY.md)):

```bash
git checkout main
git pull origin main
npm install
npm run build
npm run migrate
# restart: npm run server + npm run jobs (or systemd units)
```

Confirm `FOOTBALL_DATA_TOKEN`, `JOIN_PASSWORD`, `VITE_API_BASE_URL` in `.env`. **Do not** run `seed:*` on production.

## Deliverables

1. Bug log rows in [UI_HANDOVER.md](./UI_HANDOVER.md)  
2. Fixes on `Debug` → merge to `main` → push both  
3. Updated [STRESS_TEST_HANDOVER.md](./STRESS_TEST_HANDOVER.md) / [GO_LIVE.md](./GO_LIVE.md) if behaviour changed  
4. Short summary for owner: pass/fail per matrix row + deploy confirmation

## Quality gates

```bash
npm test
npm run build
```

## Conventions

- Do not edit [FINAL_PLAN.md](./FINAL_PLAN.md) without owner approval  
- User-facing word: **prediction**  
- Only **`main`** and **`Debug`** branches — delete stray `cursor/*` if any reappear

---

*End of stress-test agent prompt.*
