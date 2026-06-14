interface CrowdStatsHeaderProps {
  shuffling?: boolean;
  onShuffle?: () => void;
}

export function CrowdStatsHeader({ shuffling, onShuffle }: CrowdStatsHeaderProps) {
  return (
    <article className="card crowd-stats-header">
      <div className="crowd-stats-header-row">
        <h3>Crowd Predictions</h3>
        {onShuffle && (
          <button
            type="button"
            className="crowd-stats-shuffle-btn"
            onClick={onShuffle}
            disabled={shuffling}
          >
            {shuffling ? 'Shuffling…' : 'Shuffle Stats'}
          </button>
        )}
      </div>
    </article>
  );
}
