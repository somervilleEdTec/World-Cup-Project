import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { teams } from '../data/tournament';
import { TeamLabel } from '../components/TeamLabel';
import {
  fetchComparisonFixtures,
  fetchMatchComparison,
  fetchNextMatchComparison
} from '../services/apiClient';
import { formatFixtureScore } from '../components/FixtureScoreSummary';
import { formatKickoffBst } from '../lib/formatDateTime';
import { classifyPickAccuracy } from '../lib/matchScoring';
import { MatchComparisonView } from '../types';

function formatPick(entry: MatchComparisonView['entries'][number]): string {
  if (entry.hidden) return 'Hidden until lock';
  if (!entry.pick) return 'No committed pick';
  const { homeScore, awayScore, progressingTeamId } = entry.pick;
  if (homeScore === awayScore && progressingTeamId) {
    const team = teams.find((t) => t.id === progressingTeamId);
    const name = team ? team.name : progressingTeamId;
    return `${homeScore}-${awayScore} (adv: ${name})`;
  }
  return `${homeScore}-${awayScore}`;
}

function pickCellClass(
  entry: MatchComparisonView['entries'][number],
  actual: MatchComparisonView['actualResult']
): string | undefined {
  if (entry.hidden || !entry.pick || !actual) return undefined;
  const accuracy = classifyPickAccuracy(
    {
      matchId: 'compare',
      homeScore: entry.pick.homeScore,
      awayScore: entry.pick.awayScore,
      progressingTeamId: entry.pick.progressingTeamId
    },
    {
      matchId: 'compare',
      homeScore: actual.homeScore,
      awayScore: actual.awayScore,
      progressingTeamId: actual.progressingTeamId
    }
  );
  if (accuracy === 'exact') return 'comparison-pick-exact';
  if (accuracy === 'result') return 'comparison-pick-result';
  if (accuracy === 'miss') return 'comparison-pick-miss';
  return undefined;
}

export function ComparisonPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<MatchComparisonView | null>(null);
  const [fixtures, setFixtures] = useState<
    Array<{ id: string; stage: string; kickoff: string; homeTeamId: string; awayTeamId: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedMatchId = searchParams.get('matchId') ?? '';

  useEffect(() => {
    fetchComparisonFixtures()
      .then((list) => setFixtures(list))
      .catch(() => setFixtures([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const loader = selectedMatchId ? fetchMatchComparison(selectedMatchId) : fetchNextMatchComparison();

    loader
      .then((response) => {
        setData(response as MatchComparisonView);
        setError(null);
      })
      .catch((err) => {
        setData(null);
        setError(err instanceof Error ? err.message : 'Unable to load comparison');
      })
      .finally(() => setLoading(false));
  }, [selectedMatchId]);

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
  const activeId = selectedMatchId || data.match.id;

  return (
    <section className="stack">
      <article className="card">
        <h2>Comparison</h2>
        <label>
          Choose fixture
          <select
            value={activeId}
            onChange={(event) => {
              const id = event.target.value;
              setSearchParams({ matchId: id });
            }}
          >
            {fixtures.map((fixture) => {
              const home = teams.find((t) => t.id === fixture.homeTeamId);
              const away = teams.find((t) => t.id === fixture.awayTeamId);
              return (
                <option key={fixture.id} value={fixture.id}>
                  {fixture.stage} — {home?.name ?? 'TBD'} vs {away?.name ?? 'TBD'} — {formatKickoffBst(fixture.kickoff)}
                </option>
              );
            })}
          </select>
        </label>
        <p className="kicker">{data.match.stage}{data.match.group ? ` · Group ${data.match.group}` : ''}</p>
        <div className="fixture-row">
          {homeTeam && homeTeam.id !== 'tbd' ? <TeamLabel team={homeTeam} /> : <span>TBD</span>}
          <strong>vs</strong>
          {awayTeam && awayTeam.id !== 'tbd' ? <TeamLabel team={awayTeam} /> : <span>TBD</span>}
        </div>
        <p>Kickoff: {formatKickoffBst(data.match.kickoff)}</p>
        {data.actualResult && (
          <p className="fixture-actual">
            <strong>Official result:</strong>{' '}
            {formatFixtureScore(
              data.actualResult.homeScore,
              data.actualResult.awayScore,
              data.actualResult.progressingTeamId
            )}
          </p>
        )}
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
                <td className={pickCellClass(entry, data.actualResult)}>{formatPick(entry)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
