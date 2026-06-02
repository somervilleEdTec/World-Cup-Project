# UI / UX handover

**Last updated:** 2026-06-02  
**Branch:** `main`  
**Status:** Owner polish pass **complete** (PRs #7–#11). Next work: **stress test & debug** — see [STRESS_TEST_HANDOVER.md](./STRESS_TEST_HANDOVER.md).

---

## 1. For the next agent

**Do not** ask the owner for a new UI wish-list unless they raise issues during stress testing.

**Do:**

1. Read [STRESS_TEST_HANDOVER.md](./STRESS_TEST_HANDOVER.md) and run the playbook.
2. Log bugs in §6 below.
3. Fix with small PRs; run `npm test` + `npm run build`.

---

## 2. UI surface area

| Area | File(s) | Notes |
|------|---------|--------|
| **My Picks** | `src/pages/MyPicksPage.tsx` | 3 tabs; auto-save; lock group; missing picks |
| **Team picker** | `src/components/TeamSelect.tsx` | Flags + A–Z names |
| **Layout / nav** | `src/components/AppLayout.tsx`, `src/styles/app.css` | Mobile 2×2 bottom nav |
| **Welcome + rules** | `src/pages/WelcomePage.tsx` | Rules on welcome; no `/rules` |
| **Login** | `src/pages/LoginPage.tsx` | Name + password + join password |
| **Comparison** | `src/pages/ComparisonPage.tsx` | Fixture picker |
| **League table** | `src/pages/LeagueTablePage.tsx` | Leaderboard |
| **Admin** | `src/pages/AdminPage.tsx` | Sync / diagnostics |

Styling: **`src/styles/app.css` only** (no Tailwind).

---

## 3. Owner UI work — completed (PRs #7–#11)

| # | Area | Change | PR |
|---|------|--------|-----|
| 1 | Auth | Name login; password ≤6 chars; join password `MadSlags1`; `npm run db:purge` | #7 |
| 2 | My Picks — Group | Auto-save; no Save match buttons | #7 |
| 3 | My Picks — Group | Projected table GP/W/D/L/GF/GA/Pts | #7 |
| 4 | My Picks — tabs | Tournament Results · Group · Knockout | #7 |
| 5 | Tournament | Standalone save; flag dropdowns A–Z | #9 |
| 6 | My Picks | Remove commit panel; bonus saves committed | #9 |
| 7 | Bonus / table | Fix save button; zeros until input; score clamp | #8 |
| 8 | Welcome / nav | Rules on welcome; mobile nav spacing | #10 |
| 9 | My Picks | Lock group; missing picks list; debounced auto-save | #11 |

---

## 4. Intentional behaviour (do not revert without owner)

1. **Knockout tab** — only fixtures with **both teams** from official `results` ([knockoutFixtureAvailability.ts](../src/lib/knockoutFixtureAvailability.ts)).
2. **72 group picks** — server gate for knockout **saves** ([pickLocks.ts](../src/lib/pickLocks.ts)); tournament picks are **not** gated.
3. **SVG flags** — not emoji; custom `TeamSelect` (not native `<option>` images).
4. **Lock group** — one-way; `accepted_groups` in DB = locked groups.
5. **Match picks** — POST `/api/predictions/draft` writes **committed** rows (no UI commit step).

---

## 5. Windows test command

```powershell
.\scripts\Test-LocalSite.ps1 -Mode Serve
```

http://localhost:8787/login

---

## 6. Stress-test / bug log (agent fills in)

| # | Page / flow | Steps | Expected | Actual | Status |
|---|-------------|-------|----------|--------|--------|
| | | | | | |

---

*End of UI handover.*
