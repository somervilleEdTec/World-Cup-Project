import { CrowdStatCard as CrowdStatCardType } from '../../types';

interface PodiumOutlookCardProps {
  card: Extract<CrowdStatCardType, { visualType: 'podium' }>;
}

const PODIUM_SUBTITLES: Record<
  Extract<CrowdStatCardType, { visualType: 'podium' }>['slot'],
  string
> = {
  champion: 'Tournament winner picks',
  runnerUp: 'Runner-up picks',
  third: 'Third-place picks',
  fourth: 'Fourth-place picks'
};

const PODIUM_LABELS: Record<Extract<CrowdStatCardType, { visualType: 'podium' }>['slot'], string> =
  {
    champion: 'Champion',
    runnerUp: 'Runner-up',
    third: 'Third place',
    fourth: 'Fourth place'
  };

const PODIUM_HEIGHTS = ['tall', 'medium', 'short'] as const;

export function PodiumOutlookCard({ card }: PodiumOutlookCardProps) {
  const picks = card.picks.slice(0, 3);

  return (
    <article className="card crowd-stat-card crowd-stat-card-podium">
      <p className="crowd-stat-panel-kicker">{PODIUM_SUBTITLES[card.slot]}</p>
      <h4>{PODIUM_LABELS[card.slot]}</h4>
      <div className="podium-steps">
        {picks.map((pick, index) => (
          <div
            key={pick.label}
            className={`podium-step podium-step-${PODIUM_HEIGHTS[index] ?? 'short'}`}
          >
            <span className="podium-step-label">{pick.label}</span>
            <span className="podium-step-pct">{pick.pct}%</span>
            <span className="podium-step-count">{pick.count}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
