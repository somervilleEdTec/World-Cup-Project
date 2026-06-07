import { describe, it, expect } from 'vitest';
import {
  pickKey,
  formatScorelineLabel,
  computeMatchConsensus,
  computeHeadlines,
  computeGroupConsensus,
  computeTournamentOutlook,
  computeFunFacts,
  computeMysteryStats,
  sortMatchConsensusForDisplay,
  UserPicks
} from '../lib/predictionStats';
import { groupMatches } from '../data/tournament';

describe('pickKey', () => {
  it('returns score only for group matches', () => {
    expect(
      pickKey(
        { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
        'GROUP',
        { homeTeamId: 'mexico', awayTeamId: 'south-africa' }
      )
    ).toBe('2-1');
  });

  it('includes advancer for knockout draws', () => {
    expect(
      pickKey(
        { matchId: 'r32-1', homeScore: 1, awayScore: 1, progressingTeamId: 'mexico' },
        'R32',
        { homeTeamId: 'mexico', awayTeamId: 'south-africa' }
      )
    ).toBe('1-1|mexico');
  });
});

describe('formatScorelineLabel', () => {
  it('formats advancer label', () => {
    expect(formatScorelineLabel('1-1|mexico')).toBe('1-1 (adv: Mexico)');
  });
});

describe('computeMatchConsensus', () => {
  const groupAFirst = groupMatches.find((m) => m.id === 'g-a-1')!;
  const groupASecond = groupMatches.find((m) => m.id === 'g-a-2')!;

  const users: UserPicks[] = [
    {
      userId: 'u1',
      displayName: 'Alice',
      picks: {
        'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
        'g-a-2': { matchId: 'g-a-2', homeScore: 0, awayScore: 0 }
      }
    },
    {
      userId: 'u2',
      displayName: 'Bob',
      picks: {
        'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 },
        'g-a-2': { matchId: 'g-a-2', homeScore: 1, awayScore: 2 }
      }
    },
    {
      userId: 'u3',
      displayName: 'Carol',
      picks: {
        'g-a-1': { matchId: 'g-a-1', homeScore: 1, awayScore: 0 },
        'g-a-2': { matchId: 'g-a-2', homeScore: 3, awayScore: 3 }
      }
    }
  ];

  it('aggregates scorelines per match', () => {
    const viewable = new Set(['g-a-1', 'g-a-2']);
    const consensus = computeMatchConsensus([groupAFirst, groupASecond], users, viewable);

    const ga1 = consensus.find((c) => c.matchId === 'g-a-1');
    expect(ga1?.totalPicks).toBe(3);
    expect(ga1?.topScorelines[0]).toMatchObject({ label: '2-1', count: 2, pct: 67 });
    expect(ga1?.modePct).toBe(67);

    const ga2 = consensus.find((c) => c.matchId === 'g-a-2');
    expect(ga2?.distinctScorelines).toBe(3);
  });

  it('skips non-viewable matches', () => {
    const viewable = new Set(['g-a-1']);
    const consensus = computeMatchConsensus([groupAFirst, groupASecond], users, viewable);
    expect(consensus).toHaveLength(1);
    expect(consensus[0].matchId).toBe('g-a-1');
  });
});

describe('computeHeadlines', () => {
  it('selects hive mind and scoreline king', () => {
    const groupAFirst = groupMatches.find((m) => m.id === 'g-a-1')!;
    const users: UserPicks[] = [
      {
        userId: 'u1',
        displayName: 'Alice',
        picks: { 'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 } }
      },
      {
        userId: 'u2',
        displayName: 'Bob',
        picks: { 'g-a-1': { matchId: 'g-a-1', homeScore: 2, awayScore: 1 } }
      }
    ];
    const viewable = new Set(['g-a-1']);
    const consensus = computeMatchConsensus([groupAFirst], users, viewable);
    const picks = users.flatMap((u) => {
      const pick = u.picks['g-a-1'];
      return pick
        ? [
            {
              matchId: 'g-a-1',
              stage: 'GROUP' as const,
              homeTeamId: groupAFirst.homeTeamId,
              awayTeamId: groupAFirst.awayTeamId,
              pick,
              userId: u.userId,
              displayName: u.displayName
            }
          ]
        : [];
    });

    const headlines = computeHeadlines(consensus, picks);
    expect(headlines.hiveMind?.pct).toBe(100);
    expect(headlines.scorelineKing?.scoreline).toBe('2-1');
  });
});

describe('computeGroupConsensus', () => {
  it('returns empty when group phase not locked', () => {
    expect(computeGroupConsensus([], false)).toEqual([]);
  });
});

describe('computeTournamentOutlook', () => {
  it('returns hidden when group phase not locked', () => {
    const outlook = computeTournamentOutlook([], false);
    expect(outlook.visible).toBe(false);
  });

  it('counts champion picks', () => {
    const users: UserPicks[] = [
      {
        userId: 'u1',
        displayName: 'Alice',
        picks: {},
        bonus: {
          winnerTeamId: 'brazil',
          runnerUpTeamId: 'france',
          thirdTeamId: 'germany',
          fourthTeamId: 'spain'
        }
      },
      {
        userId: 'u2',
        displayName: 'Bob',
        picks: {},
        bonus: {
          winnerTeamId: 'brazil',
          runnerUpTeamId: 'argentina',
          thirdTeamId: 'germany',
          fourthTeamId: 'spain'
        }
      }
    ];
    const outlook = computeTournamentOutlook(users, true);
    expect(outlook.visible).toBe(true);
    expect(outlook.champion[0]).toMatchObject({ count: 2, pct: 100 });
  });
});

describe('sortMatchConsensusForDisplay', () => {
  it('sorts by unanimity and split', () => {
    const items = [
      {
        matchId: 'a',
        stage: 'GROUP' as const,
        homeTeamId: 'x',
        awayTeamId: 'y',
        totalPicks: 5,
        topScorelines: [],
        resultSplit: [],
        modePct: 60,
        distinctScorelines: 3
      },
      {
        matchId: 'b',
        stage: 'GROUP' as const,
        homeTeamId: 'x',
        awayTeamId: 'y',
        totalPicks: 5,
        topScorelines: [],
        resultSplit: [],
        modePct: 90,
        distinctScorelines: 2
      }
    ];
    const sorted = sortMatchConsensusForDisplay(items);
    expect(sorted.mostUnanimous[0].matchId).toBe('b');
    expect(sorted.mostSplit[0].matchId).toBe('a');
  });
});

describe('computeMysteryStats', () => {
  it('returns teaser facts without team names before lock', async () => {
    const { groupMatches } = await import('../data/tournament');
    const groupAMatches = groupMatches.filter((m) => m.group === 'A');
    const picksA = Object.fromEntries(
      groupAMatches.map((m) => [m.id, { matchId: m.id, homeScore: 2, awayScore: 1 }])
    );

    const users: UserPicks[] = [
      { userId: 'u1', displayName: 'Alice', picks: picksA, bonus: { winnerTeamId: 'brazil', runnerUpTeamId: 'france', thirdTeamId: 'germany', fourthTeamId: 'spain' } },
      { userId: 'u2', displayName: 'Bob', picks: picksA, bonus: { winnerTeamId: 'brazil', runnerUpTeamId: 'argentina', thirdTeamId: 'germany', fourthTeamId: 'spain' } }
    ];

    const facts = computeMysteryStats(users);
    expect(facts.length).toBeGreaterThan(0);
    expect(facts.every((f) => !f.text.includes('Brazil') && !f.text.includes('Mexico'))).toBe(true);
    expect(facts.some((f) => f.text.includes('unlock'))).toBe(true);
  });
});

describe('computeFunFacts', () => {
  it('returns facts when picks exist', () => {
    const picks = [
      {
        matchId: 'g-a-1',
        stage: 'GROUP' as const,
        homeTeamId: 'mexico',
        awayTeamId: 'south-africa',
        pick: { matchId: 'g-a-1', homeScore: 1, awayScore: 1 },
        userId: 'u1',
        displayName: 'Alice'
      }
    ];
    const facts = computeFunFacts([], [], [], picks, {
      visible: false,
      champion: [],
      runnerUp: [],
      third: [],
      fourth: [],
      darkHorse: null
    });
    expect(facts.length).toBeGreaterThan(0);
    expect(facts.some((f) => f.text.includes('draw'))).toBe(true);
  });
});
