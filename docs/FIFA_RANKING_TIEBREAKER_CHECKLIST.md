# FIFA ranking tiebreaker — pre-tournament checklist

Use this checklist **before the first match kicks off** whenever this app is configured for a **new World Cup or future tournament** (new teams, groups, or ranking snapshot).

It does **not** apply as an ongoing in-tournament task once the opening-day ranking snapshot is verified and play has started.

---

## Background

Group standings use FIFA’s published tiebreaker order (see `src/lib/groupStandings.ts`):

1. Points  
2. Head-to-head mini-league (points, goal difference, goals scored)  
3. Overall group goal difference, then goals scored  
4. Fair play (team conduct) — **actual tables only**; predictions skip this step  
5. **FIFA World Ranking** — frozen **opening-day** edition (for 2026: 11 June 2026), stored in `src/data/fifaWorldRankingTournamentStart2026.ts`  
6. If teams are **still tied** after step 5, FIFA’s regulations call for **drawing of lots**

The app does **not** currently implement drawing of lots. If step 5 cannot separate two teams (identical rank number) and every prior step is also tied, the code falls back to **alphabetical `teamId` order**, which is **not** FIFA-official and must not be relied on for a real competition.

---

## Mandatory check before kickoff (future tournaments)

Run this **after** you load the new tournament-start ranking snapshot and **before** inviting players or accepting predictions.

### 1. Confirm the ranking snapshot is complete

- File: `src/data/fifaWorldRankingTournamentStart2026.ts` (or its successor for another edition)  
- Every finalist must have exactly one rank from the **opening-day** FIFA edition (not live API, not post-tournament updates)  
- Run: `npm test` — tests in `src/__tests__/fifaWorldRankingTournamentStart.test.ts` should pass  

### 2. Scan for identical rank numbers

Two or more teams may share the **same integer rank** in FIFA’s published list (e.g. both listed as 42).

For each rank value that appears more than once, list the team ids that share it.

**Manual check (example):**

```bash
# From repo root — adjust import path if the snapshot file is renamed for a future edition
node --import tsx/esm -e "
import { FIFA_WORLD_RANK_TOURNAMENT_START_2026 } from './src/data/fifaWorldRankingTournamentStart2026.ts';
import { teams } from './src/data/tournament.ts';
const byRank = {};
for (const [id, rank] of Object.entries(FIFA_WORLD_RANK_TOURNAMENT_START_2026)) {
  (byRank[rank] ??= []).push(id);
}
const dupes = Object.entries(byRank).filter(([, ids]) => ids.length > 1);
console.log('Duplicate ranks:', dupes.length ? dupes : 'none');
for (const group of 'ABCDEFGHIJKL') {
  const ids = teams.filter(t => t.group === group).map(t => t.id);
  const ranks = ids.map(id => FIFA_WORLD_RANK_TOURNAMENT_START_2026[id]);
  const seen = new Set();
  for (let i = 0; i < ranks.length; i++) {
    if (seen.has(ranks[i])) console.log('Group', group, 'shares rank', ranks[i], 'among', ids);
    seen.add(ranks[i]);
  }
}
"
```

### 3. If duplicate ranks exist **in the same group** — action required

**Stop and notify the project owner / maintainer.** Do **not** treat the app as production-ready for scoring until resolved.

| Situation | Risk | Required action |
|-----------|------|-----------------|
| Duplicate rank, **different groups** | Low for group tables; may affect third-place ranking across groups | Document; monitor if a full tie reaches the ranking step |
| Duplicate rank, **same group** | **High** — a full statistical tie could force FIFA lots; app would use non-official alphabetical order | **Implement a drawing-of-lots failsafe** (official FIFA outcome recorded in data or admin override) **or** block/unresolved standings until lots are published |

**What “take action” means (not implemented in 2026):**

- Add an authoritative lots decision (static snapshot or admin tool) once FIFA publishes the draw  
- Replace the alphabetical `teamId` fallback in `groupStandings.ts` and `compareThirdPlaceStats`  
- Add regression tests for the tied-rank + same-group scenario  
- Re-run `npm run audit:standings` after any ranking or lots data change  

Until that work is done, **do not deploy** for a real pool if step 2 reports duplicate ranks within any group.

### 4. Record the check

Note in your release/go-live log (or PR description):

- Ranking edition date (e.g. `2026-06-11`)  
- Result of duplicate-rank scan: **none** or **list groups affected**  
- Sign-off that either no same-group duplicate ranks exist, or lots failsafe is implemented  

---

## 2026 World Cup (reference)

As of the opening-day snapshot in this repository, **all 48 finalists have unique rank numbers**, and **no group contains two teams with the same rank**. The duplicate-rank + same-group lots scenario is **not reachable via ranking alone** for 2026, but the alphabetical fallback remains a known limitation if every tiebreaker including fair play were ever equal.

---

## Related files and docs

| Item | Location |
|------|----------|
| Frozen ranking snapshot | `src/data/fifaWorldRankingTournamentStart2026.ts` |
| Group tiebreaker logic | `src/lib/groupStandings.ts` |
| Fair play (actual tables) | `src/lib/fairPlay.ts`, `src/data/worldCupDiscipline2026.ts` |
| Wikipedia/FIFA standings audit | `npm run audit:standings`, `src/__tests__/groupStandingsAudit.test.ts` |
| Go-live smoke tests | [GO_LIVE.md](./GO_LIVE.md) |
| Architecture handover | [HANDOVER.md](./HANDOVER.md) §11 Known risks |

---

## When to re-run this checklist

- New tournament edition (new `fifaWorldRankingTournamentStart*.ts` snapshot)  
- FIFA errata changes opening-day ranks  
- Group draw or team list changes in `src/data/tournament.ts`  
- Any planned production deploy for a **future** World Cup cycle  

**Do not skip** because “last year’s check was clean.”
