#!/usr/bin/env node
/** Build only the optional logical-clock companion from its native source and original lesson text. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const logicalClocksExplorerPath = join(root, 'courses/logical-clocks-explorer.html');
const expectedImport = "import { CLOCK_GRAPH, createClockTrace, compareClockEvents, clockTotalOrder } from './logical-clocks.mjs';\n";

export function renderLogicalClocksExplorer({ template, modelSource, uiSource, courseText, guideText }) {
  if ([template, modelSource, uiSource, courseText, guideText].some(value => typeof value !== 'string')) {
    throw new TypeError('The logical-clock companion requires complete template, model, UI, course and guide strings.');
  }
  parseDeck(courseText);
  if (!uiSource.startsWith(expectedImport)) throw new Error('The companion requires its explicit native logical-clock model import.');
  const model = modelSource.replace(/^export (?=(?:const|function) )/gm, '');
  const ui = uiSource.slice(expectedImport.length);
  const script = `(() => {\n'use strict';\n${model}\n${ui}\n})();`;
  if (/^\s*(?:import|export)\s/m.test(script)) throw new Error('The standalone companion contains an unsupported module declaration.');
  if (/<\/script\b/i.test(script)) throw new Error('Inline source must not contain an HTML script closing tag.');
  const encodeText = text => JSON.stringify(text).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
  const replacements = {
    '@@LOGICAL_CLOCKS_COURSE@@': encodeText(courseText),
    '@@LOGICAL_CLOCKS_GUIDE@@': encodeText(guideText),
    '@@LOGICAL_CLOCKS_SCRIPT@@': script,
  };
  for (const marker of Object.keys(replacements)) {
    if (template.split(marker).length !== 2) throw new Error(`Expected exactly one build marker: ${marker}`);
  }
  return template.replace(/@@LOGICAL_CLOCKS_(?:COURSE|GUIDE|SCRIPT)@@/g, marker => replacements[marker]);
}

export function buildLogicalClocksExplorer() {
  const read = path => readFileSync(join(root, path), 'utf8');
  return renderLogicalClocksExplorer({
    template: read('courses/logical-clocks-explorer.template.html'),
    modelSource: read('src/logical-clocks.mjs'),
    uiSource: read('src/logical-clocks-ui.mjs'),
    courseText: read('courses/logical-clocks.json'),
    guideText: read('courses/logical-clocks.md'),
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(arg => arg !== '--check')) {
    throw new Error('Usage: node tools/build-logical-clocks.mjs [--check]');
  }
  const html = buildLogicalClocksExplorer();
  if (args.includes('--check')) {
    if (readFileSync(logicalClocksExplorerPath, 'utf8') !== html) throw new Error('The companion is stale. Run node tools/build-logical-clocks.mjs.');
    console.log('Logical-clock companion matches its native source and original course and guide.');
  } else {
    writeFileSync(logicalClocksExplorerPath, html);
    console.log(`Built courses/logical-clocks-explorer.html (${Buffer.byteLength(html)} bytes).`);
  }
}
