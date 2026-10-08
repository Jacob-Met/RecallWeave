#!/usr/bin/env node
/** Build this optional, self-contained lab without changing any shared learner builder. */
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const springLabPath = join(root, 'courses/spring-energy-lab.html');

export function buildSpringLab() {
  const courseText = readFileSync(join(root, 'courses/spring-energy.json'), 'utf8');
  parseDeck(courseText);
  const model = readFileSync(join(root, 'src/spring-energy.mjs'), 'utf8')
    .replace(/^export (?=(?:const|function) )/gm, '');
  const importLine = "import { OSCILLATOR_LIMITS, OSCILLATOR_DEFAULT, inspectOscillator, parseOscillatorInput, sampleOscillatorCycle, serializeOscillatorExperiment } from './spring-energy.mjs';\n";
  const originalUI = readFileSync(join(root, 'src/spring-energy-ui.mjs'), 'utf8');
  if (!originalUI.startsWith(importLine)) throw new Error('Expected the spring UI model import.');
  const ui = originalUI.slice(importLine.length);
  if (/^\s*(?:import|export)\s/m.test(model + '\n' + ui)) {
    throw new Error('Unsupported standalone module declaration.');
  }
  if (/<\/script\b/i.test(model + ui)) throw new Error('Standalone JavaScript contains an HTML script closing tag.');
  let html = readFileSync(join(root, 'templates/spring-energy-lab.html'), 'utf8');
  for (const [marker, replacement] of [
    ['/*__SPRING_COURSE__*/', JSON.stringify(courseText).replaceAll('<', '\\u003c')],
    ['/*__SPRING_MODEL__*/', model],
    ['/*__SPRING_UI__*/', ui],
  ]) {
    if (html.split(marker).length !== 2) throw new Error('Expected exactly one build marker: ' + marker);
    html = html.replace(marker, () => replacement);
  }
  return html;
}

// realpath makes direct invocation through an ordinary filesystem alias work as well.
if (process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    throw new Error('Usage: node tools/build-spring-energy.mjs [--check]');
  }
  const html = buildSpringLab();
  if (args[0] === '--check') {
    if (readFileSync(springLabPath, 'utf8') !== html) {
      throw new Error('Spring lab differs from its source. Run node tools/build-spring-energy.mjs.');
    }
    console.log('Spring lab matches its source (' + Buffer.byteLength(html) + ' bytes).');
  } else {
    writeFileSync(springLabPath, html);
    console.log('Built courses/spring-energy-lab.html (' + Buffer.byteLength(html) + ' bytes).');
  }
}
