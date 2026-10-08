import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--check') || args.length > 1) {
  throw new Error('Usage: node tools/build-sampling-aliasing.mjs [--check]');
}
const [template, model, ui, courseText] = await Promise.all([
  readFile(resolve(root, 'templates/sampling-aliasing-lab.html'), 'utf8'),
  readFile(resolve(root, 'src/sampling-aliasing.mjs'), 'utf8'),
  readFile(resolve(root, 'src/sampling-aliasing-ui.mjs'), 'utf8'),
  readFile(resolve(root, 'courses/sampling-aliasing.json'), 'utf8'),
]);
parseDeck(courseText);
const expectedImport = "import { analyzeSampling, cosineAt, samplingCsv } from './sampling-aliasing.mjs';\n";
if (!ui.startsWith(expectedImport)) throw new Error('The standalone builder needs its explicit sampling UI import.');
const script = `(() => {\n'use strict';\n${model.replace(/^export /gm, '')}\n${ui.slice(expectedImport.length).replace(/^export /gm, '')}\n})();`;
if (/<\/script/i.test(script)) throw new Error('Inline source must not contain an HTML script closing tag.');
const replacements = {
  '@@SAMPLING_SCRIPT@@': script,
  '@@SAMPLING_COURSE@@': JSON.stringify(courseText).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'),
};
for (const token of Object.keys(replacements)) {
  if (template.split(token).length !== 2) throw new Error(`Template needs exactly one ${token} placeholder.`);
}
const html = template.replace(/@@SAMPLING_(?:SCRIPT|COURSE)@@/g, token => replacements[token]);
const destination = resolve(root, 'courses/sampling-aliasing-lab.html');
if (args.includes('--check')) {
  const existing = await readFile(destination, 'utf8');
  if (html !== existing) throw new Error('Sampling lab is stale. Run node tools/build-sampling-aliasing.mjs.');
  process.stdout.write('Sampling lab matches its native sources and validated course.\n');
} else {
  await writeFile(destination, html);
  process.stdout.write('Built courses/sampling-aliasing-lab.html with no external runtime dependencies.\n');
}
