# Final prediction handover — debug / troubleshoot

**Purpose:** Local database seeded so the tournament is **one step from the end**: every official result exists **except the final**, and every test user has **exactly one prediction left** — the **final** match.

**Branches:** Develop on `Debug`; release on `main` — [BRANCHING.md](./BRANCHING.md).

**Next agent:** Read this file first, then [HANDOVER.md](./HANDOVER.md) and [KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md). Use [AGENT_PROMPT.md](./AGENT_PROMPT.md) for general conventions.

---

## One-command setup (wipes DB)

```bash
npm install
npm run build
npm run seed:before-final
npm run server
```

Open **http://localhost:8787/login**

Equivalent:

```bash
npm run seed:ko-environment -- --before-final
```

Both commands **purge** `data.db` by default (full wipe + recreate).

---

## What is in the database

| Item | Detail |
|------|--------|
| Users | `Test 1` … `Test 10` |
| Password | `summer` (all) |
| Admin | `Test 1` |
| Group predictions | 72 per user (committed) |
| Tournament bonus | Set per user (locked) |
| Knockout predictions | All **confirmed** KO fixtures **except** `final` |
| Official results | 72 group + all KO through **third-place** (`third-place`) |
| **Not** in DB | Official result for `final`; user prediction on `final` |
| Simulated “now” | `2026-07-19T12:00:00Z` (after 3rd-place, **before** final kickoff `2026-07-19T19:00:00Z`) |
| Locks | `group_locked` set via `runAutoLocks` at simulated date |

Sign-up password for **new** registrations remains `MadSlags1` (env `JOIN_PASSWORD`). Seeded users are created by the script.

---

## What to verify (manual / GUI)

Log in as **`Test 1`** / **`summer`** (repeat for `Test 2` … `Test 10`).

1. **My Predictions → Final / 3rd Place**
   - **Third-place** and earlier tabs: predictions + official results + points where applicable; inputs locked after kickoff.
   - **Final**: both teams shown; **no** official result line; **empty** prediction (editable until kickoff).
2. **League Table** — standings differ across users (random picks vs results).
3. **Comparison**
   - Group: others visible (group locked).
   - KO played fixtures: others visible after kickoff; colour when results exist.
   - **Final**: others’ predictions hidden until final kickoff (no one has a final pick yet).
4. **Saving the final prediction** — enter score, auto-save; draw requires progressing team.

Document bugs in [UI_HANDOVER.md](./UI_HANDOVER.md) §6. Do **not** change [FINAL_PLAN.md](./FINAL_PLAN.md) without owner.

---

## Bracket reference

| Match id | Stage | Notes |
|----------|--------|--------|
| `third-place` | THIRD_PLACE | Official result **present** |
| `final` | FINAL | Teams from SF winners; **no** official result; **no** user prediction |

Knockout templates: `src/lib/bracketEngine.ts`. Seed logic: `scripts/seed-ko-environment.ts` (`--before-final`).

---

## Re-seed / reset

```bash
npm run seed:before-final
```

Fresh random scores and users. To wipe without seeding:

```bash
npm run db:purge
```

---

## Quality gates (after code changes)

```bash
npm test
npm run build
```

---

## Known seed design choices

- KO user predictions are written at `2026-06-27` (before any KO kickoff) so later kickoffs do not block seeding.
- Official KO results stop before inserting `final`; the final fixture still **confirms** once SF results exist.
- Default `npm run seed:ko-environment` (no flags) remains **group results only** for lighter KO entry testing.

---

*Prepared for agent handoff — simulated environment “all results through semis + 3rd place; one prediction left.”*
