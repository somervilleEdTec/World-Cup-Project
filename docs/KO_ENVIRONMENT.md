# KO Environment — local knockout testing

Script and docs live on **`main`** (originally developed on `KO-Environment`).

Use this to evaluate **league rankings** and **knockout prediction entry** with ten seeded users, random group/tournament predictions, and **official results** injected via the database (no `FOOTBALL_DATA_TOKEN` required).

## What gets created

| Item | Detail |
|------|--------|
| Users | `Test 1` … `Test 10` |
| Password | `summer` (all accounts) |
| Admin | `Test 1` (for Admin page if needed) |
| Group predictions | 72 random scores per user (0–3 goals each side) |
| Tournament predictions | Random winner / runner-up / third / fourth per user |
| Official results | All 72 group games (random 0–3 per team). **R32 only** by default — not later KO rounds |
| Locks | Group + tournament bonus predictions locked in DB (simulated post–first kickoff) |

Sign-up password for **new** registrations is unchanged (`MadSlags1` by default). Seeded users are created by the script, not the register form.

## Windows — one-time setup

```powershell
cd C:\Users\tomso\World-Cup-Project
git fetch origin
git checkout main
git pull origin main
npm install
npm run build
npm run seed:ko-environment
.\scripts\Test-LocalSite.ps1 -Mode Serve
```

Open **http://localhost:8787/login**

## macOS / Linux

```bash
git fetch origin
git checkout main
git pull origin main
npm install
npm run build
npm run seed:ko-environment
npm run server
```

Open **http://localhost:8787/login**

## Log in and test

1. Log in as **`Test 1`** / **`summer`** (admin).
2. **League Table** — ten users with different point totals from random picks vs official results.
3. **My Predictions → Round of 32** (etc.) — confirmed fixtures per tab; enter scores (auto-save). Draws require a progressing team.
4. Repeat with **`Test 2`** … **`Test 10`** / **`summer`** to confirm KO saves for multiple accounts.
5. **Comparison** — pick a fixture and compare users.

## Re-seed (fresh random data)

```bash
npm run seed:ko-environment
```

This **purges** `data.db` by default (all users and picks wiped, then recreated).

To append without purge (only if you know the DB is empty):

```bash
npm run seed:ko-environment -- --no-purge
```

## Notes

- Official results use source `ko-environment-seed` in the `results` table — same path as Admin manual override, not football-data.org.
- Group results are retried until all **16 R32** fixtures have both teams (valid third-place mapping).
- Knockout **predictions** are not pre-filled; you enter those in the UI to test the flow.
- **My Predictions** shows **Your prediction**, **Official result**, and **Points scored** when locked/results exist.
- **Comparison** lists all fixtures with known teams; group predictions after lock; **knockout after kickoff**.
- Optional: seed every knockout result (all 32 fixtures unlocked) with `npm run seed:ko-environment -- --full-bracket`
- **One final prediction left per user** (all other results + picks): see [FINAL_PREDICTION_HANDOVER.md](./FINAL_PREDICTION_HANDOVER.md) — `npm run seed:before-final`

## Bug evaluation (environment vs product)

| Symptom | Cause | Fix |
|---------|--------|-----|
| Can edit tournament / group picks after “results are in” | Lock is by **first kickoff time**, not by results. Old seed did not set `group_locked`. | Seed now runs `runAutoLocks`. **Before 11 Jun 2026** on a fresh `main` DB, picks are still editable by design. |
| All 32 KO fixtures in My Picks | Seed inserted results for every KO round (`--full-bracket` behaviour). | Default seed is **group results only** → **16 R32** fixtures. |
| Comparison hides other players’ group picks | Visibility used calendar only, ignored DB `group_locked`. | **Product fix:** comparison respects `group_locked` + seed applies lock. |
| Comparison fixture list empty / missing played games | Picker only listed **future** kickoffs. | **Product fix:** all fixtures with known teams. |
| No official score on My Picks | Feature gap. | **Product fix:** prediction state includes `officialResults`; UI shows both lines. |

## Quality check (optional)

```bash
npm test
npm run build
```
