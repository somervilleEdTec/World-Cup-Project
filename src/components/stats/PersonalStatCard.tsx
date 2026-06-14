import { teams } from '../../data/tournament';
import { TeamLabel } from '../TeamLabel';
import { StatsTeamName } from './StatsTeamName';
import { formatFixtureStageLabel } from '../../lib/fixtureLabels';
import { CrowdStatCard as CrowdStatCardType } from '../../types';

interface PersonalStatCardProps {
  card: Extract<CrowdStatCardType, { visualType: 'personal' }>;
  revealNames: boolean;
}

function FixtureHeader({
  card,
  revealNames
}: {
  card: PersonalStatCardProps['card'];
  revealNames: boolean;
}) {
  if (!card.homeTeamId || !card.awayTeamId) return null;
  const homeTeam = teams.find((t) => t.id === card.homeTeamId);
  const awayTeam = teams.find((t) => t.id === card.awayTeamId);

  return (
    <>
      <div className="fixture-row">
        {revealNames && homeTeam ? <TeamLabel team={homeTeam} /> : <span>Home</span>}
        <strong>vs</strong>
        {revealNames && awayTeam ? <TeamLabel team={awayTeam} /> : <span>Away</span>}
      </div>
      {card.stage && <p className="kicker">{formatFixtureStageLabel(card.stage, card.group)}</p>}
    </>
  );
}

function LadderMoveBody({ card }: { card: PersonalStatCardProps['card'] }) {
  if (card.kind !== 'ladderMove' || card.beforeRank === undefined || card.afterRank === undefined) {
    return null;
  }
  const delta = card.delta ?? card.beforeRank - card.afterRank;
  const direction = delta > 0 ? 'up' : 'down';

  return (
    <div className="personal-ladder-move">
      <p className="personal-ladder-move-scoreline">
        {card.scoreline}{' '}
        {card.scorelinePct !== undefined && (
          <span className="ladder-swing-pct">({card.scorelinePct}% crowd pick)</span>
        )}
      </p>
      <div className="personal-ladder-move-you">
        <span className="personal-ladder-move-label">You</span>
        <span className="personal-ladder-move-ranks">
          #{card.beforeRank} → #{card.afterRank}
        </span>
        <span className={`ladder-swing-delta ${direction}`}>
          {delta > 0 ? `↑${delta}` : `↓${Math.abs(delta)}`}
        </span>
      </div>
    </div>
  );
}

