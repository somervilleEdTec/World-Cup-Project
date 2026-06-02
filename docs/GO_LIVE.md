# Go-live checklist — World Cup Boys

Use before inviting your group (~10 friends). After June 2026 UX work, run **stress tests** first — see [STRESS_TEST_HANDOVER.md](./STRESS_TEST_HANDOVER.md).

## 1. Environment

- [ ] Copy `.env.example` → `.env` (if present) or set env vars
- [ ] Set `FOOTBALL_DATA_TOKEN` (football-data.org) for live results
- [ ] Optional: `JOIN_PASSWORD` if not using default `MadSlags1`
- [ ] Set `VITE_API_BASE_URL` when building for a public domain

## 2. Install and migrate

**Windows (PowerShell):**

```powershell
git pull origin main
npm install
npm run migrate
npm test
npm run build
.\scripts\Test-LocalSite.ps1 -Mode Serve
```

**macOS / Linux:**

```bash
npm install
npm run migrate
npm run build
```

For a small friends pool, **SQLite** (`data.db`) is sufficient. Back up `data.db` regularly.

Fresh start (destroys all users/picks): `npm run db:purge`

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

1. Register in the app (**Name** + password + sign-up password)
2. Promote to admin:

```bash
sqlite3 data.db "UPDATE users SET is_admin = 1 WHERE display_name = 'YourName';"
```

3. Admin → **Mapping diagnostics** — expect group stage **72/72 mapped**
4. Run **full football-data sync** once (if token set)

## 5. Group smoke test (2 users)

### Auth

- [ ] Two users register with different names
- [ ] Wrong join password rejected

### Tournament Results

- [ ] Save winner / runner-up / third / fourth (no group picks required)
- [ ] Missing-picks list clears tournament lines

### Group Stage (sample groups)

- [ ] Enter scores — auto-save; projected table shows zeros until input
- [ ] **Lock group** — cannot edit after lock
- [ ] Complete all 12 groups for full pool (or accept partial for limited test)

### Knockout Stage

- [ ] Tab empty until official results confirm fixtures
- [ ] After **72** group picks saved: can enter KO scores
- [ ] Draw + progression team auto-saves

### General

- [ ] Missing-picks header accurate on all tabs
- [ ] Leaderboard + comparison reflect picks
- [ ] Mobile bottom nav usable at ~375px width
- [ ] Rules visible on **Welcome** (no Rules tab)

## 6. During tournament

- Keep `npm run jobs` running (results poll + lock pass)
- Admin → mapping diagnostics if sync skips increase
- Manual result override available

## 7. Phase status

**Done:** Rules engine, auth, picks, locks, scoring, comparison, admin sync, deploy docs, owner UI polish (PRs #7–#11).

**Current:** Stress test & debug — [STRESS_TEST_HANDOVER.md](./STRESS_TEST_HANDOVER.md).

**Later:** OAuth, PWA, PDF export.
