import { teams } from '../../data/tournament';
import { TeamLabel } from '../TeamLabel';
import { CrowdStatCard as CrowdStatCardType } from '../../types';

interface HeadToHeadCardProps {
  card: Extract<CrowdStatCardType, { kind: 'battle' }>;
  revealNames: boolean;
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
        <li className="head-to-head-row">
          <span className="head-to-head-rank">#{card.rankA}</span>
          <span className="head-to-head-name">{card.playerA}</span>
          <span className="head-to-head-pick">{card.pickA}</span>
        </li>
        <li className="head-to-head-row">
          <span className="head-to-head-rank">#{card.rankB}</span>
          <span className="head-to-head-name">{card.playerB}</span>
          <span className="head-to-head-pick">{card.pickB}</span>
        </li>
      </ul>
    </article>
  );
}
