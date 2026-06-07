import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { teams } from '../data/tournament';
import { TeamLabel } from '../components/TeamLabel';
import { CrowdStatsPanel } from '../components/stats/CrowdStatsPanel';
import {
  fetchComparisonFixtures,
  fetchMatchComparison,
  fetchNextMatchComparison,
  fetchStatistics,
  userFacingError
} from '../services/apiClient';
import { formatFixtureScore } from '../components/FixtureScoreSummary';
import { formatKickoffBst } from '../lib/formatDateTime';
import {
  fixtureSelectGroupLabel,
  formatFixtureOptionLabel,
  formatFixtureStageLabel
} from '../lib/fixtureLabels';
import { classifyPickAccuracy } from '../lib/matchScoring';
import { MatchComparisonView, Stage, StatisticsResponse } from '../types';

type StatsTab = 'fixture' | 'crowd';

function formatPick(entry: MatchComparisonView['entries'][number], stage: string): string {
  if (entry.hidden) {
    return stage === 'GROUP' ? 'Hidden until lock' : 'Hidden until kickoff';
  }
  if (!entry.pick) return 'No prediction';
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
  actual: MatchComparisonView['actualResult'],
  match: MatchComparisonView['match']
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
    },
    { stage: match.stage as Stage, match }
  );
  if (accuracy === 'exact') return 'comparison-pick-exact';
  if (accuracy === 'result') return 'comparison-pick-result';
  if (accuracy === 'miss') return 'comparison-pick-miss';
  return undefined;
}

export function ComparisonPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<MatchComparisonView | null>(null);
  const [statsData, setStatsData] = useState<StatisticsResponse | null>(null);
  const [fixtures, setFixtures] = useState<
    Array<{
      id: string;
      stage: string;
      group?: string;
      kickoff: string;
      homeTeamId: string;
      awayTeamId: string;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const selectedMatchId = searchParams.get('matchId') ?? '';
  const activeTab = (searchParams.get('tab') === 'fixture' ? 'fixture' : 'crowd') as StatsTab;

  const setTab = (tab: StatsTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'crowd') {
      next.delete('tab');
    } else {
      next.set('tab', tab);
    }
    setSearchParams(next);
  };

  useEffect(() => {
    fetchComparisonFixtures()
      .then((list) => setFixtures(list))
      .catch(() => setFixtures([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const loader = selectedMatchId
      ? fetchMatchComparison(selectedMatchId)
      : fetchNextMatchComparison();

    loader
      .then((response) => {
        setData(response as MatchComparisonView);
        setError(null);
      })
      .catch((err) => {
        setData(null);
        setError(userFacingError(err, 'Unable to load stats'));
      })
      .finally(() => setLoading(false));
  }, [selectedMatchId]);

  useEffect(() => {
    setStatsLoading(true);
    fetchStatistics()
      .then((response) => {
        setStatsData(response);
        setStatsError(null);
      })
      .catch((err) => setStatsError(userFacingError(err, 'Unable to load crowd stats')))
      .finally(() => setStatsLoading(false));
  }, []);

  if (loading && activeTab === 'fixture') {
    return <section className="card">Loading stats…</section>;
  }

  if (error && activeTab === 'fixture' && !data) {
    return (
      <section className="card">
        <h2>Stats</h2>
        <p className="warning">{error}</p>
        <p>Log in to view predictions and crowd stats.</p>
      </section>
    );
  }

  const homeTeam = data ? teams.find((team) => team.id === data.match.homeTeamId) : undefined;
  const awayTeam = data ? teams.find((team) => team.id === data.match.awayTeamId) : undefined;
  const activeId = selectedMatchId || data?.match.id || '';

  const fixtureGroups = fixtures.reduce<
    Array<{ label: string; items: typeof fixtures }>
  >((groups, fixture) => {
    const label = fixtureSelectGroupLabel(fixture);
    const existing = groups.find((group) => group.label === label);
    if (existing) {
      existing.items.push(fixture);
    } else {
      groups.push({ label, items: [fixture] });
    }
    return groups;
  }, []);

  return (
    <section className="stack">
      <article className="card">
        <h2>Stats</h2>
        <p className="kicker">Compare picks by fixture or explore crowd predictions</p>
        <div className="picks-phase-tabs stats-page-tabs">
          <button
            type="button"
            className={activeTab === 'crowd' ? 'active-tab' : undefined}
            onClick={() => setTab('crowd')}
          >
            Crowd Predictions
          </button>
          <button
            type="button"
            className={activeTab === 'fixture' ? 'active-tab' : undefined}
            onClick={() => setTab('fixture')}
          >
            By Fixture
          </button>
        </div>
      </article>

      {activeTab === 'crowd' && (
        <>
          {statsLoading && <section className="card">Loading crowd stats…</section>}
          {statsError && (
            <section className="card">
              <p className="warning">{statsError}</p>
            </section>
          )}
          {statsData && !statsLoading && <CrowdStatsPanel data={statsData} />}
        </>
      )}

      {activeTab === 'fixture' && data && (
        <>
          <article className="card">
            <label>
              Choose fixture
              <select
                value={activeId}
                onChange={(event) => {
                  const id = event.target.value;
                  const next = new URLSearchParams(searchParams);
                  next.set('matchId', id);
                  setSearchParams(next);
                }}
              >
                {fixtureGroups.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.items.map((fixture) => (
                      <option key={fixture.id} value={fixture.id}>
                        {formatFixtureOptionLabel(fixture, teams)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <p className="kicker">{formatFixtureStageLabel(data.match.stage, data.match.group)}</p>
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
            <h3>Player predictions</h3>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Prediction</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <tr
                    key={entry.userId}
                    className={entry.isCurrentUser ? 'comparison-row-you' : undefined}
                  >
                    <td>
                      {entry.displayName}
                      {entry.isCurrentUser ? ' (you)' : ''}
                    </td>
                    <td className={pickCellClass(entry, data.actualResult, data.match)}>
                      {formatPick(entry, data.match.stage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </>
      )}

      {activeTab === 'fixture' && !data && !loading && (
        <section className="card">No upcoming matches.</section>
      )}
    </section>
  );
}
