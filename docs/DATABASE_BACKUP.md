# Database backup (live server)

Predictions, users, and results live in **`data.db`** (SQLite) on the production VM unless you use Postgres.

## Manual backup

On the server:

```bash
cd /home/ubuntu/World-Cup-Project
npm run db:backup
```

Creates `backups/data-<timestamp>.db` and keeps the last **14** copies by default (`BACKUP_KEEP_COUNT` in `.env`).

## Automatic backup

### On every deploy

`scripts/deploy-production.sh` runs `npm run db:backup` **before** `npm run migrate`, so each production deploy keeps a snapshot.

### Daily cron (recommended)

```bash
crontab -e
```

Add:

```cron
0 3 * * * cd /home/ubuntu/World-Cup-Project && /usr/bin/npm run db:backup >> /home/ubuntu/backup.log 2>&1
```

## Restore predictions from a backup

**Stop the app first** so SQLite is not locked:

```bash
sudo systemctl stop worldcup worldcup-jobs
cp backups/data-YYYY-MM-DDTHH-MM-SS.db data.db
sudo systemctl start worldcup-jobs worldcup
```

Verify:

```bash
sqlite3 data.db "SELECT COUNT(*) FROM predictions;"
curl -s http://127.0.0.1:8787/api/health
```

## Postgres

If `DATABASE_URL` is set, `npm run db:backup` uses `pg_dump` and writes `backups/postgres-<timestamp>.sql.gz`. Restore with `gunzip -c file.sql.gz | psql "$DATABASE_URL"`.

## Do not commit backups

The `backups/` folder is gitignored. Copy important snapshots off the VM periodically (e.g. to your PC or cloud storage).
