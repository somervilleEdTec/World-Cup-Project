# football-data.org API verification

How to confirm your `FOOTBALL_DATA_TOKEN` is valid, mapping works, and (once games finish) results match [FIFA](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures).

---

## Quick answer: is my API key correct?

**Valid token** → `GET https://api.football-data.org/v4/competitions/WC` returns **HTTP 200** and competition JSON.

**Invalid token** → **HTTP 400** with `"Your API token is invalid."`

### On the production server

```bash
cd /home/ubuntu/World-Cup-Project
source .env   # or: export $(grep -v '^#' .env | xargs)
npm run verify:football-data
```

### On your PC (Debug branch)

```powershell
cd C:\Users\tomso\World-Cup-Project
git checkout cursor/verify-football-data-fb2e   # or main after merge
# Add FOOTBALL_DATA_TOKEN=... to .env (temporarily — do not commit)
npm run verify:football-data
```

### Via Admin UI (production)

1. Log in as **AdminTomsom**
2. Open **Admin**
3. Click **Mapping diagnostics** — if the token is wrong you get an error; if correct you see group mapping counts (target **72/72** group fixtures)
4. Click **Import kickoffs** / **Full sync** — check server logs for `mapped/skipped` counts

### One-line curl test

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "X-Auth-Token: YOUR_TOKEN_HERE" \
  https://api.football-data.org/v4/competitions/WC
```

Expect `200`. `400` = bad token.

---

## Full verification script

Branch: `cursor/verify-football-data-fb2e`

```bash
FOOTBALL_DATA_TOKEN=your_token npm run verify:football-data
```

**Read-only** (default): checks token, fixture counts, kickoff cross-check vs FIFA static schedule, mapping diagnostics. Does **not** write results.

**Import mode** (test DB only):

```bash
FOOTBALL_DATA_TOKEN=your_token npm run verify:football-data -- --import
```

Writes kickoffs + finished results via the same path as production sync. Use on **local SQLite** or a **copy** of the DB — not on live production during the tournament unless you intend to sync.

---

## What to expect before the tournament (June 2026)

| Check | Expected now (pre–11 June) |
|-------|----------------------------|
| Token | HTTP 200, competition name “FIFA World Cup” |
| API quota headers | `X-Requests-Available` / `X-RequestCounter-Limit` shown |
| Fixture status | Mostly `SCHEDULED` or `TIMED` |
| **Finished matches** | **0** — results import cannot be fully tested yet |
| Group mapping | **≥ 70/72** (ideally 72/72) |
| Kickoffs vs FIFA | Most group kickoffs should match `src/data/groupStageKickoffs.ts` |

Cross-reference kickoffs manually: [FIFA scores & fixtures](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures)

Opening match check: **Mexico vs South Africa**, **11 June 2026, 19:00 UTC** (= 20:00 BST).

---

## After games finish (results cross-check)

1. Run `npm run verify:football-data` — **Finished matches** section lists FT scores from the API.
2. Compare each line to FIFA (same URL above) — scores should match **90-minute** full-time (ET/penalties excluded for group scoring).
3. Run with `--import` on a test DB, then inspect:

```bash
sqlite3 data.db "SELECT match_id, home_score, away_score, source FROM results ORDER BY updated_at DESC LIMIT 10;"
```

4. On production: **Admin → Full sync** and confirm `results.updated` increases after each matchday.

---

## Existing commands (same API)

| Command | Purpose |
|---------|---------|
| `npm run diagnose:mappings` | JSON mapping report |
| `npm run seed:fixtures` | Full kickoff + results sync (production CLI) |
| `npm run generate:group-kickoffs` | Print kickoff map from API |

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| HTTP 400 “invalid token” | Wrong/expired token; typo in `.env` |
| HTTP 403 | Rate limit or plan restriction |
| Group mapping &lt; 72 | Team name alias missing — see Admin diagnostics `unmappedTeamNames` |
| Kickoffs wrong on site | Stale `match_kickoffs` — Admin → **Import kickoffs** after deploy |
| 0 results forever | No finished WC matches in API yet, or mapping skipped |

Register / manage token: https://www.football-data.org/client/register
