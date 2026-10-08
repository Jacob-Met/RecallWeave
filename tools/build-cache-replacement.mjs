#!/usr/bin/env node
/** Build the separate dependency-free cache lab; shared learner generators are untouched. */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parseDeck } from '../src/deck.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFile(resolve(root, path), 'utf8');
const exportDeclaration = /^export (const|function) /gm;

function plainModule(source, imports = []) {
  let text = source;
  for (const line of imports) {
    if (text.split(line).length !== 2) throw new Error('Cache-lab imports changed; update the standalone builder.');
    text = text.replace(line, '');
  }
  text = text.replace(exportDeclaration, '$1 ');
  if (/^\s*(?:import|export)\b/m.test(text)) throw new Error('An unsupported module statement would remain in the standalone lab.');
  if (/<\/script/i.test(text)) throw new Error('Inline script source contains an HTML closing tag.');
  return text;
}

function replaceOnce(text, before, after) {
  if (text.split(before).length !== 2) throw new Error('Cache-lab template changed; update the standalone builder.');
  return text.replace(before, after);
}

/** Produce a deterministic standalone file while retaining the exact checked course text. */
export function renderCacheReplacement({ template, css, deckModule, coreModule, uiModule, courseText }) {
  parseDeck(courseText);
  if (/<\/style/i.test(css)) throw new Error('Inline styles contain an HTML closing tag.');
  const deck = plainModule(deckModule);
  const core = plainModule(coreModule);
  const ui = plainModule(uiModule, [
    "import { analyzeCacheTrace, parseReferenceText } from './cache-replacement-core.mjs';\n",
    "import { parseDeck } from '../src/deck.mjs';\n"
  ]);
  const literal = JSON.stringify(courseText).replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const runtime = "(function () {\n'use strict';\n"
    + "const { parseDeck } = (function () {\n" + deck + "\nreturn { parseDeck };\n})();\n"
    + "const { analyzeCacheTrace, parseReferenceText } = (function () {\n" + core
    + "\nreturn { analyzeCacheTrace, parseReferenceText };\n})();\n"
    + ui + "\nconst courseText = JSON.parse(document.querySelector('#cache-course-source').textContent);\n"
    + "mountCacheLab(document, { courseText });\n})();\n";
  let html = replaceOnce(template, '  <link rel="stylesheet" href="./cache-replacement.css">',
    '<style>\n' + css + '</style>');
  return replaceOnce(html, '  <script type="module" src="./cache-replacement-entry.mjs"></script>',
    '<script id="cache-course-source" type="application/json">' + literal + '</script>\n'
    + '<script id="cache-lab-runtime">\n' + runtime + '</script>');
}

export async function readCacheReplacementInputs() {
  const paths = {
    template: 'courses/cache-replacement.template.html',
    css: 'courses/cache-replacement.css',
    deckModule: 'src/deck.mjs',
    coreModule: 'courses/cache-replacement-core.mjs',
    uiModule: 'courses/cache-replacement-ui.mjs',
    courseText: 'courses/cache-replacement.json'
  };
  return Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([name, path]) => [name, await read(path)])));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some(argument => argument !== '--check') || process.argv.slice(2).length > 1) {
    console.error('Usage: node tools/build-cache-replacement.mjs [--check]');
    process.exitCode = 2;
  } else {
    const html = renderCacheReplacement(await readCacheReplacementInputs());
    const destination = resolve(root, 'courses/cache-replacement.html');
    if (process.argv.includes('--check')) {
      if (await readFile(destination, 'utf8') !== html) {
        throw new Error('cache-replacement.html is stale. Run node tools/build-cache-replacement.mjs and commit it.');
      }
      console.log('Cache lab is current; exact source and course bytes match.');
    } else {
      await writeFile(destination, html, 'utf8');
      console.log('Built courses/cache-replacement.html (' + Buffer.byteLength(html) + ' bytes).');
    }
  }
}
