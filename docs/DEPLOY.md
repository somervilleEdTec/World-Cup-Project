# Production deployment — World Cup Boys

This guide covers running the app in production with **PostgreSQL**, optional **football-data.org** fixture import, and a **single-host** layout (API serves the built SPA).

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (recommended for production)
- football-data.org API token (optional; for live results and kickoff import)

## Small pool (~10 friends)

**SQLite is fine.** Use the default setup (`data.db`, no `DATABASE_URL`), run `npm run migrate`, and back up `data.db` occasionally. Postgres is optional until you need concurrent write scale or hosted HA.

Set `FOOTBALL_DATA_TOKEN` in `.env` (your football-data.org personal token; sent as **`X-Auth-Token`**). The API and jobs processes import real kickoffs and poll live results automatically (see §3). Never commit `.env`.

---

## 1. Database (PostgreSQL)

For larger deployments, create a database and user:

```sql
CREATE USER worldcup WITH PASSWORD 'your-secure-password';
CREATE DATABASE worldcup_boys OWNER worldcup;
```

Set the connection string:

```bash
export DATABASE_URL="postgres://worldcup:your-secure-password@localhost:5432/worldcup_boys"
```

Run migrations:

```bash
npm install
npm run migrate
```

Without `DATABASE_URL`, the app uses **SQLite** at `./data.db` (fine for local dev only).

## 2. Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Production | PostgreSQL connection string |
| `FOOTBALL_DATA_TOKEN` | Optional | football-data.org API token |
| `PORT` | No | API port (default `8787`) |
| `VITE_API_BASE_URL` | Build-time | Public API URL baked into frontend (e.g. `https://your-domain.com`) |

Create `.env` in the project root (never commit secrets):

```env
DATABASE_URL=postgres://...
FOOTBALL_DATA_TOKEN=your_token
PORT=8787
```

## 3. Real kickoffs and live results (football-data.org)

Set `FOOTBALL_DATA_TOKEN` in `.env`. Then:

| When | What runs |
|------|-----------|
| **API startup** | Imports kickoffs once (`match_kickoffs` + provider IDs) |
| **`npm run jobs`** | Initial full sync (kickoffs + results), then results every **2 min**, kickoffs every **6 h** |
| **Admin → Run full sync** | Kickoffs + finished results on demand |
| **CLI** | `npm run seed:fixtures` — same as full sync (kickoffs + results) |

Locks and comparison use DB kickoffs when present. Without a token, the app uses approximate static kickoffs from code.

## 4. Build and run

```bash
npm run build
npm run migrate
npm run seed:fixtures   # if using football-data
```

**API + static frontend (single process):**

```bash
npm run server
```

**Background jobs (locks + sync poll):** run in a second process or container:

```bash
npm run jobs
```

## 5. Admin user

Register via the UI, then promote to admin:

```bash
# SQLite
sqlite3 data.db "UPDATE users SET is_admin = 1 WHERE email = 'you@example.com';"

# PostgreSQL
psql "$DATABASE_URL" -c "UPDATE users SET is_admin = 1 WHERE email = 'you@example.com';"
```

## 6. Reverse proxy (HTTPS)

Example **nginx** in front of Node:

```nginx
server {
  listen 443 ssl;
  server_name worldcup.example.com;

  location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Set `VITE_API_BASE_URL=https://worldcup.example.com` when running `npm run build` so the SPA calls the correct origin.

## 7. Process manager (systemd example)

```ini
[Unit]
Description=World Cup Boys API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/world-cup-boys
EnvironmentFile=/opt/world-cup-boys/.env
ExecStart=/usr/bin/npm run server
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Duplicate for `worldcup-jobs.service` with `ExecStart=/usr/bin/npm run jobs`.

## 8. Docker (optional sketch)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
COPY migrations ./migrations
COPY src/server ./src/server
COPY src/data ./src/data
COPY src/lib ./src/lib
COPY src/services ./src/services
COPY scripts ./scripts
ENV NODE_ENV=production
CMD ["npm", "run", "server"]
```

Run migrations in an init container or entrypoint before `server`.

## 9. Quality checks before deploy

```bash
npm test
npm run build
```

## 10. Split frontend hosting (alternative)

If the SPA is on Vercel/Netlify and the API elsewhere:

1. Build with `VITE_API_BASE_URL=https://api.example.com`
2. Deploy `dist/` to static hosting
3. Run only `server` + `jobs` on the API host **without** relying on static middleware (use a slim API entry or omit `dist` from that host)

CORS is enabled on the API; restrict origins in production if needed.

---

See also [HANDOVER.md](./HANDOVER.md) and [FINAL_PLAN.md](./FINAL_PLAN.md).
