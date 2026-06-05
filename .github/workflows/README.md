# GitHub Actions

| Workflow | Branch / trigger | Purpose |
|----------|------------------|---------|
| **[deploy-main.yml](./deploy-main.yml)** | Push to **`main`**, manual | CI → SSH deploy → **verify live `/api/health`** (must match commit) |

**If verify fails with HTTP 530 / error 1033:** usually `cloudflared` down — see [docs/OUTAGE_RECOVERY.md](../docs/OUTAGE_RECOVERY.md). Re-run this workflow before SSH.
| **[ci-debug.yml](./ci-debug.yml)** | Push/PR **`Debug`**, PR to **`main`** | `npm test` + build (no deploy) |
| **[bootstrap-production.yml](./bootstrap-production.yml)** | Manual (`BOOTSTRAP_PRODUCTION`) | One-time VM: build tools, systemd, sudoers |
| **[wipe-live-database.yml](./wipe-live-database.yml)** | Manual (`WIPE_LIVE_DATABASE`) | Wipe live DB |

**Control plane guide:** [docs/DEPLOY_CONTROL_PLANE.md](../docs/DEPLOY_CONTROL_PLANE.md)

**`Debug`** never deploys live. **`main`** is the only automated path to https://worldcup.dosums.uk.

**On-server fallback:** `worldcup-deploy.timer` polls `origin/main` every 3 min and runs `deploy-production.sh` when GitHub SSH to port 22 is unavailable.

**Guide:** [docs/DEPLOY_CONTROL_PLANE.md](../docs/DEPLOY_CONTROL_PLANE.md)
