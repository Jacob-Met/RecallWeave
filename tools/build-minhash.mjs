import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parseDeck } from '../src/deck.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(root + path, 'utf8');
if (process.argv.slice(2).some(arg => arg !== '--check') || process.argv.slice(2).length > 1)
  throw new Error('Use node tools/build-minhash.mjs [--check].');
const course = read('courses/probability-foundations.json');
const bytes = Buffer.from(course, 'utf8');
const courseGit = createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
if (courseGit !== '82cc4bdd8bf22afc5ca84098a0b19c3d485d2f45') throw new Error('Probability course identity changed; review the consumer before updating this pin.');
const parsed = parseDeck(course);
const model = read('src/minhash.mjs');
const ui = read('src/minhash-ui.mjs');
const importLine = "import { analyzeMinHash, parseSetText } from './minhash.mjs';";
if (!ui.startsWith(importLine + '\n')) throw new Error('Unexpected MinHash UI import.');
const safeScript = value => value.replaceAll('</script', '<\\/script');
const replacements = {
  '@@MINHASH_COURSE@@': JSON.stringify(course).replaceAll('<', '\\u003c'),
  '@@MINHASH_GUIDE@@': JSON.stringify(read('courses/minhash.md')).replaceAll('<', '\\u003c'),
  '@@MINHASH_MODEL@@': safeScript(model.replace(/^export /gm, '')),
  '@@MINHASH_UI@@': safeScript(ui.slice(importLine.length + 1))
};
let output = read('courses/minhash-explorer.template.html');
for (const [marker, value] of Object.entries(replacements)) {
  if (output.split(marker).length !== 2) throw new Error('Missing or repeated marker: ' + marker);
  output = output.replace(marker, () => value);
}
if (output.includes('@@MINHASH_')) throw new Error('Unresolved MinHash marker.');
const target = root + 'courses/minhash-explorer.html';
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== output) throw new Error('Standalone MinHash page is stale. Run the builder without --check.');
  console.log('MINHASH_BUILD_OK current=1 course_items=' + parsed.items.length);
} else {
  writeFileSync(target, output);
  console.log('MINHASH_BUILD_OK written=1 course_items=' + parsed.items.length);
}
