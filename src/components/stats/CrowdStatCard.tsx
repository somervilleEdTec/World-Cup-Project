import { StatHeroCard } from './StatHeroCard';
import { FixtureScorelinesCard } from './FixtureScorelinesCard';
import { LadderSwingCard } from './LadderSwingCard';
import { MiniGroupStandingsCard } from './MiniGroupStandingsCard';
import { PodiumOutlookCard } from './PodiumOutlookCard';
import { InsightTileCard } from './InsightTileCard';
import { HeadToHeadCard } from './HeadToHeadCard';
import { CrowdStatCard as CrowdStatCardType } from '../../types';

interface CrowdStatCardProps {
  card: CrowdStatCardType;
  revealNames: boolean;
}

export function CrowdStatCard({ card, revealNames }: CrowdStatCardProps) {
  switch (card.visualType) {
    case 'hero':
      return (
        <div className="crowd-stat-card crowd-stat-card-hero">
          <StatHeroCard
            title={card.title}
            value={card.value}
            detail={card.detail}
            variant={card.variant}
          />
        </div>
      );
    case 'fixture':
      return <FixtureScorelinesCard card={card} revealNames={revealNames} />;
    case 'ladder':
      return <LadderSwingCard card={card} revealNames={revealNames} />;
    case 'standings':
      return <MiniGroupStandingsCard card={card} />;
    case 'podium':
      return <PodiumOutlookCard card={card} />;
    case 'insight':
      if (card.kind === 'battle') {
        return <HeadToHeadCard card={card} revealNames={revealNames} />;
      }
      return <InsightTileCard card={card} />;
    default:
      return null;
  }
}
