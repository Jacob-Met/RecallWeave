#!/usr/bin/env node
/** Deterministic offline page builder. Node 20+; no packages, server or network. */
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {parseDeck, serializeDeck} from '../src/deck.mjs';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--check')) throw new Error('Usage: node tools/make_shortest_paths_explorer.mjs [--check]');
const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const [template, core, ui, courseText] = await Promise.all([
  read('courses/shortest-paths-explorer.template.html'),
  read('courses/shortest-paths-core.mjs'),
  read('courses/shortest-paths-explorer-ui.mjs'),
  read('courses/shortest-paths.json')
]);
const course = serializeDeck(parseDeck(courseText));
if (course !== courseText) throw new Error('The course must use canonical serializeDeck formatting before building.');
for (const marker of ['<!-- SHORTEST_PATHS_DECK -->', '<!-- SHORTEST_PATHS_SCRIPT -->']) {
  if (template.split(marker).length !== 2) throw new Error('The template needs exactly one ' + marker);
}
if (/<\/script/i.test(core + ui)) throw new Error('Inline script source contains a closing script tag.');
const html = template
  .replace('<!-- SHORTEST_PATHS_DECK -->', '<script id="course-data" type="application/json">' + course.replaceAll('<', '\\u003c') + '</script>')
  .replace('<!-- SHORTEST_PATHS_SCRIPT -->', '<script type="module">\n' + core + '\n' + ui + '</script>');
const target = new URL('courses/shortest-paths-explorer.html', root);
if (args.includes('--check')) {
  if (await readFile(target, 'utf8') !== html) throw new Error('The offline explorer is stale. Rebuild with node tools/make_shortest_paths_explorer.mjs.');
  console.log('PASS: standalone explorer matches the exact template, core, UI and canonical course.');
} else {
  await writeFile(target, html);
  console.log('Built ' + fileURLToPath(target) + ' (' + Buffer.byteLength(html, 'utf8') + ' bytes).');
}
