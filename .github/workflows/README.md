# GitHub Actions

| Workflow | Branches | Effect |
|----------|----------|--------|
| **deploy-main.yml** | `main` only (push + manual dispatch on `main`) | Runs tests, then deploys to the **live** server via SSH |
| *(none)* | `Debug` | **No workflows** — test on your PC only (`npm test`, `Test-LocalSite.ps1`) |

Pushing to **`Debug` never updates the live website.**
