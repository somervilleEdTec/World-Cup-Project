import { StatisticsResponse } from '../../types';
import { ConsensusBar } from './ConsensusBar';

interface TournamentOutlookProps {
  outlook: StatisticsResponse['tournamentOutlook'];
}

function OutlookColumn({
  title,
  picks
}: {
  title: string;
  picks: StatisticsResponse['tournamentOutlook']['champion'];
}) {
  const maxCount = picks[0]?.count ?? 1;

  return (
    <div className="tournament-outlook-column">
      <h4>{title}</h4>
      {picks.length === 0 ? (
        <p className="kicker">No picks yet</p>
      ) : (
        picks.slice(0, 4).map((pick) => (
          <ConsensusBar key={pick.label} item={pick} maxCount={maxCount} />
        ))
      )}
    </div>
  );
}

export function TournamentOutlook({ outlook }: TournamentOutlookProps) {
  if (!outlook.visible) {
    return (
      <article className="card stats-locked-notice">
        <h3>Tournament Outlook</h3>
        <p>Tournament winner and podium picks appear after the first match kickoff.</p>
      </article>
    );
  }

  return (
    <article className="card">
      <h3>Tournament Outlook</h3>
      {outlook.darkHorse && (
        <p className="stats-dark-horse">
          Dark horse champion: only <strong>{outlook.darkHorse.playerName}</strong> picked{' '}
          {outlook.champion.find((c) => c.count === 1)?.label ?? 'their team'} to win it all.
        </p>
      )}
      <div className="tournament-outlook-grid">
        <OutlookColumn title="Champion" picks={outlook.champion} />
        <OutlookColumn title="Runner-up" picks={outlook.runnerUp} />
        <OutlookColumn title="3rd place" picks={outlook.third} />
        <OutlookColumn title="4th place" picks={outlook.fourth} />
      </div>
    </article>
  );
}
