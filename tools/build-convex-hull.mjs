#!/usr/bin/env node
/** Build the self-contained hull page without dependencies or network access. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDeck } from '../src/deck.mjs';

const hullRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const convexHullPagePath = join(hullRoot, 'courses/convex-hull-explorer.html');
const embeddedText = text => JSON.stringify(text).replaceAll('<', '\\u003c')
  .replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');

export function buildConvexHullPage() {
  const deck = readFileSync(join(hullRoot, 'courses/convex-hull.json'), 'utf8');
  parseDeck(deck);
  const guide = readFileSync(join(hullRoot, 'courses/convex-hull.md'), 'utf8');
  const model = readFileSync(join(hullRoot, 'src/convex-hull.mjs'), 'utf8')
    .replace(/^export (?=(?:const|function) )/gm, '');
  const ui = readFileSync(join(hullRoot, 'src/convex-hull-ui.mjs'), 'utf8')
    .replace(/^import \{ parseHullPoints, analyzeHull, serializeHullRecord \} from '\.\/convex-hull\.mjs';\r?\n/, '')
    .replace(/^export (?=function )/gm, '');
  if (/^\s*(?:import|export)\s/m.test(model + '\n' + ui)) throw new Error('Unsupported standalone module declaration.');
  if (/<\/script\b/i.test(model + ui)) throw new Error('Standalone source contains an HTML script closing tag.');
  let page = readFileSync(join(hullRoot, 'templates/convex-hull-explorer.html'), 'utf8');
  for (const [marker, value] of [
    ['/* HULL_DECK_TEXT */', embeddedText(deck)],
    ['/* HULL_GUIDE_TEXT */', embeddedText(guide)],
    ['/* HULL_MODEL */', model],
    ['/* HULL_UI */', ui],
  ]) {
    if (page.split(marker).length !== 2) throw new Error('Expected exactly one marker: ' + marker);
    page = page.replace(marker, () => value);
  }
  return page;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 1 || args[0] !== '--check')) {
    console.error('Usage: node tools/build-convex-hull.mjs [--check]');
    process.exitCode = 2;
  } else {
    const page = buildConvexHullPage();
    if (args[0] === '--check') {
      if (readFileSync(convexHullPagePath, 'utf8') !== page) {
        console.error('convex-hull-explorer.html differs from its source inputs.');
        process.exitCode = 1;
      } else console.log('Convex hull page matches its sources.');
    } else {
      writeFileSync(convexHullPagePath, page);
      console.log('Built courses/convex-hull-explorer.html (' + Buffer.byteLength(page) + ' bytes).');
    }
  }
}
