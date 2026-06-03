import { useEffect, useState } from 'react';
import { fetchLeaderboard, userFacingError } from '../services/apiClient';
import { LeaderboardEntry } from '../types';

export function LeagueTablePage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard()
      .then((response) => setEntries(response as LeaderboardEntry[]))
      .catch((err) => setError(userFacingError(err, 'Unable to load leaderboard')));
  }, []);

  return (
    <section className="card">
      <h2>League Table</h2>
      {error && <p className="warning">{error}</p>}
      <table className="league-table-page">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Correct Results</th>
            <th>Exact Scores</th>
            <th>Group Position</th>
            <th>Bonus Points</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={entry.userId}>
              <td>{index + 1}</td>
              <td>{entry.name}</td>
              <td>{entry.correctResultPoints}</td>
              <td>{entry.exactScorePoints}</td>
              <td>{entry.groupPositionPoints}</td>
              <td>{entry.bonusPoints}</td>
              <td className="league-total">{entry.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
