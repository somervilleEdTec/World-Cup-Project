# Debug branch — local development policy

**Branch:** **`Debug` only** for day-to-day work.  
**Live site:** **`main`** — do not push unless the owner explicitly asks and confirms.

---

## Agent and contributor rules

| Rule | Requirement |
|------|-------------|
| Default branch | Check out **`Debug`** before any edit |
| Commits / push | Push to **`origin/Debug` only** |
| **`main`** | **Never** push, merge to `main`, or open PRs to `main` unless the user **explicitly requests and confirms** a production release |
| Project folder | Run **all** `git` / `npm` commands inside the clone (not Desktop or another folder) |
| Hosting | **Local only** (`localhost` / `127.0.0.1`) — not the Oracle VM |
| Results | **No** football-data.org on Debug — use **random seeded results** or **no results** (see below) |
| Test users | **`Test1` … `Test20`**, password **`guest`**, unless a task says otherwise |

See also [BRANCHING.md](./BRANCHING.md) · [CONTRIBUTING.md](../CONTRIBUTING.md) · [AGENT_PROMPT.md](./AGENT_PROMPT.md)

---

## Local hosting (Windows — owner PC)

**Important:** Open PowerShell, then **`cd` into the repo** before `git`, `Copy-Item`, or `npm`.  
If you run commands from `C:\Users\tomso\Desktop` (or anywhere without `.git`), they will fail.

**Owner clone path:**

```powershell
cd C:\Users\tomso\World-Cup-Project
```

If you cloned elsewhere, use that folder instead — it must contain `package.json` and `.git`.

### First-time clone

```powershell
cd C:\Users\tomso
git clone https://github.com/somervilleEdTec/World-Cup-Project.git
cd C:\Users\tomso\World-Cup-Project
```

### Every session

```powershell
cd C:\Users\tomso\World-Cup-Project
git fetch origin
git checkout Debug
git pull origin Debug
Copy-Item .env.debug.example .env
npm install
npm run seed:debug
.\scripts\Test-LocalSite.ps1 -Mode Serve
```

Browser: http://localhost:8787 — log in **Test1** / **guest** (sign-up password **MadSlags1** if needed).

Never point `VITE_API_BASE_URL` at production. `DEBUG_LOCAL=1` in `.env` blocks football-data.org sync.

### macOS / Linux

```bash
cd /path/to/World-Cup-Project
git checkout Debug
git pull origin Debug
cp .env.debug.example .env
npm install
npm run seed:debug
npm run server
```

---

## Results modes

| `RESULTS_MODE` | Behaviour |
|----------------|-----------|
| **`none`** (default with `DEBUG_LOCAL`) | No live API; no automatic results. Use seeds or Admin manual override. |
| **`random`** | Use seed scripts — they inject **random** official scores (0–`max-goals` per team). |
| **`live`** | Not used on Debug. Reserved for production (`main`). |

### Standard seed (20 users + random results)

From the project folder:

```powershell
cd C:\Users\tomso\World-Cup-Project
npm run seed:debug
```

Creates **Test1–Test20** / **`guest`**, random group picks and bonus picks, random group-stage official results (R32-only KO results unless flags below).

Variants:

| Command | Users | Results |
|---------|-------|---------|
| `npm run seed:debug` | Test1–20 | Random group results |
| `npm run seed:debug -- --no-results` | Test1–20 | **No** official results |
| `npm run seed:complete-teams` | Test1–20 | Random **full tournament** |
| `npm run seed:before-final` | Test1–20 | Random; one final pick left per user |

Override count or names only when a task says so:

```powershell
cd C:\Users\tomso\World-Cup-Project
npm run seed:ko-environment -- --user-count 5 --user-prefix Test --password guest
```

---

## Environment file

Use **[`.env.debug.example`](../.env.debug.example)** on **`Debug`**. Do not copy production `.env` values (no production URL, no live token required).

| Variable | Debug value |
|----------|-------------|
| `DEBUG_LOCAL` | `1` |
| `RESULTS_MODE` | `none` or `random` (via seeds) |
| `ALLOW_KO_SEED` | `1` |
| `VITE_API_BASE_URL` | `http://localhost:8787` |
| `FOOTBALL_DATA_TOKEN` | Leave unset |
| `NODE_ENV` | Unset or `development` (not `production`) |

---

## Releasing to production (owner only)

Only after explicit confirmation:

```powershell
cd C:\Users\tomso\World-Cup-Project
git checkout main
git pull origin main
git merge Debug
npm test
npm run build
git push origin main
```

That push deploys https://worldcup.dosums.uk. See [PRODUCTION.md](./PRODUCTION.md).
