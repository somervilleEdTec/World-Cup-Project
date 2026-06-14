import { ConsensusBar } from './ConsensusBar';
import { StatsTeamName } from './StatsTeamName';
import { CrowdStatCard as CrowdStatCardType } from '../../types';

interface MiniGroupStandingsCardProps {
  card: Extract<CrowdStatCardType, { visualType: 'standings' }>;
  revealNames: boolean;
}

export function MiniGroupStandingsCard({ card, revealNames }: MiniGroupStandingsCardProps) {
  const isConsensus = card.variant === 'consensus';

  return (
    <article className="card crowd-stat-card crowd-stat-card-standings">
      <p className="crowd-stat-panel-kicker">
        {isConsensus ? "The crowd's top 4" : 'Who wins the group?'}
      </p>
      <h4>Group {card.groupId}</h4>
      {isConsensus ? (
        <>
          <p className="kicker">
            {card.modalCount} player{card.modalCount === 1 ? '' : 's'} picked this exact order (
            {card.modalPct}%)
          </p>
          <ol className="mini-standings-order-list">
            {(card.modalOrder ?? []).map((team, index) => (
              <li key={`${team}-${index}`} className="mini-standings-order-row">
                <span className="mini-standings-rank">#{index + 1}</span>
                <StatsTeamName
                  teamId={card.modalOrderTeamIds?.[index]}
                  label={team}
                  revealNames={revealNames}
                />
              </li>
            ))}
          </ol>
        </>
      ) : (
        <>
          <p className="kicker">{card.distinctWinners} different teams tipped to finish 1st</p>
          <div className="mini-standings-grid">
            {(card.positions[0]?.teams ?? []).map((team) => (
              <div key={team.label} className="mini-standings-row">
                <span className="mini-standings-rank">1st</span>
                <div className="mini-standings-bar-wrap">
                  <ConsensusBar item={team} maxCount={team.count} revealNames={revealNames} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </article>
  );
}
