import { useState } from 'react';
import { teams } from '../../data/tournament';
import { TeamLabel } from '../TeamLabel';
import { StatisticsResponse } from '../../types';
import { ConsensusBar } from './ConsensusBar';

interface GroupConsensusPanelProps {
  groups: StatisticsResponse['groupConsensus'];
}

export function GroupConsensusPanel({ groups }: GroupConsensusPanelProps) {
  const [activeGroup, setActiveGroup] = useState(groups[0]?.groupId ?? 'A');
  const group = groups.find((g) => g.groupId === activeGroup) ?? groups[0];

  if (!group) return null;

  const modalTeams = group.modalOrder
    .map((teamId) => teams.find((t) => t.id === teamId))
    .filter(Boolean);

  return (
    <article className="card">
      <h3>Group Standings Consensus</h3>
      <div className="group-stage-tabs">
        {groups.map((g) => (
          <button
            key={g.groupId}
            type="button"
            className={g.groupId === activeGroup ? 'active-tab' : undefined}
            onClick={() => setActiveGroup(g.groupId)}
          >
            {g.groupId}
          </button>
        ))}
      </div>

      <p className="kicker">
        Group {group.groupId} — {group.modalCount} player{group.modalCount === 1 ? '' : 's'}{' '}
        predict the same full order ({group.modalPct}%)
      </p>

      {group.positionPopularity.map((position) => {
        const maxCount = position.teams[0]?.count ?? 1;
        const topTeam = position.teams[0];
        const topTeamId = topTeam
          ? teams.find((t) => t.name === topTeam.label)?.id
          : undefined;
        const topTeamObj = topTeamId ? teams.find((t) => t.id === topTeamId) : undefined;

        return (
          <div key={position.rank} className="group-position-row">
            <div className="group-position-rank">{position.rank}</div>
            <div className="group-position-content">
              {topTeamObj ? <TeamLabel team={topTeamObj} /> : <span>{topTeam?.label}</span>}
              {position.teams.slice(0, 3).map((team) => (
                <ConsensusBar key={team.label} item={team} maxCount={maxCount} />
              ))}
            </div>
          </div>
        );
      })}

      {modalTeams.length > 0 && (
        <p className="stats-modal-order">
          Most common order:{' '}
          {modalTeams.map((team, idx) => (
            <span key={team!.id}>
              {idx > 0 ? ' · ' : ''}
              <TeamLabel team={team!} />
            </span>
          ))}{' '}
          ({group.modalCount} picks)
        </p>
      )}
    </article>
  );
}
