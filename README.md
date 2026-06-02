# World Cup Boys

Welcome to the Shiva Bowl.

## Local setup

```bash
npm install
```

### Run frontend

```bash
npm run dev
```

### Run API backend

```bash
npm run server
```

### Run schedulers (auto-lock + football-data sync)

```bash
npm run jobs
```

## Environment

- `FOOTBALL_DATA_TOKEN` (required for automatic score sync)
- `VITE_API_BASE_URL` (optional, defaults to `http://localhost:8787`)

## Quality checks

```bash
npm test
npm run build
```
