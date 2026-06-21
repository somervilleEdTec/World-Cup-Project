import { MatchDiscipline } from '../types';

/**
 * Optional static discipline snapshot for group matches (free tier — no paid card API).
 * DB/admin overrides take precedence. Update after matchdays from public FIFA reports.
 */
export const WORLD_CUP_DISCIPLINE_SNAPSHOT: Readonly<Record<string, MatchDiscipline>> = {
  // Group H MD1: Saudi Arabia 1–1 Uruguay — Saudi −1 fair play (one yellow).
  'g-h-2': {
    home: { yellowCards: 1, secondYellowReds: 0, directReds: 0 },
    away: { yellowCards: 0, secondYellowReds: 0, directReds: 0 }
  }
};
