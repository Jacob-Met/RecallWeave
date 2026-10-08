#!/usr/bin/env node
/** Build the offline reader from the unchanged native admission/review modules. */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Script } from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modules = [
  'src/knowledge.mjs', 'src/review.mjs', 'src/deck.mjs', 'src/trace-archive.mjs',
  'src/trace-comparison.mjs', 'src/trace-comparison-ui.mjs',
];
const source = [];
for (const path of modules) {
  let text = await readFile(resolve(root, path), 'utf8');
  text = text.replace(/^import .+;\r?\n/gm, '');
  text = text.replace(/^export (const|function) /gm, '$1 ');
  if (/^\s*(import|export)\s/m.test(text)) {
    throw new Error('Unsupported module syntax in ' + path + '; update this reader builder explicitly.');
  }
  source.push('// Source: ' + path + '\n' + text);
}
let script = source.join('\n\n') + '\nmountTraceComparison();\n';
// Parse before writing; failures leave the previous built page intact.
new Script(script, { filename: 'recallweave-trace-comparison.js' });
script = script.replace(/<\/script/gi, '<\\/script');
const template = await readFile(resolve(root, 'compare-traces.template.html'), 'utf8');
const marker = '/* TRACE_COMPARISON_SCRIPT */';
if (template.split(marker).length !== 2) throw new Error('Reader template needs exactly one script marker.');
const html = template.replace(marker, () => script);
const output = resolve(root, 'compare-traces.html');
await writeFile(output, html, 'utf8');
process.stdout.write('Built compare-traces.html (' + Buffer.byteLength(html) + ' bytes)\n');
