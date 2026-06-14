import { teams } from '../data/tournament';
import { GroupRow } from '../lib/groupStandings';
import { TeamLabel } from './TeamLabel';

export function GroupStandingsTable({ standings }: { standings: GroupRow[] }) {
  return (
    <div className="comparison-table-wrap">
      <table className="comparison-table league-table">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Team</th>
            <th>GP</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, index) => {
            const team = teams.find((entry) => entry.id === row.teamId);
            return (
              <tr key={row.teamId}>
                <td>{index + 1}</td>
                <td>{team ? <TeamLabel team={team} /> : row.teamId}</td>
                <td>{row.gp}</td>
                <td>{row.w}</td>
                <td>{row.d}</td>
                <td>{row.l}</td>
                <td>{row.pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
