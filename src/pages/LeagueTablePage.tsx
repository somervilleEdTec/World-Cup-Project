import { useEffect, useId, useState } from 'react';
import { fetchLeaderboard, userFacingError } from '../services/apiClient';
import { LeaderboardEntry, LeaderboardResponse } from '../types';

function ScoringInfoPanel() {
  return (
    <div className="league-table-scoring-panel">
      <h4>Match points</h4>
      <ul>
        <li>Correct win/draw/loss: +2 points</li>
        <li>Exact score bonus: +4 additional points (6 total when exact)</li>
      </ul>
      <h4>Knockout match points</h4>
      <ul>
        <li>
          <strong>Correct advancing team:</strong> +2 points. You must pick a team to advance if FT
          score is a draw.
        </li>
        <li>
          <strong>Exact score bonus:</strong> +4 additional points when your predicted 90-minute
          scoreline matches the official result.
        </li>
        <li>Quarter-finals: 1.5× match points</li>
        <li>Semi-finals: 2× match points</li>
        <li>Final and third-place play-off: 3× match points</li>
      </ul>
      <h4>Group standings bonus</h4>
      <p>+1 point for each team you place in the exact correct finishing position within its group.</p>
      <h4>Tournament predictions</h4>
      <ul>
        <li>Champion: +6</li>
        <li>Runner-up: +5</li>
        <li>Third place: +4</li>
        <li>Fourth place: +3</li>
      </ul>
      <p>
        CR and ES columns show how many matches you got right (used for tie-breakers), not the
        points earned from those matches.
      </p>
    </div>
  );
}

const LEGEND_ROWS = [
  { acronym: 'Pts', meaning: 'Points (total)', shows: 'Total score' },
  {
    acronym: 'CR',
    meaning: 'Correct Results',
    shows: 'Number of matches where you picked the correct outcome (win/draw/loss)'
  },
  {
    acronym: 'ES',
    meaning: 'Exact Scores',
    shows: 'Number of matches where you picked the exact scoreline'
  },
  {
    acronym: 'GP',
    meaning: 'Group Positions',
    shows: 'Number of teams you placed in the exact correct group finishing position'
  },
  {
    acronym: 'TP',
    meaning: 'Tournament Points',
    shows: 'Points earned from tournament outcome picks (Champion +6, Runner-up +5, etc.) — not a count'
  }
] as const;

export function LeagueTablePage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [coinFlipNote, setCoinFlipNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showScoringInfo, setShowScoringInfo] = useState(false);
  const scoringPanelId = useId();

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

      <p className="league-table-prizes" aria-label="League prizes">
        <strong>Prizes:</strong>{' '}
        <span className="league-prize-first">1st £50</span>
        {' · '}
        <span className="league-prize-second">2nd £20</span>
      </p>

      <table className="league-table-page">
        <thead>
          <tr>
            <th>Pos</th>
            <th className="league-col-player">Player</th>
            <th className="league-total" title="Points (total)">
              Pts
            </th>
            <th title="Correct Results — number of matches with correct outcome">CR</th>
            <th title="Exact Scores — number of matches with exact scoreline">ES</th>
            <th title="Group Positions — exact group finishing positions">GP</th>
            <th title="Tournament Points — points from tournament outcome picks">TP</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.userId}
              className={
                entry.rank === 1
                  ? 'league-row-first'
                  : entry.rank === 2
                    ? 'league-row-second'
                    : undefined
              }
            >
              <td>{entry.rank}</td>
              <td className="league-col-player">{entry.name}</td>
              <td className="league-total">{entry.points}</td>
              <td>{entry.correctResults}</td>
              <td>{entry.exactScores}</td>
              <td>{entry.groupPositionPoints}</td>
              <td>{entry.bonusPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="league-table-legend">
        <div className="league-table-legend-header">
          <strong>Column key</strong>
          <button
            type="button"
            className="league-table-info-btn"
            aria-label="How points are calculated"
            aria-expanded={showScoringInfo}
            aria-controls={scoringPanelId}
            onClick={() => setShowScoringInfo((open) => !open)}
          >
            i
          </button>
        </div>
        <table className="league-table-legend-table">
          <thead>
            <tr>
              <th>Acronym</th>
              <th>Meaning</th>
              <th>Column shows</th>
            </tr>
          </thead>
          <tbody>
            {LEGEND_ROWS.map((row) => (
              <tr key={row.acronym}>
                <td>
                  <strong>{row.acronym}</strong>
                </td>
                <td>{row.meaning}</td>
                <td>{row.shows}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="league-table-legend-note">
          CR and ES show how many matches you got right, not the points earned. TP shows points
          earned.
        </p>
        {showScoringInfo && (
          <div id={scoringPanelId}>
            <ScoringInfoPanel />
          </div>
        )}
      </div>
    </section>
  );
}
