# KO Environment — local knockout testing

Branch: **`KO-Environment`**

Use this branch to evaluate **league rankings** and **knockout pick entry** with ten seeded users, random group/tournament predictions, and **official results** injected via the database (no `FOOTBALL_DATA_TOKEN` required).

## What gets created

| Item | Detail |
|------|--------|
| Users | `Test 1` … `Test 10` |
| Password | `summer` (all accounts) |
| Admin | `Test 1` (for Admin page if needed) |
| Group picks | 72 random scores per user (0–3 goals each side) |
| Tournament picks | Random winner / runner-up / third / fourth per user |
| Official results | All 72 group games + full knockout bracket, random 0–3 per team, manual-override source |

Sign-up password for **new** registrations is unchanged (`MadSlags1` by default). Seeded users are created by the script, not the register form.

## Windows — one-time setup

```powershell
cd C:\Users\tomso\World-Cup-Project
git fetch origin
git checkout KO-Environment
git pull origin KO-Environment
npm install
npm run build
npm run seed:ko-environment
.\scripts\Test-LocalSite.ps1 -Mode Serve
```

Open **http://localhost:8787/login**

## macOS / Linux

```bash
git fetch origin
git checkout KO-Environment
git pull origin KO-Environment
npm install
npm run build
npm run seed:ko-environment
npm run server
```

Open **http://localhost:8787/login**

## Log in and test

1. Log in as **`Test 1`** / **`summer`** (admin).
2. **League Table** — ten users with different point totals from random picks vs official results.
3. **My Picks → Knockout Stage** — confirmed fixtures listed; enter scores (auto-save). Draws require a progressing team.
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
- To return to normal development: `git checkout main`.

## Quality check (optional)

```bash
npm test
npm run build
```
