import { CrowdStatCard as CrowdStatCardType } from '../../types';

interface InsightTileCardProps {
  card: Extract<CrowdStatCardType, { kind: 'fact' | 'spotlight' }>;
}

export function InsightTileCard({ card }: InsightTileCardProps) {
  return (
    <article className="card crowd-stat-card crowd-stat-card-insight">
      {card.subtitle && <p className="crowd-stat-panel-kicker">{card.subtitle}</p>}
      <div className="insight-tile">
        <span className="insight-tile-icon" aria-hidden="true">
          {card.icon}
        </span>
        <p className="insight-tile-text">{card.text}</p>
      </div>
    </article>
  );
}
