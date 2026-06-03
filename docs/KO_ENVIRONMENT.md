# Local test environment (Debug branch)

**Branch:** **`Debug` only** — see [DEBUG.md](./DEBUG.md).  
**Hosting:** localhost — `DEBUG_LOCAL=1` in `.env`.

---

## Default state (`npm run seed:debug`)

| Item | Value |
|------|--------|
| Users | **Test1** … **Test20** |
| Password | **`guest`** |
| Admin | **Test1** |
| Predictions | **None** |
| Official results | **None** |

```powershell
cd C:\Users\tomso\World-Cup-Project
Copy-Item .env.debug.example .env
npm run seed:debug
```

---

## Optional scenarios

| Command | Predictions | Results |
|---------|-------------|---------|
| `npm run seed:debug` | None | None |
| `npm run seed:debug -- --with-predictions` | Random group + bonus | None |
| `npm run seed:debug-random` | Random | Random (group; R32 if KO path) |
| `npm run seed:complete-teams` | Full tournament | All rounds random |
| `npm run seed:before-final` | All but final | Through 3rd place |

```powershell
cd C:\Users\tomso\World-Cup-Project
npm run seed:debug-random
```

Overrides (only when a task asks):

```powershell
npm run seed:ko-environment -- --user-count 10 --with-predictions --random-results
```

---

## Manual checks (empty default)

1. Log in as **Test1** / **guest**.
2. **My Picks** — all tabs empty / zero picks.
3. **League Table** — users listed with **0** points until picks and results exist.
4. Enter picks manually or re-seed with `seed:debug-random` to test scoring.

Re-seed default: `npm run seed:debug` (purges DB unless `--no-purge`).

---

## Related

- [DEBUG.md](./DEBUG.md) — branch policy  
- [BRANCHING.md](./BRANCHING.md) — merge to `main` only when confirmed  
