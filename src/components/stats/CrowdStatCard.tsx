import { StatHeroCard } from './StatHeroCard';
import { FixtureScorelinesCard } from './FixtureScorelinesCard';
import { LadderSwingCard } from './LadderSwingCard';
import { MiniGroupStandingsCard } from './MiniGroupStandingsCard';
import { PodiumOutlookCard } from './PodiumOutlookCard';
import { InsightTileCard } from './InsightTileCard';
import { HeadToHeadCard } from './HeadToHeadCard';
import { PersonalStatCard } from './PersonalStatCard';
import { VolatileFixtureCard } from './VolatileFixtureCard';
import { RankClusterCard } from './RankClusterCard';
import { CrowdStatCard as CrowdStatCardType } from '../../types';

interface CrowdStatCardProps {
  card: CrowdStatCardType;
  revealNames: boolean;
  pinned?: boolean;
}

const HERO_SUBTITLES: Record<string, string> = {
  'The Hive Mind': 'Strongest match consensus',
  'Room for Debate': 'Most divided fixture',
  'Scoreline King': 'Most-picked scoreline'
};

export function CrowdStatCard({ card, revealNames, pinned = false }: CrowdStatCardProps) {
  const pinnedClass = pinned ? ' crowd-stat-card-pinned' : '';

  switch (card.visualType) {
    case 'hero':
      return (
        <div className={`crowd-stat-card crowd-stat-card-hero${pinnedClass}`}>
          <StatHeroCard
            subtitle={HERO_SUBTITLES[card.title] ?? 'League highlight'}
            title={card.title}
            value={card.value}
            detail={card.detail}
            variant={card.variant}
          />
        </div>
      );
    case 'fixture':
      return (
        <div className={pinnedClass || undefined}>
          <FixtureScorelinesCard card={card} revealNames={revealNames} />
        </div>
      );
    case 'ladder':
      return (
        <div className={pinnedClass || undefined}>
          <LadderSwingCard card={card} revealNames={revealNames} />
        </div>
      );
    case 'standings':
      return (
        <div className={pinnedClass || undefined}>
          <MiniGroupStandingsCard card={card} />
        </div>
      );
    case 'podium':
      return (
        <div className={pinnedClass || undefined}>
          <PodiumOutlookCard card={card} />
        </div>
      );
    case 'personal':
      return (
        <div className={pinnedClass || undefined}>
          <PersonalStatCard card={card} revealNames={revealNames} />
        </div>
      );
    case 'volatile':
      return (
        <div className={pinnedClass || undefined}>
          <VolatileFixtureCard card={card} revealNames={revealNames} />
        </div>
      );
    case 'cluster':
      return (
        <div className={pinnedClass || undefined}>
          <RankClusterCard card={card} />
        </div>
      );
    case 'insight':
      if (card.kind === 'battle') {
        return (
          <div className={pinnedClass || undefined}>
            <HeadToHeadCard card={card} revealNames={revealNames} />
          </div>
        );
      }
      return (
        <div className={pinnedClass || undefined}>
          <InsightTileCard card={card} />
        </div>
      );
    default:
      return null;
  }
}
