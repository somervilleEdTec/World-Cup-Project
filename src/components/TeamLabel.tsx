import { Team } from '../types';
import { CountryFlag } from './CountryFlag';

interface TeamLabelProps {
  team: Team;
}

export function TeamLabel({ team }: TeamLabelProps) {
  return (
    <span className="team-label" aria-label={team.name}>
      <CountryFlag countryCode={team.countryCode} title={team.name} />
      <span>{team.name}</span>
    </span>
  );
}
