# UI / UX handover — next agent

**Last updated:** 2026-06-02  
**Branch:** `main`  
**Owner machine tested:** Windows 11, PowerShell, `C:\Users\tomso\World-Cup-Project`

---

## 1. Your mission

The product owner has been **smoke-testing locally** and reports **UI issues** (layout, clarity, mobile, flows). Your job is to **debug and fix those issues** with the owner — not to change competition rules or backend scoring unless a bug requires it.

**Before coding:** ask the owner for their **numbered list of UI problems** (screenshots help). Do not guess priorities.

**Do not edit** [docs/FINAL_PLAN.md](./FINAL_PLAN.md) without owner approval.

---

## 2. How the owner runs the app (Windows)

```powershell
cd C:\Users\tomso\World-Cup-Project
git pull origin main
.\scripts\Test-LocalSite.ps1              # automated check
.\scripts\Test-LocalSite.ps1 -Mode Serve   # use site at http://localhost:8787/login
```

Dev mode (hot reload UI on :5173):

```powershell
.\scripts\Test-LocalSite.ps1 -Mode Dev
```

See also [README.md](../README.md) and [HANDOVER.md](./HANDOVER.md) §8.

---

## 3. UI surface area (where to look)

| Area | File(s) | Notes |
|------|---------|--------|
| **My Picks** | `src/pages/MyPicksPage.tsx` | Group / Knockout **tabs**; group wizard; bonus form; commit |
| **Layout / nav** | `src/components/AppLayout.tsx`, `src/styles/app.css` | Global chrome |
| **Team display** | `src/components/TeamLabel.tsx`, `CountryFlag.tsx` | SVG flags in `public/flags/4x3/` |
| **Comparison** | `src/pages/ComparisonPage.tsx` | Fixture picker + table |
| **League table** | `src/pages/LeagueTablePage.tsx` | Leaderboard |
| **Login / Welcome** | `src/pages/LoginPage.tsx`, `WelcomePage.tsx` | Auth entry |
| **Rules** | `src/pages/RulesPage.tsx` | Static copy |
| **Admin** | `src/pages/AdminPage.tsx` | Sync / diagnostics |

Styling is **minimal** (`src/styles/app.css` only — no Tailwind). Owner previously deferred “polish” until functional go-live; this session is the **polish / fix** pass.

---

## 4. Recent UI-related behaviour (already on `main`)

These are **intentional** — do not “fix” back without owner sign-off:

1. **Group vs knockout tabs** — Knockout picks only appear for fixtures **confirmed by official results** (both teams known), not from predicted group tables. See `src/lib/knockoutFixtureAvailability.ts`.
2. **72 group picks committed** before knockout/bonus (pre–first kickoff). See `src/lib/pickLocks.ts`.
3. **Flags** — SVG images (`countryCode` on teams), not emoji. Dropdowns show **names only** (HTML `<option>` limitation).

---

## 5. Owner-reported UI issues (fill in with owner)

> **Product owner:** add items below (or paste in chat for the agent to copy here).

| # | Page / flow | What’s wrong | Expected |
|---|-------------|--------------|----------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

## 6. Suggested workflow for the agent

1. Read [HANDOVER.md](./HANDOVER.md), [AGENT_PROMPT.md](./AGENT_PROMPT.md), this file.
2. **Ask owner** for the table in §5 (and screenshots).
3. `git pull origin main` → `npm install` → `npm test` → `npm run build`.
4. Reproduce each issue locally (`-Mode Dev` or `-Mode Serve`).
5. Fix in **small PRs** or one PR per issue group; run `npm test` + manual smoke.
6. Update §5 when fixed; note any CSS/component conventions in PR description.

---

## 7. Quality gates

```bash
npm test              # 30 tests (unit + API integration)
npm run build
npm run lint          # optional
```

No visual regression suite yet — manual browser check required.

---

## 8. Conventions

- Branch: `cursor/<topic>-21eb` or owner’s preference; PR base: **`main`**
- Keep diffs focused on UI/CSS/components unless backend is required for a UI bug
- Match existing patterns in `app.css` (simple classes: `.card`, `.fixture-card`, `.warning`)

---

*End of UI handover.*
