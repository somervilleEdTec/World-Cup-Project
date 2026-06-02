# Go-live checklist — World Cup Boys

Use this before inviting your group (~10 friends).

## 1. Environment

- [ ] Copy `.env.example` → `.env`
- [ ] Set `FOOTBALL_DATA_TOKEN` (football-data.org)
- [ ] Optional: set `VITE_API_BASE_URL` when building for a public domain

## 2. Install and migrate

**Windows (PowerShell):**

```powershell
git pull origin main
.\scripts\Test-LocalSite.ps1
```

**macOS / Linux:**

```bash
npm install
npm run migrate
npm run build
```

For a small friends pool, **SQLite** (`data.db`) is sufficient. Back up `data.db` weekly.

## 3. Start processes

```bash
chmod +x scripts/start-production.sh
./scripts/start-production.sh
```

Or manually:

```bash
npm run jobs    # terminal 1 — locks + football-data sync
npm run server  # terminal 2 — API + built SPA (:8787)
```

## 4. Admin setup

1. Register your account in the app
2. Promote to admin:

```bash
sqlite3 data.db "UPDATE users SET is_admin = 1 WHERE email = 'you@example.com';"
```

3. Open **Admin** → **Mapping diagnostics** — expect:
   - Group stage: **72/72 mapped**
   - Skipped knockout fixtures: unassigned teams until bracket fills (normal)

4. Run **full football-data sync** once

## 5. Group smoke test (2 users)

- [ ] Each user completes all **72** group picks
- [ ] Accept all **12** groups
- [ ] **Commit** group picks
- [ ] Bonus picks unlock only after 72/72 committed
- [ ] Knockout picks unlock only after 72/72 committed **and** each fixture has both teams from official results (Knockout tab)
- [ ] Comparison + leaderboard show committed picks only

## 6. During tournament

- Keep `npm run jobs` running (results every 2 min, kickoffs every 6 h)
- Use Admin → mapping diagnostics if sync skips increase
- Manual result override remains available

## 7. Product scope

**In scope (done):** rules engine, auth, picks, locks, scoring, comparison, admin sync, deploy docs.

**Current phase:** UI/layout polish — owner-reported issues; see [UI_HANDOVER.md](./UI_HANDOVER.md).

**Later:** OAuth, PWA, PDF export.

See [COMPLIANCE.md](./COMPLIANCE.md) and [DEPLOY.md](./DEPLOY.md).
