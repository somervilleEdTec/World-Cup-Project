# Local test environment (Debug branch)

**Branch:** **`Debug` only** — see [DEBUG.md](./DEBUG.md).  
**Hosting:** localhost — `DEBUG_LOCAL=1` in `.env` (copy from `.env.debug.example`).  
**Results:** random via seed scripts, or none with `--no-results` — **never** football-data.org on Debug.

---

## Standard test data

| Item | Default |
|------|---------|
| Users | **Test1** … **Test20** |
| Password | **`guest`** |
| Admin | **Test1** |
| Official results | Random 0–3 per team (group stage); see scenarios below |

```bash
cp .env.debug.example .env
npm run seed:debug
```

No results (picks only):

```bash
npm run seed:debug -- --no-results
```

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run seed:debug` | 20 users, random group results (default) |
| `npm run seed:debug -- --no-results` | 20 users, no official results |
| `npm run seed:complete-teams` | Full tournament — all random results + all KO picks |
| `npm run seed:before-final` | One final prediction left per user |
| `npm run seed:ko-environment` | Alias of `seed:debug` |

Overrides (only when a task asks):

```bash
npm run seed:ko-environment -- --user-count 10 --user-prefix Test --password guest --max-goals 4
```

---

## What gets seeded

| Item | Detail |
|------|--------|
| Group predictions | 72 random scores per user |
| Tournament bonus | Random top-four teams per user |
| Official results | Random scores in `results` table (`ko-environment-seed` source) |
| Locks | Simulated tournament date applied after seed |

---

## Manual checks

1. Log in as **Test1** / **guest** (admin).
2. **League Table** — different point totals across users.
3. **My Picks** — group tabs; KO tabs when results allow.
4. **Comparison** — visibility per [LOCKING.md](./LOCKING.md).

Re-seed: `npm run seed:debug` (purges DB by default).

---

## Related

- [DEBUG.md](./DEBUG.md) — branch policy  
- [BRANCHING.md](./BRANCHING.md) — merge to `main` only when confirmed  
