import { teams } from '../../data/tournament';
import {
  BONUS_SLOT_LABELS,
  BONUS_SLOT_TEAM_KEYS,
  isCorrectBonusPick
} from '../../lib/overallPicks';
import { OverallPicksEntry, TournamentBonusPick } from '../../types';
import { CountryFlag } from '../CountryFlag';

interface OverallPicksMatrixProps {
  entries: OverallPicksEntry[];
  actualPlacings?: TournamentBonusPick;
  revealNames: boolean;
}

function PickCell({
  teamId,
  slotIndex,
  hidden,
  revealNames,
  actualPlacings
}: {
  teamId?: string;
  slotIndex: number;
  hidden: boolean;
  revealNames: boolean;
  actualPlacings?: TournamentBonusPick;
}) {
  if (hidden) {
    return <span className="overall-pick-hidden">—</span>;
  }
  if (!teamId) {
    return <span className="overall-pick-missing">—</span>;
  }
  const team = teams.find((entry) => entry.id === teamId);
  if (!team || !revealNames) {
    return <span className="overall-pick-hidden">?</span>;
  }
  const correct = isCorrectBonusPick(slotIndex, teamId, actualPlacings);
  return (
    <CountryFlag
      countryCode={team.countryCode}
      title={`${BONUS_SLOT_LABELS[slotIndex]}: ${team.name}`}
      className={`overall-pick-flag${correct ? ' overall-pick-correct' : ''}`}
    />
  );
}

export function OverallPicksMatrix({ entries, actualPlacings, revealNames }: OverallPicksMatrixProps) {
  return (
    <div className="overall-picks-matrix-wrap">
      <table className="overall-picks-matrix league-table">
        <thead>
          <tr>
            <th scope="col" className="overall-col-rank">
              <span className="overall-col-rank-short" aria-hidden="true">
                #
              </span>
            </th>
            <th scope="col" className="overall-col-player">
              Player
            </th>
            {BONUS_SLOT_LABELS.map((label) => (
              <th key={label} scope="col" className="overall-col-pick">
                <span className="overall-slot-label-full">{label}</span>
                <span className="overall-slot-label-short" aria-hidden="true">
                  {label.charAt(0)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.userId}
              className={entry.isCurrentUser ? 'comparison-row-you' : undefined}
            >
              <td className="overall-col-rank">{entry.rank}</td>
              <td className="overall-col-player" title={entry.name}>
                {entry.name}
                {entry.isCurrentUser ? ' (you)' : ''}
              </td>
              {BONUS_SLOT_TEAM_KEYS.map((key, slotIndex) => (
                <td key={key} className="overall-col-pick">
                  <PickCell
                    teamId={entry.bonus?.[key]}
                    slotIndex={slotIndex}
                    hidden={entry.hidden}
                    revealNames={revealNames}
                    actualPlacings={actualPlacings}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
