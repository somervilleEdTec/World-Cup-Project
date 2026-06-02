import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type WheelEvent } from 'react';
import { groupMatches, teams } from '../data/tournament';
import { TeamLabel } from '../components/TeamLabel';
import { fetchPredictionState, lockGroup, saveBonusDraft, saveDraftPick } from '../services/apiClient';
import { TeamSelect } from '../components/TeamSelect';
import { ALL_GROUP_IDS } from '../lib/pickLocks';
import { computeMissingPicks } from '../lib/missingPicks';
import { computeGroupStandings, shouldLockGroup } from '../lib/tournamentLogic';
import { Match, Pick, TournamentBonusPick } from '../types';

const groupSequence = ALL_GROUP_IDS;
const AUTOSAVE_MS = 450;

function formatCountdown(targetIso: string, nowIso: string): string {
  const diff = new Date(targetIso).getTime() - new Date(nowIso).getTime();
  if (diff <= 0) return 'Locked';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    (nextHome: number, nextAway: number, nextProgressing = progressingTeamId) => {
      if (!onScoresChange) return;
      const home = clampScore(nextHome);
      const away = clampScore(nextAway);
      onScoresChange({
        matchId: match.id,
        homeScore: home,
        awayScore: away,
        progressingTeamId: home === away ? nextProgressing || undefined : undefined
      });
    },
    [match.id, onScoresChange, progressingTeamId]
  );

  const scheduleSave = useCallback(() => {
    if (disabled || !edited) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void onSave(buildPick());
    }, AUTOSAVE_MS);
  }, [buildPick, disabled, edited, onSave]);

  useEffect(() => {
    scheduleSave();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [homeScore, awayScore, progressingTeamId, scheduleSave]);

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
        />
      </div>
      {isDraw && match.stage !== 'GROUP' && (
        <label>
          Draw selected — choose the team that progresses.
          <select
            value={progressingTeamId}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value;
              setEdited(true);
              setProgressingTeamId(next);
              notifyChange(homeScore, awayScore, next);
            }}
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
  const groupStandings = useMemo(
    () => computeGroupStandings(activeGroup, { ...savedPicks, ...pendingGroupPicks }),
    [activeGroup, pendingGroupPicks, savedPicks]
  );

  const missingPicks = useMemo(
    () => computeMissingPicks(mergedPicks, state.bonusCommitted, confirmedKnockoutFixtures),
    [mergedPicks, state.bonusCommitted, confirmedKnockoutFixtures]
  );

  const groupComplete = activeGroupMatches.every((match) => mergedPicks[match.id] !== undefined);
  const groupIsLocked = lockedGroups.includes(activeGroup) || tournamentLocked;
  const allGroupPicksCommitted = state.allGroupPicksCommitted ?? false;
  const koPicksAllowed = allGroupPicksCommitted || tournamentLocked;
  const hasConfirmedKnockout = confirmedKnockoutFixtures.length > 0;
  const bonus = bonusValues(state);

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
      setGroupMessage(err instanceof Error ? err.message : 'Could not save pick');
    }
  };

  const flushPendingForGroup = async () => {
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
      setBonusMessage('Tournament result picks saved. They lock at the first match kickoff.');
      await refresh();
    } catch (err) {
      setBonusMessage(err instanceof Error ? err.message : 'Could not save tournament picks');
    }
  };

  return (
    <section className="stack">
      <article className="card">
        <h2>My Picks</h2>
        <p>
          {tournamentLocked
            ? 'Group-stage and tournament result picks are now locked.'
            : 'Scores save automatically. Lock a group when you are happy with it.'}
        </p>
        <div className="missing-picks">
          <h3>You have the following missing picks:</h3>
          {missingPicks.length === 0 ? (
            <p className="success">None — all current picks are complete.</p>
          ) : (
            <ul className="missing-picks-list">
              {missingPicks.map((item) => (
                <li key={item.label}>{item.label}</li>
              ))}
            </ul>
          )}
        </div>
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
          {groupIsLocked && lockedGroups.includes(activeGroup) && (
            <p className="success">Group {activeGroup} is locked.</p>
          )}
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
                  disabled={groupIsLocked}
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
              disabled={!groupComplete || groupIsLocked || lockedGroups.includes(activeGroup)}
              onClick={async () => {
                try {
                  await flushPendingForGroup();
                  await lockGroup(activeGroup);
                  setGroupMessage(`Group ${activeGroup} locked.`);
                  await refresh();
                } catch (err) {
                  setGroupMessage(err instanceof Error ? err.message : 'Could not lock group');
                }
              }}
            >
              Lock group
            </button>
            <button type="button" disabled={groupIndex === 0} onClick={() => setGroupIndex((value) => value - 1)}>
              Previous Group
            </button>
            <button
              type="button"
              disabled={groupIndex === groupSequence.length - 1}
              onClick={() => setGroupIndex((value) => value + 1)}
            >
              Next Group
            </button>
          </div>
          {groupMessage && <p className={groupMessage.includes('locked') ? 'success' : 'warning'}>{groupMessage}</p>}
        </article>
      )}

      {phase === 'bonus' && (
        <article className="card">
          <h3>Tournament result picks</h3>
          <p>Pick the top four teams. These lock at the first match kickoff — no group picks required.</p>
          {tournamentLocked && <p className="warning">Tournament result picks are locked.</p>}
          {state.bonusCommitted && !tournamentLocked && (
            <p className="success">Your tournament result picks are saved.</p>
          )}
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
              Save tournament picks
            </button>
            {bonusMessage && (
              <p className={bonusMessage.includes('saved') ? 'success' : 'warning'}>{bonusMessage}</p>
            )}
          </form>
        </article>
      )}

      {phase === 'knockout' && (
        <article className="card">
          <h3>Knockout fixture picks</h3>
          <p>Only officially confirmed fixtures are listed — not projected from your group picks.</p>
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
                <MatchScoreInputs
                  match={match}
                  pick={pick}
                  disabled={locked || !koPicksAllowed}
                  onSave={saveMatchPick}
                />
              </div>
            );
          })}
        </article>
      )}
    </section>
  );
}
