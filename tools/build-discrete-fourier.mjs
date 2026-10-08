#!/usr/bin/env node
/** Generate a dependency-free, direct-file lab from its reviewed sources. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDeck } from '../src/deck.mjs';

const fourierRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const discreteFourierLabPath = join(fourierRoot, 'courses/discrete-fourier-lab.html');

export function buildDiscreteFourierLab() {
  const deckText = readFileSync(join(fourierRoot, 'courses/discrete-fourier.json'), 'utf8');
  parseDeck(deckText);
  const model = readFileSync(join(fourierRoot, 'src/discrete-fourier.mjs'), 'utf8')
    .replace(/^export (?=(?:const|function) )/gm, '');
  const ui = readFileSync(join(fourierRoot, 'src/discrete-fourier-ui.mjs'), 'utf8')
    .replace(/^import \{ parseFourierSamples, analyzeFourier, serializeFourierRecord \} from '\.\/discrete-fourier\.mjs';\r?\n/, '');
  if (/^\s*(?:import|export)\s/m.test(model + '\n' + ui)) throw new Error('Unsupported standalone module declaration.');
  if (/<\/script\b/i.test(model + ui)) throw new Error('Standalone source contains an HTML script closing tag.');
  let result = readFileSync(join(fourierRoot, 'templates/discrete-fourier-lab.html'), 'utf8');
  for (const [marker, value] of [
    ['/* FOURIER_DECK_TEXT */', JSON.stringify(deckText).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029')],
    ['/* FOURIER_MODEL */', model],
    ['/* FOURIER_UI */', ui]
  ]) {
    if (result.split(marker).length !== 2) throw new Error('Expected exactly one marker: ' + marker);
    result = result.replace(marker, () => value);
  }
  return result;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 1 || args[0] !== '--check')) {
    console.error('Usage: node tools/build-discrete-fourier.mjs [--check]');
    process.exitCode = 2;
  } else {
    const result = buildDiscreteFourierLab();
    if (args[0] === '--check') {
      if (readFileSync(discreteFourierLabPath, 'utf8') !== result) {
        console.error('discrete-fourier-lab.html differs from its source inputs.');
        process.exitCode = 1;
      } else console.log('Discrete Fourier lab matches its sources.');
    } else {
      writeFileSync(discreteFourierLabPath, result);
      console.log('Built courses/discrete-fourier-lab.html (' + Buffer.byteLength(result) + ' bytes).');
    }
  }
}
