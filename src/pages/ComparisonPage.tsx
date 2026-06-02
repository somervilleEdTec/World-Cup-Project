import { useEffect, useState } from 'react';
import { matches, teams } from '../data/tournament';
import { TeamLabel } from '../components/TeamLabel';
import { fetchPredictionState } from '../services/apiClient';
import { Pick } from '../types';

export function ComparisonPage() {
  const [committedPicks, setCommittedPicks] = useState<Record<string, Pick>>({});

  useEffect(() => {
    fetchPredictionState()
      .then((state) => setCommittedPicks((state as { committedPicks: Record<string, Pick> }).committedPicks ?? {}))
      .catch(() => setCommittedPicks({}));
  }, []);

  const nowIso = new Date().toISOString();
  const nextMatch = matches
    .filter((match) => new Date(match.kickoff).getTime() > new Date(nowIso).getTime())
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())[0];

  if (!nextMatch) {
    return <section className="card">No upcoming matches.</section>;
  }

  const homeTeam = teams.find((team) => team.id === nextMatch.homeTeamId);
  const awayTeam = teams.find((team) => team.id === nextMatch.awayTeamId);
  const yourPick = committedPicks[nextMatch.id];

  return (
    <section className="card">
      <h2>Comparison</h2>
      <p>Next game:</p>
      <div className="fixture-row">
        {homeTeam && <TeamLabel team={homeTeam} />} <strong>vs</strong> {awayTeam && <TeamLabel team={awayTeam} />}
      </div>
      <p>Your committed pick: {yourPick ? `${yourPick.homeScore}-${yourPick.awayScore}` : 'No committed pick yet'}</p>
      <p>Other players’ committed picks appear here after lock (backend multi-user compare endpoint planned next).</p>
    </section>
  );
}
