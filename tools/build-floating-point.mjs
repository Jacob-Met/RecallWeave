#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseDeck, serializeDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const output = resolve(root, 'courses/floating-point-lab.html');
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--check') || args.length > 1) {
  console.error('Usage: node tools/build-floating-point.mjs [--check]');
  process.exit(2);
}
const template = read('courses/floating-point-lab.template.html');
const core = read('src/floating-point.mjs').replace(/^export /gm, '');
const ui = read('src/floating-point-ui.mjs').replace(/^import \{[\s\S]*?\} from '\.\/floating-point\.mjs';\n/, '');
if (/^import |^export /m.test(core + '\n' + ui)) throw new Error('The standalone module boundary changed; review the build.');
const deck = serializeDeck(parseDeck(read('courses/floating-point.json'))).trimEnd().replace(/</g, '\\u003c');
let built = template;
for (const [marker, source] of [
  ['__FLOATING_POINT_DECK__', deck],
  ['/*__FLOATING_POINT_CORE__*/', core],
  ['/*__FLOATING_POINT_UI__*/', ui],
]) {
  if (built.split(marker).length !== 2) throw new Error(`Expected exactly one ${marker} marker.`);
  built = built.replace(marker, () => source);
}
if (args[0] === '--check') {
  if (readFileSync(output, 'utf8') !== built) {
    console.error('Floating-point standalone output differs. Run node tools/build-floating-point.mjs.');
    process.exit(1);
  }
  console.log('Floating-point standalone source parity verified.');
} else {
  writeFileSync(output, built);
  console.log('Built courses/floating-point-lab.html.');
}
