import { teams } from '../../data/tournament';
import { TeamLabel } from '../TeamLabel';
import { StatisticsPickCount } from '../../types';

interface ConsensusBarProps {
  item: StatisticsPickCount;
  revealNames?: boolean;
}

export function ConsensusBar({ item, revealNames = true }: ConsensusBarProps) {
  const width = item.pct > 0 ? Math.max(item.pct, 2) : 0;
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
