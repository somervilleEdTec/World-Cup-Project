import { teams } from '../../data/tournament';
import { TeamLabel } from '../TeamLabel';
import { ConsensusBar } from './ConsensusBar';
import { formatFixtureStageLabel } from '../../lib/fixtureLabels';
import { CrowdStatCard as CrowdStatCardType } from '../../types';

interface FixtureScorelinesCardProps {
  card: Extract<CrowdStatCardType, { visualType: 'fixture' }>;
  revealNames: boolean;
}

export function FixtureScorelinesCard({ card, revealNames }: FixtureScorelinesCardProps) {
  const maxCount = card.topScorelines[0]?.count ?? 1;
  const homeTeam = teams.find((t) => t.id === card.homeTeamId);
  const awayTeam = teams.find((t) => t.id === card.awayTeamId);

  return (
    <article className="card crowd-stat-card crowd-stat-card-fixture">
      <p className="crowd-stat-panel-kicker">Top predicted scorelines</p>
      <div className="stats-match-header">
        <div className="fixture-row">
          {revealNames && homeTeam ? <TeamLabel team={homeTeam} /> : <span>Home</span>}
          <strong>vs</strong>
          {revealNames && awayTeam ? <TeamLabel team={awayTeam} /> : <span>Away</span>}
        </div>
        <p className="kicker">
          {formatFixtureStageLabel(card.stage, card.group)} · {card.totalPicks} picks
        </p>
      </div>
      <div className="fixture-scorelines-body">
        {card.topScorelines.map((line) => (
          <ConsensusBar key={line.label} item={line} maxCount={maxCount} />
        ))}
      </div>
    </article>
  );
}
