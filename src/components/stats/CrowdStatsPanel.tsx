import { teams } from '../../data/tournament';
import { TeamLabel } from '../TeamLabel';
import { StatHeroCard } from './StatHeroCard';
import { ConsensusBar } from './ConsensusBar';
import { ResultDonut } from './ResultDonut';
import { GroupConsensusPanel } from './GroupConsensusPanel';
import { TournamentOutlook } from './TournamentOutlook';
import { FunFactsList } from './FunFactsList';
import { MysteryStatsList } from './MysteryStatsList';
import { StatisticsResponse } from '../../types';
import { formatFixtureStageLabel } from '../../lib/fixtureLabels';

function fixtureLabel(homeTeamId: string, awayTeamId: string): string {
  const home = teams.find((t) => t.id === homeTeamId);
  const away = teams.find((t) => t.id === awayTeamId);
  return `${home?.name ?? homeTeamId} vs ${away?.name ?? awayTeamId}`;
}

interface CrowdStatsPanelProps {
  data: StatisticsResponse;
}

export function CrowdStatsPanel({ data }: CrowdStatsPanelProps) {
  const { headlines, meta, matchConsensus, groupConsensus, tournamentOutlook, funFacts, mysteryStats } =
    data;

  if (!meta.groupPhaseLocked) {
    return (
      <section className="stack">
        <article className="card stats-locked-notice">
          <h3>Crowd Predictions</h3>
          <p>{meta.message}</p>
        </article>
        <MysteryStatsList stats={mysteryStats} />
      </section>
    );
  }

  return (
    <section className="stack">
      <article className="card">
        <h3>Crowd Predictions</h3>
        <p className="kicker">What the league is predicting</p>
        <p>
          Based on {meta.playerCount} player{meta.playerCount === 1 ? '' : 's'}
          {meta.viewableMatchCount > 0
            ? ` across ${meta.viewableMatchCount} viewable fixture${meta.viewableMatchCount === 1 ? '' : 's'}`
            : ''}
          .
        </p>
        <p className="kicker">{meta.message}</p>
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

      {groupConsensus.length > 0 && <GroupConsensusPanel groups={groupConsensus} />}
      <TournamentOutlook outlook={tournamentOutlook} />
      <FunFactsList facts={funFacts} />
    </section>
  );
}
