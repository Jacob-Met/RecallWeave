import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
import {parseDeck} from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFile(resolve(root, path), 'utf8');
const [template, core, ui, course, guide] = await Promise.all([
  read('templates/reservoir-sampling-lab.html'),
  read('src/reservoir-sampling.mjs'), read('src/reservoir-sampling-ui.mjs'),
  read('courses/reservoir-sampling.json'), read('courses/reservoir-sampling.md')
]);
parseDeck(course);
const importLine = "import {traceReservoir, distributionReservoir} from './reservoir-sampling.mjs';";
if (!ui.startsWith(importLine + '\n')) throw new Error('Unexpected UI import boundary');
const inlineCore = core.replace(/^export (?=function )/gm, '');
if (/^export /m.test(inlineCore)) throw new Error('Unhandled core export');
const quote = text => JSON.stringify(text).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const inserts = {
  '/*__ASSETS__*/': 'const COURSE_TEXT = ' + quote(course) + ';\nconst GUIDE_TEXT = ' + quote(guide) + ';',
  '/*__CORE__*/': inlineCore,
  '/*__UI__*/': ui.slice(importLine.length + 1)
};
let output = template;
for (const [marker, text] of Object.entries(inserts)) {
  if (output.split(marker).length !== 2) throw new Error('Expected exactly one marker: ' + marker);
  output = output.replace(marker, () => text);
}
if (/<script[^>]+src=/i.test(output)) throw new Error('Standalone page must not load external scripts');
await writeFile(resolve(root, 'courses/reservoir-sampling-lab.html'), output, 'utf8');
process.stdout.write(JSON.stringify({output: 'courses/reservoir-sampling-lab.html', bytes: Buffer.byteLength(output)}) + '\n');
