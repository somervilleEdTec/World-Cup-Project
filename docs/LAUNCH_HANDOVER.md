# Launch handover — live website for friend registration

**Purpose:** Hand off to a new agent to **deploy a public site** so friends can **register**, enter predictions, and use the app through World Cup 2026.

**Product:** World Cup Boys — “Welcome to the Shiva Bowl”  
**Repository:** https://github.com/somervilleEdTec/World-Cup-Project  
**Branch for production:** **`main` only**  
**Phase:** Launch — empty production database, live results from football-data.org

---

## Start here (agent)

1. **This file** — launch scope and checklist  
2. [DEPLOY.md](./DEPLOY.md) — hosting, HTTPS, Postgres vs SQLite, systemd  
3. [GO_LIVE.md](./GO_LIVE.md) — post-deploy smoke tests before inviting friends  
4. [HANDOVER.md](./HANDOVER.md) — architecture, API, env vars  
5. [FINAL_PLAN.md](./FINAL_PLAN.md) — competition rules (**do not change** without owner)  
6. [BRANCHING.md](./BRANCHING.md) — `main` vs `Debug`; no test seeds on production  

Copy-paste session prompt: [AGENT_PROMPT_LAUNCH.md](./AGENT_PROMPT_LAUNCH.md)

---

## What “done” looks like

| Goal | Success criteria |
|------|------------------|
| **Public URL** | Friends open `https://your-domain` (or agreed URL) and see Welcome / login |
| **Registration** | New users: display name + password (≤6 chars) + **join password** |
| **Empty start** | No test users (`Test 1`…), no fake results in production DB |
| **Live results** | `FOOTBALL_DATA_TOKEN` set; kickoffs + finished scores sync from football-data.org |
| **Background jobs** | `npm run jobs` running (locks every 30s, results every 2 min) |
| **Admin** | Owner account promoted to admin; mapping diagnostics **72/72** group mappings |
| **Invite** | Owner shares URL + join password with ~10 friends |

---

## Non-negotiables

- **Do not commit** `.env`, `data.db`, or API tokens to git.  
- **Do not run** `npm run seed:ko-environment` or `seed:before-final` on production (`main`). Those are **Debug-only** (or `ALLOW_KO_SEED=1` locally).  
- **Do not change** [FINAL_PLAN.md](./FINAL_PLAN.md) without owner approval.  
- **Before first real users:** `npm run db:purge` once on the production host so the database is empty.

---

## Secrets and environment (`.env`)

Copy `.env.example` → `.env` on the **server only**:

```env
# Required — live kickoffs + results (header: X-Auth-Token)
FOOTBALL_DATA_TOKEN=your_token_from_football-data.org

# Production behaviour (server exits without token)
NODE_ENV=production

# Sign-up gate — share this with friends (default MadSlags1 if unset)
JOIN_PASSWORD=choose_a_shared_secret

# Public URL baked into frontend at build time
VITE_API_BASE_URL=https://your-domain.com

# Optional — omit for SQLite (~10 friends is fine)
# DATABASE_URL=postgres://user:pass@host:5432/worldcup_boys

PORT=8787
```

Get a token: https://www.football-data.org/ (register → copy personal token).

---

## Recommended launch topology (~10 friends)

**Single VPS** (e.g. small Linux VM or owner’s always-on machine):

```text
Internet → nginx (HTTPS :443) → Node :8787 (npm run server)
                              ↘ npm run jobs (background)
         SQLite data.db OR PostgreSQL
```

- **SQLite** is acceptable for ~10 users; back up `data.db` daily during the tournament.  
- **PostgreSQL** if you want managed DB or easier remote backup — set `DATABASE_URL` and run `npm run migrate`.

See [DEPLOY.md](./DEPLOY.md) for nginx, systemd, and Postgres details.

---

## Launch procedure (production host)

### 1. Code

```bash
git clone https://github.com/somervilleEdTec/World-Cup-Project.git
cd World-Cup-Project
git checkout main
git pull origin main
```

### 2. Dependencies and empty database

```bash
npm install
cp .env.example .env
# Edit .env — FOOTBALL_DATA_TOKEN, JOIN_PASSWORD, VITE_API_BASE_URL

npm run db:purge          # once — wipes any prior test data
npm run migrate
npm test
npm run build             # uses VITE_API_BASE_URL from .env
```

