import { useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { computeScore } from '../lib/tournamentLogic';
import { ActualResult, TournamentBonusPick } from '../types';

const mockResults: Record<string, ActualResult> = {};
const finalPlacings: TournamentBonusPick = {
  winnerTeamId: 'mex',
  runnerUpTeamId: 'can',
  thirdTeamId: 'sui',
  fourthTeamId: 'kor'
};

export function LeagueTablePage(): JSX.Element {
  const committedPicks = useAppStore((state) => state.committedPicks);
  const bonusCommitted = useAppStore((state) => state.bonusCommitted);

  const summary = useMemo(
    () => computeScore(committedPicks, mockResults, bonusCommitted, finalPlacings),
    [committedPicks, bonusCommitted]
  );

  return (
    <section className="card">
      <h2>League Table</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Points</th>
            <th>Exact Scores</th>
            <th>Correct Results</th>
            <th>Exact Group Positions</th>
            <th>Bonus Hits</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>You</td>
            <td>{summary.points}</td>
            <td>{summary.exactScores}</td>
            <td>{summary.correctResults}</td>
            <td>{summary.exactGroupPositions}</td>
            <td>{summary.bonusHits}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
