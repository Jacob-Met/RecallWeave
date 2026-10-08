import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const course = read('courses/euclidean-algorithm.json');
parseDeck(course);
const core = read('src/euclidean-algorithm.mjs').replace(/^export (const|function) /gm, '$1 ');
const ui = read('src/euclidean-algorithm-ui.mjs')
  .replace("import { computeEuclid } from './euclidean-algorithm.mjs';\n", '')
  .replace(/^export function /gm, 'function ');
const literal = JSON.stringify(course).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const template = read('templates/euclidean-algorithm-explorer.html');
for (const token of ['__EUCLID_COURSE_LITERAL__', '__EUCLID_CODE__']) {
  if (template.split(token).length !== 2) throw new Error('Expected one template token: ' + token);
}
if (/<\/script/i.test(core + ui)) throw new Error('Unexpected script-closing text in bundled source.');
const output = template.replace('__EUCLID_COURSE_LITERAL__', () => literal)
  .replace('__EUCLID_CODE__', () => core + '\n' + ui);
const target = resolve(root, 'courses/euclidean-algorithm-explorer.html');
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== output) throw new Error('Euclidean explorer differs from its exact source inputs.');
  console.log('EUCLID_BUILD_PARITY_OK');
} else {
  writeFileSync(target, output, 'utf8');
  console.log('Built courses/euclidean-algorithm-explorer.html (' + Buffer.byteLength(output) + ' bytes)');
}
