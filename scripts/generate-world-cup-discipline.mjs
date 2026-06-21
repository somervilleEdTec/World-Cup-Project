/**
 * Regenerates src/data/worldCupDiscipline2026.ts from Wikipedia group Discipline tables.
 * Run: npm run generate:discipline
 * Validate against Transfermarkt: npm run validate:discipline
 */
import { writeFileSync } from 'node:fs';
import { OFFICIAL_GROUP_FIXTURE_ORIENTATIONS } from '../src/data/officialGroupFixtureOrientations.ts';
import { teams } from '../src/data/tournament.ts';

const FIFA_TO_TEAM = {
  CZE: 'czechia', KOR: 'south-korea', MEX: 'mexico', RSA: 'south-africa',
  SUI: 'switzerland', CAN: 'canada', BIH: 'bosnia-and-herzegovina', QAT: 'qatar',
  MAR: 'morocco', BRA: 'brazil', HAI: 'haiti', SCO: 'scotland',
  TUR: 'turkiye', AUS: 'australia', USA: 'united-states', PAR: 'paraguay',
  GER: 'germany', CUW: 'curacao', CIV: 'ivory-coast', ECU: 'ecuador',
  NED: 'netherlands', JPN: 'japan', SWE: 'sweden', TUN: 'tunisia',
  BEL: 'belgium', EGY: 'egypt', IRN: 'iran', NZL: 'new-zealand',
  ESP: 'spain', CPV: 'cape-verde', KSA: 'saudi-arabia', URU: 'uruguay',
  FRA: 'france', SEN: 'senegal', NOR: 'norway', IRQ: 'iraq',
  ARG: 'argentina', ALG: 'algeria', AUT: 'austria', JOR: 'jordan',
  POR: 'portugal', COD: 'dr-congo', UZB: 'uzbekistan', COL: 'colombia',
  ENG: 'england', CRO: 'croatia', GHA: 'ghana', PAN: 'panama'
};

async function fetchJson(url, attempt = 0) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'WorldCupBoys/1.0 (discipline snapshot generator)' }
  });
  if (res.status === 429 && attempt < 5) {
    const delayMs = 2000 * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return fetchJson(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`Fetch failed ${url}: ${res.status}`);
  return res.json();
}

async function pauseBetweenGroups() {
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

function parseDisciplineRows(wikitext) {
  const rows = [];
  for (const block of wikitext.split('|-')) {
    const codeMatch = block.match(/\{\{#invoke:flag\|fb\|([A-Z]{3})\}\}/);
    if (!codeMatch) continue;
    const code = codeMatch[1];
    const segments = block.split('solid gray"|').slice(1);
    const matchStats = [];
    for (let m = 0; m < 3; m += 1) {
      const seg = segments[m] ?? '';
      const cells = seg.split('||').map((c) => c.trim());
      const nums = cells.slice(0, 4).map((c) => (c && /^\d+$/.test(c) ? Number(c) : 0));
      matchStats.push({
        yellowCards: nums[0] ?? 0,
        secondYellowReds: nums[1] ?? 0,
        directReds: nums[2] ?? 0
      });
    }
    rows.push({ code, matchStats });
  }
  return rows;
}

function teamMatchIds(groupId) {
  const prefix = `g-${groupId.toLowerCase()}`;
  const ids = Object.keys(OFFICIAL_GROUP_FIXTURE_ORIENTATIONS)
    .filter((id) => id.startsWith(`${prefix}-`))
    .sort((a, b) => Number(a.split('-')[2]) - Number(b.split('-')[2]));
  const byTeam = Object.fromEntries(teams.filter((t) => t.group === groupId).map((t) => [t.id, []]));
  ids.forEach((matchId) => {
    const { homeTeamId, awayTeamId } = OFFICIAL_GROUP_FIXTURE_ORIENTATIONS[matchId];
    byTeam[homeTeamId]?.push(matchId);
    byTeam[awayTeamId]?.push(matchId);
  });
  return byTeam;
}

function emptyDiscipline() {
  return { yellowCards: 0, secondYellowReds: 0, directReds: 0 };
}

function mergeDiscipline(existing, next) {
  return {
    yellowCards: existing.yellowCards + next.yellowCards,
    secondYellowReds: existing.secondYellowReds + next.secondYellowReds,
    directReds: existing.directReds + next.directReds
  };
}

async function main() {
  const snapshot = {};
  for (const groupId of 'ABCDEFGHIJKL') {
    await pauseBetweenGroups();
    const page = `2026_FIFA_World_Cup_Group_${groupId}`;
    const sections = await fetchJson(`https://en.wikipedia.org/w/api.php?action=parse&page=${page}&prop=sections&format=json`);
    const disciplineSection = sections.parse.sections.find((s) => s.line === 'Discipline');
    if (!disciplineSection) continue;
    await pauseBetweenGroups();
    const parsed = await fetchJson(`https://en.wikipedia.org/w/api.php?action=parse&page=${page}&prop=wikitext&section=${disciplineSection.index}&format=json`);
    const rows = parseDisciplineRows(parsed.parse.wikitext['*']);
    const byTeam = teamMatchIds(groupId);
    for (const row of rows) {
      const teamId = FIFA_TO_TEAM[row.code];
      if (!teamId) continue;
      const matchIds = byTeam[teamId];
      if (!matchIds) continue;
      row.matchStats.forEach((stats, idx) => {
        const matchId = matchIds[idx];
        if (!matchId) return;
        if (!(stats.yellowCards || stats.secondYellowReds || stats.directReds)) return;
        const fixture = OFFICIAL_GROUP_FIXTURE_ORIENTATIONS[matchId];
        const side = fixture.homeTeamId === teamId ? 'home' : 'away';
        const current = snapshot[matchId] ?? { home: emptyDiscipline(), away: emptyDiscipline() };
        current[side] = mergeDiscipline(current[side], stats);
        snapshot[matchId] = current;
      });
    }
  }
  const lines = [
    "import { MatchDiscipline } from '../types';",
    '',
    '// Auto-generated from Wikipedia 2026 FIFA World Cup group Discipline sections.',
    '// Regenerate: node scripts/generate-world-cup-discipline.mjs',
    'export const WORLD_CUP_DISCIPLINE_SNAPSHOT: Readonly<Record<string, MatchDiscipline>> = {'
  ];
  for (const matchId of Object.keys(snapshot).sort()) {
    const d = snapshot[matchId];
    lines.push(`  '${matchId}': {`);
    lines.push(`    home: { yellowCards: ${d.home.yellowCards}, secondYellowReds: ${d.home.secondYellowReds}, directReds: ${d.home.directReds} },`);
    lines.push(`    away: { yellowCards: ${d.away.yellowCards}, secondYellowReds: ${d.away.secondYellowReds}, directReds: ${d.away.directReds} },`);
    lines.push('  },');
  }
  lines.push('};', '');
  writeFileSync('src/data/worldCupDiscipline2026.ts', lines.join('\n'));
  console.log(`Wrote ${Object.keys(snapshot).length} match discipline entries.`);
}

main().catch((error) => { console.error(error); process.exit(1); });
