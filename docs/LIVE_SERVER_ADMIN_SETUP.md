# Live server — deploying admin-managed accounts

After merging the admin-auth and 15-minute lock changes to `main`:

## 1. Deploy the new build

Auto-deploy runs on push to `main`. Or SSH to the VM and pull manually:

```bash
cd /home/ubuntu/World-Cup-Project
git pull origin main
npm ci
npm run migrate
npm run build
sudo systemctl restart worldcup-app
sudo systemctl restart worldcup-jobs   # if using systemd for jobs
```

## 2. Run database migration

Migration `003` adds `must_change_password` to `users`. `npm run migrate` applies it on SQLite or Postgres.

## 3. Bootstrap admin account

On first start after deploy, the server creates (or promotes) the admin user:

| Setting | Default |
|---------|---------|
| Username | `AdminTomsom` |
| Password | `DickTits9` |

Override on the server `.env` (recommended after first login):

```env
ADMIN_USERNAME=AdminTomsom
ADMIN_PASSWORD=<choose a strong password only you know>
```

Remove `JOIN_PASSWORD` from `.env` — public registration is disabled.

## 4. Database backups

Before each production deploy, `deploy-production.sh` runs `npm run db:backup`.

Also set a **daily cron** — see [DATABASE_BACKUP.md](./DATABASE_BACKUP.md).

```bash
npm run db:backup   # manual snapshot → backups/data-<timestamp>.db
```

## 5. Production hardening (after deploy)

| Item | Action |
|------|--------|
| **CORS** | Set `VITE_API_BASE_URL=https://worldcup.dosums.uk` in `.env` (app locks CORS to this origin in production) |
| **Login rate limit** | Add nginx snippet from `deploy/nginx/worldcup-rate-limit.conf.snippet` |
| **Sessions** | Tokens last **90 days** on the same device (no change needed) |
| **Leaderboard** | Stays public (no login required) |

## 6. Add your friends

1. Log in at https://worldcup.dosums.uk as **AdminTomsom**.
2. Open **Admin → Players**.
3. Add each player with a **temporary password** (any length up to 30 characters).
4. Share username + temporary password privately (text/WhatsApp).
5. Each player logs in, chooses their own password (up to 30 characters; password managers OK), then uses the app.

## 7. Existing accounts on live DB

Players who registered themselves before this change keep working. To align with the new model:

- Optionally delete test accounts via SQLite/Postgres, or
- Leave them as-is; they are not forced to change password unless you set `must_change_password = 1` in SQL.

To promote an existing user to admin (only if needed):

```bash
sqlite3 data.db "UPDATE users SET is_admin = 1, must_change_password = 0 WHERE display_name = 'AdminTomsom';"
```

## 8. Verify

- Log in as a new test player → password-change screen appears.
- Log in as a regular player → no **Admin** nav link.
- Direct URL `/admin` as a regular player → redirected home; API returns 403.
