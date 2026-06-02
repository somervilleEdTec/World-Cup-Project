import { matches, teams } from '../data/tournament';
import { TeamLabel } from '../components/TeamLabel';
import { useAppStore } from '../lib/store';

export function ComparisonPage() {
  const committedPicks = useAppStore((state) => state.committedPicks);
  const nowIso = useAppStore((state) => state.nowIso);

  const nextMatch = matches
    .filter((match) => new Date(match.kickoff).getTime() > new Date(nowIso).getTime())
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())[0];

  if (!nextMatch) {
    return <section className="card">No upcoming matches.</section>;
  }

  const homeTeam = teams.find((team) => team.id === nextMatch.homeTeamId);
  const awayTeam = teams.find((team) => team.id === nextMatch.awayTeamId);
  const yourPick = committedPicks[nextMatch.id];

  return (
    <section className="card">
      <h2>Comparison</h2>
      <p>Next game:</p>
      <div className="fixture-row">
        {homeTeam && <TeamLabel team={homeTeam} />} <strong>vs</strong> {awayTeam && <TeamLabel team={awayTeam} />}
      </div>
      <p>
        Your committed pick:{' '}
        {yourPick ? `${yourPick.homeScore}-${yourPick.awayScore}` : 'No committed pick yet'}
      </p>
      <p>Other players’ picks will be shown here after lock.</p>
    </section>
  );
}
