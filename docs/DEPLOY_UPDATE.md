# Production deploy — after merging Debug to main

**Last updated:** 2026-06-03

Run these steps on the **production host** (VPS / owner machine serving the live site) after `git pull origin main`.

## 1. Pull latest `main`

```bash
cd /path/to/World-Cup-Project
git fetch origin
git checkout main
git pull origin main
```

Confirm `main` and `Debug` point to the same commit:

```bash
git rev-parse main Debug
```

## 2. Install, build, migrate

```bash
npm install
npm run migrate
VITE_API_BASE_URL=https://your-production-domain npm run build
npm test    # optional on host
```

## 3. Restart processes

```bash
# If using start-production.sh:
./scripts/start-production.sh

# Or manually — stop old processes first:
npm run jobs    # background — locks every 30s, results every 2 min
npm run server  # foreground or systemd — API + SPA on :8787
```

Ensure `.env` includes:

- `FOOTBALL_DATA_TOKEN`
- `NODE_ENV=production`
- `JOIN_PASSWORD`
- `VITE_API_BASE_URL` (must match public URL used at build time)

## 4. Smoke test live URL

Follow [GO_LIVE.md](./GO_LIVE.md) §5 on the **public HTTPS URL** (not only localhost).

## 5. Do not on production

- `npm run seed:ko-environment` / `seed:complete-teams` / `seed:before-final`
- `npm run db:purge` after friends have registered (unless intentional reset)

---

See [DEPLOY.md](./DEPLOY.md) for nginx, Postgres, and systemd details.
