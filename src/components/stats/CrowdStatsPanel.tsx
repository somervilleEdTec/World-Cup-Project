import { StatisticsResponse } from '../../types';
import { CrowdStatsHeader } from './CrowdStatsHeader';
import { CrowdStatsGrid } from './CrowdStatsGrid';

interface CrowdStatsPanelProps {
  data: StatisticsResponse;
  shuffling?: boolean;
  onShuffle?: () => void;
}

export function CrowdStatsPanel({ data, shuffling, onShuffle }: CrowdStatsPanelProps) {
  const { meta, crowdCards } = data;

  return (
    <section className="stack">
      <CrowdStatsHeader meta={meta} shuffling={shuffling} onShuffle={onShuffle} />
      <CrowdStatsGrid
        cards={crowdCards}
        revealNames={meta.groupPhaseLocked}
        mysteryMode={!meta.groupPhaseLocked}
      />
    </section>
  );
}
