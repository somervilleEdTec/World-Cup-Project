# GitHub Actions

| Workflow | Branch / trigger | Purpose |
|----------|------------------|---------|
| **[deploy-main.yml](./deploy-main.yml)** | Push to **`main`**, manual | CI → SSH deploy (`ci-ssh-setup.sh` + retries) → **verify live `/api/health`** |
| **[ci-debug.yml](./ci-debug.yml)** | Push/PR **`Debug`**, PR to **`main`** | `npm test` + build (no deploy) |
| **[bootstrap-production.yml](./bootstrap-production.yml)** | Manual (`BOOTSTRAP_PRODUCTION`) | One-time VM: build tools, systemd, sudoers |
| **[wipe-live-database.yml](./wipe-live-database.yml)** | Manual (`WIPE_LIVE_DATABASE`) | Wipe live DB |

**Control plane guide:** [docs/DEPLOY_CONTROL_PLANE.md](../docs/DEPLOY_CONTROL_PLANE.md)

**`Debug`** never deploys live. **`main`** is the only automated path to https://worldcup.dosums.uk.
