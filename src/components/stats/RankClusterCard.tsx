import { CrowdStatCard as CrowdStatCardType } from '../../types';

interface RankClusterCardProps {
  card: Extract<CrowdStatCardType, { visualType: 'cluster' }>;
}

export function RankClusterCard({ card }: RankClusterCardProps) {
  const maxPoints = card.players[0]?.points ?? 1;

  return (
    <article className="card crowd-stat-card crowd-stat-card-cluster">
      <p className="crowd-stat-panel-kicker">{card.subtitle}</p>
      <ul className="rank-cluster-list">
        {card.players.map((player) => {
          const width = maxPoints > 0 ? Math.round((player.points / maxPoints) * 100) : 0;
          return (
            <li
              key={player.userId}
              className={`rank-cluster-row${player.isCurrentUser ? ' rank-cluster-you' : ''}`}
            >
              <span className="rank-cluster-rank">#{player.rank}</span>
              <span className="rank-cluster-name">
                {player.isCurrentUser ? 'You' : player.displayName}
              </span>
              <div className="rank-cluster-bar-wrap">
                <div className="rank-cluster-bar-track" aria-hidden="true">
                  <div className="rank-cluster-bar-fill" style={{ width: `${width}%` }} />
                </div>
                <span className="rank-cluster-points">{player.points} pts</span>
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
