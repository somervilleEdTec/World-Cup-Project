import { FormEvent, useEffect, useMemo, useState } from 'react';
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
import { getMatches } from '../lib/matchResolver';
import { ALL_GROUP_IDS } from '../lib/pickLocks';
import { computeGroupPositions, shouldLockGroup } from '../lib/tournamentLogic';
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
  bonusDraft?: TournamentBonusPick;
  bonusCommitted?: TournamentBonusPick;
  commitState: { groupLocked: boolean };
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
  const [message, setMessage] = useState<string>('');
  const [state, setState] = useState<RemoteState>(initialState);

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

  const mergedPicks = { ...state.committedPicks, ...state.draftPicks };
  const resolvedMatches = useMemo(() => getMatches(mergedPicks), [mergedPicks]);
  const groupPreview = useMemo(() => computeGroupPositions(activeGroup, mergedPicks), [activeGroup, mergedPicks]);

  const groupComplete = activeGroupMatches.every((match) => mergedPicks[match.id] !== undefined);
  const groupAccepted = state.acceptedGroups.includes(activeGroup);
  const allGroupsAccepted = groupSequence.every((g) => state.acceptedGroups.includes(g));
  const bonus = bonusValues(state);

  const saveMatch = async (event: FormEvent<HTMLFormElement>, match: Match) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const homeScore = Number(form.get('homeScore'));
    const awayScore = Number(form.get('awayScore'));
    const progressingTeamId = (form.get('progressingTeamId') as string) || undefined;

    try {
      await saveDraftPick({ matchId: match.id, homeScore, awayScore, progressingTeamId });
      setMessage('Draft saved. Remember to commit changes.');
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save draft');
    }
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
      setMessage('Bonus picks saved to draft. Commit to lock them.');
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save bonus picks');
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
      </article>

      <article className="card">
        <h3>Group {activeGroup} predictions</h3>
        {activeGroupMatches.map((match) => {
          const homeTeam = teams.find((team) => team.id === match.homeTeamId);
          const awayTeam = teams.find((team) => team.id === match.awayTeamId);
          const pick = mergedPicks[match.id];
          return (
            <form key={match.id} onSubmit={(event) => saveMatch(event, match)} className="fixture-card">
              <div className="fixture-row">
                {homeTeam && <TeamLabel team={homeTeam} />} <strong>vs</strong> {awayTeam && <TeamLabel team={awayTeam} />}
              </div>
              <div className="score-inputs">
                <input name="homeScore" type="number" min="0" required defaultValue={pick?.homeScore ?? 0} />
                <input name="awayScore" type="number" min="0" required defaultValue={pick?.awayScore ?? 0} />
              </div>
              <button type="submit" disabled={groupLocked}>
                Save match
              </button>
            </form>
          );
        })}

        <h4>Projected table (Group {activeGroup})</h4>
        <ol>
          {groupPreview.map((teamId) => {
            const team = teams.find((entry) => entry.id === teamId);
            return <li key={teamId}>{team ? `${team.flag} ${team.name}` : teamId}</li>;
          })}
        </ol>

        <div className="button-row">
          <button
            type="button"
            disabled={!groupComplete || groupLocked}
            onClick={async () => {
              try {
                await setGroupAccepted(activeGroup, true);
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
        </div>
        {!groupAccepted && groupComplete && <p className="warning">Accept this group before moving on.</p>}
        {groupAccepted && <p className="success">Group {activeGroup} accepted.</p>}

        <div className="button-row">
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
      </article>

      <article className="card">
        <h3>Tournament bonus picks</h3>
        <p>Select winner, runner-up, third, and fourth from all teams (repeats allowed).</p>
        {!allGroupsAccepted && (
          <p className="warning">Complete and accept all 12 groups before saving tournament bonus picks.</p>
        )}
        <form onSubmit={submitBonus} className="form-grid">
          <label>
            Winner
            <select name="winnerTeamId" defaultValue={bonus.winnerTeamId}>
              {teams.map((team) => (
                <option key={`winner-${team.id}`} value={team.id}>{`${team.flag} ${team.name}`}</option>
              ))}
            </select>
          </label>
          <label>
            Runner-up
            <select name="runnerUpTeamId" defaultValue={bonus.runnerUpTeamId}>
              {teams.map((team) => (
                <option key={`runner-${team.id}`} value={team.id}>{`${team.flag} ${team.name}`}</option>
              ))}
            </select>
          </label>
          <label>
            Third
            <select name="thirdTeamId" defaultValue={bonus.thirdTeamId}>
              {teams.map((team) => (
                <option key={`third-${team.id}`} value={team.id}>{`${team.flag} ${team.name}`}</option>
              ))}
            </select>
          </label>
          <label>
            Fourth
            <select name="fourthTeamId" defaultValue={bonus.fourthTeamId}>
              {teams.map((team) => (
                <option key={`fourth-${team.id}`} value={team.id}>{`${team.flag} ${team.name}`}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={groupLocked || !allGroupsAccepted}>
            Save bonus picks
          </button>
        </form>
      </article>

      <article className="card">
        <h3>Knockout fixture picks</h3>
        {resolvedMatches
          .filter((match) => match.stage !== 'GROUP')
          .map((match) => {
            const homeTeam = teams.find((team) => team.id === match.homeTeamId);
            const awayTeam = teams.find((team) => team.id === match.awayTeamId);
            const homeOk = homeTeam && homeTeam.id !== 'tbd';
            const awayOk = awayTeam && awayTeam.id !== 'tbd';
            const pick = mergedPicks[match.id];
            const locked = new Date(nowIso).getTime() >= new Date(match.kickoff).getTime();

            return (
              <form key={match.id} onSubmit={(event) => saveMatch(event, match)} className="fixture-card">
                <p className="kicker">{match.stage}</p>
                <div className="fixture-row">
                  {homeOk ? <TeamLabel team={homeTeam!} /> : <span>TBD</span>} <strong>vs</strong>{' '}
                  {awayOk ? <TeamLabel team={awayTeam!} /> : <span>TBD</span>}
                </div>
                <p>Locks in: {formatCountdown(match.kickoff, nowIso)}</p>
                <p className="warning">This match locks at kickoff. Commit your changes before deadline.</p>
                <div className="score-inputs">
                  <input
                    name="homeScore"
                    type="number"
                    min="0"
                    required
                    defaultValue={pick?.homeScore ?? 0}
                    disabled={locked}
                  />
                  <input
                    name="awayScore"
                    type="number"
                    min="0"
                    required
                    defaultValue={pick?.awayScore ?? 0}
                    disabled={locked}
                  />
                </div>
                {(pick?.homeScore ?? 0) === (pick?.awayScore ?? 0) && (
                  <label>
                    Draw selected — choose the team that progresses.
                    <select name="progressingTeamId" defaultValue={pick?.progressingTeamId} disabled={locked} required>
                      <option value="">Select progressing team</option>
                      {homeTeam && <option value={homeTeam.id}>{`${homeTeam.flag} ${homeTeam.name}`}</option>}
                      {awayTeam && <option value={awayTeam.id}>{`${awayTeam.flag} ${awayTeam.name}`}</option>}
                    </select>
                  </label>
                )}
                <button type="submit" disabled={locked}>
                  Save knockout pick
                </button>
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
              </form>
            );
          })}
      </article>

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
