import { FormEvent, useEffect, useMemo, useState } from 'react';
import { groupMatches, teams } from '../data/tournament';
import { FixturePickCard } from '../components/FixturePickCard';
import { GroupStandingsTable } from '../components/GroupStandingsTable';
import { TeamLabel } from '../components/TeamLabel';
import { picksFromActuals } from '../lib/pickUtils';
import { fetchPredictionState, lockGroup, saveBonusDraft, saveDraftPick, unlockGroup } from '../services/apiClient';
import { TeamSelect } from '../components/TeamSelect';
import { ALL_GROUP_IDS } from '../lib/pickLocks';
import { computeMissingPicks } from '../lib/missingPicks';
import {
  computeGroupStandings,
  isKnockoutFixtureLocked,
  kickoffReached,
  shouldLockGroup
} from '../lib/tournamentLogic';
import { ActualResult, Match, Pick, Stage, TournamentBonusPick } from '../types';

const groupSequence = ALL_GROUP_IDS;

const KNOCKOUT_PHASES = [
  { id: 'r32' as const, label: 'Round of 32', stages: ['R32'] as Stage[] },
  { id: 'r16' as const, label: 'Round of 16', stages: ['R16'] as Stage[] },
  { id: 'qf' as const, label: 'Quarter Final', stages: ['QF'] as Stage[] },
  { id: 'sf' as const, label: 'Semi Final', stages: ['SF'] as Stage[] },
  { id: 'finals' as const, label: 'Final / 3rd Place', stages: ['FINAL', 'THIRD_PLACE'] as Stage[] }
];

type PicksPhase = 'bonus' | 'group' | (typeof KNOCKOUT_PHASES)[number]['id'];

