import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { validateDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const paths = {
  template: 'courses/numerical-precision-explorer.template.html',
  deck: 'courses/numerical-precision.json',
  guide: 'courses/numerical-precision.md',
  model: 'src/numerical-precision.mjs',
  ui: 'src/numerical-precision-ui.mjs',
  output: 'courses/numerical-precision-explorer.html'
};
if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('Use no arguments, or --check.');
const values = Object.fromEntries(await Promise.all(Object.entries(paths).filter(([key]) => key !== 'output')
  .map(async ([key, path]) => [key, await readFile(resolve(root, path), 'utf8')])));
validateDeck(JSON.parse(values.deck));
const importLine = "import { analyzeDecimalOperation, serializeWorkedExample, PRECISION_PRESETS } from './numerical-precision.mjs';\n";
if (!values.ui.startsWith(importLine) || /^\s*import\s/m.test(values.ui.slice(importLine.length))) {
  throw new Error('Unexpected explorer import boundary.');
}
const exports = [...values.model.matchAll(/^export (?:function|const) (\w+)/gm)].map(match => match[1]);
if (JSON.stringify(exports) !== JSON.stringify(['analyzeDecimalOperation', 'serializeWorkedExample', 'PRECISION_PRESETS'])) {
  throw new Error('Unexpected model exports.');
}
const model = values.model.replace(/^export (?=function|const)/gm, '');
const script = 'const { analyzeDecimalOperation, serializeWorkedExample, PRECISION_PRESETS } = (() => {\n'
  + model + '\nreturn { analyzeDecimalOperation, serializeWorkedExample, PRECISION_PRESETS };\n})();\n'
  + values.ui.slice(importLine.length);
if (/<\/script/i.test(script)) throw new Error('Embedded source must not close the script element.');
const replacements = {
  '@@DECK_JSON@@': JSON.stringify(values.deck).replaceAll('<', '\\u003c'),
  '@@GUIDE_JSON@@': JSON.stringify(values.guide).replaceAll('<', '\\u003c'),
  '@@SCRIPT@@': script
};
let output = values.template;
for (const [marker, value] of Object.entries(replacements)) {
  if (output.split(marker).length !== 2) throw new Error('Template marker must occur exactly once: ' + marker);
  output = output.replace(marker, () => value);
}
if (/@@(?:DECK_JSON|GUIDE_JSON|SCRIPT)@@/.test(output)) throw new Error('An unresolved template marker remains.');
const target = resolve(root, paths.output);
if (process.argv.includes('--check')) {
  if (await readFile(target, 'utf8') !== output) throw new Error('Rebuild the numerical precision explorer.');
  console.log('Numerical precision explorer matches its exact source inputs.');
} else {
  await writeFile(target, output, 'utf8');
  console.log('Built courses/numerical-precision-explorer.html');
}
