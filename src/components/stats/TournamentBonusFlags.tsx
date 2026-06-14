import { teams } from '../../data/tournament';
import { TournamentBonusPick } from '../../types';
import { CountryFlag } from '../CountryFlag';

interface TournamentBonusFlagsProps {
  bonus?: TournamentBonusPick;
  revealNames: boolean;
}

const SLOT_LABELS = ['1st', '2nd', '3rd', '4th'] as const;

export function TournamentBonusFlags({ bonus, revealNames }: TournamentBonusFlagsProps) {
  if (!revealNames || !bonus) return null;

  const teamIds = [
    bonus.winnerTeamId,
    bonus.runnerUpTeamId,
    bonus.thirdTeamId,
    bonus.fourthTeamId
  ];
  if (teamIds.some((teamId) => !teamId)) return null;

  return (
    <span className="head-to-head-bonus-flags" aria-label="Tournament podium picks">
      {teamIds.map((teamId, index) => {
        const team = teams.find((entry) => entry.id === teamId);
        if (!team) return null;
        const slot = SLOT_LABELS[index];
        return (
          <CountryFlag
            key={`${slot}-${teamId}`}
            countryCode={team.countryCode}
            title={`${slot}: ${team.name}`}
            className={`head-to-head-bonus-flag head-to-head-bonus-flag-${index + 1}`}
          />
        );
      })}
    </span>
  );
}
