import { FormEvent, useCallback, useEffect, useMemo, useState, type WheelEvent } from 'react';
import { groupMatches, teams } from '../data/tournament';
import { TeamLabel } from '../components/TeamLabel';
import {
  commitDraft,
  fetchPredictionState,
  markReviewed,
  saveBonusDraft,
  saveDraftPick,
  setGroupAccepted
} from '../services/apiClient';
import { ALL_GROUP_IDS, GROUP_MATCH_COUNT } from '../lib/pickLocks';
import { computeGroupStandings, shouldLockGroup } from '../lib/tournamentLogic';
import { Match, Pick, TournamentBonusPick } from '../types';

const groupSequence = ALL_GROUP_IDS;

function formatCountdown(targetIso: string, nowIso: string): string {
  const diff = new Date(targetIso).getTime() - new Date(nowIso).getTime();
  if (diff <= 0) return 'Locked';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function bonusValues(state: RemoteState): TournamentBonusPick {
  const source = state.bonusDraft ?? state.bonusCommitted;
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
}

type PicksPhase = 'bonus' | 'group' | 'knockout';

const initialState: RemoteState = {
  committedPicks: {},
  draftPicks: {},
  affectedMatches: [],
  acceptedGroups: [],
  commitState: { groupLocked: false }
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function parseScoreInput(raw: string): number {
  if (raw.trim() === '') return 0;
  return clampScore(Number(raw));
}

function MatchScoreInputs({
  match,
  pick,
  disabled,
  onSave,
  onScoresChange
}: {
  match: Match;
  pick?: Pick;
  disabled: boolean;
  onSave: (pick: Pick) => Promise<void>;
  onScoresChange?: (pick: Pick) => void;
}) {
  const hasSavedPick = pick !== undefined;
  const [homeScore, setHomeScore] = useState(pick?.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(pick?.awayScore ?? 0);
  const [progressingTeamId, setProgressingTeamId] = useState(pick?.progressingTeamId ?? '');
  const [edited, setEdited] = useState(false);

  useEffect(() => {
    setHomeScore(pick?.homeScore ?? 0);
    setAwayScore(pick?.awayScore ?? 0);
    setProgressingTeamId(pick?.progressingTeamId ?? '');
    setEdited(false);
  }, [pick?.homeScore, pick?.awayScore, pick?.progressingTeamId, match.id]);

  const buildPick = useCallback((): Pick => {
    const home = clampScore(homeScore);
    const away = clampScore(awayScore);
    return {
      matchId: match.id,
      homeScore: home,
      awayScore: away,
      progressingTeamId: home === away ? progressingTeamId || undefined : undefined
    };
  }, [awayScore, homeScore, match.id, progressingTeamId]);

  const notifyChange = useCallback(
    (nextHome: number, nextAway: number) => {
      if (!onScoresChange) return;
      const home = clampScore(nextHome);
      const away = clampScore(nextAway);
      onScoresChange({
        matchId: match.id,
        homeScore: home,
        awayScore: away,
        progressingTeamId: home === away ? progressingTeamId || undefined : undefined
      });
    },
    [match.id, onScoresChange, progressingTeamId]
  );

  const persist = useCallback(async () => {
    if (disabled || !edited) return;
    await onSave(buildPick());
  }, [buildPick, disabled, edited, onSave]);

  const homeTeam = teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === match.awayTeamId);
  const isDraw = clampScore(homeScore) === clampScore(awayScore);

  const handleScoreWheel = (event: WheelEvent<HTMLInputElement>) => {
    event.currentTarget.blur();
  };

  return (
    <>
      <div className="score-inputs">
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={hasSavedPick || edited ? homeScore : ''}
          placeholder="0"
          disabled={disabled}
          onWheel={handleScoreWheel}
          onChange={(event) => {
            const next = parseScoreInput(event.target.value);
            setEdited(true);
            setHomeScore(next);
            notifyChange(next, awayScore);
          }}
          onBlur={() => void persist()}
        />
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={hasSavedPick || edited ? awayScore : ''}
          placeholder="0"
          disabled={disabled}
          onWheel={handleScoreWheel}
          onChange={(event) => {
            const next = parseScoreInput(event.target.value);
            setEdited(true);
            setAwayScore(next);
            notifyChange(homeScore, next);
          }}
          onBlur={() => void persist()}
        />
      </div>
      {isDraw && match.stage !== 'GROUP' && (
        <label>
          Draw selected — choose the team that progresses.
          <select
            value={progressingTeamId}
            disabled={disabled}
            onChange={(event) => {
              setProgressingTeamId(event.target.value);
            }}
            onBlur={() => void persist()}
          >
            <option value="">Select progressing team</option>
            {homeTeam && <option value={homeTeam.id}>{homeTeam.name}</option>}
            {awayTeam && <option value={awayTeam.id}>{awayTeam.name}</option>}
          </select>
        </label>
      )}
    </>
  );
}

export function MyPicksPage() {
  const [groupIndex, setGroupIndex] = useState(0);
  const [phase, setPhase] = useState<PicksPhase>('group');
  const [message, setMessage] = useState<string>('');
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
      setMessage(err instanceof Error ? err.message : 'Failed to load prediction state');
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const activeGroup = groupSequence[groupIndex];
  const activeGroupMatches = groupMatches.filter((match) => match.group === activeGroup);
  const groupLocked = state.commitState.groupLocked || shouldLockGroup(nowIso);

  const savedPicks = { ...state.committedPicks, ...state.draftPicks };
  const mergedPicks = { ...savedPicks, ...pendingGroupPicks };
  const confirmedKnockoutFixtures = state.confirmedKnockoutFixtures ?? [];
  const groupStandings = useMemo(
    () => computeGroupStandings(activeGroup, { ...savedPicks, ...pendingGroupPicks }),
    [activeGroup, pendingGroupPicks, savedPicks]
  );

  const groupComplete = activeGroupMatches.every((match) => mergedPicks[match.id] !== undefined);
  const groupAccepted = state.acceptedGroups.includes(activeGroup);
  const groupPicksRequired = state.groupPicksRequired ?? GROUP_MATCH_COUNT;
  const groupPicksCommittedCount = state.groupPicksCommittedCount ?? 0;
  const allGroupPicksCommitted =
    state.allGroupPicksCommitted ?? groupPicksCommittedCount >= groupPicksRequired;
  const bonus = bonusValues(state);
  const koPicksAllowed = allGroupPicksCommitted || groupLocked;
  const hasConfirmedKnockout = confirmedKnockoutFixtures.length > 0;

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
      setMessage(err instanceof Error ? err.message : 'Could not save pick');
    }
  };

  const flushGroupPicks = async () => {
    for (const match of activeGroupMatches) {
      const pick = pendingGroupPicks[match.id];
      if (pick) {
        await saveDraftPick(pick);
      }
    }
    setPendingGroupPicks({});
    await refresh();
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
      setBonusMessage('Bonus picks saved. Use “Commit changes” below when you are ready to lock them in.');
      setMessage('Bonus picks saved to draft.');
      await refresh();
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Could not save bonus picks';
      setBonusMessage(text);
      setMessage(text);
    }
  };

  return (
    <section className="stack">
      <article className="card">
        <h2>My Picks</h2>
        <p className={state.affectedMatches.length > 0 ? 'warning' : 'success'}>
          {state.affectedMatches.length > 0 ? 'Uncommitted changes pending' : 'All changes committed'}
        </p>
        <p>
          {groupLocked
            ? 'Group-stage picks are now locked. Only previously committed predictions were locked.'
            : 'Only committed group picks and bonus selections will lock at first kickoff.'}
        </p>
        <p className="warning">Uncommitted edits will not count. Last committed picks will be locked.</p>
        <p className={allGroupPicksCommitted ? 'success' : 'warning'}>
          Group picks committed: {groupPicksCommittedCount}/{groupPicksRequired}
          {!allGroupPicksCommitted && !groupLocked
            ? ' — commit all group-stage picks before first kickoff to unlock bonus and knockout picks.'
            : ''}
        </p>
        <div className="button-row">
          <button type="button" className={phase === 'bonus' ? 'active-tab' : ''} onClick={() => setPhase('bonus')}>
            Tournament Results
          </button>
          <button type="button" className={phase === 'group' ? 'active-tab' : ''} onClick={() => setPhase('group')}>
            Group Stage
          </button>
          <button
            type="button"
            className={phase === 'knockout' ? 'active-tab' : ''}
            onClick={() => setPhase('knockout')}
          >
            Knockout Stage
            {hasConfirmedKnockout ? ` (${confirmedKnockoutFixtures.length})` : ''}
          </button>
        </div>
        {phase === 'knockout' && !hasConfirmedKnockout && (
          <p className="warning">
            Knockout picks appear here once official group results confirm each fixture (both teams known).
          </p>
        )}
      </article>

      {phase === 'group' && (
        <article className="card">
          <h3>Group {activeGroup} predictions</h3>
          <p className="kicker">Scores save automatically when you leave each field.</p>
          {activeGroupMatches.map((match) => {
            const homeTeam = teams.find((team) => team.id === match.homeTeamId);
            const awayTeam = teams.find((team) => team.id === match.awayTeamId);
            const pick = mergedPicks[match.id];
            return (
              <div key={match.id} className="fixture-card">
                <div className="fixture-row">
                  {homeTeam && <TeamLabel team={homeTeam} />} <strong>vs</strong>{' '}
                  {awayTeam && <TeamLabel team={awayTeam} />}
                </div>
                <MatchScoreInputs
                  match={match}
                  pick={pick}
                  disabled={groupLocked}
                  onSave={saveMatchPick}
                  onScoresChange={(updated) =>
                    setPendingGroupPicks((current) => ({ ...current, [match.id]: updated }))
                  }
                />
              </div>
            );
          })}

          <h4>Projected table (Group {activeGroup})</h4>
          <div className="comparison-table-wrap">
            <table className="comparison-table league-table">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Team</th>
                  <th>GP</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                  <th>GF</th>
                  <th>GA</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {groupStandings.map((row, index) => {
                  const team = teams.find((entry) => entry.id === row.teamId);
                  return (
                    <tr key={row.teamId}>
                      <td>{index + 1}</td>
                      <td>{team ? <TeamLabel team={team} /> : row.teamId}</td>
                      <td>{row.gp}</td>
                      <td>{row.w}</td>
                      <td>{row.d}</td>
                      <td>{row.l}</td>
                      <td>{row.gf}</td>
                      <td>{row.ga}</td>
                      <td>{row.pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="button-row">
            <button
              type="button"
              disabled={!groupComplete || groupLocked}
              onClick={async () => {
                try {
                  await flushGroupPicks();
                  await setGroupAccepted(activeGroup, true);
                  setMessage(`Group ${activeGroup} accepted and all match results locked in.`);
                  await refresh();
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : 'Could not accept group');
                }
              }}
            >
              Accept group table
            </button>
            <button
              type="button"
              disabled={groupLocked}
              onClick={async () => {
                try {
                  await setGroupAccepted(activeGroup, false);
                  await refresh();
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : 'Could not amend group');
                }
              }}
            >
              Amend
            </button>
            <button type="button" disabled={groupIndex === 0} onClick={() => setGroupIndex((value) => value - 1)}>
              Previous Group
            </button>
            <button
              type="button"
              disabled={groupIndex === groupSequence.length - 1 || !groupAccepted}
              onClick={() => setGroupIndex((value) => value + 1)}
            >
              Next Group
            </button>
          </div>
          {!groupAccepted && groupComplete && <p className="warning">Accept this group before moving on.</p>}
          {groupAccepted && <p className="success">Group {activeGroup} accepted.</p>}
        </article>
      )}

      {phase === 'bonus' && (
        <article className="card">
          <h3>Tournament bonus picks</h3>
          <p>Select winner, runner-up, third, and fourth from all teams (repeats allowed).</p>
          {groupLocked && <p className="warning">Tournament bonus picks are locked.</p>}
          <form
            key={JSON.stringify(state.bonusDraft ?? state.bonusCommitted ?? bonus)}
            onSubmit={submitBonus}
            className="form-grid"
          >
            <label>
              Winner
              <select name="winnerTeamId" defaultValue={bonus.winnerTeamId} disabled={groupLocked}>
                {teams.map((team) => (
                  <option key={`winner-${team.id}`} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Runner-up
              <select name="runnerUpTeamId" defaultValue={bonus.runnerUpTeamId} disabled={groupLocked}>
                {teams.map((team) => (
                  <option key={`runner-${team.id}`} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Third
              <select name="thirdTeamId" defaultValue={bonus.thirdTeamId} disabled={groupLocked}>
                {teams.map((team) => (
                  <option key={`third-${team.id}`} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fourth
              <select name="fourthTeamId" defaultValue={bonus.fourthTeamId} disabled={groupLocked}>
                {teams.map((team) => (
                  <option key={`fourth-${team.id}`} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={groupLocked}>
              Save bonus picks
            </button>
            {bonusMessage && (
              <p className={bonusMessage.includes('saved') ? 'success' : 'warning'}>{bonusMessage}</p>
            )}
            {state.bonusDraft && !state.bonusCommitted && (
              <p className="warning">Bonus picks saved as draft — commit when ready.</p>
            )}
            {state.bonusCommitted && !state.bonusDraft && (
              <p className="success">Bonus picks committed.</p>
            )}
          </form>
        </article>
      )}

      {phase === 'knockout' && (
        <article className="card">
          <h3>Knockout fixture picks</h3>
          <p>Only officially confirmed fixtures are listed — not projected from your group picks.</p>
          <p className="kicker">Scores save automatically when you leave each field.</p>
          {!koPicksAllowed && (
            <p className="warning">
              Commit all {groupPicksRequired} group-stage picks before first kickoff to save knockout predictions.
            </p>
          )}
          {hasConfirmedKnockout && !koPicksAllowed && (
            <p className="warning">Finish committing your group-stage picks to enable saving knockout scores.</p>
          )}
          {!hasConfirmedKnockout && (
            <p className="warning">
              No knockout fixtures are confirmed yet. They unlock as group games finish and FIFA assigns teams.
            </p>
          )}
          {confirmedKnockoutFixtures.map((match) => {
            const homeTeam = teams.find((team) => team.id === match.homeTeamId);
            const awayTeam = teams.find((team) => team.id === match.awayTeamId);
            const homeOk = homeTeam && homeTeam.id !== 'tbd';
            const awayOk = awayTeam && awayTeam.id !== 'tbd';
            const pick = mergedPicks[match.id];
            const locked = new Date(nowIso).getTime() >= new Date(match.kickoff).getTime();

            return (
              <div key={match.id} className="fixture-card">
                <p className="kicker">{match.stage}</p>
                <div className="fixture-row">
                  {homeOk ? <TeamLabel team={homeTeam!} /> : <span>TBD</span>} <strong>vs</strong>{' '}
                  {awayOk ? <TeamLabel team={awayTeam!} /> : <span>TBD</span>}
                </div>
                <p>Locks in: {formatCountdown(match.kickoff, nowIso)}</p>
                <p className="warning">This match locks at kickoff. Commit your changes before deadline.</p>
                <MatchScoreInputs
                  match={match}
                  pick={pick}
                  disabled={locked || !koPicksAllowed}
                  onSave={saveMatchPick}
                />
                {state.affectedMatches.includes(match.id) && (
                  <button
                    type="button"
                    onClick={async () => {
                      await markReviewed(match.id);
                      await refresh();
                    }}
                  >
                    Mark reviewed
                  </button>
                )}
              </div>
            );
          })}
        </article>
      )}

      <article className="card">
        <button
          type="button"
          onClick={async () => {
            try {
              await commitDraft();
              setMessage('Changes committed successfully.');
              await refresh();
            } catch (err) {
              setMessage(err instanceof Error ? err.message : 'Commit failed');
            }
          }}
        >
          Review affected fixtures and Commit changes
        </button>
        <p>{message}</p>
      </article>
    </section>
  );
}
