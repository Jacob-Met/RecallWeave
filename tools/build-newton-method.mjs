import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { validateDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length > 1 || args.some(arg => arg !== '--check')) {
  throw new Error('Use no arguments, or --check.');
}
const input = {
  template: 'courses/newton-method-explorer.template.html',
  deck: 'courses/newton-method.json',
  guide: 'courses/newton-method.md',
  model: 'src/newton-method.mjs',
  ui: 'src/newton-method-ui.mjs',
};
const values = Object.fromEntries(await Promise.all(Object.entries(input).map(async ([key, path]) => [
  key, await readFile(resolve(root, path), 'utf8'),
])));
validateDeck(JSON.parse(values.deck));
const importLine = "import { NEWTON_PRESETS, analyzeNewton, approximateRational, polynomialLabel } from './newton-method.mjs';\n";
if (!values.ui.startsWith(importLine) || /^\s*import\b/m.test(values.ui.slice(importLine.length))) {
  throw new Error('Unexpected Newton UI import boundary.');
}
const model = values.model.replace(/^export (?=function|const)/gm, '');
if (/^\s*(?:import|export)\b/m.test(model)) throw new Error('Unexpected Newton model module boundary.');
const exposed = 'NEWTON_PRESETS, analyzeNewton, approximateRational, polynomialLabel';
const script = 'const { ' + exposed + ' } = (() => {\n' + model +
  '\nreturn { ' + exposed + ' };\n})();\n' + values.ui.slice(importLine.length);
if (script.toLowerCase().includes('<' + '/script')) throw new Error('Source must not close its script element.');
let html = values.template;
for (const [marker, value] of Object.entries({
  '@@DECK_JSON@@': JSON.stringify(values.deck).replaceAll('<', '\\u003c'),
  '@@GUIDE_JSON@@': JSON.stringify(values.guide).replaceAll('<', '\\u003c'),
  '@@SCRIPT@@': script,
})) {
  if (html.split(marker).length !== 2) throw new Error('Template marker must occur exactly once: ' + marker);
  html = html.replace(marker, () => value);
}
const target = resolve(root, 'courses/newton-method-explorer.html');
if (args.includes('--check')) {
  if (await readFile(target, 'utf8') !== html) throw new Error('Rebuild the Newton method explorer.');
  console.log('Newton method explorer matches its exact source inputs.');
} else {
  await writeFile(target, html, 'utf8');
  console.log('Built courses/newton-method-explorer.html');
}
