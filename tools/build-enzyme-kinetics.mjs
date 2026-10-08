#!/usr/bin/env node
/** Standalone builder following RecallWeave's existing DC-lab convention. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const enzymeLabPath = join(root, 'courses/enzyme-kinetics-lab.html');

export function buildEnzymeLab() {
  const courseText = readFileSync(join(root, 'courses/enzymes-energy-and-control.json'), 'utf8');
  parseDeck(courseText);
  const model = readFileSync(join(root, 'src/enzyme-kinetics.mjs'), 'utf8')
    .replace(/^export (?=(?:const|function) )/gm, '');
  const ui = readFileSync(join(root, 'src/enzyme-kinetics-ui.mjs'), 'utf8')
    .replace(/^import \{ KINETICS_BASELINE, KINETICS_LIMITS, KINETICS_MODES, parseKineticsNumber, compareKinetics, kineticsCurve, kineticsCSV \} from '\.\/enzyme-kinetics\.mjs';\n/, '');
  if (/^\s*(?:import|export)\s/m.test(model + '\n' + ui)) {
    throw new Error('The standalone enzyme explorer contains an unsupported module declaration.');
  }
  if (/<\/script\b/i.test(model + ui)) {
    throw new Error('Standalone JavaScript must not contain an HTML script closing tag.');
  }
  let html = readFileSync(join(root, 'templates/enzyme-kinetics-lab.html'), 'utf8');
  for (const [marker, replacement] of [
    ['/*__ENZYME_COURSE__*/', JSON.stringify(courseText).replaceAll('<', '\\u003c')],
    ['/*__ENZYME_MODEL__*/', model],
    ['/*__ENZYME_UI__*/', ui],
  ]) {
    if (html.split(marker).length !== 2) throw new Error('Expected one build marker: ' + marker);
    html = html.replace(marker, () => replacement);
  }
  return html;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    throw new Error('Usage: node tools/build-enzyme-kinetics.mjs [--check]');
  }
  const html = buildEnzymeLab();
  if (args[0] === '--check') {
    if (readFileSync(enzymeLabPath, 'utf8') !== html) {
      throw new Error('Enzyme explorer differs from its source. Run node tools/build-enzyme-kinetics.mjs.');
    }
    console.log('Enzyme explorer matches its source (' + Buffer.byteLength(html) + ' bytes).');
  } else {
    writeFileSync(enzymeLabPath, html);
    console.log('Built courses/enzyme-kinetics-lab.html (' + Buffer.byteLength(html) + ' bytes).');
  }
}
