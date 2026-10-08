import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { validateDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length > 1 || args.some(arg => arg !== '--check')) throw new Error('Use no arguments, or --check.');
const paths = {
  template: 'templates/eigen-directions-explorer.html',
  deck: 'courses/eigen-directions.json',
  guide: 'courses/eigen-directions.md',
  model: 'src/eigen-directions.mjs',
  ui: 'src/eigen-directions-ui.mjs'
};
const values = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([name, path]) =>
  [name, await readFile(resolve(root, path), 'utf8')])));
validateDeck(JSON.parse(values.deck));
const importLine = "import { EIGEN_PRESETS, analyzeEigen, serializeEigen } from './eigen-directions.mjs';\n";
if (!values.ui.startsWith(importLine) || values.ui.slice(importLine.length).split('\n').some(line => /^\s*import\s/.test(line))) {
  throw new Error('Unexpected eigen-directions UI import boundary.');
}
const model = values.model.replace(/^export (?=function|const)/gm, '');
if (/^\s*(import|export)\s/m.test(model)) throw new Error('Unexpected model module boundary.');
const script = 'const { EIGEN_PRESETS, analyzeEigen, serializeEigen } = (() => {\n' + model +
  '\nreturn { EIGEN_PRESETS, analyzeEigen, serializeEigen };\n})();\n' + values.ui.slice(importLine.length);
if (script.toLowerCase().includes('<' + '/script')) throw new Error('A source must not close its script element.');
const embeddedText = text => JSON.stringify(text).replaceAll('<', '\\u003c');
let html = values.template;
for (const [marker, replacement] of Object.entries({
  '@@DECK_JSON@@': embeddedText(values.deck),
  '@@GUIDE_JSON@@': embeddedText(values.guide),
  '@@SCRIPT@@': script
})) {
  if (html.split(marker).length !== 2) throw new Error('Expected one template marker: ' + marker);
  html = html.replace(marker, () => replacement);
}
const target = resolve(root, 'courses/eigen-directions-explorer.html');
if (args.includes('--check')) {
  if (await readFile(target, 'utf8') !== html) throw new Error('Rebuild the eigen-directions explorer.');
  console.log('Eigen-directions explorer matches its exact source inputs.');
} else {
  await writeFile(target, html, 'utf8');
  console.log('Built courses/eigen-directions-explorer.html');
}
