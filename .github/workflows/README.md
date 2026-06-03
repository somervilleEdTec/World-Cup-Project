# GitHub Actions

| Workflow | Branch | Purpose |
|----------|--------|---------|
| **deploy-main.yml** | **`main`** only | Test, build, SSH deploy to production |
| **wipe-live-database.yml** | Manual | Wipe live DB (`confirm` = `WIPE_LIVE_DATABASE`) |

**`Debug`** has no workflows — local testing only. See [docs/BRANCHING.md](../../docs/BRANCHING.md).
