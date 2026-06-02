import { teams } from '../data/tournament';
import { ActualResult, Pick } from '../types';

export function formatFixtureScore(
  homeScore: number,
  awayScore: number,
  progressingTeamId?: string
): string {
  if (homeScore === awayScore && progressingTeamId) {
    const team = teams.find((t) => t.id === progressingTeamId);
    return `${homeScore}–${awayScore} (${team?.name ?? progressingTeamId} advances)`;
  }
  return `${homeScore}–${awayScore}`;
}

export function FixtureScoreSummary({
  pick,
  actual
}: {
  pick?: Pick;
  actual?: ActualResult;
}) {
  return (
    <div className="fixture-scores-summary">
      <p>
        <strong>Your prediction:</strong>{' '}
        {pick
          ? formatFixtureScore(pick.homeScore, pick.awayScore, pick.progressingTeamId)
          : '—'}
      </p>
      {actual && (
        <p className="fixture-actual">
          <strong>Official result:</strong>{' '}
          {formatFixtureScore(actual.homeScore, actual.awayScore, actual.progressingTeamId)}
        </p>
      )}
    </div>
  );
}
