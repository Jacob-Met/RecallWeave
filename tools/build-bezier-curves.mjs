import { readFile, writeFile } from 'node:fs/promises';
import { validateDeck } from '../src/deck.mjs';
const args = process.argv.slice(2);
if (args.length > 1 || (args.length && args[0] !== '--check')) throw new Error('Use no argument, or --check.');
const paths = { model: 'src/bezier-curves.mjs', ui: 'src/bezier-curves-ui.mjs', template: 'courses/bezier-curves-explorer.template.html', deck: 'courses/bezier-curves.json', guide: 'courses/bezier-curves.md' };
const source = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, path]) =>
  [key, await readFile(new URL('../' + path, import.meta.url), 'utf8')])));
validateDeck(JSON.parse(source.deck));
const names = ['parseBezierInput', 'traceBezier', 'BEZIER_PRESETS'];
const importLine = "import { parseBezierInput, traceBezier, BEZIER_PRESETS } from './bezier-curves.mjs';\n";
if (!source.ui.startsWith(importLine) || /^\s*import\s/m.test(source.ui.slice(importLine.length)) || /^\s*import\s/m.test(source.model)) throw new Error('Unexpected explorer import boundary.');
const exports = [...source.model.matchAll(/^export (?:function|const) (\w+)/gm)].map(match => match[1]);
if (JSON.stringify(exports) !== JSON.stringify(names)) throw new Error('Unexpected model exports.');
const script = 'const { ' + names.join(', ') + ' } = (() => {\n' + source.model.replace(/^export (?=function|const)/gm, '') + '\nreturn { ' + names.join(', ') + ' };\n})();\n' + source.ui.slice(importLine.length);
if (/<\/script/i.test(script)) throw new Error('Source cannot close its script element.');
let output = source.template;
for (const [marker, content] of Object.entries({ '@@DECK_JSON@@': JSON.stringify(source.deck).replaceAll('<', '\\u003c'), '@@GUIDE_JSON@@': JSON.stringify(source.guide).replaceAll('<', '\\u003c'), '@@SCRIPT@@': script })) {
  if (output.split(marker).length !== 2) throw new Error('Expected one template marker: ' + marker);
  output = output.replace(marker, () => content);
}
if (/@@[A-Z_]+@@/.test(output)) throw new Error('Unresolved template marker.');
const target = new URL('../courses/bezier-curves-explorer.html', import.meta.url);
if (args.length) {
  if (await readFile(target, 'utf8') !== output) throw new Error('Rebuild the Bézier explorer.');
  console.log('Bézier explorer matches its model, UI, validated course and guide.');
} else {
  await writeFile(target, output, 'utf8');
  console.log('Built courses/bezier-curves-explorer.html');
}
