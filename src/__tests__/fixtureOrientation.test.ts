import { describe, expect, it } from 'vitest';
import { normalizeScoresToInternalFixture } from '../lib/fixtureOrientation';

describe('normalizeScoresToInternalFixture', () => {
  it('keeps scores when provider home/away matches internal fixture', () => {
    const normalized = normalizeScoresToInternalFixture(
      'mexico',
      'south-africa',
      'Mexico',
      'South Africa',
      2,
      1,
      'home'
    );
    expect(normalized).toEqual({
      homeScore: 2,
      awayScore: 1,
      progressingTeamHint: 'home'
    });
  });

  it('transposes scores when provider home/away is reversed', () => {
    const normalized = normalizeScoresToInternalFixture(
      'czechia',
      'south-africa',
      'South Africa',
      'Czechia',
      1,
      2,
      'away'
    );
    expect(normalized).toEqual({
      homeScore: 2,
      awayScore: 1,
      progressingTeamHint: 'home'
    });
  });
});
