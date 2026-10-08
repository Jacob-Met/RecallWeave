#!/usr/bin/env node
/** Build the optional self-contained lab; existing learner/author builds are unchanged. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = join(root, 'courses/measurement-uncertainty-lab.template.html');
export const measurementLabPath = join(root, 'courses/measurement-uncertainty-lab.html');

export function buildMeasurementLab() {
  const deckText = readFileSync(join(root, 'courses/measurement-uncertainty.json'), 'utf8');
  parseDeck(deckText); // Use the existing published admission contract without rewriting bytes.
  const calculationSource = readFileSync(join(root, 'src/measurement-uncertainty.mjs'), 'utf8')
    .replace(/^export (?=(?:const|function) )/gm, '');
  const uiSource = readFileSync(join(root, 'src/measurement-uncertainty-ui.mjs'), 'utf8')
    .replace(/^import \{ parseReadings, parseMeasurementNumber, summarizeMeasurements, projectUncertainty \} from '\.\/measurement-uncertainty\.mjs';\n/, '');
  if (/^\s*(?:import|export)\s/m.test(calculationSource + '\n' + uiSource)) {
    throw new Error('Standalone lab source still contains an unsupported module declaration.');
  }
  if (/<\/script\b/i.test(calculationSource + uiSource)) {
    throw new Error('Standalone script source must not contain an HTML script closing tag.');
  }
  let result = readFileSync(templatePath, 'utf8');
  const replacements = [
    ['/* MEASUREMENT_DECK_TEXT */', JSON.stringify(deckText).replaceAll('<', '\\u003c')],
    ['/* MEASUREMENT_CALCULATIONS */', calculationSource],
    ['/* MEASUREMENT_UI */', uiSource],
  ];
  for (const [marker, value] of replacements) {
    if (result.split(marker).length !== 2) throw new Error(`Expected exactly one build marker: ${marker}`);
    result = result.replace(marker, () => value);
  }
  return result;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const result = buildMeasurementLab();
  writeFileSync(measurementLabPath, result);
  console.log(`Built courses/measurement-uncertainty-lab.html (${Buffer.byteLength(result)} bytes).`);
}
