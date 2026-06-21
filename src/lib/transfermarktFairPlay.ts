import { teams } from '../data/tournament';

/** Transfermarkt fair-play row (deduction points — higher is worse). */
export interface TransfermarktFairPlayRow {
  teamName: string;
  teamId: string;
  yellowCards: number;
  secondYellowReds: number;
  directReds: number;
  deductionPoints: number;
}

export interface FairPlayValidationMismatch {
  teamId: string;
  teamName: string;
  snapshotDeductionPoints: number;
  transfermarktDeductionPoints: number;
}

export interface FairPlayValidationResult {
  ok: boolean;
  comparedTeams: number;
  mismatches: FairPlayValidationMismatch[];
  unmappedTransfermarktNames: string[];
  teamsMissingFromTransfermarkt: string[];
}

const TRANSFERMARKT_URL =
  'https://www.transfermarkt.com/world-cup/fairnesstabelle/pokalwettbewerb/FIWC/plus/0?saison_id=2025';

/** Map Transfermarkt display names to internal team ids. */
const TRANSFERMARKT_NAME_ALIASES: Record<string, string> = {
  'bosnia-herzegovina': 'bosnia-and-herzegovina',
  'democratic-republic-of-the-congo': 'dr-congo',
  'dr-congo': 'dr-congo',
  curacao: 'curacao',
  'cote-divoire': 'ivory-coast',
  'ivory-coast': 'ivory-coast',
  usa: 'united-states',
  'united-states': 'united-states',
  'south-korea': 'south-korea',
  'south-africa': 'south-africa',
  'saudi-arabia': 'saudi-arabia',
  'new-zealand': 'new-zealand',
  'cape-verde': 'cape-verde'
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function teamIdFromTransfermarktName(name: string): string | null {
  const normalized = normalizeName(name);
  const aliased = TRANSFERMARKT_NAME_ALIASES[normalized] ?? normalized;
  const team = teams.find((t) => normalizeName(t.name) === aliased);
  return team?.id ?? null;
}

/** Parse Transfermarkt fair-play HTML (2026 World Cup FIWC layout). */
export function parseTransfermarktFairPlayHtml(html: string): TransfermarktFairPlayRow[] {
  const rows: TransfermarktFairPlayRow[] = [];

  for (const tr of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
    const nameMatch = tr.match(/class="hauptlink[^"]*"[^>]*>\s*<a[^>]*title="([^"]+)"/);
    if (!nameMatch) continue;

    const teamName = nameMatch[1]!.trim();
    if (teamName === 'Club') continue;

    const nums = [...tr.matchAll(/class="zentriert[^"]*">(?:<a[^>]*>)?(\d+)(?:<\/a>)?/g)].map((m) =>
      Number(m[1])
    );
    if (nums.length < 6) continue;

    const [, yellowCards, secondYellowReds, directReds, , deductionPoints] = nums;
    const teamId = teamIdFromTransfermarktName(teamName);
    if (!teamId) continue;

    rows.push({
      teamName,
      teamId,
      yellowCards: yellowCards ?? 0,
      secondYellowReds: secondYellowReds ?? 0,
      directReds: directReds ?? 0,
      deductionPoints: deductionPoints ?? 0
    });
  }

  return rows;
}

/** Compare snapshot cumulative deductions (positive) with Transfermarkt points. */
export function validateFairPlayAgainstTransfermarkt(
  snapshotDeductionPointsByTeam: Record<string, number>,
  transfermarktRows: TransfermarktFairPlayRow[]
): FairPlayValidationResult {
  const tmByTeam = Object.fromEntries(transfermarktRows.map((row) => [row.teamId, row]));
  const mismatches: FairPlayValidationMismatch[] = [];
  const unmappedTransfermarktNames: string[] = [];
  const teamsMissingFromTransfermarkt: string[] = [];

  for (const team of teams) {
    const snapshotPts = snapshotDeductionPointsByTeam[team.id] ?? 0;
    const tmRow = tmByTeam[team.id];
    if (!tmRow) {
      if (snapshotPts > 0) {
        teamsMissingFromTransfermarkt.push(team.id);
      }
      continue;
    }
    if (snapshotPts !== tmRow.deductionPoints) {
      mismatches.push({
        teamId: team.id,
        teamName: team.name,
        snapshotDeductionPoints: snapshotPts,
        transfermarktDeductionPoints: tmRow.deductionPoints
      });
    }
  }

  return {
    ok: mismatches.length === 0 && teamsMissingFromTransfermarkt.length === 0,
    comparedTeams: transfermarktRows.length,
    mismatches,
    unmappedTransfermarktNames,
    teamsMissingFromTransfermarkt
  };
}

export async function fetchTransfermarktFairPlayHtml(
  url: string = TRANSFERMARKT_URL
): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; WorldCupBoys/1.0; +https://worldcup.dosums.uk) discipline-validation'
    }
  });
  if (!response.ok) {
    throw new Error(`Transfermarkt fetch failed: HTTP ${response.status}`);
  }
  return response.text();
}

export { TRANSFERMARKT_URL };
