import { FormEvent, useMemo, useState } from 'react';
import { matches, teams } from '../data/tournament';
import { TeamLabel } from '../components/TeamLabel';
import { useAppStore } from '../lib/store';
import { computeGroupPositions, shouldLockGroup } from '../lib/tournamentLogic';
import { Match, TournamentBonusPick } from '../types';

const groupSequence = ['A', 'B'];

function formatCountdown(targetIso: string, nowIso: string): string {
  const diff = new Date(targetIso).getTime() - new Date(nowIso).getTime();
  if (diff <= 0) return 'Locked';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export function MyPicksPage(): JSX.Element {
  const [groupIndex, setGroupIndex] = useState(0);
  const [message, setMessage] = useState<string>('');

  const nowIso = useAppStore((state) => state.nowIso);
  const draftPicks = useAppStore((state) => state.draftPicks);
  const committedPicks = useAppStore((state) => state.committedPicks);
  const affectedMatches = useAppStore((state) => state.affectedMatches);
  const bonusDraft = useAppStore((state) => state.bonusDraft);
  const updateDraftPick = useAppStore((state) => state.updateDraftPick);
  const reviewAffectedMatch = useAppStore((state) => state.reviewAffectedMatch);
  const setBonusDraft = useAppStore((state) => state.setBonusDraft);
  const commitDraft = useAppStore((state) => state.commitDraft);
  const runAutoLocks = useAppStore((state) => state.runAutoLocks);

  const activeGroup = groupSequence[groupIndex];
  const groupMatches = matches.filter((match) => match.stage === 'GROUP' && match.group === activeGroup);
  const groupLocked = shouldLockGroup(nowIso);

  const mergedPicks = { ...committedPicks, ...draftPicks };

  const groupPreview = useMemo(() => computeGroupPositions(activeGroup, mergedPicks), [activeGroup, mergedPicks]);

  const saveMatch = (event: FormEvent<HTMLFormElement>, match: Match) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const homeScore = Number(form.get('homeScore'));
    const awayScore = Number(form.get('awayScore'));
    const progressingTeamId = (form.get('progressingTeamId') as string) || undefined;

    const errors = updateDraftPick(match.id, {
      matchId: match.id,
      homeScore,
      awayScore,
      progressingTeamId,
      reviewed: true
    });

    if (errors.length > 0) {
      setMessage(errors[0]);
      return;
    }
    setMessage('Draft saved. Remember to commit changes.');
  };

  const submitBonus = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const payload: TournamentBonusPick = {
      winnerTeamId: String(form.get('winnerTeamId')),
      runnerUpTeamId: String(form.get('runnerUpTeamId')),
      thirdTeamId: String(form.get('thirdTeamId')),
      fourthTeamId: String(form.get('fourthTeamId'))
    };

    setBonusDraft(payload);
    setMessage('Bonus picks saved to draft. Commit to lock them.');
  };

  return (
    <section className="stack">
      <article className="card">
        <h2>My Picks</h2>
        <p className={affectedMatches.length > 0 ? 'warning' : 'success'}>
          {affectedMatches.length > 0 ? 'Uncommitted changes pending' : 'All changes committed'}
        </p>
        <p>
          {groupLocked
            ? 'Group-stage picks are now locked. Only previously committed predictions were locked.'
            : 'Only committed group picks and bonus selections will lock at first kickoff.'}
        </p>
        <button type="button" onClick={runAutoLocks}>
          Refresh lock status
        </button>
      </article>

      <article className="card">
        <h3>Group {activeGroup} predictions</h3>
        <p>Complete this group, preview standings, then move next.</p>
        {groupMatches.map((match) => {
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
              <button type="submit" disabled={groupLocked}>Save match</button>
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
      </article>

      <article className="card">
        <h3>Tournament bonus picks</h3>
        <p>Select winner, runner-up, third, and fourth from all teams (repeats allowed).</p>
        <form onSubmit={submitBonus} className="form-grid">
          <label>
            Winner
            <select name="winnerTeamId" defaultValue={bonusDraft?.winnerTeamId ?? teams[0].id}>
              {teams.map((team) => (
                <option key={`winner-${team.id}`} value={team.id}>{`${team.flag} ${team.name}`}</option>
              ))}
            </select>
          </label>
          <label>
            Runner-up
            <select name="runnerUpTeamId" defaultValue={bonusDraft?.runnerUpTeamId ?? teams[1].id}>
              {teams.map((team) => (
                <option key={`runner-${team.id}`} value={team.id}>{`${team.flag} ${team.name}`}</option>
              ))}
            </select>
          </label>
          <label>
            Third
            <select name="thirdTeamId" defaultValue={bonusDraft?.thirdTeamId ?? teams[2].id}>
              {teams.map((team) => (
                <option key={`third-${team.id}`} value={team.id}>{`${team.flag} ${team.name}`}</option>
              ))}
            </select>
          </label>
          <label>
            Fourth
            <select name="fourthTeamId" defaultValue={bonusDraft?.fourthTeamId ?? teams[3].id}>
              {teams.map((team) => (
                <option key={`fourth-${team.id}`} value={team.id}>{`${team.flag} ${team.name}`}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={groupLocked}>Save bonus picks</button>
        </form>
      </article>

      <article className="card">
        <h3>Knockout fixture picks</h3>
        {matches
          .filter((match) => match.stage !== 'GROUP')
          .map((match) => {
            const homeTeam = teams.find((team) => team.id === match.homeTeamId);
            const awayTeam = teams.find((team) => team.id === match.awayTeamId);
            const pick = mergedPicks[match.id];
            const locked = new Date(nowIso).getTime() >= new Date(match.kickoff).getTime();

            return (
              <form key={match.id} onSubmit={(event) => saveMatch(event, match)} className="fixture-card">
                <p className="kicker">{match.stage}</p>
                <div className="fixture-row">
                  {homeTeam && <TeamLabel team={homeTeam} />} <strong>vs</strong> {awayTeam && <TeamLabel team={awayTeam} />}
                </div>
                <p>
                  Locks in: {formatCountdown(match.kickoff, nowIso)}{' '}
                  {locked ? '(Locked)' : '(Open)'}
                </p>
                <div className="score-inputs">
                  <input name="homeScore" type="number" min="0" required defaultValue={pick?.homeScore ?? 0} disabled={locked} />
                  <input name="awayScore" type="number" min="0" required defaultValue={pick?.awayScore ?? 0} disabled={locked} />
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
                <button type="submit" disabled={locked}>Save knockout pick</button>
                {affectedMatches.includes(match.id) && (
                  <button type="button" onClick={() => reviewAffectedMatch(match.id)}>
                    Mark reviewed
                  </button>
                )}
              </form>
            );
          })}
      </article>

      <article className="card">
        <button type="button" onClick={() => setMessage(commitDraft().message)}>
          Review affected fixtures and Commit changes
        </button>
        <p>{message}</p>
      </article>
    </section>
  );
}
