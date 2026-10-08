import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length > 1 || args.some(arg => arg !== '--check')) {
  throw new Error('Usage: node tools/build-complex-plane.mjs [--check]');
}
const [template, core, ui, course] = await Promise.all([
  readFile(resolve(root, 'templates/complex-plane-lab.html'), 'utf8'),
  readFile(resolve(root, 'src/complex-plane.mjs'), 'utf8'),
  readFile(resolve(root, 'src/complex-plane-ui.mjs'), 'utf8'),
  readFile(resolve(root, 'courses/complex-plane.json'), 'utf8'),
]);
parseDeck(course);
const expectedImport = "import { analyzeMultiplication, serializeExperiment, plotGeometry, displayNumber } from './complex-plane.mjs';\n";
if (!ui.startsWith(expectedImport)) throw new Error('The standalone builder requires the declared complex-plane UI import.');
const script = "(() => {\n'use strict';\n" + core.replace(/^export /gm, '') + '\n' +
  ui.slice(expectedImport.length).replace(/^export /gm, '') + '\n})();';
if (/<\/script/i.test(script)) throw new Error('Inline JavaScript contains an HTML script closing tag.');
const replacements = {
  '@@COMPLEX_COURSE@@': JSON.stringify(course).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'),
  '@@COMPLEX_SCRIPT@@': script,
};
for (const token of Object.keys(replacements)) {
  if (template.split(token).length !== 2) throw new Error('The template must contain exactly one ' + token + '.');
}
const html = template.replace(/@@COMPLEX_(?:COURSE|SCRIPT)@@/g, token => replacements[token]);
const destination = resolve(root, 'courses/complex-plane-lab.html');
if (args.includes('--check')) {
  if (await readFile(destination, 'utf8') !== html) throw new Error('The complex-plane lab is stale. Rebuild it with node tools/build-complex-plane.mjs.');
  process.stdout.write('Complex-plane lab matches its native sources and exact checked lesson.\n');
} else {
  const temporary = destination + '.tmp-' + process.pid;
  await writeFile(temporary, html, { flag: 'wx' });
  try { await rename(temporary, destination); }
  catch (error) { await unlink(temporary); throw error; }
  process.stdout.write('Built the offline complex-plane lab from its checked source.\n');
}
