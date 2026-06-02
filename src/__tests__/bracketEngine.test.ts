import { describe, expect, it } from 'vitest';
import {
  buildKnockoutMatches,
  deriveFinalPlacings,
  rankThirdPlaceTeams,
  resolveThirdPlaceTeam,
  thirdPlaceCombinationKey
} from '../lib/bracketEngine';
import { groupMatches } from '../data/tournament';
import { Pick } from '../types';

function groupPicks(group: string, scores: Array<[number, number]>): Record<string, Pick> {
  const ids = groupMatches.filter((m) => m.group === group).map((m) => m.id);
  const picks: Record<string, Pick> = {};
  ids.forEach((id, idx) => {
    const [homeScore, awayScore] = scores[idx] ?? [1, 0];
    picks[id] = { matchId: id, homeScore, awayScore };
  });
  return picks;
}

function allGroupPicks(overrides: Partial<Record<string, Array<[number, number]>>> = {}): Record<string, Pick> {
  const groups = 'ABCDEFGHIJKL'.split('');
  return groups.reduce<Record<string, Pick>>((acc, group) => {
    const defaults: Array<[number, number]> = [
      [3, 0],
      [2, 0],
      [1, 0],
      [1, 0],
      [2, 1],
      [0, 1]
    ];
    return { ...acc, ...groupPicks(group, overrides[group] ?? defaults) };
  }, {});
}

describe('bracketEngine', () => {
  it('ranks eight third-place teams and resolves FIFA mapping key', () => {
    const picks = allGroupPicks();
    const ranked = rankThirdPlaceTeams(picks);
    expect(ranked).toHaveLength(12);
    const topEight = ranked.slice(0, 8);
    expect(topEight).toHaveLength(8);
    const key = thirdPlaceCombinationKey(topEight);
    expect(key).toHaveLength(8);
    expect(resolveThirdPlaceTeam('1A', picks)).toBeTruthy();
  });

  it('builds R32 fixtures from group picks without placeholder teams', () => {
    const picks = allGroupPicks();
    const ko = buildKnockoutMatches(picks);
    expect(ko).toHaveLength(32);
    const r32 = ko.filter((m) => m.stage === 'R32');
    expect(r32).toHaveLength(16);
    r32.forEach((match) => {
      expect(match.homeTeamId).not.toBe('tbd');
      expect(match.awayTeamId).not.toBe('tbd');
      expect(match.homeTeamId).not.toEqual(match.awayTeamId);
    });
  });

  it('derives final placings from knockout results', () => {
    const picks = allGroupPicks();
    const ko = buildKnockoutMatches(picks);

    const actuals: Record<string, { matchId: string; homeScore: number; awayScore: number; progressingTeamId?: string }> =
      {};
    ko.forEach((match) => {
      actuals[match.id] = {
        matchId: match.id,
        homeScore: 2,
        awayScore: 0,
        progressingTeamId: match.homeTeamId
      };
    });

    const placings = deriveFinalPlacings({ ...picks, ...Object.fromEntries(
      Object.entries(actuals).map(([id, a]) => [id, { matchId: id, homeScore: a.homeScore, awayScore: a.awayScore, progressingTeamId: a.progressingTeamId }])
    ) }, actuals);

    expect(placings?.winnerTeamId).toBeTruthy();
    expect(placings?.runnerUpTeamId).toBeTruthy();
    expect(placings?.thirdTeamId).toBeTruthy();
    expect(placings?.fourthTeamId).toBeTruthy();
  });
});
