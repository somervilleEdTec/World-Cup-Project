import { teams } from '../../data/tournament';
import { TeamLabel } from '../TeamLabel';
import { StatisticsPickCount } from '../../types';

interface ConsensusBarProps {
  item: StatisticsPickCount;
  maxCount: number;
  revealNames?: boolean;
}

export function ConsensusBar({ item, maxCount, revealNames = true }: ConsensusBarProps) {
  const width = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0;
  const team = item.teamId ? teams.find((t) => t.id === item.teamId) : undefined;

  return (
    <div className="consensus-bar-row">
      <div className="consensus-bar-track" aria-hidden="true">
        <div className="consensus-bar-fill" style={{ width: `${width}%` }} />
      </div>
      <span className="consensus-bar-label">
        {revealNames && team ? <TeamLabel team={team} /> : item.label}
      </span>
      <span className="consensus-bar-meta">
        {item.pct}% ({item.count})
      </span>
    </div>
  );
}
