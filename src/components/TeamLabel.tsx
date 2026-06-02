import { Team } from '../types';

interface TeamLabelProps {
  team: Team;
}

export function TeamLabel({ team }: TeamLabelProps) {
  return (
    <span className="team-label" aria-label={`${team.name} ${team.flag}`}>
      <span className="team-flag">{team.flag}</span>
      <span>{team.name}</span>
    </span>
  );
}
