import { Match, Team } from '../types';

export const FIRST_MATCH_KICKOFF = '2026-06-11T19:00:00Z';

export const teams: Team[] = [
  { id: 'mex', name: 'Mexico', flag: '🇲🇽', group: 'A' },
  { id: 'rsa', name: 'South Africa', flag: '🇿🇦', group: 'A' },
  { id: 'kor', name: 'South Korea', flag: '🇰🇷', group: 'A' },
  { id: 'cze', name: 'Czechia', flag: '🇨🇿', group: 'A' },
  { id: 'can', name: 'Canada', flag: '🇨🇦', group: 'B' },
  { id: 'bih', name: 'Bosnia and Herzegovina', flag: '🇧🇦', group: 'B' },
  { id: 'qat', name: 'Qatar', flag: '🇶🇦', group: 'B' },
  { id: 'sui', name: 'Switzerland', flag: '🇨🇭', group: 'B' }
];

export const matches: Match[] = [
  { id: 'g-a-1', stage: 'GROUP', group: 'A', kickoff: '2026-06-11T19:00:00Z', homeTeamId: 'mex', awayTeamId: 'rsa' },
  { id: 'g-a-2', stage: 'GROUP', group: 'A', kickoff: '2026-06-11T22:00:00Z', homeTeamId: 'kor', awayTeamId: 'cze' },
  { id: 'g-a-3', stage: 'GROUP', group: 'A', kickoff: '2026-06-15T18:00:00Z', homeTeamId: 'mex', awayTeamId: 'kor' },
  { id: 'g-a-4', stage: 'GROUP', group: 'A', kickoff: '2026-06-15T21:00:00Z', homeTeamId: 'rsa', awayTeamId: 'cze' },
  { id: 'g-b-1', stage: 'GROUP', group: 'B', kickoff: '2026-06-12T18:00:00Z', homeTeamId: 'can', awayTeamId: 'bih' },
  { id: 'g-b-2', stage: 'GROUP', group: 'B', kickoff: '2026-06-12T21:00:00Z', homeTeamId: 'qat', awayTeamId: 'sui' },
  { id: 'r32-1', stage: 'R32', kickoff: '2026-06-28T16:00:00Z', homeTeamId: 'mex', awayTeamId: 'sui' },
  { id: 'qf-1', stage: 'QF', kickoff: '2026-07-05T16:00:00Z', homeTeamId: 'mex', awayTeamId: 'can' },
  { id: 'sf-1', stage: 'SF', kickoff: '2026-07-10T16:00:00Z', homeTeamId: 'mex', awayTeamId: 'can' },
  { id: 'third-1', stage: 'THIRD_PLACE', kickoff: '2026-07-18T16:00:00Z', homeTeamId: 'mex', awayTeamId: 'can' },
  { id: 'final-1', stage: 'FINAL', kickoff: '2026-07-19T18:00:00Z', homeTeamId: 'mex', awayTeamId: 'can' }
];
