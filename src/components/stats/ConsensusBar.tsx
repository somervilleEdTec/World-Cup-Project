import { StatisticsPickCount } from '../../types';

interface ConsensusBarProps {
  item: StatisticsPickCount;
  maxCount: number;
}

export function ConsensusBar({ item, maxCount }: ConsensusBarProps) {
  const width = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0;

  return (
    <div className="consensus-bar-row">
      <div className="consensus-bar-track" aria-hidden="true">
        <div className="consensus-bar-fill" style={{ width: `${width}%` }} />
      </div>
      <span className="consensus-bar-label">{item.label}</span>
      <span className="consensus-bar-meta">
        {item.pct}% ({item.count})
      </span>
    </div>
  );
}
