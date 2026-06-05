# GitHub Actions

| Workflow | Branch / trigger | Purpose |
|----------|------------------|---------|
| **[deploy-main.yml](./deploy-main.yml)** | Push to **`main`**, manual | CI → SSH deploy → **verify live `/api/health`** (must match commit) |
| **[monitor-production.yml](./monitor-production.yml)** | Cron every **5 min**, manual | Public health check → SSH auto-recover if down |
| **[ci-debug.yml](./ci-debug.yml)** | Push/PR **`Debug`**, PR to **`main`** | `npm test` + build (no deploy) |
| **[bootstrap-production.yml](./bootstrap-production.yml)** | Manual (`BOOTSTRAP_PRODUCTION`) | One-time VM: build tools, systemd, sudoers |
| **[wipe-live-database.yml](./wipe-live-database.yml)** | Manual (`WIPE_LIVE_DATABASE`) | Wipe live DB |

**Control plane guide:** [docs/DEPLOY_CONTROL_PLANE.md](../docs/DEPLOY_CONTROL_PLANE.md)  
**Outage recovery:** [docs/OUTAGE_RECOVERY.md](../docs/OUTAGE_RECOVERY.md)

**`Debug`** never deploys live. **`main`** is the only automated path to https://worldcup.dosums.uk.

**On-server automation:**

- `worldcup-deploy.timer` — polls `origin/main` every 3 min
- `worldcup-monitor.timer` — checks public health every 2 min and auto-recovers
