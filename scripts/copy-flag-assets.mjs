import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const codesPath = path.join(root, 'src/data/teamCountryCodes.ts');
const source = fs.readFileSync(codesPath, 'utf8');
const codes = [...source.matchAll(/:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
const unique = [...new Set(codes)];

const srcDir = path.join(root, 'node_modules/flag-icons/flags/4x3');
const destDir = path.join(root, 'public/flags/4x3');
fs.mkdirSync(destDir, { recursive: true });

let copied = 0;
for (const code of unique) {
  const from = path.join(srcDir, `${code}.svg`);
  const to = path.join(destDir, `${code}.svg`);
  if (!fs.existsSync(from)) {
    console.warn(`Missing flag asset: ${code}.svg`);
    continue;
  }
  fs.copyFileSync(from, to);
  copied += 1;
}

console.log(`Copied ${copied} flag SVGs to public/flags/4x3`);
