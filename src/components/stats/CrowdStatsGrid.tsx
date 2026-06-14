import { CrowdStatCard as CrowdStatCardType } from '../../types';
import { CrowdStatCard } from './CrowdStatCard';

interface CrowdStatsGridProps {
  cards: CrowdStatCardType[];
  revealNames: boolean;
  mysteryMode?: boolean;
}

export function CrowdStatsGrid({ cards, revealNames, mysteryMode }: CrowdStatsGridProps) {
  if (cards.length === 0) {
    return (
      <article className="card crowd-stats-empty">
        <p>No crowd stats yet — submit picks and check back soon.</p>
      </article>
    );
  }

  return (
    <div className={`crowd-stats-grid${mysteryMode ? ' crowd-stats-grid-mystery' : ''}`}>
      {cards.map((card, index) => (
        <CrowdStatCard
          key={card.id}
          card={card}
          revealNames={revealNames}
          pinned={index < 2 && (card.visualType === 'personal' || card.visualType === 'ladder')}
        />
      ))}
    </div>
  );
}
