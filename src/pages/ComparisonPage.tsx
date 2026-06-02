import { useEffect, useState } from 'react';
import { matches, teams } from '../data/tournament';
import { TeamLabel } from '../components/TeamLabel';
import { fetchNextMatchComparison } from '../services/apiClient';
import { MatchComparisonView } from '../types';

function formatPick(entry: MatchComparisonView['entries'][number], homeTeamId: string, awayTeamId: string): string {
  if (entry.hidden) return 'Hidden until lock';
  if (!entry.pick) return 'No committed pick';
  const { homeScore, awayScore, progressingTeamId } = entry.pick;
  if (homeScore === awayScore && progressingTeamId) {
    const team = teams.find((t) => t.id === progressingTeamId);
    const name = team ? `${team.flag} ${team.name}` : progressingTeamId;
    return `${homeScore}-${awayScore} (adv: ${name})`;
  }
  return `${homeScore}-${awayScore}`;
}

function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

export function ComparisonPage() {
  const [data, setData] = useState<MatchComparisonView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchNextMatchComparison()
      .then((response) => {
        setData(response as MatchComparisonView);
        setError(null);
      })
      .catch((err) => {
        setData(null);
        setError(err instanceof Error ? err.message : 'Unable to load comparison');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <section className="card">Loading comparison…</section>;
  }

  if (error) {
    return (
      <section className="card">
        <h2>Comparison</h2>
        <p className="warning">{error}</p>
        <p>Log in to compare picks with other players.</p>
      </section>
    );
  }

  if (!data) {
    return <section className="card">No upcoming matches.</section>;
  }

  const homeTeam = teams.find((team) => team.id === data.match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === data.match.awayTeamId);

  return (
    <section className="stack">
      <article className="card">
        <h2>Comparison</h2>
        <p className="kicker">{data.match.stage}{data.match.group ? ` · Group ${data.match.group}` : ''}</p>
        <div className="fixture-row">
          {homeTeam && <TeamLabel team={homeTeam} />} <strong>vs</strong> {awayTeam && <TeamLabel team={awayTeam} />}
        </div>
        <p>Kickoff: {formatKickoff(data.match.kickoff)}</p>
        <p>{data.visibility.message}</p>
      </article>

      <article className="card comparison-table-wrap">
        <h3>Player picks</h3>
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Committed pick</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((entry) => (
              <tr key={entry.userId} className={entry.isCurrentUser ? 'comparison-row-you' : undefined}>
                <td>{entry.displayName}{entry.isCurrentUser ? ' (you)' : ''}</td>
                <td>{formatPick(entry, data.match.homeTeamId, data.match.awayTeamId)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className="card">
        <h3>Other upcoming fixtures</h3>
        <ul className="fixture-list">
          {matches
            .filter((m) => new Date(m.kickoff).getTime() > Date.now() && m.id !== data.match.id)
            .slice(0, 5)
            .map((m) => {
              const home = teams.find((t) => t.id === m.homeTeamId);
              const away = teams.find((t) => t.id === m.awayTeamId);
              return (
                <li key={m.id}>
                  {home && <TeamLabel team={home} />} vs {away && <TeamLabel team={away} />} — {formatKickoff(m.kickoff)}
                </li>
              );
            })}
        </ul>
      </article>
    </section>
  );
}
