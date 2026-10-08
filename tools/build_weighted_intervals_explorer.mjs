#!/usr/bin/env node
/** Build the direct-file explorer from exact local source; Node 20+, no packages. */
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {parseDeck, serializeDeck} from '../src/deck.mjs';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--check')) {
  throw new Error('Usage: node tools/build_weighted_intervals_explorer.mjs [--check]');
}
const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const [template, core, ui, courseText] = await Promise.all([
  read('courses/weighted-intervals-explorer.template.html'),
  read('courses/weighted-intervals-core.mjs'),
  read('courses/weighted-intervals-ui.mjs'),
  read('courses/weighted-interval-scheduling.json')
]);
const canonical = serializeDeck(parseDeck(courseText));
if (canonical !== courseText) {
  throw new Error('The course must use the existing canonical deck serializer before building.');
}
const importLine = "import {EXAMPLES, LIMITS, solveSchedule} from './weighted-intervals-core.mjs';\n";
if (!ui.startsWith(importLine) || ui.split(importLine).length !== 2) {
  throw new Error('The UI must have exactly the expected local core import.');
}
const script = core + '\n' + ui.slice(importLine.length);
if (/<\/script/i.test(script)) throw new Error('Inline script source contains a closing script tag.');
for (const marker of ['<!-- WEIGHTED_INTERVALS_DECK -->', '<!-- WEIGHTED_INTERVALS_SCRIPT -->']) {
  if (template.split(marker).length !== 2) throw new Error('Expected exactly one ' + marker);
}
const html = template
  .replace('<!-- WEIGHTED_INTERVALS_DECK -->', '<script id="course-data" type="application/json">' + canonical.replaceAll('<', '\\u003c') + '</script>')
  .replace('<!-- WEIGHTED_INTERVALS_SCRIPT -->', '<script type="module">\n' + script + '\n</script>');
const target = new URL('courses/weighted-intervals-explorer.html', root);
if (args.includes('--check')) {
  if (await readFile(target, 'utf8') !== html) {
    throw new Error('The offline explorer is stale. Run node tools/build_weighted_intervals_explorer.mjs.');
  }
  console.log('PASS: explorer matches its template, core, UI and checked course bytes.');
} else {
  await writeFile(target, html);
  console.log('Built ' + fileURLToPath(target) + ' (' + Buffer.byteLength(html) + ' bytes).');
}
