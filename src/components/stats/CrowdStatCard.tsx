import type { ReactNode } from 'react';
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

function wrapCard(visualType: string, pinnedClass: string, children: ReactNode, extraClass = '') {
  const classes = [
    'crowd-stat-card-wrap',
    `crowd-stat-card-wrap-${visualType}`,
    extraClass,
    pinnedClass
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  return <div className={classes}>{children}</div>;
}

export function CrowdStatCard({ card, revealNames, pinned = false }: CrowdStatCardProps) {
  const pinnedClass = pinned ? ' crowd-stat-card-pinned' : '';

  switch (card.visualType) {
    case 'hero':
      return (
        <div
          className={`crowd-stat-card-wrap crowd-stat-card-wrap-hero crowd-stat-card crowd-stat-card-hero${pinnedClass}`}
        >
          <StatHeroCard
            subtitle={HERO_SUBTITLES[card.title] ?? 'League highlight'}
            value={card.value}
            detail={card.detail}
            variant={card.variant}
          />
        </div>
      );
    case 'fixture':
      return wrapCard('fixture', pinnedClass, (
        <FixtureScorelinesCard card={card} revealNames={revealNames} />
      ));
    case 'ladder':
      return wrapCard('ladder', pinnedClass, (
        <LadderSwingCard card={card} revealNames={revealNames} />
      ));
    case 'standings':
      return wrapCard('standings', pinnedClass, (
        <MiniGroupStandingsCard card={card} revealNames={revealNames} />
      ));
    case 'podium':
      return wrapCard('podium', pinnedClass, (
        <PodiumOutlookCard card={card} revealNames={revealNames} />
      ));
    case 'personal':
      return wrapCard('personal', pinnedClass, (
        <PersonalStatCard card={card} revealNames={revealNames} />
      ));
    case 'volatile':
      return wrapCard('volatile', pinnedClass, (
        <VolatileFixtureCard card={card} revealNames={revealNames} />
      ));
    case 'cluster':
      return wrapCard('cluster', pinnedClass, <RankClusterCard card={card} />);
    case 'insight':
      if (card.kind === 'battle') {
        return wrapCard(
          'insight',
          pinnedClass,
          <HeadToHeadCard card={card} revealNames={revealNames} />,
          'crowd-stat-card-wrap-battle'
        );
      }
      return wrapCard('insight', pinnedClass, <InsightTileCard card={card} />);
    default:
      return null;
  }
}
