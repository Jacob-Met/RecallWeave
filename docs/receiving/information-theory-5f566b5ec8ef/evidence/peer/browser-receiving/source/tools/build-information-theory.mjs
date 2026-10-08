#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const UI_IMPORT = "import { INFORMATION_EXAMPLES, parseInformationCounts, analyzeInformationTable } from './information-theory.mjs';";

function oneReplacement(text, marker, replacement) {
  if (text.split(marker).length !== 2) throw new Error('Expected exactly one template marker: ' + marker);
  return text.replace(marker, function () { return replacement; });
}
function sourceBody(source) {
  const body = source.replace(/^export /gm, '');
  if (/^\s*(import|export)\b/m.test(body)) throw new Error('Unexpected module dependency in standalone source.');
  if (/<\/script[\s>]/i.test(body)) throw new Error('Source contains an HTML script terminator.');
  return body;
}
function embeddedText(text) {
  return JSON.stringify(text).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

/** Deterministic standalone assembly; downloaded text is preserved exactly. */
export function renderInformationExplorer({ template, model, ui, courseText, guideText }) {
  for (const value of [template, model, ui, courseText, guideText]) {
    if (typeof value !== 'string') throw new TypeError('All authored inputs must be UTF-8 text.');
  }
  const deck = JSON.parse(courseText);
  if (deck.format !== 'recallweave-deck/1' || !Array.isArray(deck.items)) throw new Error('Expected a RecallWeave deck.');
  if (!ui.startsWith(UI_IMPORT + '\n')) throw new Error('Unexpected UI model import.');
  const modelBody = sourceBody(model);
  const uiBody = sourceBody(ui.slice(UI_IMPORT.length + 1));
  const script = '\n(function () {\n"use strict";\n' + modelBody + '\n' + uiBody
    + '\nconst informationCourseText = ' + embeddedText(courseText) + ';\n'
    + 'const informationGuideText = ' + embeddedText(guideText) + ';\n'
    + 'mountInformationTheory(document, { courseText: informationCourseText, guideText: informationGuideText });\n'
    + '})();\n';
  const policy = 'sha256-' + createHash('sha256').update(script, 'utf8').digest('base64');
  return oneReplacement(oneReplacement(template, '__INFORMATION_SCRIPT__', script), '__INFORMATION_SCRIPT_HASH__', policy);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    throw new Error('Usage: node tools/build-information-theory.mjs [--check]');
  }
  const paths = {
    template: new URL('../courses/information-theory-explorer.template.html', import.meta.url),
    model: new URL('../src/information-theory.mjs', import.meta.url),
    ui: new URL('../src/information-theory-ui.mjs', import.meta.url),
    courseText: new URL('../courses/information-theory.json', import.meta.url),
    guideText: new URL('../courses/information-theory.md', import.meta.url)
  };
  const inputs = Object.fromEntries(await Promise.all(Object.entries(paths).map(async function ([key, path]) {
    return [key, await readFile(path, 'utf8')];
  })));
  const html = renderInformationExplorer(inputs);
  const destination = new URL('../courses/information-theory-explorer.html', import.meta.url);
  if (args[0] === '--check') {
    if (await readFile(destination, 'utf8') !== html) throw new Error('Generated explorer differs from its authored inputs. Run the builder.');
    process.stdout.write('information-theory explorer matches all authored inputs\n');
  } else {
    await writeFile(destination, html, 'utf8');
    process.stdout.write('wrote courses/information-theory-explorer.html\n');
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(function (error) {
    process.stderr.write('information-theory build: ' + error.message + '\n');
    process.exitCode = 1;
  });
}