function formatCountdown(targetIso: string, nowIso: string): string {
  const diff = new Date(targetIso).getTime() - new Date(nowIso).getTime();
  if (diff <= 0) return 'Locked';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function isKnockoutPhase(phase: PicksPhase): phase is (typeof KNOCKOUT_PHASES)[number]['id'] {
  return KNOCKOUT_PHASES.some((entry) => entry.id === phase);
}

function knockoutFixturesForPhase(phase: PicksPhase, fixtures: Match[]): Match[] {
  const config = KNOCKOUT_PHASES.find((entry) => entry.id === phase);
  if (!config) return [];
  return fixtures.filter((match) => config.stages.includes(match.stage));
}

function bonusValues(state: RemoteState): TournamentBonusPick {
  const source = state.bonusCommitted ?? state.bonusDraft;
  return {
    winnerTeamId: source?.winnerTeamId ?? teams[0].id,
    runnerUpTeamId: source?.runnerUpTeamId ?? teams[1].id,
    thirdTeamId: source?.thirdTeamId ?? teams[2].id,
    fourthTeamId: source?.fourthTeamId ?? teams[3].id
  };
}

interface RemoteState {
  committedPicks: Record<string, Pick>;
  draftPicks: Record<string, Pick>;
  affectedMatches: string[];
  acceptedGroups: string[];
  groupPicksCommittedCount?: number;
  groupPicksRequired?: number;
  allGroupPicksCommitted?: boolean;
  bonusDraft?: TournamentBonusPick;
  bonusCommitted?: TournamentBonusPick;
  commitState: { groupLocked: boolean };
  confirmedKnockoutFixtures?: Match[];
  officialResults?: Record<string, ActualResult>;
}

const initialState: RemoteState = {
  committedPicks: {},
  draftPicks: {},
  affectedMatches: [],
  acceptedGroups: [],
  commitState: { groupLocked: false }
};

export function MyPicksPage() {
  const [groupIndex, setGroupIndex] = useState(0);
  const [phase, setPhase] = useState<PicksPhase>('bonus');
  const [groupMessage, setGroupMessage] = useState<string>('');
  const [bonusMessage, setBonusMessage] = useState<string>('');
  const [state, setState] = useState<RemoteState>(initialState);
  const [pendingGroupPicks, setPendingGroupPicks] = useState<Record<string, Pick>>({});

  const nowIso = new Date().toISOString();

  const refresh = async () => {
    try {
      const response = (await fetchPredictionState()) as RemoteState;
      setState({
        ...initialState,
        ...response,
        acceptedGroups: response.acceptedGroups ?? []
      });
    } catch (err) {
      setGroupMessage(err instanceof Error ? err.message : 'Failed to load prediction state');
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const activeGroup = groupSequence[groupIndex];
  const activeGroupMatches = groupMatches.filter((match) => match.group === activeGroup);
  const tournamentLocked = state.commitState.groupLocked || shouldLockGroup(nowIso);
  const lockedGroups = state.acceptedGroups;

  const savedPicks = { ...state.committedPicks, ...state.draftPicks };
  const mergedPicks = { ...savedPicks, ...pendingGroupPicks };
  const confirmedKnockoutFixtures = state.confirmedKnockoutFixtures ?? [];
  const officialResults = state.officialResults ?? {};
  const groupStandings = useMemo(
    () => computeGroupStandings(activeGroup, { ...savedPicks, ...pendingGroupPicks }),
    [activeGroup, pendingGroupPicks, savedPicks]
  );

  const actualPicksForGroup = useMemo(() => {
    const fromActuals = picksFromActuals(officialResults);
    return Object.fromEntries(
      activeGroupMatches.filter((match) => fromActuals[match.id]).map((match) => [match.id, fromActuals[match.id]])
    );
  }, [activeGroupMatches, officialResults]);

  const actualGroupStandings = useMemo(
    () => computeGroupStandings(activeGroup, actualPicksForGroup),
    [activeGroup, actualPicksForGroup]
  );

  const hasActualGroupResults = activeGroupMatches.some((match) => officialResults[match.id] !== undefined);

  const missingPicks = useMemo(
    () => computeMissingPicks(mergedPicks, state.bonusCommitted, confirmedKnockoutFixtures),
    [mergedPicks, state.bonusCommitted, confirmedKnockoutFixtures]
  );

  const groupComplete = activeGroupMatches.every((match) => mergedPicks[match.id] !== undefined);
  const userGroupLocked = lockedGroups.includes(activeGroup);
  const groupIsLocked = userGroupLocked || tournamentLocked;
  const allGroupPicksCommitted = state.allGroupPicksCommitted ?? false;
  const koPicksAllowed = allGroupPicksCommitted || tournamentLocked;
  const bonus = bonusValues(state);

  const koCountByPhase = useMemo(() => {
    const counts: Partial<Record<PicksPhase, number>> = {};
    for (const entry of KNOCKOUT_PHASES) {
      counts[entry.id] = knockoutFixturesForPhase(entry.id, confirmedKnockoutFixtures).length;
    }
    return counts;
  }, [confirmedKnockoutFixtures]);

  const activeKoPhase = isKnockoutPhase(phase) ? KNOCKOUT_PHASES.find((entry) => entry.id === phase) : undefined;
  const activeKoFixtures = activeKoPhase
    ? knockoutFixturesForPhase(activeKoPhase.id, confirmedKnockoutFixtures)
    : [];

  const saveMatchPick = async (pick: Pick) => {
    try {
      await saveDraftPick(pick);
      setPendingGroupPicks((current) => {
        const next = { ...current };
        delete next[pick.matchId];
        return next;
      });
      await refresh();
    } catch (err) {
      setGroupMessage(err instanceof Error ? err.message : 'Could not save prediction');
    }
  };

  const flushPendingForGroup = async () => {
    const matches = groupMatches.filter((match) => match.group === activeGroup);
    for (const match of matches) {
      const pick = pendingGroupPicks[match.id];
      if (pick) {
        await saveDraftPick(pick);
      }
    }
    setPendingGroupPicks((current) => {
      const next = { ...current };
      for (const match of matches) {
        delete next[match.id];
      }
      return next;
    });
    await refresh();
  };

  const changeGroupIndex = (nextIndex: number) => {
    void flushPendingForGroup().finally(() => setGroupIndex(nextIndex));
  };

  const changePhase = (nextPhase: PicksPhase) => {
    if (phase === 'group' && nextPhase !== 'group') {
      void flushPendingForGroup();
    }
    setPhase(nextPhase);
  };

  const submitBonus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const payload: TournamentBonusPick = {
      winnerTeamId: String(form.get('winnerTeamId')),
      runnerUpTeamId: String(form.get('runnerUpTeamId')),
      thirdTeamId: String(form.get('thirdTeamId')),
      fourthTeamId: String(form.get('fourthTeamId'))
    };

    try {
      await saveBonusDraft(payload);
      setBonusMessage('Tournament result predictions saved. They lock at the first match kickoff.');
      await refresh();
    } catch (err) {
      setBonusMessage(err instanceof Error ? err.message : 'Could not save tournament predictions');
    }
  };

  const bonusSlots: Array<{ key: keyof TournamentBonusPick; label: string }> = [
    { key: 'winnerTeamId', label: 'Winner' },
    { key: 'runnerUpTeamId', label: 'Runner-up' },
    { key: 'thirdTeamId', label: 'Third' },
    { key: 'fourthTeamId', label: 'Fourth' }
  ];

  return (
    <section className="stack">
      <article className="card">
        <h2>My Predictions</h2>
        <p>
          {tournamentLocked
            ? 'Group-stage and tournament result predictions are now locked.'
            : 'Scores save automatically. Lock a group when you are happy with it.'}
        </p>
        <div className="missing-picks">
          <h3>You have the following missing predictions:</h3>
          {missingPicks.length === 0 ? (
            <p className="success">None — all current predictions are complete.</p>
          ) : (
            <ul className="missing-picks-list">
              {missingPicks.map((item) => (
                <li key={item.label}>{item.label}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="picks-phase-tabs">
          <button type="button" className={phase === 'bonus' ? 'active-tab' : ''} onClick={() => changePhase('bonus')}>
            Tournament Results
          </button>
          <button type="button" className={phase === 'group' ? 'active-tab' : ''} onClick={() => changePhase('group')}>
            Group Stage
          </button>
          {KNOCKOUT_PHASES.map((entry) => {
            const count = koCountByPhase[entry.id] ?? 0;
            return (
              <button
                key={entry.id}
                type="button"
                className={phase === entry.id ? 'active-tab' : ''}
                onClick={() => changePhase(entry.id)}
              >
                {entry.label}
                {count > 0 ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>
      </article>

      {phase === 'group' && (
        <article className="card">
          <h3>Group {activeGroup} predictions</h3>
          {userGroupLocked && !tournamentLocked && (
            <p className="success">Group {activeGroup} is locked. Scores are shown as text until you unlock.</p>
          )}
          {tournamentLocked && userGroupLocked && (
            <p className="warning">Group {activeGroup} is locked (tournament lock is active; cannot unlock).</p>
          )}
          {activeGroupMatches.map((match) => {
            const groupFixtureLocked =
              userGroupLocked || tournamentLocked || kickoffReached(match.kickoff, nowIso);
            return (
              <FixturePickCard
                key={match.id}
                match={match}
                pick={mergedPicks[match.id]}
                actual={officialResults[match.id]}
                nowIso={nowIso}
                inputsDisabled={groupFixtureLocked}
                showLockedSummary={groupFixtureLocked}
                onSave={saveMatchPick}
                onScoresChange={(updated) =>
                  setPendingGroupPicks((current) => ({ ...current, [match.id]: updated }))
                }
              />
            );
          })}

          <h4>Projected table (Group {activeGroup})</h4>
          <p className="fixture-meta">Based on your score predictions for this group.</p>
          <GroupStandingsTable standings={groupStandings} />

          <h4>Actual table (Group {activeGroup})</h4>
          {hasActualGroupResults ? (
            <>
              <p className="fixture-meta">Based on official match results.</p>
              <GroupStandingsTable standings={actualGroupStandings} />
            </>
          ) : (
            <p className="fixture-meta">Official results will appear here as matches finish.</p>
          )}

          <div className="button-row">
            <button
              type="button"
              disabled={
                tournamentLocked
                  ? true
                  : userGroupLocked
                    ? false
                    : !groupComplete
              }
              onClick={async () => {
                try {
                  if (userGroupLocked && !tournamentLocked) {
                    await unlockGroup(activeGroup);
                    setGroupMessage(`Group ${activeGroup} unlocked.`);
                  } else {
                    await flushPendingForGroup();
                    await lockGroup(activeGroup);
                    setGroupMessage(`Group ${activeGroup} locked.`);
                  }
                  await refresh();
                } catch (err) {
                  setGroupMessage(
                    err instanceof Error ? err.message : 'Could not update group lock'
                  );
                }
              }}
            >
              {userGroupLocked && !tournamentLocked ? 'Unlock group' : 'Lock group'}
            </button>
            <button type="button" disabled={groupIndex === 0} onClick={() => changeGroupIndex(groupIndex - 1)}>
              Previous Group
            </button>
            <button
              type="button"
              disabled={groupIndex === groupSequence.length - 1}
              onClick={() => changeGroupIndex(groupIndex + 1)}
            >
              Next Group
            </button>
          </div>
          {groupMessage && <p className={groupMessage.includes('locked') ? 'success' : 'warning'}>{groupMessage}</p>}
        </article>
      )}

      {phase === 'bonus' && (
        <article className="card">
          <h3>Tournament result predictions</h3>
          <p>Choose the top four teams. These lock at the first match kickoff — no group predictions required.</p>
          {tournamentLocked && <p className="warning">Tournament result predictions are locked.</p>}
          {state.bonusCommitted && !tournamentLocked && (
            <p className="success">Your tournament result predictions are saved.</p>
          )}
          {tournamentLocked && state.bonusCommitted ? (
            <div className="bonus-readonly fixture-scores-summary fixture-scores-locked">
              {bonusSlots.map((slot) => {
                const team = teams.find((entry) => entry.id === state.bonusCommitted?.[slot.key]);
                return (
                  <p key={slot.key}>
                    <strong>{slot.label}:</strong> {team ? <TeamLabel team={team} /> : '—'}
                  </p>
                );
              })}
            </div>
          ) : (
            <form onSubmit={submitBonus} className="form-grid">
              <TeamSelect
                label="Winner"
                name="winnerTeamId"
                value={bonus.winnerTeamId}
                disabled={tournamentLocked}
              />
              <TeamSelect
                label="Runner-up"
                name="runnerUpTeamId"
                value={bonus.runnerUpTeamId}
                disabled={tournamentLocked}
              />
              <TeamSelect label="Third" name="thirdTeamId" value={bonus.thirdTeamId} disabled={tournamentLocked} />
              <TeamSelect label="Fourth" name="fourthTeamId" value={bonus.fourthTeamId} disabled={tournamentLocked} />
              <button type="submit" disabled={tournamentLocked}>
                Save tournament predictions
              </button>
              {bonusMessage && (
                <p className={bonusMessage.includes('saved') ? 'success' : 'warning'}>{bonusMessage}</p>
              )}
            </form>
          )}
        </article>
      )}

      {activeKoPhase && (
        <article className="card">
          <h3>{activeKoPhase.label}</h3>
          <p>Only officially confirmed fixtures are listed — not projected from your group predictions.</p>
          {!koPicksAllowed && (
            <p className="warning">
              Complete and save all 72 group-stage match scores before knockout predictions can be saved (
              {state.groupPicksCommittedCount ?? 0}/{state.groupPicksRequired ?? 72} saved).
            </p>
          )}
          {activeKoFixtures.length === 0 ? (
            <p className="warning">No fixtures are confirmed for this round yet.</p>
          ) : (
            activeKoFixtures.map((match) => {
              const actual = officialResults[match.id];
              const koFixtureLocked = isKnockoutFixtureLocked(match, nowIso, actual);
              return (
                <FixturePickCard
                  key={match.id}
                  match={match}
                  pick={mergedPicks[match.id]}
                  actual={actual}
                  nowIso={nowIso}
                  inputsDisabled={!koPicksAllowed}
                  showLockedSummary={koFixtureLocked}
                  onSave={saveMatchPick}
                  kickoffHint={
                    koFixtureLocked ? undefined : `Locks in: ${formatCountdown(match.kickoff, nowIso)}`
                  }
                />
              );
            })
          )}
        </article>
      )}
    </section>
  );
}
