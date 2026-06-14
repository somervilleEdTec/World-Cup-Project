import { teams } from '../../data/tournament';
import { TournamentBonusPick } from '../../types';
import { TeamLabel } from '../TeamLabel';
import { CrowdStatCard as CrowdStatCardType } from '../../types';
import { TournamentBonusFlags } from './TournamentBonusFlags';

interface HeadToHeadCardProps {
  card: Extract<CrowdStatCardType, { kind: 'battle' }>;
  revealNames: boolean;
}

interface HeadToHeadRowProps {
  rank: number;
  displayName: string;
  pick: string;
  isYou: boolean;
  tournamentBonus?: TournamentBonusPick;
  revealNames: boolean;
}

function HeadToHeadRow({
  rank,
  displayName,
  pick,
  isYou,
  tournamentBonus,
  revealNames
}: HeadToHeadRowProps) {
  return (
    <li className={`head-to-head-row${isYou ? ' head-to-head-you-row personal-you-row' : ''}`}>
      <span className="head-to-head-rank">#{rank}</span>
      <span className="head-to-head-name">
        <span className="head-to-head-name-text">{isYou ? 'You' : displayName}</span>
        <TournamentBonusFlags bonus={tournamentBonus} revealNames={revealNames} />
      </span>
      <span className="head-to-head-pick">{pick}</span>
    </li>
  );
}

export function HeadToHeadCard({ card, revealNames }: HeadToHeadCardProps) {
  const homeTeam = teams.find((t) => t.id === card.homeTeamId);
  const awayTeam = teams.find((t) => t.id === card.awayTeamId);

  return (
    <article className="card crowd-stat-card crowd-stat-card-battle">
      <div className="head-to-head-header">
        <p className="crowd-stat-panel-kicker">Head to head on next fixture</p>
        <div className="fixture-row">
          {revealNames && homeTeam ? <TeamLabel team={homeTeam} /> : <span>Home</span>}
          <strong>vs</strong>
          {revealNames && awayTeam ? <TeamLabel team={awayTeam} /> : <span>Away</span>}
        </div>
      </div>
      <ul className="head-to-head-rows">
        <HeadToHeadRow
          rank={card.rankA}
          displayName={card.playerA}
          pick={card.pickA}
          isYou={card.currentUserSide === 'A'}
          tournamentBonus={card.bonusA}
          revealNames={revealNames}
        />
        <HeadToHeadRow
          rank={card.rankB}
          displayName={card.playerB}
          pick={card.pickB}
          isYou={card.currentUserSide === 'B'}
          tournamentBonus={card.bonusB}
          revealNames={revealNames}
        />
      </ul>
    </article>
  );
}
