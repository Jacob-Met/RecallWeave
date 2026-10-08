#!/usr/bin/env node
/** Rebuild only this lesson's direct-file explorer; no dependencies or app changes. */
import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseDeck } from '../src/deck.mjs';

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
  throw new Error('Usage: node tools/make_hash_tables_explorer.mjs [--check]');
}
const root = new URL('../', import.meta.url);
const paths = {
  template: 'courses/hash-tables-explorer.template.html',
  model: 'src/hash-tables.mjs',
  ui: 'src/hash-tables-ui.mjs',
  course: 'courses/hash-tables.json',
  output: 'courses/hash-tables-explorer.html',
};
const source = {};
for (const [key, path] of Object.entries(paths)) {
  if (key !== 'output') source[key] = await readFile(new URL(path, root), 'utf8');
}
parseDeck(source.course);
const importLine = "import { LIMITS, runScenario } from './hash-tables.mjs';";
if (!source.ui.startsWith(importLine + '\n')) throw new Error('Unexpected UI import boundary.');
const model = source.model.replace(/^export (?=(?:const|function) )/gm, '');
const ui = source.ui.slice(importLine.length + 1);
if (/^\s*(?:import|export)\s/m.test(model + '\n' + ui)) {
  throw new Error('The standalone model/UI must not have unresolved imports or exports.');
}
if (/<\/script/i.test(model + ui)) throw new Error('Unexpected closing script tag in source.');
const courseLiteral = JSON.stringify(source.course)
  .replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const pieces = {
  '/*__MODEL__*/': model,
  '/*__COURSE__*/': 'const COURSE_TEXT = ' + courseLiteral + ';',
  '/*__UI__*/': ui,
};
let html = source.template;
for (const [marker, value] of Object.entries(pieces)) {
  if (html.split(marker).length !== 2) throw new Error('Expected one template marker: ' + marker);
  html = html.replace(marker, () => value);
}
const output = new URL(paths.output, root);
if (args[0] === '--check') {
  if (await readFile(output, 'utf8') !== html) {
    throw new Error('Standalone explorer is stale. Run node tools/make_hash_tables_explorer.mjs.');
  }
} else {
  const temporary = new URL(paths.output + '.tmp-' + process.pid, root);
  try {
    await writeFile(temporary, html, { flag: 'wx' });
    await rename(temporary, output);
  } finally {
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}
console.log(JSON.stringify({
  mode: args[0] === '--check' ? 'check' : 'build',
  output: paths.output,
  bytes: Buffer.byteLength(html),
  sha256: createHash('sha256').update(html).digest('hex'),
  courseItems: parseDeck(source.course).items.length,
}));
