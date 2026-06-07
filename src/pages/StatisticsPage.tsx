import { useEffect, useState } from 'react';
import { teams } from '../data/tournament';
import { TeamLabel } from '../components/TeamLabel';
import { StatHeroCard } from '../components/stats/StatHeroCard';
import { ConsensusBar } from '../components/stats/ConsensusBar';
import { ResultDonut } from '../components/stats/ResultDonut';
import { GroupConsensusPanel } from '../components/stats/GroupConsensusPanel';
import { TournamentOutlook } from '../components/stats/TournamentOutlook';
import { FunFactsList } from '../components/stats/FunFactsList';
import { fetchStatistics, userFacingError } from '../services/apiClient';
import { StatisticsResponse } from '../types';
import { formatFixtureStageLabel } from '../lib/fixtureLabels';

function fixtureLabel(homeTeamId: string, awayTeamId: string): string {
  const home = teams.find((t) => t.id === homeTeamId);
  const away = teams.find((t) => t.id === awayTeamId);
  return `${home?.name ?? homeTeamId} vs ${away?.name ?? awayTeamId}`;
}

export function StatisticsPage() {
  const [data, setData] = useState<StatisticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics()
      .then((response) => {
        setData(response);
        setError(null);
      })
      .catch((err) => setError(userFacingError(err, 'Unable to load statistics')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <section className="card">Loading statistics…</section>;
  }

  if (error) {
    return (
      <section className="card">
        <h2>Statistics</h2>
        <p className="warning">{error}</p>
      </section>
    );
  }

  if (!data) {
    return <section className="card">No statistics available.</section>;
  }

  const { headlines, meta, matchConsensus, groupConsensus, tournamentOutlook, funFacts } = data;

  return (
    <section className="stack">
      <article className="card">
        <h2>Statistics</h2>
        <p className="kicker">What the crowd is predicting</p>
        <p>
          Based on {meta.playerCount} player{meta.playerCount === 1 ? '' : 's'}
          {meta.viewableMatchCount > 0
            ? ` across ${meta.viewableMatchCount} viewable fixture${meta.viewableMatchCount === 1 ? '' : 's'}`
            : ''}
          .
        </p>
        {!meta.groupPhaseLocked && (
          <p className="stats-locked-notice-inline">{meta.message}</p>
        )}
        {meta.groupPhaseLocked && <p className="kicker">{meta.message}</p>}
      </article>

      {(headlines.hiveMind || headlines.roomForDebate || headlines.scorelineKing) && (
        <div className="stats-hero-grid">
          {headlines.hiveMind && (
            <StatHeroCard
              title="The Hive Mind"
              value={headlines.hiveMind.scoreline}
              detail={`${fixtureLabel(headlines.hiveMind.homeTeamId, headlines.hiveMind.awayTeamId)} — ${headlines.hiveMind.count}/${headlines.hiveMind.total} agree (${headlines.hiveMind.pct}%)`}
              variant="consensus"
            />
          )}
          {headlines.roomForDebate && (
            <StatHeroCard
              title="Room for Debate"
              value={`${headlines.roomForDebate.distinctScorelines} scorelines`}
              detail={fixtureLabel(
                headlines.roomForDebate.homeTeamId,
                headlines.roomForDebate.awayTeamId
              )}
              variant="chaos"
            />
          )}
          {headlines.scorelineKing && (
            <StatHeroCard
              title="Scoreline King"
              value={headlines.scorelineKing.scoreline}
              detail={`Predicted ${headlines.scorelineKing.count} time${headlines.scorelineKing.count === 1 ? '' : 's'} across all fixtures`}
            />
          )}
        </div>
      )}

      {matchConsensus.length > 0 && (
        <article className="card">
          <h3>Match Consensus</h3>
          {matchConsensus.map((match) => {
            const maxCount = match.topScorelines[0]?.count ?? 1;
            const homeTeam = teams.find((t) => t.id === match.homeTeamId);
            const awayTeam = teams.find((t) => t.id === match.awayTeamId);

            return (
              <div key={match.matchId} className="stats-match-block">
                <div className="stats-match-header">
                  <div className="fixture-row">
                    {homeTeam ? <TeamLabel team={homeTeam} /> : <span>TBD</span>}
                    <strong>vs</strong>
                    {awayTeam ? <TeamLabel team={awayTeam} /> : <span>TBD</span>}
                  </div>
                  <p className="kicker">
                    {formatFixtureStageLabel(match.stage, match.group)} · {match.totalPicks} picks
                  </p>
                </div>
                <div className="stats-match-body">
                  <div className="stats-match-bars">
                    {match.topScorelines.map((line) => (
                      <ConsensusBar key={line.label} item={line} maxCount={maxCount} />
                    ))}
                  </div>
                  <ResultDonut segments={match.resultSplit} />
                </div>
              </div>
            );
          })}
        </article>
      )}

      {meta.groupPhaseLocked && groupConsensus.length > 0 && (
        <GroupConsensusPanel groups={groupConsensus} />
      )}

      {!meta.groupPhaseLocked && (
        <article className="card stats-locked-notice">
          <h3>Group Standings Consensus</h3>
          <p>Group standings stats appear after the first tournament kickoff.</p>
        </article>
      )}

      <TournamentOutlook outlook={tournamentOutlook} />
      <FunFactsList facts={funFacts} />
    </section>
  );
}
