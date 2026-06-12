import { StatisticsResponse } from '../../types';

interface CrowdStatsHeaderProps {
  meta: StatisticsResponse['meta'];
  shuffling?: boolean;
  onShuffle?: () => void;
}

export function CrowdStatsHeader({ meta, shuffling, onShuffle }: CrowdStatsHeaderProps) {
  return (
    <article className="card crowd-stats-header">
      <div className="crowd-stats-header-row">
        <div>
          <h3>Crowd Predictions</h3>
          <p className="kicker">What the league is predicting</p>
        </div>
        {onShuffle && (
          <button
            type="button"
            className="crowd-stats-shuffle-btn"
            onClick={onShuffle}
            disabled={shuffling}
          >
            {shuffling ? 'Shuffling…' : 'Shuffle stats'}
          </button>
        )}
      </div>
      <p>
        Based on {meta.playerCount} player{meta.playerCount === 1 ? '' : 's'}
        {meta.upcomingFixtureCount > 0
          ? ` across ${meta.upcomingFixtureCount} upcoming fixture${meta.upcomingFixtureCount === 1 ? '' : 's'}`
          : ''}
        .
      </p>
      <p className="kicker">{meta.message}</p>
      {!meta.groupPhaseLocked && (
        <p className="crowd-stats-mystery-kicker">
          Teasers until first kickoff — team names hidden
        </p>
      )}
    </article>
  );
}
