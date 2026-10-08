#!/usr/bin/env node
/** Build the optional direct-file explorer from its checked native sources. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const unitExplorerPath = join(root, 'courses/unit-conversion-explorer.html');

export function buildUnitExplorer() {
  const courseText = readFileSync(join(root, 'courses/units-and-dimensions.json'), 'utf8');
  parseDeck(courseText);
  const calculations = readFileSync(join(root, 'src/unit-conversion.mjs'), 'utf8')
    .replace(/^export (?=(?:const|function) )/gm, '');
  const rawUi = readFileSync(join(root, 'src/unit-conversion-ui.mjs'), 'utf8');
  const importLine = "import { UNIT_CATALOG, parseUnitExpression, convertUnits } from './unit-conversion.mjs';\n";
  if (!rawUi.startsWith(importLine)) throw new Error('The explorer UI import changed; review standalone composition.');
  const ui = rawUi.slice(importLine.length);
  if (/^\s*(?:import|export)\s/m.test(calculations + '\n' + ui)) {
    throw new Error('Standalone source contains an unsupported module declaration.');
  }
  if (/<\/script\b/i.test(calculations + ui)) throw new Error('Standalone JavaScript contains a closing script tag.');
  let result = readFileSync(join(root, 'courses/unit-conversion-explorer.template.html'), 'utf8');
  for (const [marker, replacement] of [
    ['/* UNIT_COURSE_TEXT */', JSON.stringify(courseText).replaceAll('<', '\\u003c')],
    ['/* UNIT_CALCULATIONS */', calculations],
    ['/* UNIT_UI */', ui],
  ]) {
    if (result.split(marker).length !== 2) throw new Error('Expected exactly one template marker: ' + marker);
    result = result.replace(marker, () => replacement);
  }
  return result;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const mode = process.argv.slice(2);
  if (mode.length > 1 || (mode.length === 1 && mode[0] !== '--check')) throw new Error('Expected optional --check only.');
  const output = buildUnitExplorer();
  if (mode[0] === '--check') {
    if (readFileSync(unitExplorerPath, 'utf8') !== output) throw new Error('Rebuild the unit conversion explorer from its current sources.');
    console.log('The standalone unit explorer matches its checked source and exact course bytes.');
  } else {
    writeFileSync(unitExplorerPath, output);
    console.log('Built courses/unit-conversion-explorer.html (' + Buffer.byteLength(output) + ' bytes).');
  }
}
