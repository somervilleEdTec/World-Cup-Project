# Contributing

## Branches

This project uses **two branches only**:

| Branch | Use |
|--------|-----|
| **`Debug`** | All development and local testing |
| **`main`** | Production — merges from `Debug` trigger live deploy |

See **[docs/BRANCHING.md](docs/BRANCHING.md)** for the full workflow.

## Before you push

```bash
npm test
npm run build
npm run lint
npm run format:check   # optional
```

## Pull requests

1. Branch from **`Debug`** (or work directly on `Debug`).
2. Open PR into **`Debug`** for review, or merge locally.
3. When ready for production: merge **`Debug` → `main`** and push **`main`**.

Do not push experimental work directly to **`main`** without tests passing.

## Documentation

- Index: [docs/README.md](docs/README.md)
- Architecture: [docs/HANDOVER.md](docs/HANDOVER.md)
- Competition rules: [docs/FINAL_PLAN.md](docs/FINAL_PLAN.md) (owner approval required)
