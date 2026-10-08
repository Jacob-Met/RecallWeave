import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { Script } from 'node:vm';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--check') || args.length > 1) {
  throw new Error('Usage: node tools/build-phasor-interference.mjs [--check]');
}
const [template, model, ui, courseText] = await Promise.all([
  readFile(resolve(root, 'templates/phasor-interference-lab.html'), 'utf8'),
  readFile(resolve(root, 'src/phasor-interference.mjs'), 'utf8'),
  readFile(resolve(root, 'src/phasor-interference-ui.mjs'), 'utf8'),
  readFile(resolve(root, 'courses/phasor-interference.json'), 'utf8'),
]);
parseDeck(courseText);
const expectedImport = "import { analyzeInterference, interferenceJson, interferenceCsv, DEFAULT_INTERFERENCE } from './phasor-interference.mjs';\n";
if (!ui.startsWith(expectedImport)) throw new Error('The standalone builder needs its explicit phasor UI import.');
const combined = model.replace(/^export /gm, '') + '\n' + ui.slice(expectedImport.length).replace(/^export /gm, '');
if (/^\s*(?:import|export)\b/m.test(combined)) throw new Error('Unexpected module boundary in inline sources.');
const script = "(() => {\n'use strict';\n" + combined + '\n})();';
if (/<\/script/i.test(script)) throw new Error('Inline source must not contain an HTML script closing tag.');
new Script(script, { filename: 'phasor-interference-inline.js' });
const replacements = {
  '@@PHASOR_SCRIPT@@': script,
  '@@PHASOR_COURSE@@': JSON.stringify(courseText).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'),
};
for (const token of Object.keys(replacements)) {
  if (template.split(token).length !== 2) throw new Error('Template needs exactly one ' + token + ' placeholder.');
}
const html = template.replace(/@@PHASOR_(?:SCRIPT|COURSE)@@/g, token => replacements[token]);
const destination = resolve(root, 'courses/phasor-interference-lab.html');
if (args.includes('--check')) {
  if (html !== await readFile(destination, 'utf8')) throw new Error('Phasor lab is stale. Run node tools/build-phasor-interference.mjs.');
  process.stdout.write('Phasor lab matches its native sources and validated course.\n');
} else {
  await writeFile(destination, html);
  process.stdout.write('Built courses/phasor-interference-lab.html with no external runtime dependencies.\n');
}
