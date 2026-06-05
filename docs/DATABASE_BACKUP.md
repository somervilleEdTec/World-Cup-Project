# Database backup (live server)

Predictions, users, and results live in **`data.db`** (SQLite) on the production VM unless you use Postgres.

> **Prediction preservation policy:** See **[DATA_PROTECTION.md](./DATA_PROTECTION.md)** — deploys abort if migrations would destroy stored predictions. A separate retrieval-only archive is kept in **`prediction-archive-retrieval-only/`**.

## Two backup layers

| Location | Purpose | Used by app/deploy? | Retention |
|----------|---------|---------------------|-----------|
| `backups/` | Operational restore before migrate | Yes (deploy writes; manual restore) | Last 14 (`BACKUP_KEEP_COUNT`) |
| `prediction-archive-retrieval-only/` | Human disaster recovery for predictions | **Never** | Append-only (not pruned) |

## Manual backup

On the server:

```bash
cd /home/ubuntu/World-Cup-Project
npm run db:backup
```

This writes **both** the retrieval archive (when predictions exist) and an operational copy in `backups/data-<timestamp>.db`.

Retrieval archive only:

```bash
npm run db:archive
```

## Automatic backup

### On every deploy

`scripts/deploy-production.sh` runs `npm run db:backup` **before** `npm run migrate`. If backup or migrate fails, **deploy aborts** to protect stored predictions.

### Daily cron (recommended)

```bash
crontab -e
```

Add:

```cron
0 3 * * * cd /home/ubuntu/World-Cup-Project && /usr/bin/npm run db:backup >> /home/ubuntu/backup.log 2>&1
```

Copy retrieval archives off the VM periodically (weekly recommended).

## Restore predictions from operational backup

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

## Restore from retrieval-only archive

Use **`prediction-archive-retrieval-only/`** only for manual disaster recovery — the app never reads this directory automatically.

```bash
sudo systemctl stop worldcup worldcup-jobs
cp prediction-archive-retrieval-only/predictions-retrieval-YYYY-MM-DD....db data.db
sudo systemctl start worldcup-jobs worldcup
```

See [DATA_PROTECTION.md](./DATA_PROTECTION.md) for full policy.

## Postgres

If `DATABASE_URL` is set, `npm run db:backup` uses `pg_dump` and writes `backups/postgres-<timestamp>.sql.gz`. Retrieval archive writes `prediction-archive-retrieval-only/predictions-retrieval-<timestamp>.sql.gz`. Restore with `gunzip -c file.sql.gz | psql "$DATABASE_URL"`.

## Do not commit backups

The `backups/` and `prediction-archive-retrieval-only/` folders are gitignored. Copy important snapshots off the VM periodically (e.g. to your PC or cloud storage).
