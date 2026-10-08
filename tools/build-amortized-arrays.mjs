import { readFileSync, writeFileSync } from 'node:fs';
import { parseDeck } from '../src/deck.mjs';
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--check') || args.length > 1) {
  console.error('Usage: node tools/build-amortized-arrays.mjs [--check]');
  process.exit(2);
}
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const course = read('courses/amortized-arrays.json');
parseDeck(course); // Use the maintained complete local-course admission path.
const guide = read('courses/amortized-arrays.md');
const model = read('src/amortized-arrays.mjs').replace(/^export /gm, '');
const uiSource = read('src/amortized-arrays-ui.mjs');
const importLine = "import { parseArrayInputs, traceArrays, arrayObservation } from './amortized-arrays.mjs';\n";
if (!uiSource.startsWith(importLine)) throw new Error('Unexpected UI import; inspect the source closure before rebuilding.');
const ui = uiSource.slice(importLine.length).replace(/^export /gm, '');
if (/<\/script/i.test(model + ui)) throw new Error('Inline source cannot contain an HTML script terminator.');
const embedText = text => JSON.stringify(text).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
let result = read('templates/amortized-arrays-lab.html');
for (const [token, content] of [['__COURSE_JSON__', embedText(course)], ['__GUIDE_JSON__', embedText(guide)], ['/*__MODEL__*/', model], ['/*__UI__*/', ui]]) {
  if (result.split(token).length !== 2) throw new Error(`Expected exactly one template token: ${token}`);
  result = result.replace(token, () => content);
}
const output = new URL('../courses/amortized-arrays-lab.html', import.meta.url);
if (args.includes('--check')) {
  if (readFileSync(output, 'utf8') !== result) throw new Error('Standalone lab is stale; rebuild it.');
  console.log('amortized-arrays: standalone source/course/guide parity passed');
} else {
  writeFileSync(output, result);
  console.log(`amortized-arrays: wrote ${Buffer.byteLength(result)} bytes`);
}
