import { groupMatches } from '../data/tournament';
import { getKickoffOverrides } from './kickoffOverrides';
import { ActualResult, Match, Pick } from '../types';
import { buildKnockoutMatches } from './bracketEngine';
import { picksFromActuals } from './pickUtils';

function withKickoffOverride(match: Match): Match {
  const kickoff = getKickoffOverrides()[match.id] ?? match.kickoff;
  return kickoff === match.kickoff ? match : { ...match, kickoff };
}

export function getMatches(
  picks: Record<string, Pick> = {},
  actuals: Record<string, ActualResult> = {}
): Match[] {
  const mergedPicks = { ...picks, ...picksFromActuals(actuals) };
  const knockout = buildKnockoutMatches(mergedPicks, actuals).map(withKickoffOverride);
  const groups = groupMatches.map(withKickoffOverride);
  return [...groups, ...knockout];
}
