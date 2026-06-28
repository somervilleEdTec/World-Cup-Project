import { describe, expect, it } from 'vitest';
import {
  OFFICIAL_KNOCKOUT_FIXTURE_IDS,
  OFFICIAL_KNOCKOUT_FIXTURE_ORIENTATIONS
} from '../data/officialKnockoutFixtureOrientations';
import { KNOCKOUT_STAGE_KICKOFFS } from '../data/knockoutStageKickoffs';
import { KNOCKOUT_TEMPLATES } from '../lib/bracketEngine';
import {
  compareKnockoutOrientation,
  formatKnockoutOrientationLabel
} from '../lib/knockoutFixtureOrientations';

describe('knockout fixture home/away orientations', () => {
  it('defines official FIFA orientations for all 32 knockout fixtures', () => {
    expect(OFFICIAL_KNOCKOUT_FIXTURE_IDS).toHaveLength(32);
    expect(Object.keys(KNOCKOUT_STAGE_KICKOFFS)).toHaveLength(32);
    for (const id of Object.keys(KNOCKOUT_STAGE_KICKOFFS)) {
      expect(OFFICIAL_KNOCKOUT_FIXTURE_ORIENTATIONS[id], `missing orientation for ${id}`).toBeTruthy();
    }
  });

  it('matches bracketEngine templates for every knockout fixture', () => {
    expect(KNOCKOUT_TEMPLATES).toHaveLength(32);
    for (const template of KNOCKOUT_TEMPLATES) {
      const official = OFFICIAL_KNOCKOUT_FIXTURE_ORIENTATIONS[template.id];
      expect(official, `missing official orientation for ${template.id}`).toBeTruthy();
      expect(template.home).toEqual(official.home);
      expect(template.away).toEqual(official.away);
    }
  });

  it('uses unique FIFA match numbers 73 through 104', () => {
    const numbers = OFFICIAL_KNOCKOUT_FIXTURE_IDS.map(
      (id) => OFFICIAL_KNOCKOUT_FIXTURE_ORIENTATIONS[id]!.fifaMatchNumber
    );
    expect(numbers.sort((a, b) => a - b)).toEqual(
      Array.from({ length: 32 }, (_, index) => 73 + index)
    );
  });

  it('keeps R32 first-listed FIFA slot on the home side', () => {
    expect(OFFICIAL_KNOCKOUT_FIXTURE_ORIENTATIONS['r32-1']).toMatchObject({
      home: { kind: 'pos', group: 'A', position: 2 },
      away: { kind: 'pos', group: 'B', position: 2 }
    });
    expect(OFFICIAL_KNOCKOUT_FIXTURE_ORIENTATIONS['r32-14']).toMatchObject({
      home: { kind: 'pos', group: 'J', position: 1 },
      away: { kind: 'pos', group: 'H', position: 2 }
    });
  });

  it('keeps later rounds on winner-of-first-feeder = home convention', () => {
    expect(OFFICIAL_KNOCKOUT_FIXTURE_ORIENTATIONS['r16-2']).toMatchObject({
      home: { kind: 'winner', matchId: 'r32-1' },
      away: { kind: 'winner', matchId: 'r32-3' }
    });
    expect(OFFICIAL_KNOCKOUT_FIXTURE_ORIENTATIONS.final).toMatchObject({
      home: { kind: 'winner', matchId: 'sf-1' },
      away: { kind: 'winner', matchId: 'sf-2' }
    });
    expect(OFFICIAL_KNOCKOUT_FIXTURE_ORIENTATIONS['third-place']).toMatchObject({
      home: { kind: 'loser', matchId: 'sf-1' },
      away: { kind: 'loser', matchId: 'sf-2' }
    });
  });
});

describe('compareKnockoutOrientation', () => {
  it('detects direct, swapped, and mismatched provider orientations', () => {
    expect(
      compareKnockoutOrientation(
        { homeTeamId: 'mexico', awayTeamId: 'canada' },
        'mexico',
        'canada'
      ).status
    ).toBe('ok');
    expect(
      compareKnockoutOrientation(
        { homeTeamId: 'mexico', awayTeamId: 'canada' },
        'canada',
        'mexico'
      ).status
    ).toBe('swapped');
    expect(
      compareKnockoutOrientation(
        { homeTeamId: 'mexico', awayTeamId: 'canada' },
        'brazil',
        'japan'
      ).status
    ).toBe('mismatch');
    expect(
      compareKnockoutOrientation({ homeTeamId: 'mexico', awayTeamId: 'tbd' }, 'mexico', 'canada')
        .status
    ).toBe('incomplete');
  });

  it('formats readable home/away labels', () => {
    expect(formatKnockoutOrientationLabel('mexico', 'canada')).toBe('Mexico vs Canada');
  });
});
