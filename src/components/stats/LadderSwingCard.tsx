import { teams } from '../../data/tournament';
import { TeamLabel } from '../TeamLabel';
import { formatFixtureStageLabel } from '../../lib/fixtureLabels';
import { CrowdStatCard as CrowdStatCardType } from '../../types';

interface LadderSwingCardProps {
  card: Extract<CrowdStatCardType, { visualType: 'ladder' }>;
  revealNames: boolean;
}

export function LadderSwingCard({ card, revealNames }: LadderSwingCardProps) {
  const homeTeam = teams.find((t) => t.id === card.homeTeamId);
  const awayTeam = teams.find((t) => t.id === card.awayTeamId);

  return (
    <article className="card crowd-stat-card crowd-stat-card-ladder">
      <div className="ladder-swing-header">
        <p className="ladder-swing-kicker">If this scoreline lands</p>
        <div className="fixture-row">
          {revealNames && homeTeam ? <TeamLabel team={homeTeam} /> : <span>Home</span>}
          <strong>vs</strong>
          {revealNames && awayTeam ? <TeamLabel team={awayTeam} /> : <span>Away</span>}
        </div>
        <p className="ladder-swing-scoreline">
          {card.scoreline} <span className="ladder-swing-pct">({card.scorelinePct}% crowd pick)</span>
        </p>
        <p className="kicker">{formatFixtureStageLabel(card.stage, card.group)}</p>
      </div>
      <ul className="ladder-swing-movers">
        {card.movers.map((mover) => (
          <li key={`${mover.displayName}-${mover.beforeRank}`} className="ladder-swing-mover">
            <span className="ladder-swing-name">{mover.displayName}</span>
            <span className="ladder-swing-ranks">
              #{mover.beforeRank} → #{mover.afterRank}
            </span>
            <span className={`ladder-swing-delta ${mover.delta > 0 ? 'up' : 'down'}`}>
              {mover.delta > 0 ? `↑${mover.delta}` : `↓${Math.abs(mover.delta)}`}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
