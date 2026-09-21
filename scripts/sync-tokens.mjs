#!/usr/bin/env node
// Copies design/tokens.css into every project that uses it.
//
// The tokens are vendored rather than linked from one URL on purpose: these
// sites make no runtime call to any third party, and a shared stylesheet on
// another origin would be exactly that, plus a render-blocking round trip.
// One canonical file here, copied outward, keeps both properties.
//
//   node scripts/sync-tokens.mjs          report what is out of date
//   node scripts/sync-tokens.mjs --write  copy it into each project

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

const ROOT = new URL('..', import.meta.url);
const SOURCE = new URL('design/tokens.css', ROOT);

// Where each project keeps its copy. A project not listed here has not been
// migrated yet; add it once its styles actually reference the tokens.
const TARGETS = [
  { name: 'Startup Credits', path: 'C:/Users/AJ/freestack/assets/tokens.css' },
  { name: 'Breaking Change Radar', path: 'C:/Users/AJ/Documents/breaking-change-radar/assets/tokens.css' },
  { name: 'Mission Control', path: 'C:/Users/AJ/mission-control/assets/tokens.css' },
  { name: 'AI Council', path: 'C:/Users/AJ/ai-council/site/assets/tokens.css' },
];

const write = process.argv.includes('--write');
const source = await readFile(SOURCE, 'utf8');

let stale = 0;
for (const t of TARGETS) {
  const url = new URL(`file:///${t.path}`);
  const current = existsSync(url) ? await readFile(url, 'utf8') : null;

  if (current === source) {
    console.log(`  up to date  ${t.name}`);
    continue;
  }

  stale++;
  if (!write) {
    console.log(`  STALE       ${t.name}  (${current === null ? 'missing' : 'differs'})`);
    continue;
  }

  await mkdir(dirname(t.path), { recursive: true });
  await writeFile(url, source);
  console.log(`  written     ${t.name}`);
}

if (!write && stale) {
  console.log(`\n${stale} out of date. Run with --write to update.`);
  process.exit(1);
}
console.log(`\ntokens: ${TARGETS.length} projects, ${stale === 0 ? 'all current' : stale + ' updated'}`);
