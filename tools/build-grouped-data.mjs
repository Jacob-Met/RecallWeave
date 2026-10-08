import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = 'courses/grouped-data-explorer.html';
function inlineModule(source, expectedImport = null) {
  if (expectedImport) {
    const lines = source.split('\n');
    if (lines[0] !== expectedImport) throw new Error('Unexpected explorer module dependency.');
    source = lines.slice(1).join('\n');
  }
  source = source.replace(/^export (?=(?:const|function) )/gm, '');
  if (/^\s*(import|export)\b/m.test(source)) throw new Error('Unsupported explorer module boundary.');
  return source;
}
function scriptLiteral(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
export function buildGroupedExplorer() {
  const template = readFileSync(resolve(root, 'courses/grouped-data-explorer.template.html'), 'utf8');
  const courseText = readFileSync(resolve(root, 'courses/grouped-data.json'), 'utf8');
  parseDeck(courseText);
  const core = inlineModule(readFileSync(resolve(root, 'src/grouped-data.mjs'), 'utf8'));
  const ui = inlineModule(readFileSync(resolve(root, 'src/grouped-data-ui.mjs'), 'utf8'),
    "import { analyzeGroupedData, parseGroupedCount, serializeGroupedComparison, GROUPED_PRESETS, GROUPED_KEYS, GROUPED_OPTIONS } from './grouped-data.mjs';");
  const marker = '<!-- GROUPED_DATA_SCRIPT -->';
  if (template.split(marker).length !== 2) throw new Error('The explorer template needs exactly one script marker.');
  const script = '(function(){\n"use strict";\n' + core + '\n' + ui +
    '\nmountGroupedDataExplorer(document, { courseText: ' + scriptLiteral(courseText) + ' });\n})();';
  if (/<\/script/i.test(script)) throw new Error('An inline script close marker must be escaped.');
  return template.replace(marker, '<script>\n' + script + '\n</script>');
}
function isDirectEntry() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    // An importing process may have no resolvable file entry.
    return false;
  }
}
if (isDirectEntry()) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    console.error('Usage: node tools/build-grouped-data.mjs [--check]'); process.exitCode = 1;
  } else {
    try {
      const html = buildGroupedExplorer();
      if (args[0] === '--check') {
        if (readFileSync(resolve(root, TARGET), 'utf8') !== html) throw new Error('Standalone explorer differs from its sources; rebuild it.');
      } else writeFileSync(resolve(root, TARGET), html);
      console.log(JSON.stringify({ target: TARGET, state: args[0] === '--check' ? 'current' : 'built',
        bytes: Buffer.byteLength(html), sha256: createHash('sha256').update(html).digest('hex') }));
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
