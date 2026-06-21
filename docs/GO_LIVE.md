# Go-live checklist — World Cup Boys

**Production:** https://worldcup.dosums.uk (auto-deploy from **`main`**).

## Before inviting friends — read this first

**Future World Cup editions:** complete the **[FIFA ranking tiebreaker checklist](./FIFA_RANKING_TIEBREAKER_CHECKLIST.md)** after loading the opening-day ranking snapshot and **before** the first match. If two teams share the same FIFA rank **and** are in the **same group**, you must resolve that (drawing-of-lots failsafe) before relying on this app for live scoring.

**[LAUNCH_RULES.md](./LAUNCH_RULES.md)** is mandatory for the real tournament start:

1. **Wipe** the live database one last time  
2. **Bootstrap admin** (`AdminTomsom` / `ADMIN_PASSWORD` in `.env`) — organiser only, **not** on the league table  
3. **Add players** only via **Admin → Players** (no public registration)  
4. **Protect** the admin account from use as a league competitor  

---

## Environment (production `.env`)

```env
FOOTBALL_DATA_TOKEN=<your token>
NODE_ENV=production
VITE_API_BASE_URL=https://worldcup.dosums.uk
ADMIN_USERNAME=AdminTomsom
ADMIN_PASSWORD=<organiser password>
PORT=8787
```

Remove obsolete `JOIN_PASSWORD`. See [LIVE_SERVER_ADMIN_SETUP.md](./LIVE_SERVER_ADMIN_SETUP.md).

---

## Install, migrate, test (local or VM)

```bash
npm install
npm run migrate
npm test
npm run build
```

Backups: [DATABASE_BACKUP.md](./DATABASE_BACKUP.md) · `npm run db:backup`

---

## Processes on the server

| Process | Command / unit |
|---------|----------------|
| **Cloudflare Tunnel** | `cloudflared.service` — **required** for public HTTPS |
| API + SPA | `worldcup.service` (:8787) |
| Locks + sync | `worldcup-jobs.service` |

**Outage:** [OUTAGE_RECOVERY.md](./OUTAGE_RECOVERY.md)

---

## Smoke test (after launch rules)

### Auth

- [ ] Admin logs in (`AdminTomsom`)
- [ ] Admin adds a test player; player must change password on first login
- [ ] Public registration URL removed (login only)
- [ ] Reserved admin username cannot be added as a player

### Admin visibility

- [ ] Regular player does **not** see **Admin** in nav
- [ ] `/admin` redirects non-admins to home
- [ ] Admin **not** listed on leaderboard or comparison

### Stats (Crowd Predictions)

- [ ] **Stats** nav opens `/comparison` with **Crowd Predictions** tab (default)
- [ ] 5–8 random cards load; **Shuffle stats** returns a new mix
- [ ] Pre-lock: no team names in teaser cards; post-lock: match infographics for upcoming fixtures
- [ ] **By Fixture** tab shows player prediction table for selected match

### Predictions & locks

- [ ] Group + tournament bonus lock **15 minutes before** first kickoff (Welcome rules)
- [ ] KO fixtures lock **15 minutes before** each kickoff
- [ ] Per-group lock/unlock still works before global lock

### Ops

- [ ] Admin → mapping diagnostics (72/72 group if token set)
- [ ] All fixture kickoff dates correct — opening match **11 Jun 20:00 BST**; knockout times from `knockoutStageKickoffs.ts` (not legacy bracket offsets)
- [ ] Full football-data sync once (Admin → **Import kickoffs** if production DB has stale dates)
- [ ] `curl -s http://127.0.0.1:8787/api/health`

---

## Related

- [LAUNCH_RULES.md](./LAUNCH_RULES.md) — **mandatory** one-time live launch  
- [FIFA_RANKING_TIEBREAKER_CHECKLIST.md](./FIFA_RANKING_TIEBREAKER_CHECKLIST.md) — pre-kickoff duplicate-rank check (future tournaments)  
- [PRODUCTION.md](./PRODUCTION.md) — VM, deploy, wipe, nginx  
- [BRANCHING.md](./BRANCHING.md) — Debug vs main  
