#!/usr/bin/env node
/** Build the optional offline course explorer. No packages or network access. */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let checking = false;
let output = resolve(root, 'courses/feedback-control-lab.html');
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === '--check') checking = true;
  else if (args[index] === '--output' && args[index + 1] && !args[index + 1].startsWith('--')) output = resolve(args[++index]);
  else throw new Error('Usage: node tools/build-feedback-control.mjs [--check] [--output FILE]');
}
const [template, core, ui, course] = await Promise.all([
  readFile(resolve(root, 'templates/feedback-control-lab.html'), 'utf8'),
  readFile(resolve(root, 'src/feedback-control.mjs'), 'utf8'),
  readFile(resolve(root, 'src/feedback-control-ui.mjs'), 'utf8'),
  readFile(resolve(root, 'courses/feedback-control.json'))
]);
parseDeck(course.toString('utf8'));
const importLine = "import { DEFAULT_SETTINGS, PRESETS, simulateFeedback, feedbackCsv } from './feedback-control.mjs';";
if (!ui.startsWith(importLine + '\n')) throw new Error('The UI import must match the bundled model.');
const bundle = core.replace(/^export /gm, '') + '\n' + ui.slice(importLine.length + 1);
if (/<\/script/i.test(bundle)) throw new Error('The bundled source contains a closing script tag.');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let html = template;
for (const [marker, value] of [
  ['__COURSE_SHA256__', sha(course)],
  ['__MODEL_SHA256__', sha(core)],
  ['__COURSE_BASE64__', course.toString('base64')],
  ['__FEEDBACK_BUNDLE__', bundle]
]) {
  if (html.split(marker).length !== 2) throw new Error('Template must contain exactly one ' + marker);
  html = html.replace(marker, () => value);
}
if (checking) {
  if (await readFile(output, 'utf8') !== html) throw new Error('Generated feedback explorer is stale. Rebuild it.');
  console.log('PASS exact generated explorer ' + sha(html));
} else {
  await writeFile(output, html);
  console.log(JSON.stringify({ output, bytes: Buffer.byteLength(html), sha256: sha(html), courseSha256: sha(course), modelSha256: sha(core) }));
}
