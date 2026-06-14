import { teams } from '../../data/tournament';
import { TeamLabel } from '../TeamLabel';

interface StatsTeamNameProps {
  teamId?: string;
  label: string;
  revealNames: boolean;
}

export function StatsTeamName({ teamId, label, revealNames }: StatsTeamNameProps) {
  if (!revealNames) {
    return <span className="mini-standings-team">{label}</span>;
  }

  const team = teamId ? teams.find((t) => t.id === teamId) : teams.find((t) => t.name === label);
  if (team) {
    return (
      <span className="mini-standings-team">
        <TeamLabel team={team} />
      </span>
    );
  }

  return <span className="mini-standings-team">{label}</span>;
}
