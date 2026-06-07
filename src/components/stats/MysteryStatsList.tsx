import { StatisticsResponse } from '../../types';

interface MysteryStatsListProps {
  stats: StatisticsResponse['mysteryStats'];
}

export function MysteryStatsList({ stats }: MysteryStatsListProps) {
  if (stats.length === 0) return null;

  return (
    <article className="card stats-mystery-panel">
      <h3>Mystery Stats</h3>
      <p className="kicker">Teasers until picks unlock — no names revealed yet</p>
      <ul className="fun-facts-list">
        {stats.map((stat) => (
          <li key={stat.text} className="fun-fact-card stats-mystery-card">
            <span className="fun-fact-icon" aria-hidden="true">
              {stat.icon}
            </span>
            <span>{stat.text}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
