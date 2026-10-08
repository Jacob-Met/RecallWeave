#!/usr/bin/env node
/** Build or check the optional DC lab without changing the learner or author builders. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const dcLabPath = join(root, 'courses/dc-circuits-lab.html');

export function buildDCLab() {
  const courseText = readFileSync(join(root, 'courses/dc-circuits.json'), 'utf8');
  parseDeck(courseText);
  const model = readFileSync(join(root, 'src/dc-circuits.mjs'), 'utf8')
    .replace(/^export (?=(?:const|function) )/gm, '');
  const ui = readFileSync(join(root, 'src/dc-circuits-ui.mjs'), 'utf8')
    .replace(/^import \{ CIRCUIT_LIMITS, parseCircuitNumber, compareCircuits, comparisonCSV \} from '\.\/dc-circuits\.mjs';\n/, '');
  if (/^\s*(?:import|export)\s/m.test(model + '\n' + ui)) {
    throw new Error('The standalone DC lab contains an unsupported module declaration.');
  }
  if (/<\/script\b/i.test(model + ui)) {
    throw new Error('Standalone JavaScript must not contain an HTML script closing tag.');
  }
  let html = readFileSync(join(root, 'templates/dc-circuits-lab.html'), 'utf8');
  for (const [marker, replacement] of [
    ['/*__DC_COURSE__*/', JSON.stringify(courseText).replaceAll('<', '\\u003c')],
    ['/*__DC_MODEL__*/', model],
    ['/*__DC_UI__*/', ui],
  ]) {
    if (html.split(marker).length !== 2) throw new Error('Expected one build marker: ' + marker);
    html = html.replace(marker, () => replacement);
  }
  return html;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    throw new Error('Usage: node tools/build-dc-circuits.mjs [--check]');
  }
  const html = buildDCLab();
  if (args[0] === '--check') {
    if (readFileSync(dcLabPath, 'utf8') !== html) {
      throw new Error('DC lab differs from its source. Run node tools/build-dc-circuits.mjs.');
    }
    console.log('DC lab matches its source (' + Buffer.byteLength(html) + ' bytes).');
  } else {
    writeFileSync(dcLabPath, html);
    console.log('Built courses/dc-circuits-lab.html (' + Buffer.byteLength(html) + ' bytes).');
  }
}
