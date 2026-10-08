#!/usr/bin/env node
/** Deterministic direct-file builder. Node 20+, no packages or network. */
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {parseDeck, serializeDeck} from '../src/deck.mjs';

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
  throw new Error('Usage: node tools/build_recursion_call_stack.mjs [--check]');
}
const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const [template, core, ui, courseText] = await Promise.all([
  read('courses/recursion-call-stack-explorer.template.html'),
  read('courses/recursion-call-stack-core.mjs'),
  read('courses/recursion-call-stack-ui.mjs'),
  read('courses/recursion-call-stack.json')
]);
const course = serializeDeck(parseDeck(courseText));
if (courseText !== course) throw new Error('The original course must use canonical serializeDeck formatting.');
const uiImport = "import {ALGORITHMS, COUNTER_DEFINITIONS, callLabel, createTrace, parseInput, snapshotAt, traceDocument} from './recursion-call-stack-core.mjs';";
if (!ui.startsWith(uiImport + '\n') || ui.split(uiImport).length !== 2) {
  throw new Error('Expected the exact single local core import in the UI source.');
}
const script = core + '\n' + ui.slice(uiImport.length + 1);
if (/<\/script/i.test(script)) throw new Error('Inline source contains a closing script tag.');
for (const marker of ['<!-- RECURSION_COURSE -->', '<!-- RECURSION_SCRIPT -->']) {
  if (template.split(marker).length !== 2) throw new Error('Expected exactly one ' + marker);
}
const html = template
  .replace('<!-- RECURSION_COURSE -->', '<script type="application/json" id="course-data">' + course.replaceAll('<', '\\u003c') + '</script>')
  .replace('<!-- RECURSION_SCRIPT -->', '<script type="module">\n' + script + '</script>');
const target = new URL('courses/recursion-call-stack-explorer.html', root);
if (args[0] === '--check') {
  if (await readFile(target, 'utf8') !== html) throw new Error('The standalone recursion explorer is stale. Run node tools/build_recursion_call_stack.mjs.');
  console.log('PASS: standalone explorer matches the exact template, core, UI and validated course.');
} else {
  await writeFile(target, html);
  console.log('Built ' + fileURLToPath(target) + ' (' + Buffer.byteLength(html, 'utf8') + ' bytes).');
}
