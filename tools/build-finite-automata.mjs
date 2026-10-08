#!/usr/bin/env node
/** Deterministic direct-open build. Uses the existing deck validator unchanged.
 * Inlining follows tools/build-grouped-data.mjs; no shared builder is modified.
 */
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseDeck} from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const uiImport = "import { ALPHABET, MAX_STATES, MAX_WORD_LENGTH, PRESETS, getPreset, validateMachine, traceWord, compareMachines } from './finite-automata.mjs';";
function inlineModule(source, expectedImport = '') {
  if (expectedImport) {
    if (!source.startsWith(expectedImport + '\n')) throw new Error('Unexpected finite-automata UI dependency.');
    source = source.slice(expectedImport.length + 1);
  }
  source = source.replace(/^export (?=(?:const|function) )/gm, '');
  if (/^\s*(?:import|export)\b/m.test(source)) throw new Error('Unresolved module syntax in standalone build.');
  return source;
}
const scriptLiteral = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

export async function buildFiniteAutomata(project = root) {
  const [template, core, ui, courseText] = await Promise.all([
    readFile(join(project, 'courses/finite-automata-explorer.template.html'), 'utf8'),
    readFile(join(project, 'src/finite-automata.mjs'), 'utf8'),
    readFile(join(project, 'src/finite-automata-ui.mjs'), 'utf8'),
    readFile(join(project, 'courses/finite-automata.json'), 'utf8')
  ]);
  parseDeck(courseText);
  const marker = '<!-- FINITE_AUTOMATA_SCRIPT -->';
  if (template.split(marker).length !== 2) throw new Error('Expected exactly one standalone script marker.');
  const script = "'use strict';\n(() => {\n" + inlineModule(core) + '\n' + inlineModule(ui, uiImport) +
    '\nmountFiniteAutomata(document, {courseText:' + scriptLiteral(courseText) + '});\n})();\n';
  if (/<\/script/i.test(script)) throw new Error('Inline script contains a closing-script sequence.');
  return template.replace(marker, '<script>\n' + script + '</script>');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    throw new Error('Usage: node tools/build-finite-automata.mjs [--check]');
  }
  const html = await buildFiniteAutomata();
  const target = join(root, 'courses/finite-automata-explorer.html');
  if (args[0] === '--check') {
    if (await readFile(target, 'utf8') !== html) throw new Error('Rebuild the finite-automata standalone explorer.');
  } else {
    await writeFile(target, html);
  }
  console.log(JSON.stringify({status: 'passed', action: args[0] === '--check' ? 'check' : 'build',
    path: 'courses/finite-automata-explorer.html', bytes: Buffer.byteLength(html),
    sha256: createHash('sha256').update(html).digest('hex')}));
}
