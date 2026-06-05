# World Cup Boys — Final Plan (Restructured Competition Rules)

> **Source of truth for product rules.** This file is a repo copy of the agreed final plan.  
> For implementation status, see [HANDOVER.md](./HANDOVER.md) and [LOCKING.md](./LOCKING.md). **Next agent (locking audit):** [AGENT_PROMPT_LOCKING.md](./AGENT_PROMPT_LOCKING.md).

## Final Locked Rules

- App name: **World Cup Boys**
- Tagline: **"World Cup Predictions"**
- Score source: **football-data.org**
- Team display everywhere: **flag + country name**
- Global pool only
- Mobile-first UI with clear top/bottom navigation

## Competition Structure

### Group Stage

- All group-stage predictions must be submitted and committed before kickoff of the first tournament game.
- At first kickoff, group-stage predictions auto-lock and cannot be changed.
- Group-stage outcomes determine knockout participants and bracket population.

### Knockout Stage

- Knockout phase begins at the **Round of 32** (R32) and includes R16, QF, SF, Final, and third-place play-off.
- Knockout fixtures appear as real-world qualifiers are confirmed.
- **Fixture confirmation:** A fixture unlocks for prediction once **both teams are known from official results**:
  - **R32 (group-fed slots):** when every feeding group has all six official results (e.g. `r32-1` after groups A and B finish).
  - **R32 (third-place slots):** when all 12 groups are complete (third-place mapping needs full group stage).
  - **R16 onward:** when both feeder knockout matches have full-time official results and winners are known.
- Users predict each knockout fixture before that fixture’s kickoff.
- **Rolling lock per fixture:** each KO match auto-locks at its own kickoff.
- Future KO fixtures remain editable until their own kickoff.
- **Results sync:** football-data.org 90-minute scores sync every 2 minutes; kickoffs every 6 hours. API mapping uses stored official results so knockout fixtures map as soon as the bracket resolves teams.

### Preselected Tournament Outcome Picks (during group-stage flow)

After completing group predictions, users must preselect:

- Tournament winner (+6)
- Runner-up (+5)
- Third place (+6)
- Fourth place (+4)

Rules:

- Selected from dropdowns listing **all teams**.
- Team repetition is allowed.
- Locked with group-stage lock (first-match kickoff).

### Clarifications

- Ignore any separate “third place league” concept.
- Third/fourth refer to knockout-stage final standings for bonus scoring.
- Preselected third/fourth bonus picks remain active as defined.

## Scoring Rules (Final)

### Group match points

- Correct W/D/L: **+2**
- Exact score bonus: **+4** (exact total = **6**)

### Group standing bonus

- **+1 point per team** in the exact correct final position within its group (1st–4th).

### Knockout match points

- **Correct advancing team:** **+2** (base) — pick the team that goes through (winner after 90 minutes, or **team to progress** on a draw after ET/pens).
- **Exact score bonus:** **+4** (base) — predicted **90-minute scoreline** matches official result; extra time and penalty-shootout goals do **not** count toward this bonus.
- **Round multipliers** (applied to both result and exact bonus for that fixture):
  - Round of 32 / Round of 16: **1×**
  - Quarter-finals: **1.5×**
  - Semi-finals: **2×**
  - Final and third-place play-off: **3×**
- Knockout draw: must select **team to progress** (ET/pens).

### Tournament preselection bonuses

- Champion: **+6**
- Runner-up: **+5**
- Third: **+4**
- Fourth: **+3**

### Tie-breakers

1. Most exact scores
2. Most correct results
3. Most exact group-position calls
4. Most correct tournament preselection bonuses
5. Virtual coin flip (deterministic, applied after the tournament final result is in)

## Commit and Lock Model

Two states:

- **CommittedPrediction** (official, lock-eligible)
- **DraftPrediction** (in progress)

### Group-stage lock

- At first tournament kickoff: lock last committed group picks + bonus selections.
- Uncommitted drafts are ignored.

### Knockout lock

- Per fixture: at kickoff, lock last committed pick for that fixture.
- Uncommitted draft for that fixture is ignored.

### Dependency review

- Upstream edits that affect downstream fixtures mark them **NeedsReview**.
- Commit blocked until all impacted fixtures are reviewed.

## Required Pages (v1)

1. **Log In**
2. **Welcome**
3. **My Picks** (group wizard, bonus picks, KO panels)
4. **League Table**
5. **Comparison** (next fixture, all players’ committed picks)

## Comparison visibility

- **Group:** other players’ picks visible after first kickoff (group lock).
- **Knockout:** other players’ predictions visible after that fixture’s kickoff (when locked).

## Messaging (required in UI)

- `All changes committed` / `Uncommitted changes pending`
- Group: `Only committed group picks and bonus selections will lock at first kickoff.`
- KO: `This match locks at kickoff. Commit your changes before deadline.`
- Draft warning: `Uncommitted edits will not count. Last committed picks will be locked.`

## football-data.org Integration

- Poll fixtures/results on quota-safe schedule (kickoffs every 6 hours, results every 2 minutes).
- Static group-stage kickoffs use the official FIFA UTC schedule (`src/data/groupStageKickoffs.ts`); production DB overrides via sync when mapped.
- football-data mapping scopes team pairs by provider group code (`GROUP_A` → `A`) where available.
- Update KO availability as teams qualify.
- Recalculate leaderboard after results finalize.
- Manual admin override always available.
- Regenerate kickoff map: `FOOTBALL_DATA_TOKEN=... npx tsx scripts/generate-group-kickoffs.ts`

## Acceptance Criteria

- Group + bonus picks lock at first kickoff and never change.
- Each KO fixture locks at its own kickoff.
- Uncommitted edits never count at lock time.
- +1 exact group-position scoring works correctly.
- Preselected bonus picks scored as configured.
- Comparison and League Table use **committed** predictions only.
- Mobile-friendly UI with flag + team name everywhere.