### 3. Run processes

**Linux/macOS:**

```bash
chmod +x scripts/start-production.sh
./scripts/start-production.sh
```

This starts **`npm run jobs`** in the background and **`npm run server`** in the foreground (API + built SPA on port 8787).

**Or two terminals:**

```bash
npm run jobs    # terminal 1
npm run server  # terminal 2
```

**Windows (owner dev machine before public deploy):**

```powershell
git pull origin main
npm install
npm run db:purge
npm run migrate
npm run build
# Set .env then run jobs + server in two PowerShell windows, or use Test-LocalSite.ps1 for local only
```

### 4. HTTPS and domain

- Point DNS **A record** to the server.  
- Configure **nginx** (or Caddy) TLS reverse proxy to `http://127.0.0.1:8787` — example in [DEPLOY.md](./DEPLOY.md).  
- Rebuild if you change public URL: `VITE_API_BASE_URL=https://your-domain.com npm run build`.

### 5. Owner admin account

1. Open the site → **Register** (your name, password, join password).  
2. Promote to admin:

```bash
# SQLite
sqlite3 data.db "UPDATE users SET is_admin = 1 WHERE display_name = 'YourName';"

# PostgreSQL
psql "$DATABASE_URL" -c "UPDATE users SET is_admin = 1 WHERE display_name = 'YourName';"
```

3. Log in → **Admin** → **Mapping diagnostics** → expect **72/72** group stage mappings.  
4. **Run full football-data sync** once; confirm server log shows kickoffs + results synced.

### 6. Pre-invite checklist

Complete [GO_LIVE.md](./GO_LIVE.md) §5 (two-user smoke test) on the **production URL**.

### 7. Invite friends

Share:

- **URL:** `https://your-domain.com`  
- **Join password:** value of `JOIN_PASSWORD` in `.env` (not their login password)  
- Short instructions: register → Tournament Results → Group Stage → save picks before first kickoff  

---

## Runtime behaviour (for support)

| Process | Role |
|---------|------|
| `npm run server` | API + static SPA; bootstraps football-data.org on start if token set |
| `npm run jobs` | Auto-locks (30s); results sync (2 min); kickoff refresh (6 h) |
| Admin UI | Manual sync, mapping diagnostics, result override if API misses a match |

Results in DB use `source = 'football-data.org'`. Admin override uses `manual-override`.

---

## During the tournament

- Keep **jobs** and **server** running (systemd or process manager).  
- Back up **`data.db`** or Postgres regularly.  
- Watch Admin → sync status / mapping diagnostics if scores stop updating.  
- Log UI issues in [UI_HANDOVER.md](./UI_HANDOVER.md) §6.

---

## Local regression (not production)

On **`Debug`** branch only, with fake data:

```bash
git checkout Debug
ALLOW_KO_SEED=1 npm run seed:ko-environment
```

See [KO_ENVIRONMENT.md](./KO_ENVIRONMENT.md) — **never** on the live site.

---

## Quality gates before inviting anyone

```bash
npm test
npm run build
```

Current suite: unit + integration tests (see `package.json`).

---

## Open decisions for the launch agent

Confirm with the owner:

1. **Domain name** and DNS provider  
2. **Hosting** (VPS name, region, who pays)  
3. **`JOIN_PASSWORD`** to give friends (distinct from personal login passwords)  
4. **SQLite vs PostgreSQL** on production  
5. Whether the owner wants a **staging URL** on `Debug` before switching DNS to `main`

---

## Documentation index

| Doc | When to use |
|-----|-------------|
| [LAUNCH_HANDOVER.md](./LAUNCH_HANDOVER.md) | **This file** — public launch |
| [DEPLOY.md](./DEPLOY.md) | nginx, systemd, Postgres, Docker sketch |
| [GO_LIVE.md](./GO_LIVE.md) | Smoke tests and tournament ops |
| [HANDOVER.md](./HANDOVER.md) | Code map, API, scoring |
| [BRANCHING.md](./BRANCHING.md) | `main` / `Debug` workflow |
| [FINAL_PLAN.md](./FINAL_PLAN.md) | Locked rules |
| [UI_HANDOVER.md](./UI_HANDOVER.md) | UI history + bug log |

---

*Prepared for agent handoff — live website, friend registration, World Cup 2026.*
