#!/usr/bin/env node
/** Deterministic offline companion; no changes to the shared learner build. */
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const geneticLinkageLabPath = join(root, 'courses/genetic-linkage-lab.html');

export function buildGeneticLinkageLab() {
  const deckText = readFileSync(join(root, 'courses/genetic-linkage.json'), 'utf8');
  parseDeck(deckText);
  const model = readFileSync(join(root, 'src/genetic-linkage.mjs'), 'utf8')
    .replace(/^export (?=(?:const|function) )/gm, '');
  const ui = readFileSync(join(root, 'src/genetic-linkage-ui.mjs'), 'utf8')
    .replace(/^import \{ LINKAGE_ASSUMPTIONS, analyzeLinkage \} from '\.\/genetic-linkage\.mjs';\n/, '');
  if (/^\s*(?:import|export)\s/m.test(model + '\n' + ui)) throw new Error('Unsupported standalone module declaration.');
  if (/<\/script\b/i.test(model + ui)) throw new Error('Source contains an HTML script closing tag.');
  let html = readFileSync(join(root, 'templates/genetic-linkage-lab.html'), 'utf8');
  for (const [marker, content] of [
    ['/* LINKAGE_DECK_TEXT */', JSON.stringify(deckText).replaceAll('<', '\\u003c')],
    ['/* LINKAGE_MODEL */', model],
    ['/* LINKAGE_UI */', ui]
  ]) {
    if (html.split(marker).length !== 2) throw new Error('Expected exactly one marker: ' + marker);
    html = html.replace(marker, () => content);
  }
  return html;
}
function invokedDirectly() {
  try { return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
}
if (invokedDirectly()) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    throw new Error('Usage: node tools/build-genetic-linkage.mjs [--check]');
  }
  const html = buildGeneticLinkageLab();
  if (args.length) {
    if (readFileSync(geneticLinkageLabPath, 'utf8') !== html) throw new Error('Rebuild the genetic linkage lab; its generated page is stale.');
    console.log('Genetic linkage lab matches its source and exact course bytes.');
  } else {
    writeFileSync(geneticLinkageLabPath, html);
    console.log('Built courses/genetic-linkage-lab.html (' + Buffer.byteLength(html) + ' bytes).');
  }
}
