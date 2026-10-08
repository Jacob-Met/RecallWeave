#!/usr/bin/env node
/** Build the optional direct-file lab using its own sources and the unchanged course validator. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const finiteConvolutionLabPath = join(root, 'courses/finite-convolution-lab.html');

export function buildFiniteConvolutionLab() {
  const deckText = readFileSync(join(root, 'courses/finite-convolution.json'), 'utf8');
  parseDeck(deckText);
  const model = readFileSync(join(root, 'src/finite-convolution.mjs'), 'utf8')
    .replace(/^export (?=(?:const|function) )/gm, '');
  const ui = readFileSync(join(root, 'src/finite-convolution-ui.mjs'), 'utf8')
    .replace(/^import \{ parseConvolutionSequence, createConvolutionRecord, formatConvolutionValue \} from '\.\/finite-convolution\.mjs';\r?\n/, '');
  if (/^\s*(?:import|export)\s/m.test(model + '\n' + ui)) throw new Error('Unsupported standalone module declaration.');
  if (/<\/script\b/i.test(model + ui)) throw new Error('Standalone source contains an HTML script closing tag.');
  let result = readFileSync(join(root, 'templates/finite-convolution-lab.html'), 'utf8');
  for (const [marker, value] of [
    ['/* CONVOLUTION_DECK_TEXT */', JSON.stringify(deckText).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029')],
    ['/* CONVOLUTION_MODEL */', model],
    ['/* CONVOLUTION_UI */', ui]
  ]) {
    if (result.split(marker).length !== 2) throw new Error('Expected exactly one marker: ' + marker);
    result = result.replace(marker, () => value);
  }
  return result;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 1 || args[0] !== '--check')) {
    console.error('Usage: node tools/build-finite-convolution.mjs [--check]');
    process.exitCode = 2;
  } else {
    const result = buildFiniteConvolutionLab();
    if (args[0] === '--check') {
      if (readFileSync(finiteConvolutionLabPath, 'utf8') !== result) {
        console.error('finite-convolution-lab.html differs from its source inputs.');
        process.exitCode = 1;
      } else console.log('Finite convolution lab matches its sources.');
    } else {
      writeFileSync(finiteConvolutionLabPath, result);
      console.log('Built courses/finite-convolution-lab.html (' + Buffer.byteLength(result) + ' bytes).');
    }
  }
}
