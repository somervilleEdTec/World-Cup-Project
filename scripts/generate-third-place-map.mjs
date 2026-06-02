/**
 * Regenerates src/data/thirdPlaceMappings.ts from Wikipedia's official table.
 * Run: node scripts/generate-third-place-map.mjs
 */
import { writeFileSync } from 'node:fs';

const res = await fetch(
  'https://en.wikipedia.org/w/api.php?action=parse&page=Template:2026_FIFA_World_Cup_third-place_table&prop=wikitext&format=json'
);
if (!res.ok) {
  console.error('Wikipedia fetch failed', res.status);
  process.exit(1);
}
const json = await res.json();
const wikitext = json.parse.wikitext['*'];

const map = {};
const rows = wikitext.split('|-\n').slice(2);

for (const row of rows) {
  if (!row.includes('scope="row"')) continue;

  const qualifying = [...row.matchAll(/'''([A-L])'''/g)].map((m) => m[1]);
  if (qualifying.length !== 8) continue;

  const mappingPart = row.includes('rowspan') ? row.split('rowspan')[1] : row;
  const thirdLetters = [...mappingPart.matchAll(/\b3([A-L])\b/g)].map((m) => m[1]);
  if (thirdLetters.length < 8) continue;
  const thirdMappings = thirdLetters.slice(-8);

  const key = [...new Set(qualifying)].sort().join('');
  if (key.length !== 8) continue;

  map[key] = {
    '1A': `3${thirdMappings[0]}`,
    '1B': `3${thirdMappings[1]}`,
    '1D': `3${thirdMappings[2]}`,
    '1E': `3${thirdMappings[3]}`,
    '1G': `3${thirdMappings[4]}`,
    '1I': `3${thirdMappings[5]}`,
    '1K': `3${thirdMappings[6]}`,
    '1L': `3${thirdMappings[7]}`
  };
}

if (Object.keys(map).length !== 495) {
  console.error(`Expected 495 mappings, got ${Object.keys(map).length}`);
  process.exit(1);
}

for (const [key, entry] of Object.entries(map)) {
  for (const v of Object.values(entry)) {
    if (!/^3[A-L]$/.test(v)) {
      console.error('Invalid mapping', key, entry);
      process.exit(1);
    }
  }
}

const out = `// Auto-generated from Wikipedia Template:2026_FIFA_World_Cup_third-place_table
// Do not edit manually — run: node scripts/generate-third-place-map.mjs

export type ThirdPlaceSlot = '1A' | '1B' | '1D' | '1E' | '1G' | '1I' | '1K' | '1L';
export type ThirdPlaceMapping = Record<ThirdPlaceSlot, string>;

export const THIRD_PLACE_MAPPINGS: Record<string, ThirdPlaceMapping> = ${JSON.stringify(map, null, 2)};
`;

writeFileSync('src/data/thirdPlaceMappings.ts', out);
console.log(`Wrote ${Object.keys(map).length} third-place mappings`);
