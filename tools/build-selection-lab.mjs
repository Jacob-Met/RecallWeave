#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  ['src/knowledge.mjs', 'selectionNative', {}],
  ['src/deck.mjs', 'selectionDeck', {}],
  ['src/selection-lab.mjs', 'selectionCore', { './knowledge.mjs': 'selectionNative', './deck.mjs': 'selectionDeck' }],
  ['src/selection-lab-ui.mjs', 'selectionUI', { './knowledge.mjs': 'selectionNative', './deck.mjs': 'selectionDeck', './selection-lab.mjs': 'selectionCore' }]
];

function inlineModule(source, symbol, imports) {
  const exports = [...source.matchAll(/^export (?:const|function|class) ([A-Za-z_$][\w$]*)/gm)].map(match => match[1]);
  let body = source.replace(/^import \{([^}]+)\} from ['"]([^'"]+)['"];?\r?$/gm, (_, names, path) => {
    if (!Object.hasOwn(imports, path)) throw new Error('Unexpected import in ' + symbol + ': ' + path);
    return 'const {' + names + '} = ' + imports[path] + ';';
  }).replace(/^export (?=(?:const|function|class) )/gm, '');
  if (/^(?:import|export)\s/m.test(body)) throw new Error('Unsupported module syntax in ' + symbol);
  return 'const ' + symbol + ' = (() => {\n' + body + '\nreturn { ' + exports.join(', ') + ' };\n})();\n';
}

export async function renderSelectionLab(root = projectRoot) {
  const template = await readFile(join(root, 'selection-lab.template.html'), 'utf8');
  for (const marker of ['<!--BUNDLED_DECK-->', '<!--SELECTION_MODEL_BUNDLE-->']) {
    if (template.split(marker).length !== 2) throw new Error('Template must contain exactly one ' + marker);
  }
  const source = await Promise.all(files.map(async ([path, symbol, imports]) =>
    inlineModule(await readFile(join(root, path), 'utf8'), symbol, imports)));
  const bundled = await readFile(join(root, 'data/deck.json'), 'utf8');
  JSON.parse(bundled);
  const data = bundled.replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const script = (source.join('\n') +
    '\nselectionUI.mountSelectionLab(document, JSON.parse(document.getElementById("bundled-deck").textContent));\n')
    .replace(/<\/script/gi, '<\\/script');
  return template.replace('<!--BUNDLED_DECK-->', () =>
    '<script id="bundled-deck" type="application/json">\n' + data + '\n</script>')
    .replace('<!--SELECTION_MODEL_BUNDLE-->', () => '<script type="module">\n' + script + '</script>');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check')) throw new Error('Usage: node tools/build-selection-lab.mjs [--check]');
  const target = join(projectRoot, 'selection-lab.html');
  const html = await renderSelectionLab();
  if (args.includes('--check')) {
    if (await readFile(target, 'utf8') !== html) throw new Error('selection-lab.html is stale. Rebuild it before publication.');
    console.log('PASS selection-lab.html matches its native model, validator, lab, template and bundled deck.');
  } else {
    await writeFile(target, html);
    console.log('Wrote ' + target);
  }
}
