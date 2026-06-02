import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../services/apiClient';
import { LeaderboardEntry } from '../types';

export function LeagueTablePage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard()
      .then((response) => setEntries(response as LeaderboardEntry[]))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load leaderboard'));
  }, []);

  return (
    <section className="card">
      <h2>League Table</h2>
      {error && <p className="warning">{error}</p>}
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
          {entries.map((entry, index) => (
            <tr key={entry.userId}>
              <td>{index + 1}</td>
              <td>{entry.name}</td>
              <td>{entry.points}</td>
              <td>{entry.exactScores}</td>
              <td>{entry.correctResults}</td>
              <td>{entry.exactGroupPositions}</td>
              <td>{entry.bonusHits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
