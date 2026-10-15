#!/usr/bin/env node
/** Build the standalone lab from its exact checked sources and unchanged course. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const courseSha256 = '17a35b359ab5c1f097931bba29dcf7deddc75c98accbf1cced8ae5eca9e9ad01';
export const conditionalLabPath = join(root, 'courses/conditional-probability-lab.html');

export function buildConditionalLab() {
  const course = readFileSync(join(root, 'courses/probability-foundations.json'));
  if (course.length !== 13164 || createHash('sha256').update(course).digest('hex') !== courseSha256) {
    throw new Error('The source course changed; explicitly review the new course before rebuilding this companion.');
  }
  const courseText = course.toString('utf8');
  parseDeck(courseText);
  const model = readFileSync(join(root, 'src/conditional-probability.mjs'), 'utf8')
    .replace(/^export (?=(?:const|function) )/gm, '');
  const rawUi = readFileSync(join(root, 'src/conditional-probability-ui.mjs'), 'utf8');
  const importLine = "import { CELL_KEYS, PROBABILITIES, parseCount, parseEventLabel, analyzeTable } from './conditional-probability.mjs';\n";
  if (!rawUi.startsWith(importLine)) throw new Error('Review the UI import before standalone composition.');
  const ui = rawUi.slice(importLine.length);
  if (/^\s*(?:import|export)\s/m.test(model + '\n' + ui)) throw new Error('Unsupported standalone module declaration.');
  if (/<\/script\b/i.test(model + ui)) throw new Error('A closing script tag cannot be embedded in JavaScript.');
  let output = readFileSync(join(root, 'courses/conditional-probability-lab.template.html'), 'utf8');
  for (const [marker, value] of [
    ['/* CONDITIONAL_COURSE_TEXT */', JSON.stringify(courseText).replaceAll('<', '\\u003c')],
    ['/* CONDITIONAL_MODEL */', model],
    ['/* CONDITIONAL_UI */', ui],
  ]) {
    if (output.split(marker).length !== 2) throw new Error('Expected one composition marker: ' + marker);
    output = output.replace(marker, () => value);
  }
  return output;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length && args[0] !== '--check')) throw new Error('Expected optional --check only.');
  const output = buildConditionalLab();
  if (args[0] === '--check') {
    if (readFileSync(conditionalLabPath, 'utf8') !== output) throw new Error('Rebuild the conditional probability lab.');
    console.log('Standalone lab matches its current sources and exact unchanged course bytes.');
  } else {
    writeFileSync(conditionalLabPath, output);
    console.log('Built courses/conditional-probability-lab.html (' + Buffer.byteLength(output) + ' bytes).');
  }
}
