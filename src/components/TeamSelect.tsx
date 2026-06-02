import { useEffect, useMemo, useRef, useState } from 'react';
import { teams as allTeams } from '../data/tournament';
import { Team } from '../types';
import { TeamLabel } from './TeamLabel';

const teamsAlphabetical = [...allTeams].sort((a, b) => a.name.localeCompare(b.name));

interface TeamSelectProps {
  name: string;
  value: string;
  onChange?: (teamId: string) => void;
  disabled?: boolean;
  label: string;
}

export function TeamSelect({ name, value, onChange, disabled = false, label }: TeamSelectProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedId(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const selectedTeam = useMemo(
    () => teamsAlphabetical.find((team) => team.id === selectedId) ?? teamsAlphabetical[0],
    [selectedId]
  );

  const choose = (team: Team) => {
    setSelectedId(team.id);
    onChange?.(team.id);
    setOpen(false);
  };

  return (
    <div className="team-select-field" ref={rootRef}>
      <span className="team-select-label">{label}</span>
      <input type="hidden" name={name} value={selectedId} />
      <button
        type="button"
        className="team-select-trigger"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
      >
        <TeamLabel team={selectedTeam} />
        <span className="team-select-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul className="team-select-menu" role="listbox" aria-label={label}>
          {teamsAlphabetical.map((team) => (
            <li key={team.id}>
              <button
                type="button"
                role="option"
                aria-selected={team.id === selectedId}
                className={team.id === selectedId ? 'team-select-option active' : 'team-select-option'}
                onClick={() => choose(team)}
              >
                <TeamLabel team={team} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { teamsAlphabetical };
