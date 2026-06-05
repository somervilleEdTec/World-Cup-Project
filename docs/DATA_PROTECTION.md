# Data protection and prediction preservation

**Last updated:** 2026-06-05  
**Live policy:** Stored predictions must never be destroyed or rendered unusable by automated deploys, migrations, or scripts.

---

## Principles

1. **Code deploys must not destroy predictions.** Normal pushes to `main` only change application code and apply **additive** schema migrations.
2. **Destructive operations are blocked** when prediction rows exist, unless an operator explicitly confirms with the documented environment flags.
3. **Two backup layers:**
   - **`backups/`** — operational snapshots (used for routine restore before migrate; pruned to last 14 by default).
   - **`prediction-archive-retrieval-only/`** — append-only, **never read by the app or any automated script**. For human disaster recovery only.

---

## What is protected

| Table | Contents |
|-------|----------|
| `predictions` | All match score picks |
| `prediction_meta` | Group locks, bonus picks, commit state |
| `users` | Player accounts |
| `results` | Official match results used for scoring |

---

## Automatic protections

### Every deploy (`scripts/deploy-production.sh`)

1. **Retrieval archive** — if predictions exist, writes to `prediction-archive-retrieval-only/`
2. **Operational backup** — writes to `backups/`
3. **Safe migrate** — applies pending migrations; **aborts deploy** if a migration would destroy data

If backup or migrate fails, **deploy stops** and the live site keeps running the previous build.

### Every migration (`npm run migrate`)

Before applying **new** migrations:

- SQL is scanned for destructive patterns (`DROP TABLE`, `DELETE FROM predictions`, `TRUNCATE`, `DROP COLUMN` on protected tables).
- If predictions exist and the migration is destructive → **blocked** with a warning and alternative solutions.
- If predictions exist and the migration is safe → archive is written first, then migration runs.

### Database reset / purge

| Command | When predictions exist |
|---------|------------------------|
| `npm run db:purge` (local) | Blocked unless no predictions, or `CONFIRM_DESTROY_PREDICTIONS=yes` after archive |
| `npm run db:purge:live` | Requires `CONFIRM_LIVE_DB_PURGE` **and** `CONFIRM_DESTROY_PREDICTIONS=yes`; archive written first |
| `bash scripts/wipe-live-database.sh` | Runs `npm run db:archive` first; aborts if archive fails |

---

## Retrieval-only archive

```bash
npm run db:archive
```

Creates:

```text
prediction-archive-retrieval-only/
  README.txt
  predictions-retrieval-<timestamp>.db          # SQLite full copy
  predictions-retrieval-<timestamp>.db.manifest.json
```

Or for Postgres: `predictions-retrieval-<timestamp>.sql.gz` + manifest.

**Important:**

- The app, server startup, deploy, migrate, and `db:backup` **never read from this directory**.
- Files are **never pruned** automatically — keep until copied off the VM.
- Each manifest records row counts, timestamp, and deploy commit when available.

### Manual recovery (SQLite)

```bash
sudo systemctl stop worldcup worldcup-jobs
cp prediction-archive-retrieval-only/predictions-retrieval-YYYY-MM-DD....db data.db
sudo systemctl start worldcup-jobs worldcup
sqlite3 data.db "SELECT COUNT(*) FROM predictions;"
```

---

## Blocked action output

When an operation is blocked, the script prints:

```text
╔══════════════════════════════════════════════════════════════════════╗
║  DATA PROTECTION — ACTION BLOCKED                                    ║
╚══════════════════════════════════════════════════════════════════════╝
```

Followed by reasons and numbered **alternative solutions**. No data is modified.

---

## Emergency override (operators only)

```bash
DATA_PROTECTION_OVERRIDE=yes npm run migrate
```

Logs a warning and allows a blocked destructive migration. **Do not use** for routine deploys. Prefer additive migrations and manual offline data work instead.

Environment variables (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `PREDICTION_ARCHIVE_DIR` | Override retrieval archive directory |
| `DATA_PROTECTION_OVERRIDE` | Bypass destructive migration block (`yes`) |
| `CONFIRM_DESTROY_PREDICTIONS` | Required to purge when predictions exist (`yes`) |
| `CONFIRM_LIVE_DB_PURGE` | Required for production purge (`yes`) |

---

## Recommended cron (VM)

Operational backup (existing):

```cron
0 3 * * * cd /home/ubuntu/World-Cup-Project && npm run db:backup >> /home/ubuntu/backup.log 2>&1
```

Weekly off-VM copy of retrieval archive:

```bash
# Example: copy newest archive to external storage
ls -t prediction-archive-retrieval-only/predictions-retrieval-*.db | head -1
```

---

## Related docs

- [DATABASE_BACKUP.md](./DATABASE_BACKUP.md) — operational backups and restore
- [DEPLOY_CONTROL_PLANE.md](./DEPLOY_CONTROL_PLANE.md) — deploy pipeline
- [PRODUCTION.md](./PRODUCTION.md) — live server ops
- [LAUNCH_RULES.md](./LAUNCH_RULES.md) — one-time pre-launch wipe (only before real predictions)
