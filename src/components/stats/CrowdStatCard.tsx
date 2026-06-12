import { teams } from '../../data/tournament';
import { TeamLabel } from '../TeamLabel';
import { StatHeroCard } from './StatHeroCard';
import { ConsensusBar } from './ConsensusBar';
import { ResultDonut } from './ResultDonut';
import { CrowdStatCard as CrowdStatCardType } from '../../types';
import { formatFixtureStageLabel } from '../../lib/fixtureLabels';

interface CrowdStatCardProps {
  card: CrowdStatCardType;
  revealNames: boolean;
}

function MatchCard({ card, revealNames }: { card: Extract<CrowdStatCardType, { kind: 'match' }>; revealNames: boolean }) {
  const maxCount = card.topScorelines[0]?.count ?? 1;
  const homeTeam = teams.find((t) => t.id === card.homeTeamId);
  const awayTeam = teams.find((t) => t.id === card.awayTeamId);

  return (
    <article className="card crowd-stat-card crowd-stat-card-match">
      <div className="stats-match-header">
        <div className="fixture-row">
          {revealNames && homeTeam ? <TeamLabel team={homeTeam} /> : <span>Home</span>}
          <strong>vs</strong>
          {revealNames && awayTeam ? <TeamLabel team={awayTeam} /> : <span>Away</span>}
        </div>
        <p className="kicker">
          {formatFixtureStageLabel(card.stage, card.group)} · {card.totalPicks} picks
        </p>
      </div>
      <div className="stats-match-body">
        <div className="stats-match-bars">
          {card.topScorelines.map((line) => (
            <ConsensusBar key={line.label} item={line} maxCount={maxCount} />
          ))}
        </div>
        <ResultDonut segments={card.resultSplit} />
      </div>
    </article>
  );
}

function GroupCard({ card }: { card: Extract<CrowdStatCardType, { kind: 'group' }> }) {
  const maxCount = card.topWinners[0]?.count ?? 1;

  return (
    <article className="card crowd-stat-card crowd-stat-card-group">
      <h4>Group {card.groupId}</h4>
      <p className="kicker">
        {card.modalCount} player{card.modalCount === 1 ? '' : 's'} predict the same full order (
        {card.modalPct}%)
      </p>
      <p className="kicker">{card.distinctWinners} different winner picks</p>
      {card.topWinners.map((team) => (
        <ConsensusBar key={team.label} item={team} maxCount={maxCount} />
      ))}
    </article>
  );
}

function OutlookCard({ card }: { card: Extract<CrowdStatCardType, { kind: 'outlook' }> }) {
  const maxCount = card.picks[0]?.count ?? 1;
  const label =
    card.slot === 'champion'
      ? 'Champion'
      : card.slot === 'runnerUp'
        ? 'Runner-up'
        : card.slot === 'third'
          ? 'Third place'
          : 'Fourth place';

  return (
    <article className="card crowd-stat-card crowd-stat-card-outlook">
      <h4>{label}</h4>
      {card.picks.map((pick) => (
        <ConsensusBar key={pick.label} item={pick} maxCount={maxCount} />
      ))}
    </article>
  );
}

export function CrowdStatCard({ card, revealNames }: CrowdStatCardProps) {
  switch (card.kind) {
    case 'hero':
      return (
        <div className="crowd-stat-card crowd-stat-card-hero">
          <StatHeroCard
            title={card.title}
            value={card.value}
            detail={card.detail}
            variant={card.variant}
          />
        </div>
      );
    case 'fact':
      return (
        <article className="card crowd-stat-card crowd-stat-card-fact">
          <div className="fun-fact-card">
            <span className="fun-fact-icon" aria-hidden="true">
              {card.icon}
            </span>
            <span>{card.text}</span>
          </div>
        </article>
      );
    case 'match':
      return <MatchCard card={card} revealNames={revealNames} />;
    case 'group':
      return <GroupCard card={card} />;
    case 'outlook':
      return <OutlookCard card={card} />;
    case 'spotlight':
      return (
        <article className="card crowd-stat-card crowd-stat-card-spotlight">
          <div className="fun-fact-card stats-dark-horse">
            <span className="fun-fact-icon" aria-hidden="true">
              {card.icon}
            </span>
            <span>{card.text}</span>
          </div>
        </article>
      );
    default:
      return null;
  }
}
