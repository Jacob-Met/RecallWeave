#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCourseCatalog, validateCatalogPaths } from '../src/course-catalog.mjs';

const DEFAULT_ROOT = fileURLToPath(new URL('../', import.meta.url));

function withoutExports(source) {
  return source.replace(/^export (?=(?:const|function) )/gm, '');
}

function withoutImport(source, statement) {
  if (!source.startsWith(statement + '\n')) {
    throw new Error('Catalog bundler expected its explicit local import: ' + statement);
  }
  return withoutExports(source.slice(statement.length + 1));
}

function fillOnce(template, marker, value) {
  if (template.split(marker).length !== 2) {
    throw new Error('Catalog template must contain exactly one ' + marker + ' marker.');
  }
  return template.replace(marker, () => value);
}

/** Keep raw source strings recoverable without letting JSON terminate its script. */
export function renderCourseCatalog({ template, css, validator, model, ui, sources }) {
  createCourseCatalog(sources);
  const data = JSON.stringify(sources)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const script = [
    '(function () {',
    "'use strict';",
    withoutExports(validator),
    withoutImport(model, "import { parseDeck } from './deck.mjs';"),
    withoutImport(ui, "import { createCourseCatalog, filterCourseCatalog } from './course-catalog.mjs';"),
    '})();'
  ].join('\n');
  let html = fillOnce(template, '{{CATALOG_CSS}}', css.trimEnd());
  html = fillOnce(html, '{{CATALOG_SCRIPT}}', script);
  return fillOnce(html, '{{CATALOG_DATA}}', data);
}

export async function buildCourseCatalog(root = DEFAULT_ROOT) {
  const readText = async path => {
    const bytes = await readFile(resolve(root, path));
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  };
  const paths = validateCatalogPaths(JSON.parse(await readText('catalog/courses.json')));
  const sources = await Promise.all(paths.map(async path => ({
    path, text: await readText(path)
  })));
  const [template, css, validator, model, ui] = await Promise.all([
    'catalog/template.html', 'catalog/catalog.css', 'src/deck.mjs',
    'src/course-catalog.mjs', 'src/course-catalog-ui.mjs'
  ].map(readText));
  return renderCourseCatalog({ template, css, validator, model, ui, sources });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
      throw new Error('Usage: node tools/build-course-catalog.mjs [--check]');
    }
    const html = await buildCourseCatalog();
    const destination = resolve(DEFAULT_ROOT, 'catalog.html');
    if (args[0] === '--check') {
      if (await readFile(destination, 'utf8') !== html) {
        throw new Error('catalog.html is stale. Run node tools/build-course-catalog.mjs.');
      }
      console.log('catalog.html matches the catalog sources and original course files.');
    } else {
      await writeFile(destination, html, 'utf8');
      console.log('Built catalog.html from validated original course files.');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
