#!/usr/bin/env node
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDeck } from '../src/deck.mjs';
import { renderHammingPage } from '../courses/hamming-codes/page.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
  console.error('Usage: node tools/build_hamming_explorer.mjs [--check]');
  process.exit(2);
}
const read = name => readFileSync(resolve(root, name), 'utf8');
const deckText = read('courses/hamming-codes.json');
parseDeck(deckText);
const modelSource = read('courses/hamming-codes/model.mjs').replace(/^export \{[^\n]+\};\n?$/gm, '');
const uiSource = read('courses/hamming-codes/explorer.mjs').replace(/^import [^\n]+;\n/gm, '');
const page = renderHammingPage({modelSource, uiSource, deckText});
const destination = resolve(root, 'courses/hamming-codes-explorer.html');
if (args[0] === '--check') {
  if (readFileSync(destination, 'utf8') !== page) {
    throw new Error('Rebuild courses/hamming-codes-explorer.html with tools/build_hamming_explorer.mjs.');
  }
  console.log('Standalone Hamming explorer matches its original sources and course.');
} else {
  const temporary = destination + '.tmp-' + process.pid;
  try {
    writeFileSync(temporary, page, {encoding: 'utf8', flag: 'wx'});
    renameSync(temporary, destination);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
  console.log('Built courses/hamming-codes-explorer.html');
}
