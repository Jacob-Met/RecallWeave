import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { parseDeck, serializeDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = name => readFile(resolve(root, name), 'utf8');
const paths = ['templates/euler-trails.html', 'src/euler-trails.mjs', 'src/euler-trails-ui.mjs', 'courses/euler-trails.json', 'courses/euler-trails.md'];
const [template, core, ui, deck, guide] = await Promise.all(paths.map(read));
if (serializeDeck(parseDeck(deck)) !== deck) throw new Error('Course must use canonical checked-deck serialization.');
for (const [name, text] of [['model', core], ['UI', ui]]) {
  if (/<\/script\b/i.test(text)) throw new Error(`${name} contains an unsafe closing script tag.`);
}
const replacements = {
  '/* EULER_MODEL */': core.replace(/^export /gm, ''),
  '/* EULER_UI */': ui.replace(/^import .* from ['"]\.\/euler-trails\.mjs['"];\r?\n/m, ''),
  '/* EULER_FILES */': 'const COURSE_TEXT = ' + JSON.stringify(deck).replace(/</g, '\\u003c') + ';\nconst GUIDE_TEXT = ' + JSON.stringify(guide).replace(/</g, '\\u003c') + ';'
};
let html = template;
for (const [marker, content] of Object.entries(replacements)) {
  if (html.split(marker).length !== 2) throw new Error(`Expected one ${marker} marker.`);
  html = html.replace(marker, () => content);
}
if (/\/\* EULER_[A-Z]+ \*\//.test(html)) throw new Error('Unresolved standalone marker.');
const target = resolve(root, 'courses/euler-trails-explorer.html');
if (process.argv.includes('--check')) {
  if (await readFile(target, 'utf8') !== html) throw new Error('Standalone differs; regenerate with build-euler-trails.mjs.');
  console.log('Euler standalone matches all five source inputs.');
} else {
  await writeFile(target, html);
  console.log(`Wrote ${Buffer.byteLength(html)} bytes to courses/euler-trails-explorer.html.`);
}
