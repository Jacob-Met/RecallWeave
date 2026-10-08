import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length > 1 || (args.length && args[0] !== '--check')) throw new Error('Use no argument, or --check.');
const paths = {
  template: 'courses/binary-search-explorer.template.html',
  model: 'src/binary-search-explorer.mjs',
  ui: 'src/binary-search-explorer-ui.mjs',
  deck: 'courses/binary-search.json',
  guide: 'courses/binary-search.md'
};
const values = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, path]) =>
  [key, await readFile(resolve(root, path), 'utf8')])));
validateDeck(JSON.parse(values.deck));
const names = ['parseBinarySearchInput', 'traceLowerBound', 'BINARY_SEARCH_PRESETS'];
const importLine = "import { parseBinarySearchInput, traceLowerBound, BINARY_SEARCH_PRESETS } from './binary-search-explorer.mjs';\n";
if (!values.ui.startsWith(importLine) || /^\s*import\s/m.test(values.ui.slice(importLine.length))
  || /^\s*import\s/m.test(values.model)) throw new Error('Unexpected explorer import boundary.');
const exports = [...values.model.matchAll(/^export (?:function|const) (\w+)/gm)].map(match => match[1]);
if (JSON.stringify(exports) !== JSON.stringify(names)) throw new Error('Unexpected model exports.');
const model = values.model.replace(/^export (?=function|const)/gm, '');
const script = 'const { ' + names.join(', ') + ' } = (() => {\n' + model
  + '\nreturn { ' + names.join(', ') + ' };\n})();\n' + values.ui.slice(importLine.length);
if (/<\/script/i.test(script)) throw new Error('Embedded source must not close its script element.');
const replacements = {
  '@@DECK_JSON@@': JSON.stringify(values.deck).replaceAll('<', '\\u003c'),
  '@@GUIDE_JSON@@': JSON.stringify(values.guide).replaceAll('<', '\\u003c'),
  '@@SCRIPT@@': script
};
let output = values.template;
for (const [marker, text] of Object.entries(replacements)) {
  if (output.split(marker).length !== 2) throw new Error('Template marker must occur exactly once: ' + marker);
  output = output.replace(marker, () => text);
}
if (/@@[A-Z_]+@@/.test(output)) throw new Error('Unresolved template marker.');
const target = resolve(root, 'courses/binary-search-explorer.html');
if (args.length) {
  if (await readFile(target, 'utf8') !== output) throw new Error('Rebuild the binary-search explorer.');
  console.log('Binary-search explorer matches its original course and exact source inputs.');
} else {
  await writeFile(target, output, 'utf8');
  console.log('Built courses/binary-search-explorer.html');
}