function YouVsCrowdBody({ card }: { card: PersonalStatCardProps['card'] }) {
  if (card.kind !== 'youVsCrowd') return null;

  return (
    <div className="personal-you-vs-crowd">
      <div className="personal-pick-column personal-pick-column-you">
        <span className="personal-pick-heading">You</span>
        <span className="personal-pick-value">{card.yourPick}</span>
      </div>
      <div className="personal-scoreline-chips" aria-label="Crowd scoreline breakdown">
        {(card.scorelineBreakdown ?? []).map((entry) => {
          const isYou = entry.label === card.yourPick;
          return (
            <span
              key={entry.label}
              className={`personal-scoreline-chip${isYou ? ' personal-scoreline-chip-you' : ''}`}
            >
              {entry.label} · {entry.pct}%
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ContrarianBody({ card }: { card: PersonalStatCardProps['card'] }) {
  if (card.kind !== 'contrarian') return null;
  const width = Math.max(card.crowdPct ?? 0, 4);

  return (
    <div className="personal-contrarian">
      <p className="personal-contrarian-pick">Your pick: {card.yourPick}</p>
      <div className="consensus-bar-row">
        <div className="consensus-bar-track" aria-hidden="true">
          <div className="consensus-bar-fill" style={{ width: `${width}%` }} />
        </div>
        <span className="consensus-bar-meta">{card.crowdPct}% of players</span>
      </div>
    </div>
  );
}

function NearestRivalBody({ card }: { card: PersonalStatCardProps['card'] }) {
  if (card.kind !== 'nearestRival') return null;

  return (
    <ul className="head-to-head-rows">
      <li className="head-to-head-row personal-you-row">
        <span className="head-to-head-rank">#{card.yourRank}</span>
        <span className="head-to-head-name">You</span>
        <span className="head-to-head-pick">{card.yourPick}</span>
      </li>
      <li className="head-to-head-row">
        <span className="head-to-head-rank">#{card.rivalRank}</span>
        <span className="head-to-head-name">{card.rivalName}</span>
        <span className="head-to-head-pick">{card.rivalPick}</span>
      </li>
    </ul>
  );
}

function HiveMindBody({ card }: { card: PersonalStatCardProps['card'] }) {
  if (card.kind !== 'hiveMind') return null;
  const ringPct = Math.min(Math.max(card.hiveMindPct ?? 0, 1), 99);

  return (
    <div className="personal-hive-mind">
      <div
        className="personal-hive-ring"
        style={{ '--hive-pct': `${ringPct}%` } as Record<string, string>}
      >
        <span className="personal-hive-pct">{card.hiveMindPct}%</span>
      </div>
      <p className="personal-hive-detail">
        {card.matchCount} of {card.matchTotal} upcoming picks match the crowd favourite
      </p>
      <p className="kicker">League average: {card.leagueAvgPct}%</p>
    </div>
  );
}

function GroupDiffBody({
  card,
  revealNames
}: {
  card: PersonalStatCardProps['card'];
  revealNames: boolean;
}) {
  if (card.kind !== 'groupDiff') return null;

  return (
    <div className="personal-group-diff">
      <p className="kicker">
        {card.mismatchCount} position{card.mismatchCount === 1 ? '' : 's'} differ from the crowd
      </p>
      <div className="personal-group-diff-columns">
        <div>
          <p className="personal-group-diff-heading">You</p>
          <ol className="mini-standings-order-list">
            {(card.yourOrder ?? []).map((team, index) => (
              <li
                key={`you-${team}-${index}`}
                className={`mini-standings-order-row${
                  card.yourOrderTeamIds?.[index] !== card.crowdOrderTeamIds?.[index]
                    ? ' personal-group-mismatch'
                    : ''
                }`}
              >
                <span className="mini-standings-rank">#{index + 1}</span>
                <StatsTeamName
                  teamId={card.yourOrderTeamIds?.[index]}
                  label={team}
                  revealNames={revealNames}
                />
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className="personal-group-diff-heading">Crowd</p>
          <ol className="mini-standings-order-list">
            {(card.crowdOrder ?? []).map((team, index) => (
              <li key={`crowd-${team}-${index}`} className="mini-standings-order-row">
                <span className="mini-standings-rank">#{index + 1}</span>
                <StatsTeamName
                  teamId={card.crowdOrderTeamIds?.[index]}
                  label={team}
                  revealNames={revealNames}
                />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export function PersonalStatCard({ card, revealNames }: PersonalStatCardProps) {
  return (
    <article className="card crowd-stat-card crowd-stat-card-personal">
      <p className="crowd-stat-panel-kicker">{card.subtitle}</p>
      <FixtureHeader card={card} revealNames={revealNames} />
      {card.kind === 'ladderMove' && <LadderMoveBody card={card} />}
      {card.kind === 'youVsCrowd' && <YouVsCrowdBody card={card} />}
      {card.kind === 'contrarian' && <ContrarianBody card={card} />}
      {card.kind === 'nearestRival' && <NearestRivalBody card={card} />}
      {card.kind === 'hiveMind' && <HiveMindBody card={card} />}
      {card.kind === 'groupDiff' && (
        <>
          <h4>Group {card.groupId}</h4>
          <GroupDiffBody card={card} revealNames={revealNames} />
        </>
      )}
    </article>
  );
}
