import { useEffect, useState } from 'react';
import { fetchLeaderboard, userFacingError } from '../services/apiClient';
import { LeaderboardEntry, LeaderboardResponse } from '../types';

export function LeagueTablePage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [coinFlipNote, setCoinFlipNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard()
      .then((response: LeaderboardResponse) => {
        setEntries(response.entries);
        const cf = response.meta.coinFlip;
        if (cf.applied && cf.winnerName && (cf.tiedUserIds?.length ?? 0) > 1) {
          const lines = cf.outcomes?.map((o) => `${o.name}: ${o.outcome}`).join(' · ');
          setCoinFlipNote(
            `Tie on all tie-breakers resolved by virtual coin flip. Winner: ${cf.winnerName}.${lines ? ` (${lines})` : ''}`
          );
        } else {
          setCoinFlipNote(null);
        }
      })
      .catch((err) => setError(userFacingError(err, 'Unable to load leaderboard')));
  }, []);

  return (
    <section className="card">
      <h2>League Table</h2>
      {error && <p className="warning">{error}</p>}
      {coinFlipNote && <p className="kicker">{coinFlipNote}</p>}
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
          {entries.map((entry) => (
            <tr key={entry.userId}>
              <td>{entry.rank}</td>
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
