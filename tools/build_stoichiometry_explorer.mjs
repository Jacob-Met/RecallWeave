#!/usr/bin/env node
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { parseDeck } from '../src/deck.mjs';
import { renderStoichiometryPage } from '../src/stoichiometry-page.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length && !(args.length === 1 && args[0] === '--check')) {
  console.error('Usage: node tools/build_stoichiometry_explorer.mjs [--check]');
  process.exit(2);
}
const read = name => readFileSync(resolve(root, name), 'utf8');
const deckText = read('courses/stoichiometry-foundations.json');
parseDeck(deckText);
const modelSource = read('src/stoichiometry.mjs').replace(/^export /gm, '');
const uiSource = read('src/stoichiometry-ui.mjs').replace(/^import[^\n]*\n/gm, '');
const page = renderStoichiometryPage({ modelSource, uiSource, deckText });
const path = resolve(root, 'courses/stoichiometry-explorer.html');
if (args[0] === '--check') {
  if (readFileSync(path, 'utf8') !== page) throw new Error('Rebuild the standalone stoichiometry explorer.');
  console.log('Standalone stoichiometry explorer matches its sources.');
} else {
  writeFileSync(path + '.tmp', page, 'utf8');
  renameSync(path + '.tmp', path);
  console.log('Built courses/stoichiometry-explorer.html');
}
