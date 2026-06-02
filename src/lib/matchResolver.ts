import { groupMatches } from '../data/tournament';
import { ActualResult, Match, Pick } from '../types';
import { buildKnockoutMatches } from './bracketEngine';
import { picksFromActuals } from './pickUtils';

export function getMatches(
  picks: Record<string, Pick> = {},
  actuals: Record<string, ActualResult> = {}
): Match[] {
  const mergedPicks = { ...picks, ...picksFromActuals(actuals) };
  return [...groupMatches, ...buildKnockoutMatches(mergedPicks, actuals)];
}
