import { useMemo } from 'react';
import { teams } from '../../data/tournament';
import { BONUS_SLOT_LABELS, BONUS_SLOT_TEAM_KEYS } from '../../lib/overallPicks';
import { OverallPicksEntry } from '../../types';
import { TeamLabel } from '../TeamLabel';

interface OverallPicksConsensusProps {
  entries: OverallPicksEntry[];
  revealNames: boolean;
}

interface TeamGroup {
  teamId: string;
  count: number;
  pct: number;
  players: string[];
}

function buildSlotGroups(
  entries: OverallPicksEntry[],
  slotKey: (typeof BONUS_SLOT_TEAM_KEYS)[number]
): TeamGroup[] {
  const visible = entries.filter((entry) => !entry.hidden && entry.bonus?.[slotKey]);
  const total = visible.length;
  const byTeam = new Map<string, { count: number; players: string[] }>();

  for (const entry of visible) {
    const teamId = entry.bonus![slotKey];
    const existing = byTeam.get(teamId);
    if (existing) {
      existing.count += 1;
      existing.players.push(entry.name);
    } else {
      byTeam.set(teamId, { count: 1, players: [entry.name] });
    }
  }

  return [...byTeam.entries()]
    .map(([teamId, { count, players }]) => ({
      teamId,
      count,
      pct: total ? Math.round((count / total) * 100) : 0,
      players: players.sort((a, b) => a.localeCompare(b))
    }))
    .sort((a, b) => b.count - a.count || a.teamId.localeCompare(b.teamId));
}

const SLOT_TITLES = ['Champion', 'Runner-up', 'Third place', 'Fourth place'] as const;

export function OverallPicksConsensus({ entries, revealNames }: OverallPicksConsensusProps) {
  const columns = useMemo(
    () =>
      BONUS_SLOT_TEAM_KEYS.map((key, index) => ({
        key,
        title: SLOT_TITLES[index],
        shortLabel: BONUS_SLOT_LABELS[index],
        groups: buildSlotGroups(entries, key)
      })),
    [entries]
  );

  return (
    <div className="tournament-outlook-grid overall-consensus-grid">
      {columns.map((column) => (
        <section key={column.key} className="tournament-outlook-column overall-consensus-column">
          <h4>{column.title}</h4>
          {column.groups.length === 0 ? (
            <p className="overall-consensus-empty">No picks yet</p>
          ) : (
            <ul className="overall-consensus-list">
              {column.groups.map((group) => {
                const team = teams.find((entry) => entry.id === group.teamId);
                return (
                  <li key={group.teamId} className="overall-consensus-item">
                    <div className="overall-consensus-team">
                      {revealNames && team ? (
                        <TeamLabel team={team} />
                      ) : (
                        <span className="overall-pick-hidden">Hidden</span>
                      )}
                      <span className="overall-consensus-meta">
                        {group.count} ({group.pct}%)
                      </span>
                    </div>
                    {revealNames && (
                      <p className="overall-consensus-players">{group.players.join(', ')}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
