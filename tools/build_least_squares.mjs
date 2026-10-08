import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {parseDeck, serializeDeck} from '../src/deck.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFile(resolve(root, path), 'utf8');
const names = [
  'courses/least-squares-lab.template.html', 'courses/least-squares-core.mjs',
  'courses/least-squares-ui.mjs', 'courses/least-squares.json', 'courses/least-squares.md'
];
const [template, core, ui, course, guide] = await Promise.all(names.map(read));
const deck = parseDeck(course);
if (serializeDeck(deck) !== course || deck.items.length !== 16 || deck.concepts.length !== 4) {
  throw new Error('The original sixteen-question course must be canonical learner JSON.');
}
const importLine = "import {analyze, EXAMPLES, LIMITS, parseCoordinate, parseScalar, rationalText, rationalNumber} from './least-squares-core.mjs';";
if (ui.split(importLine).length !== 2) throw new Error('Expected exactly one local core import.');
const code = `(() => {\n'use strict';\n${core.replace(/^export (?=(?:const|function)\b)/gm, '')}\n${ui.replace(importLine, '')}\n})();`;
if (/<\/script/i.test(code) || /^\s*(?:import|export)\s/m.test(code)) throw new Error('Unexpected inline code boundary or remaining module dependency.');
const textPayload = text => JSON.stringify(text).replaceAll('<', '\\u003c');
let output = template;
for (const [marker, value] of [
  ['@@LEAST_SQUARES_COURSE@@', textPayload(course)],
  ['@@LEAST_SQUARES_GUIDE@@', textPayload(guide)],
  ['@@LEAST_SQUARES_CODE@@', code]
]) {
  if (output.split(marker).length !== 2) throw new Error(`Expected exactly one ${marker} marker.`);
  // A replacement function keeps any literal $ sequences in authored text unchanged.
  output = output.replace(marker, () => value);
}
if (/@@LEAST_SQUARES_/.test(output)) throw new Error('An unresolved build marker remains.');
const destination = resolve(root, 'courses/least-squares-lab.html');
if (process.argv.length > 3 || (process.argv[2] !== undefined && process.argv[2] !== '--check')) {
  throw new Error('Usage: node tools/build_least_squares.mjs [--check]');
}
if (process.argv[2] === '--check') {
  if (await readFile(destination, 'utf8') !== output) throw new Error('Generated least-squares lab is stale. Run the builder.');
  console.log('Least-squares lab is current; exact course and guide bytes are embedded.');
} else {
  await writeFile(destination, output);
  console.log(`Built courses/least-squares-lab.html (${Buffer.byteLength(output)} bytes; sixteen validated questions).`);
}
