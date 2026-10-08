#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'courses/stable-matching-explorer.html');
const paths = [
  'src/stable-matching.mjs',
  'src/stable-matching-ui.mjs',
  'templates/stable-matching-explorer.html',
  'courses/stable-matching.json',
  'courses/stable-matching.md',
  'tools/build-stable-matching.mjs'
];
const sources = Object.fromEntries(await Promise.all(paths.map(async path => [path, await readFile(resolve(root, path), 'utf8')])));
parseDeck(sources['courses/stable-matching.json']);
const sourceHashes = Object.fromEntries(paths.map(path => [path, createHash('sha256').update(sources[path]).digest('hex')]));
const escapedJSON = JSON.stringify({
  courseText: sources['courses/stable-matching.json'],
  guideText: sources['courses/stable-matching.md'],
  sourceHashes
}).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
const core = sources['src/stable-matching.mjs'].replace(/^export /gm, '');
const ui = sources['src/stable-matching-ui.mjs'].replace(/^import \{ traceStableMatching \} from '\.\/stable-matching\.mjs';\n/, '').replace(/^export /gm, '');
let html = sources['templates/stable-matching-explorer.html'];
for (const [token, content] of [['/*PAYLOAD*/', escapedJSON], ['/*CORE*/', core], ['/*UI*/', ui]]) {
  if (html.split(token).length !== 2) throw new Error('Expected exactly one template token: ' + token);
  html = html.replace(token, () => content);
}
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
  throw new Error('Usage: node tools/build-stable-matching.mjs [--check]');
}
if (args[0] === '--check') {
  if (await readFile(output, 'utf8') !== html) throw new Error('Stable matching explorer is stale. Run node tools/build-stable-matching.mjs.');
  console.log('Stable matching explorer matches every current input byte.');
} else {
  await writeFile(output, html);
  console.log('Built courses/stable-matching-explorer.html (' + Buffer.byteLength(html) + ' UTF-8 bytes).');
}
