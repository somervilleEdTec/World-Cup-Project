import { describe, it, expect } from 'vitest';
import {
  parseTransfermarktFairPlayHtml,
  validateFairPlayAgainstTransfermarkt
} from '../lib/transfermarktFairPlay';

const SAMPLE_HTML = `
<table>
  <tr>
    <td class="zentriert">1</td>
    <td class="hauptlink"><a title="New Zealand" href="/nz">New Zealand</a></td>
    <td class="zentriert">0</td><td class="zentriert">0</td><td class="zentriert">0</td><td class="zentriert">0</td><td class="zentriert">0</td>
  </tr>
  <tr>
    <td class="zentriert">2</td>
    <td class="hauptlink"><a title="Iran" href="/iran">Iran</a></td>
    <td class="zentriert">1</td><td class="zentriert">0</td><td class="zentriert">0</td><td class="zentriert">0</td><td class="zentriert">1</td>
  </tr>
  <tr>
    <td class="zentriert">3</td>
    <td class="hauptlink"><a title="Saudi Arabia" href="/ksa">Saudi Arabia</a></td>
    <td class="zentriert">1</td><td class="zentriert">0</td><td class="zentriert">0</td><td class="zentriert">0</td><td class="zentriert">1</td>
  </tr>
</table>`;

describe('transfermarktFairPlay', () => {
  it('parses team names and deduction points from HTML', () => {
    const rows = parseTransfermarktFairPlayHtml(SAMPLE_HTML);
    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.teamId === 'iran')).toMatchObject({ deductionPoints: 1 });
    expect(rows.find((r) => r.teamId === 'new-zealand')).toMatchObject({ deductionPoints: 0 });
    expect(rows.find((r) => r.teamId === 'saudi-arabia')).toMatchObject({ deductionPoints: 1 });
  });

  it('reports mismatches between snapshot totals and Transfermarkt', () => {
    const rows = parseTransfermarktFairPlayHtml(SAMPLE_HTML);
    const ok = validateFairPlayAgainstTransfermarkt(
      { iran: 1, 'new-zealand': 0, 'saudi-arabia': 1 },
      rows
    );
    expect(ok.ok).toBe(true);
    expect(ok.mismatches).toHaveLength(0);
  });

  it('flags teams whose snapshot deductions differ from Transfermarkt', () => {
    const rows = parseTransfermarktFairPlayHtml(SAMPLE_HTML);
    const result = validateFairPlayAgainstTransfermarkt({ iran: 2, 'new-zealand': 0 }, rows);
    expect(result.ok).toBe(false);
    expect(result.mismatches[0]).toMatchObject({
      teamId: 'iran',
      snapshotDeductionPoints: 2,
      transfermarktDeductionPoints: 1
    });
  });
});
