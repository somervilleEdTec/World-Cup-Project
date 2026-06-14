import { ConsensusBar } from './ConsensusBar';
import { CrowdStatCard as CrowdStatCardType } from '../../types';

interface MiniGroupStandingsCardProps {
  card: Extract<CrowdStatCardType, { visualType: 'standings' }>;
}

export function MiniGroupStandingsCard({ card }: MiniGroupStandingsCardProps) {
  return (
    <article className="card crowd-stat-card crowd-stat-card-standings">
      <h4>Group {card.groupId}</h4>
      <p className="kicker">
        {card.modalCount} player{card.modalCount === 1 ? '' : 's'} share the same full order (
        {card.modalPct}%)
      </p>
      <div className="mini-standings-grid">
        {card.positions.map((slot) => {
          const leader = slot.teams[0];
          if (!leader) return null;
          return (
            <div key={slot.rank} className="mini-standings-row">
              <span className="mini-standings-rank">#{slot.rank}</span>
              <div className="mini-standings-bar-wrap">
                <ConsensusBar item={leader} maxCount={leader.count} />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
