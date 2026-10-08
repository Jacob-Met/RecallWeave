#!/usr/bin/env node
/** Build only the optional graph companion; shared learner/author pages stay exact. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const dependencyExplorerPath = join(root, 'courses/dependency-graphs-explorer.html');
const expectedImport = "import { parseGraph, analyzeGraph, completeJob, undoCompletion, resetCompletion, reachableFrom, enumerateCompletions } from './dependency-plan.mjs';\n";

export function renderDependencyExplorer({ template, modelSource, uiSource, courseText }) {
  parseDeck(courseText);
  if (!uiSource.startsWith(expectedImport)) throw new Error('The companion requires its explicit native graph-model import.');
  const model = modelSource.replace(/^export (?=(?:const|function) )/gm, '');
  const ui = uiSource.slice(expectedImport.length);
  const script = `(() => {\n'use strict';\n${model}\n${ui}\n})();`;
  if (/^\s*(?:import|export)\s/m.test(script)) throw new Error('The standalone companion contains an unsupported module declaration.');
  if (/<\/script\b/i.test(script)) throw new Error('Inline source must not contain an HTML script closing tag.');
  const replacements = {
    '@@GRAPH_COURSE@@': JSON.stringify(courseText).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029'),
    '@@GRAPH_SCRIPT@@': script,
  };
  for (const marker of Object.keys(replacements)) {
    if (template.split(marker).length !== 2) throw new Error(`Expected exactly one build marker: ${marker}`);
  }
  return template.replace(/@@GRAPH_(?:COURSE|SCRIPT)@@/g, marker => replacements[marker]);
}

export function buildDependencyExplorer() {
  const read = path => readFileSync(join(root, path), 'utf8');
  return renderDependencyExplorer({
    template: read('courses/dependency-graphs-explorer.template.html'),
    modelSource: read('src/dependency-plan.mjs'),
    uiSource: read('src/dependency-plan-ui.mjs'),
    courseText: read('courses/dependency-graphs.json'),
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(arg => arg !== '--check')) {
    throw new Error('Usage: node tools/build-dependency-graphs.mjs [--check]');
  }
  const html = buildDependencyExplorer();
  if (args.includes('--check')) {
    if (readFileSync(dependencyExplorerPath, 'utf8') !== html) throw new Error('The companion is stale. Run node tools/build-dependency-graphs.mjs.');
    console.log('Dependency companion matches its native source and original course.');
  } else {
    writeFileSync(dependencyExplorerPath, html);
    console.log(`Built courses/dependency-graphs-explorer.html (${Buffer.byteLength(html)} bytes).`);
  }
}
