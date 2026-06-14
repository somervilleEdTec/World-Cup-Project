import { describe, expect, it } from 'vitest';
import { teams } from '../data/tournament';
import { formatFixtureOptionLabel, formatFixtureStageLabel } from '../lib/fixtureLabels';

describe('fixtureLabels', () => {
  it('labels group fixtures with group letter', () => {
    expect(formatFixtureStageLabel('GROUP', 'A')).toBe('Group A');
    expect(formatFixtureStageLabel('GROUP')).toBe('Group stage');
  });

  it('labels knockout stages with friendly names', () => {
    expect(formatFixtureStageLabel('R32')).toBe('Round of 32');
    expect(formatFixtureStageLabel('FINAL')).toBe('Final');
  });

  it('formats full fixture option text', () => {
    const mexico = teams.find((team) => team.id === 'mexico')!;
    const southAfrica = teams.find((team) => team.id === 'south-africa')!;
    const label = formatFixtureOptionLabel(
      {
        id: 'g-a-1',
        stage: 'GROUP',
        group: 'A',
        kickoff: '2026-06-11T19:00:00.000Z',
        homeTeamId: mexico.id,
        awayTeamId: southAfrica.id
      },
      teams,
      { includeKickoff: false }
    );
    expect(label).toBe('Group A — Mexico vs South Africa');
  });
});
