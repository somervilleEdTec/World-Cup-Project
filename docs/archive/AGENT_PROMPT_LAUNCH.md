# Prompt for launch agent — World Cup Boys (live site)

Copy everything below the line into a new Cursor agent session.

---

## Your role

Deploy and launch **World Cup Boys** (“Welcome to the Shiva Bowl”) so friends can **register on a live website** and enter World Cup 2026 predictions.

**Repository:** https://github.com/somervilleEdTec/World-Cup-Project  
**Production branch:** `main` only  
**Work branch for fixes:** `Debug` → merge to `main` when stable

## Mandatory first step — read in order

1. **[docs/LAUNCH_HANDOVER.md](./LAUNCH_HANDOVER.md)** — launch scope, checklist, invite flow  
2. **[docs/DEPLOY.md](./DEPLOY.md)** — HTTPS, hosting, Postgres/SQLite, systemd  
3. **[docs/GO_LIVE.md](./GO_LIVE.md)** — smoke tests before inviting friends  
4. **[docs/HANDOVER.md](./HANDOVER.md)** — architecture and API  
5. **[docs/FINAL_PLAN.md](./FINAL_PLAN.md)** — rules (**do not change** without owner)

## Launch essentials

- **Empty production DB:** `npm run db:purge` once before first real users  
- **`.env` on server only** (never commit):  
  - `FOOTBALL_DATA_TOKEN` — football-data.org personal token (`X-Auth-Token` header)  
  - `JOIN_PASSWORD` — shared secret friends need to register  
  - `VITE_API_BASE_URL` — public `https://` URL used at `npm run build`  
  - `NODE_ENV=production`  
- **Processes:** `npm run jobs` + `npm run server` (or `./scripts/start-production.sh`)  
- **No test seeds** on production (`seed:ko-environment` / `seed:before-final` are Debug-only)

## Owner context

- ~10 friends and family  
- Registration opens before / during group stage  
- Owner needs admin promotion after self-register (SQL in LAUNCH_HANDOVER)

## Quality gates

```bash
npm test
npm run build
```

## Conventions

- Do not edit [docs/FINAL_PLAN.md](./FINAL_PLAN.md) without owner approval  
- User-facing word: **prediction**  
- Log launch/UI bugs in [docs/UI_HANDOVER.md](./UI_HANDOVER.md) §6

---

*End of launch agent prompt.*
