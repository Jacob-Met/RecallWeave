#!/usr/bin/env node
/** Deterministic standalone builder; no dependency installation or network. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseDeck } from '../src/deck.mjs';

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
  console.error('Usage: node tools/build-majority-vote.mjs [--check]');
  process.exit(2);
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const template = read('templates/majority-vote-explorer.html');
const core = read('src/majority-vote.mjs');
const ui = read('src/majority-vote-ui.mjs');
const course = read('courses/majority-vote.json');
const guide = read('courses/majority-vote.md');
const deck = parseDeck(course);
if (deck.items.length !== 12) throw new Error('The majority-vote lesson must have twelve items.');
const importLine = "import { parseMajorityLines, traceMajority } from './majority-vote.mjs';\n";
if (!ui.startsWith(importLine)) throw new Error('Unexpected UI import; refusing an incomplete standalone build.');
for (const marker of ['__ASSETS__', '__SCRIPT__']) {
  if (template.split(marker).length !== 2) throw new Error('Each template marker must occur exactly once: ' + marker);
}
const assets = JSON.stringify({ course, guide }).replace(/</g, '\\u003c');
const script = core + '\n' + ui.slice(importLine.length);
if (/<\/script/i.test(script)) throw new Error('Embedded source contains a closing script tag.');
const output = template.replace('__ASSETS__', () => assets).replace('__SCRIPT__', () => script);
const target = resolve(root, 'courses/majority-vote-explorer.html');
if (args[0] === '--check') {
  if (readFileSync(target, 'utf8') !== output) throw new Error('Standalone output differs from its sources.');
  console.log('Standalone majority-vote output is exact.');
} else {
  writeFileSync(target, output, 'utf8');
  console.log('Built courses/majority-vote-explorer.html');
}
