import { teams } from '../../data/tournament';
import {
  BONUS_SLOT_LABELS,
  BONUS_SLOT_TEAM_KEYS,
  isCorrectBonusPick
} from '../../lib/overallPicks';
import { OverallPicksEntry, TournamentBonusPick } from '../../types';
import { CountryFlag } from '../CountryFlag';

interface OverallPicksPodiumCardsProps {
  entries: OverallPicksEntry[];
  actualPlacings?: TournamentBonusPick;
  revealNames: boolean;
}

const PODIUM_HEIGHTS = ['tall', 'medium', 'short', 'short'] as const;

export function OverallPicksPodiumCards({
  entries,
  actualPlacings,
  revealNames
}: OverallPicksPodiumCardsProps) {
  return (
    <div className="overall-podium-cards">
      {entries.map((entry) => (
        <article
          key={entry.userId}
          className={`overall-podium-card${entry.isCurrentUser ? ' overall-podium-card-you' : ''}`}
        >
          <header className="overall-podium-card-header">
            <span className="overall-podium-card-rank">#{entry.rank}</span>
            <span className="overall-podium-card-name">
              {entry.name}
              {entry.isCurrentUser ? ' (you)' : ''}
            </span>
          </header>
          {entry.hidden ? (
            <p className="overall-pick-hidden-note">Hidden until lock</p>
          ) : (
            <div className="podium-steps overall-podium-steps">
              {BONUS_SLOT_TEAM_KEYS.map((key, slotIndex) => {
                const teamId = entry.bonus?.[key];
                const team = teamId ? teams.find((t) => t.id === teamId) : undefined;
                const correct =
                  teamId && isCorrectBonusPick(slotIndex, teamId, actualPlacings);
                return (
                  <div
                    key={key}
                    className={`podium-step podium-step-${PODIUM_HEIGHTS[slotIndex]}`}
                  >
                    <span className="overall-podium-slot-label">{BONUS_SLOT_LABELS[slotIndex]}</span>
                    <span className="overall-podium-flag-wrap">
                      {revealNames && team ? (
                        <CountryFlag
                          countryCode={team.countryCode}
                          title={`${BONUS_SLOT_LABELS[slotIndex]}: ${team.name}`}
                          className={`overall-podium-flag${correct ? ' overall-pick-correct' : ''}`}
                        />
                      ) : (
                        <span className="overall-pick-hidden">?</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
