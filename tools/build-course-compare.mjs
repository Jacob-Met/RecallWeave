#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const moduleNames = ['deck.mjs', 'course-comparison.mjs', 'course-comparison-page.mjs', 'course-comparison-ui.mjs'];
const available = new Set();
function bundle(name, original) {
  const exports = [];
  let source = original.replace(/^export\s+(?=(?:const|let|function|class)\b)/gm, '');
  for (const match of original.matchAll(/^export\s+(?:const|let|function|class)\s+(\w+)/gm)) exports.push(match[1]);
  source = source.replace(/^import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];[ \t]*$/gm, (_, names, target) => {
    assert.ok(available.has(target), name + ': unbound import ' + target);
    const fields = names.split(',').map(x => x.trim()).filter(Boolean).map(x => x.replace(/\s+as\s+/, ': '));
    return 'const { ' + fields.join(', ') + ' } = __courseComparisonModules[' + JSON.stringify(target) + '];';
  });
  assert.ok(!/^\s*(?:import|export)\s/m.test(source), name + ': unsupported module syntax; preserve source and update the mechanical builder explicitly');
  available.add('./' + name);
  return '__courseComparisonModules[' + JSON.stringify('./' + name) + '] = (() => {\n' + source + '\nreturn { ' + exports.join(', ') + ' };\n})();\n';
}
const template = await readFile(join(root, 'course-compare/index.html'), 'utf8');
const styleMarker = '<link rel="stylesheet" href="./styles.css">';
const scriptMarker = '<script type="module" src="../src/course-comparison-ui.mjs"></script>';
assert.equal(template.split(styleMarker).length, 2);
assert.equal(template.split(scriptMarker).length, 2);
const style = await readFile(join(root, 'course-compare/styles.css'), 'utf8');
const parts = [];
for (const name of moduleNames) parts.push(bundle(name, await readFile(join(root, 'src', name), 'utf8')));
const code = "'use strict';\nconst __courseComparisonModules = Object.create(null);\n" + parts.join('\n');
const built = template.replace(styleMarker, '<style>\n' + style + '\n</style>')
  .replace(scriptMarker, '<script>\n' + code.replace(/<\/script/gi, '<\\/script') + '\n</script>');
if (process.argv.includes('--check')) {
  assert.equal(await readFile(join(root, 'course-compare.html'), 'utf8'), built, 'Regenerate course-compare.html with the unchanged builder');
  console.log('course-compare.html matches its exact modular source.');
} else {
  await writeFile(join(root, 'course-compare.html'), built);
  console.log('Wrote course-compare.html (' + Buffer.byteLength(built) + ' UTF-8 bytes).');
}
