#!/usr/bin/env node
/** Build the optional timing page without changing the graph lesson or learner. */
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const dependencyTimingPath = join(root, 'courses/dependency-timing.html');
const graphUiImport = "import { parseGraph } from './dependency-plan.mjs';\n";
const timingUiImport = "import { analyzeTiming, MAX_JOB_DURATION } from './dependency-timing.mjs';\n";
const timingModelImport = "import { validateGraph, analyzeGraph } from './dependency-plan.mjs';";

function unexport(source) {
  return source.replace(/^export (?=(?:const|function) )/gm, '');
}

export function renderDependencyTiming({ template, graphSource, timingSource, uiSource }) {
  if (!uiSource.startsWith(graphUiImport + timingUiImport)) {
    throw new Error('The timing UI requires its two explicit native model imports.');
  }
  if (timingSource.split(timingModelImport).length !== 2) {
    throw new Error('The timing model requires its exact native graph-model import.');
  }
  const graph = unexport(graphSource);
  const timing = unexport(timingSource.replace(timingModelImport, ''));
  const ui = uiSource.slice((graphUiImport + timingUiImport).length);
  const script = "(() => {\n'use strict';\n" +
    'const graphModel = (() => {\n' + graph + '\nreturn { parseGraph, validateGraph, analyzeGraph };\n})();\n' +
    'const timingModel = (() => {\nconst { validateGraph, analyzeGraph } = graphModel;\n' + timing +
    '\nreturn { analyzeTiming, MAX_JOB_DURATION };\n})();\n' +
    'const { parseGraph } = graphModel;\nconst { analyzeTiming, MAX_JOB_DURATION } = timingModel;\n' + ui + '\n})();';
  if (/^\s*(?:import|export)\s/m.test(script) || /\bimport\s*\(/u.test(script)) {
    throw new Error('The standalone timing page contains an unsupported module declaration.');
  }
  if (/<\/script\b/i.test(script)) throw new Error('Inline source must not contain an HTML script closing tag.');
  const marker = '@@TIMING_SCRIPT@@';
  if (template.split(marker).length !== 2) throw new Error('Expected exactly one timing script build marker.');
  return template.replace(marker, () => script);
}

export function buildDependencyTiming() {
  const read = path => readFileSync(join(root, path), 'utf8');
  return renderDependencyTiming({
    template: read('courses/dependency-timing.template.html'),
    graphSource: read('src/dependency-plan.mjs'),
    timingSource: read('src/dependency-timing.mjs'),
    uiSource: read('src/dependency-timing-ui.mjs'),
  });
}

if (process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(arg => arg !== '--check')) {
    throw new Error('Usage: node tools/build-dependency-timing.mjs [--check]');
  }
  const html = buildDependencyTiming();
  if (args.includes('--check')) {
    if (readFileSync(dependencyTimingPath, 'utf8') !== html) {
      throw new Error('The timing page is stale. Run node tools/build-dependency-timing.mjs.');
    }
    console.log('Dependency timing page matches its exact native graph, timing and UI sources.');
  } else {
    writeFileSync(dependencyTimingPath, html);
    console.log('Built courses/dependency-timing.html (' + Buffer.byteLength(html) + ' bytes).');
  }
}
