#!/usr/bin/env node
/** Build the direct-open catalog from an explicit manifest and exact UTF-8 decks. */
import {readFile, writeFile, rename, unlink, lstat} from 'node:fs/promises';
import {createHash, randomBytes} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {catalogJsonForHtml, createCatalog, validateCatalogManifest} from '../src/course-catalog.mjs';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function sourceText(root, path) {
  const file = join(root, path);
  if (!(await lstat(file)).isFile()) throw new Error(`Expected a regular source file: ${path}`);
  return new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(await readFile(file));
}

function inlineModule(source, expectedImports = []) {
  for (const statement of expectedImports) {
    if (source.split(statement).length !== 2) throw new Error(`Expected one module import: ${statement}`);
    source = source.replace(statement, '');
  }
  source = source.replace(/^export (?=(?:const|function) )/gm, '');
  if (/^\s*(?:import|export)\b/m.test(source)) throw new Error('Unsupported module syntax in catalog bundle.');
  if (/<\/script/i.test(source)) throw new Error('Catalog JavaScript contains a closing script tag.');
  return source;
}

export function renderCatalogPage(catalog, sources) {
  const script = `(() => {\n'use strict';\n${inlineModule(sources.deck)}\n${inlineModule(sources.catalog, ["import {parseDeck} from './deck.mjs';"])}\n${inlineModule(sources.ui, ["import {catalogSubjects, filterCourses} from './course-catalog.mjs';"])}\nmountCourseCatalog(document, JSON.parse(document.querySelector('#course-catalog-data').textContent));\n})();`;
  for (const marker of ['@@CATALOG_DATA@@', '@@CATALOG_SCRIPT@@']) {
    if (sources.template.split(marker).length !== 2) throw new Error(`Expected exactly one ${marker} marker.`);
  }
  // Callback replacement keeps authored dollar-sign sequences literal.
  return sources.template.replace(/@@CATALOG_(DATA|SCRIPT)@@/g,
    (_marker, kind) => kind === 'DATA' ? catalogJsonForHtml(catalog) : script);
}

export async function loadCatalogInputs(root = defaultRoot) {
  const manifest = validateCatalogManifest(JSON.parse(await sourceText(root, 'courses/catalog-manifest.json')));
  const deckTexts = new Map();
  for (const entry of manifest.courses) {
    deckTexts.set(entry.deck, await sourceText(root, entry.deck));
    for (const link of entry.links) {
      if (!(await lstat(join(root, link.path))).isFile()) throw new Error(`Missing regular companion file: ${link.path}`);
    }
  }
  const catalog = createCatalog(manifest, deckTexts);
  const sources = {
    template: await sourceText(root, 'courses/catalog.template.html'),
    deck: await sourceText(root, 'src/deck.mjs'),
    catalog: await sourceText(root, 'src/course-catalog.mjs'),
    ui: await sourceText(root, 'src/course-catalog-ui.mjs')
  };
  return {catalog, sources};
}

export async function buildCatalog({root = defaultRoot, check = false} = {}) {
  const {catalog, sources} = await loadCatalogInputs(root);
  const bytes = Buffer.from(renderCatalogPage(catalog, sources));
  const output = join(root, 'courses/catalog.html');
  if (check) {
    if (!(await readFile(output)).equals(bytes)) throw new Error('courses/catalog.html is stale; run node tools/build-course-catalog.mjs.');
  } else {
    const temporary = `${output}.tmp-${process.pid}-${randomBytes(6).toString('hex')}`;
    try {
      await writeFile(temporary, bytes, {flag: 'wx', mode: 0o644});
      await rename(temporary, output);
    } finally {
      await unlink(temporary).catch(error => {if (error.code !== 'ENOENT') throw error;});
    }
  }
  return {path: output, bytes: bytes.length, courses: catalog.courses.length,
    questions: catalog.courses.reduce((sum, course) => sum + course.questionCount, 0),
    sha256: createHash('sha256').update(bytes).digest('hex'), checked: check};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  let check = false;
  let root = defaultRoot;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--check') check = true;
    else if (args[index] === '--root' && args[index + 1] && !args[index + 1].startsWith('--')) root = resolve(args[++index]);
    else throw new Error('Usage: node tools/build-course-catalog.mjs [--check] [--root project-directory]');
  }
  console.log(JSON.stringify(await buildCatalog({root, check})));
}
