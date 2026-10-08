#!/usr/bin/env node
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseDeck} from '../src/deck.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function renderBooleanExplorer({template, validator, model, ui, deckText}) {
  parseDeck(deckText);
  const inline = source => {
    const result = source.replace(/^import .+;\r?\n/gmu, '').replace(/^export /gmu, '');
    if (/^import\s|<\/script/imu.test(result)) throw new Error('Inline source has an unsupported import or closing script tag.');
    return result;
  };
  const replacements = {
    __BOOLEAN_DECK_TEXT__: JSON.stringify(deckText).replace(/</gu, '\\u003c').replace(/\u2028/gu, '\\u2028').replace(/\u2029/gu, '\\u2029'),
    __DECK_VALIDATOR__: inline(validator), __BOOLEAN_MODEL__: inline(model), __BOOLEAN_UI__: inline(ui)
  };
  let result = template;
  for (const [marker, value] of Object.entries(replacements)) {
    if (result.split(marker).length !== 2) throw new Error(`Expected exactly one ${marker} marker.`);
    result = result.replace(marker, () => value);
  }
  return result;
}

export function buildBooleanExplorer(root = project) {
  const read = path => readFileSync(resolve(root, path), 'utf8');
  return renderBooleanExplorer({
    template: read('templates/boolean-logic-explorer.html'), validator: read('src/deck.mjs'),
    model: read('src/boolean-logic.mjs'), ui: read('src/boolean-logic-ui.mjs'), deckText: read('courses/boolean-logic.json')
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check')) throw new Error('Usage: node tools/build-boolean-logic.mjs [--check]');
  const output = resolve(project, 'courses/boolean-logic-explorer.html');
  const generated = buildBooleanExplorer();
  if (args.includes('--check')) {
    if (readFileSync(output, 'utf8') !== generated) throw new Error('The standalone Boolean explorer is out of date. Run this builder.');
    console.log('Standalone Boolean explorer matches its source.');
  } else {
    writeFileSync(output, generated);
    console.log(`Built ${output} (${Buffer.byteLength(generated)} bytes).`);
  }
}
