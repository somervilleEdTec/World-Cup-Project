# World Cup Boys — Final Plan (Restructured Competition Rules)

> **Source of truth for product rules.** This file is a repo copy of the agreed final plan.  
> For implementation status, see [HANDOVER.md](./HANDOVER.md). For the next agent session, see [AGENT_PROMPT.md](./AGENT_PROMPT.md).

## Final Locked Rules

- App name: **World Cup Boys**
- Tagline: **"Welcome to the Shiva Bowl"**
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

- Knockout fixtures appear as real-world qualifiers are confirmed.
- Users predict each knockout fixture before that fixture’s kickoff.
- **Rolling lock per fixture:** each KO match auto-locks at its own kickoff.
- Future KO fixtures remain editable until their own kickoff.

### Preselected Tournament Outcome Picks (during group-stage flow)

After completing group predictions, users must preselect:

- Tournament winner (+10)
- Runner-up (+8)
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

- Correct W/D/L: **+1**
- Exact score bonus: **+5** (exact total = **6**)

### Group standing bonus

- **+2 points per team** in the exact correct final position within its group (1st–4th).

### Knockout match points

- Correct W/D/L (regulation): **+1**
- Exact regulation score bonus: **+5**
- Knockout draw: must select **team to progress** (ET/pens); no extra scoreline required.

### Tournament preselection bonuses

- Champion: **+10**
- Runner-up: **+8**
- Third: **+6**
- Fourth: **+4**

### Tie-breakers

1. Most exact scores
2. Most correct results
3. Most exact group-position calls
4. Most correct tournament preselection bonuses
5. Earliest valid commit timestamp

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

- Poll fixtures/results on quota-safe schedule.
- Update KO availability as teams qualify.
- Recalculate leaderboard after results finalize.
- Manual admin override always available.

## Acceptance Criteria

- Group + bonus picks lock at first kickoff and never change.
- Each KO fixture locks at its own kickoff.
- Uncommitted edits never count at lock time.
- +2 exact group-position scoring works correctly.
- Preselected bonus picks scored as configured.
- Comparison and League Table use **committed** predictions only.
- Mobile-friendly UI with flag + team name everywhere.
