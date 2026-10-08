#!/usr/bin/env node
/** Deterministic direct-file build using only Node and the existing deck validator. */
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {parseDeck, serializeDeck} from '../src/deck.mjs';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--check') || args.length > 1) throw new Error('Usage: node tools/build-strongly-connected-components.mjs [--check]');
const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const [template, core, ui, course, guide] = await Promise.all([
  read('courses/strongly-connected-components-explorer.template.html'),
  read('src/strongly-connected-components.mjs'),
  read('src/strongly-connected-components-ui.mjs'),
  read('courses/strongly-connected-components.json'),
  read('courses/strongly-connected-components.md')
]);
if (serializeDeck(parseDeck(course)) !== course) throw new Error('Use canonical serializeDeck formatting for the course.');
if (!guide.trim()) throw new Error('The worked guide is empty.');
const assets = {
  course: {name: 'strongly-connected-components.json', mime: 'application/json;charset=utf-8', base64: Buffer.from(course, 'utf8').toString('base64')},
  guide: {name: 'strongly-connected-components.md', mime: 'text/markdown;charset=utf-8', base64: Buffer.from(guide, 'utf8').toString('base64')}
};
for (const marker of ['<!-- STRONG_COMPONENTS_DATA -->', '<!-- STRONG_COMPONENTS_SCRIPT -->']) {
  if (template.split(marker).length !== 2) throw new Error('Expected exactly one ' + marker);
}
if (/<\/script/i.test(core + ui) || /^\s*import\s/m.test(core + ui)) throw new Error('The standalone script must not close its element or import another file.');
const html = template
  .replace('<!-- STRONG_COMPONENTS_DATA -->', '<script id="component-assets" type="application/json">' + JSON.stringify(assets) + '</script>')
  .replace('<!-- STRONG_COMPONENTS_SCRIPT -->', '<script type="module">\n' + core + '\n' + ui + '</script>');
const target = new URL('courses/strongly-connected-components-explorer.html', root);
if (args.includes('--check')) {
  if (await readFile(target, 'utf8') !== html) throw new Error('The standalone explorer is stale. Rebuild it.');
  console.log('PASS: standalone explorer matches core, UI, template and exact course/guide bytes.');
} else {
  await writeFile(target, html);
  console.log('Built ' + fileURLToPath(target) + ' (' + Buffer.byteLength(html, 'utf8') + ' bytes).');
}
