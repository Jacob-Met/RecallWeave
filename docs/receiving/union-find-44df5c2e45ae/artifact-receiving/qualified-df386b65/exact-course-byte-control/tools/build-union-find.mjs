import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length > 1 || (args.length && args[0] !== '--check')) throw new Error('Use no argument, or --check.');
const inputs = {template: 'templates/union-find-explorer.html', model: 'src/union-find.mjs', ui: 'src/union-find-ui.mjs', deck: 'courses/union-find.json', guide: 'courses/union-find.md'};
const values = Object.fromEntries(await Promise.all(Object.entries(inputs).map(async ([key, path]) => [key, await readFile(resolve(root, path), 'utf8')])));
parseDeck(values.deck);
const names = ['UNION_FIND_PRESETS', 'parseUnionFindInput', 'traceUnionFind'];
const importLine = "import { UNION_FIND_PRESETS, parseUnionFindInput, traceUnionFind } from './union-find.mjs';\n";
if (!values.ui.startsWith(importLine) || /^\s*import\s/m.test(values.ui.slice(importLine.length)) || /^\s*import\s/m.test(values.model)) throw new Error('Unexpected explorer import boundary.');
const exports = [...values.model.matchAll(/^export (?:function|const) (\w+)/gm)].map(match => match[1]);
if (JSON.stringify(exports) !== JSON.stringify(names)) throw new Error('Unexpected model exports.');
const model = values.model.replace(/^export (?=function|const)/gm, '');
const script = 'const { ' + names.join(', ') + ' } = (() => {\n' + model + '\nreturn { ' + names.join(', ') + ' };\n})();\n' + values.ui.slice(importLine.length);
if (/<\/script/i.test(script)) throw new Error('Embedded source must not close its script element.');
const replacements = {'@@COURSE_JSON@@': JSON.stringify(values.deck).replaceAll('<', '\\u003c'), '@@GUIDE_JSON@@': JSON.stringify(values.guide).replaceAll('<', '\\u003c'), '@@SCRIPT@@': script};
let output = values.template;
for (const [marker, text] of Object.entries(replacements)) {
  if (output.split(marker).length !== 2) throw new Error('Expected one template marker: ' + marker);
  output = output.replace(marker, () => text);
}
if (/@@[A-Z_]+@@/.test(output)) throw new Error('Unresolved template marker.');
const target = resolve(root, 'courses/union-find-explorer.html');
if (args.length) {
  if (await readFile(target, 'utf8') !== output) throw new Error('Rebuild the union-find explorer.');
  console.log('Union-find explorer matches the exact declared sources.');
} else {
  await writeFile(target, output, 'utf8');
  console.log('Built courses/union-find-explorer.html');
}
