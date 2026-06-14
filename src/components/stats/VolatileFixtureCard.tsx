import { teams } from '../../data/tournament';
import { TeamLabel } from '../TeamLabel';
import { formatFixtureStageLabel } from '../../lib/fixtureLabels';
import { CrowdStatCard as CrowdStatCardType } from '../../types';

interface VolatileFixtureCardProps {
  card: Extract<CrowdStatCardType, { visualType: 'volatile' }>;
  revealNames: boolean;
}

export function VolatileFixtureCard({ card, revealNames }: VolatileFixtureCardProps) {
  const homeTeam = teams.find((t) => t.id === card.homeTeamId);
  const awayTeam = teams.find((t) => t.id === card.awayTeamId);
  const barWidth = Math.min(100, Math.max(12, card.maxSwing * 12));

  return (
    <article className="card crowd-stat-card crowd-stat-card-volatile">
      <p className="crowd-stat-panel-kicker">{card.subtitle}</p>
      <div className="fixture-row">
        {revealNames && homeTeam ? <TeamLabel team={homeTeam} /> : <span>Home</span>}
        <strong>vs</strong>
        {revealNames && awayTeam ? <TeamLabel team={awayTeam} /> : <span>Away</span>}
      </div>
      <p className="kicker">{formatFixtureStageLabel(card.stage, card.group)}</p>
      <p className="ladder-swing-scoreline">
        {card.scoreline} <span className="ladder-swing-pct">({card.scorelinePct}% crowd pick)</span>
      </p>
      <p className="volatile-fixture-meta">
        Would move {card.ranksMoved} player rank{card.ranksMoved === 1 ? '' : 's'}
      </p>
      <div className="consensus-bar-row">
        <div className="consensus-bar-track" aria-hidden="true">
          <div
            className="consensus-bar-fill volatile-swing-fill"
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <span className="consensus-bar-meta">↑{card.maxSwing} max swing</span>
      </div>
    </article>
  );
}
