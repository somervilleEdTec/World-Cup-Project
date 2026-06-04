# Launch rules — World Cup Boys (live tournament start)

**Mandatory before inviting real players.** These rules apply **once** when you go from testing to the real tournament on https://worldcup.dosums.uk.

Work on branch **`Debug`** locally; release via **`main`** ([BRANCHING.md](./BRANCHING.md)).

---

## Rule 1 — Wipe the live database one last time

All test users, test predictions, and cached results must be removed so the league starts clean.

**On the production VM (branch `main` only):**

```bash
cd /home/ubuntu/World-Cup-Project
git pull origin main
bash scripts/wipe-live-database.sh
```

Or GitHub Actions → **Wipe live database** → confirm `WIPE_LIVE_DATABASE`.

**Do not skip this step** if anyone has registered or entered picks during testing.

After wipe:

- `users`, `predictions`, `sessions`, and `results` tables must be **empty** (script verifies).
- App processes restart; football-data.org may re-import kickoffs/results when `FOOTBALL_DATA_TOKEN` is set (expected).

---

## Rule 2 — Bootstrap admin account (organiser only)

The **organiser admin** is created automatically on server start:

| Setting | Default |
|---------|---------|
| Username | `AdminTomsom` |
| Password | Set in `.env` as `ADMIN_PASSWORD` (change from default immediately) |

```env
ADMIN_USERNAME=AdminTomsom
ADMIN_PASSWORD=<strong password known only to the organiser>
```

After wipe + restart, log in as **AdminTomsom** and confirm **Admin → Players** works.

**Manual check if needed:**

```bash
npm run db:ensure-admin
```

---

## Rule 3 — Admin is not a league player

The admin account must **never** appear as a competitor.

| Area | Behaviour |
|------|-----------|
| **Leaderboard** | Admin users excluded (`is_admin = 0` only) |
| **Comparison** | Admin users excluded from the player list |
| **Admin → Players** | Lists only non-admin accounts |
| **Nav** | **Admin** link only when `/api/auth/me` reports `isAdmin` |

Players must not see the admin username on the league table or in head-to-head comparison.

---

## Rule 4 — Protect the admin account

| Action | Allowed? |
|--------|----------|
| Log in as admin | Yes (organiser) |
| Add players via **Admin → Players** | Yes |
| Sync / diagnostics / result override | Yes |
| Register duplicate username `AdminTomsom` (or `ADMIN_USERNAME`) | **No** — blocked at API |
| Admin on public leaderboard | **No** |
| Admin in comparison picker | **No** |
| Delete admin via app | **No API** (no delete-player endpoint) |
| `npm run db:purge:live` / wipe script | Wipes all data then **recreates** bootstrap admin on next `db:ensure-admin` or server start |

**Never** run `UPDATE users SET is_admin = 0` on the organiser account.

**Never** promote real players to `is_admin = 1` unless you intend them to run sync/override tools.

---

## Rule 5 — Add real players only via Admin

1. Log in as **AdminTomsom**.
2. **Admin → Players** → add each friend (username + temporary password).
3. Share credentials privately.
4. Each friend logs in → **chooses own password** (up to 30 characters) → enters picks.

Public self-registration is **disabled**.

---

## Rule 6 — Backups and deploy

| When | What |
|------|------|
| Every deploy | `npm run db:backup` before migrate (automatic in `deploy-production.sh`) |
| Daily | Cron `npm run db:backup` — [DATABASE_BACKUP.md](./DATABASE_BACKUP.md) |
| nginx | Login rate limit — `deploy/nginx/worldcup-rate-limit.conf.snippet` |
| CORS | `VITE_API_BASE_URL=https://worldcup.dosums.uk` in production `.env` |

---

## Launch checklist (sign-off)

- [ ] Code on **`main`** merged from **`Debug`**; `npm test` green
- [ ] Live DB wiped (`wipe-live-database.sh` or workflow)
- [ ] `ADMIN_PASSWORD` set in server `.env` (not default)
- [ ] Admin login works; **Admin** nav visible only to admin
- [ ] Admin **not** on leaderboard after adding a test player
- [ ] Two test players added via Admin → Players; password-change flow works
- [ ] `npm run jobs` / `worldcup-jobs` running
- [ ] Rules on Welcome page match 15-minute lock policy
- [ ] Friends invited

---

## Related docs

- [GO_LIVE.md](./GO_LIVE.md) — smoke tests after launch setup  
- [LIVE_SERVER_ADMIN_SETUP.md](./LIVE_SERVER_ADMIN_SETUP.md) — deploy and env  
- [PRODUCTION.md](./PRODUCTION.md) — VM, nginx, wipe workflow  
- [LOCKING.md](./LOCKING.md) — prediction lock times  
