import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const course = read('courses/congruences.json');
const guide = read('courses/congruences.md');
parseDeck(course);
const core = read('src/congruences.mjs').replace(/^export (const|function) /gm, '$1 ');
const ui = read('src/congruences-ui.mjs')
  .replace("import { solveCongruences, inspectCongruences, serializeObservation } from './congruences.mjs';\n", '')
  .replace(/^export function /gm, 'function ');
const literal = value => JSON.stringify(value).replace(/</g, '\\u003c')
  .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const substitutions = {
  '__CONGRUENCES_COURSE_LITERAL__': literal(course),
  '__CONGRUENCES_GUIDE_LITERAL__': literal(guide),
  '__CONGRUENCES_CODE__': core + '\n' + ui,
};
if (/<\/script/i.test(core + ui)) throw new Error('Unexpected script-closing source.');
let output = read('templates/congruences-explorer.html');
for (const [token, value] of Object.entries(substitutions)) {
  if (output.split(token).length !== 2) throw new Error('Expected one template token: ' + token);
  output = output.replace(token, () => value);
}
const target = resolve(root, 'courses/congruences-explorer.html');
if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--check')) {
  throw new Error('Use node tools/build-congruences.mjs [--check]');
}
if (process.argv[2] === '--check') {
  if (readFileSync(target, 'utf8') !== output) throw new Error('Congruence explorer differs from its exact source inputs.');
  console.log('CONGRUENCES_BUILD_PARITY_OK');
} else {
  writeFileSync(target, output, 'utf8');
  console.log('Built courses/congruences-explorer.html (' + Buffer.byteLength(output) + ' bytes)');
}
