import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const arguments_ = process.argv.slice(2);
if (arguments_.length > 1 || (arguments_.length === 1 && arguments_[0] !== '--check')) {
  throw new Error('Usage: node tools/build-time-stepping.mjs [--check]');
}
const read = path => readFile(resolve(root, path), 'utf8');
const [template, model, ui, course, guide] = await Promise.all([
  read('templates/time-stepping-lab.html'), read('src/time-stepping.mjs'),
  read('src/time-stepping-ui.mjs'), read('courses/time-stepping.json'),
  read('courses/time-stepping.md')
]);
const importLine = "import {simulate, observation} from './time-stepping.mjs';\n";
if (!ui.startsWith(importLine)) throw new Error('Unexpected UI import boundary.');
if ((model.match(/export function /g) ?? []).length !== 2) throw new Error('Unexpected model export boundary.');
const inlinedModel = model.replace(/export function /g, 'function ');
const inlinedUI = ui.slice(importLine.length);
if (/<\/script/i.test(inlinedModel + inlinedUI)) throw new Error('Unsafe inline script delimiter.');
const documents = JSON.stringify({course, guide}).replace(/</g, '\\u003c')
  .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
let output = template;
for (const [token, value] of [['@@DOCUMENTS@@', documents], ['@@MODEL@@', inlinedModel], ['@@UI@@', inlinedUI]]) {
  if (output.split(token).length !== 2) throw new Error('Expected exactly one ' + token);
  output = output.replace(token, () => value);
}
const destination = resolve(root, 'courses/time-stepping-lab.html');
if (arguments_[0] === '--check') {
  if (await readFile(destination, 'utf8') !== output) throw new Error('Time-stepping lab is stale; run the builder.');
  console.log('Time-stepping lab matches its exact source, course and guide bytes.');
} else {
  await writeFile(destination, output);
  console.log('Built courses/time-stepping-lab.html (' + Buffer.byteLength(output) + ' bytes).');
}
