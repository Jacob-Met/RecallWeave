import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseDeck } from '../src/deck.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(root + path, 'utf8');
const course = read('courses/counting-principles.json');
const parsed = parseDeck(course);
if (parsed.items.length !== 12 || parsed.title !== 'Counting principles: order and reuse') throw new Error('Unexpected counting course.');
const core = read('src/counting-principles.mjs');
const ui = read('src/counting-principles-ui.mjs');
const importLine = "import { parseCountingInput, countingPage } from './counting-principles.mjs';";
if (!ui.startsWith(importLine + '\n')) throw new Error('Unexpected UI module import.');
const replacements = {
  '@@COUNTING_COURSE@@': course.replaceAll('<', '\\u003c'),
  '@@COUNTING_CORE@@': core.replace(/^export /gm, '').replaceAll('</script', '<\\/script'),
  '@@COUNTING_UI@@': ui.slice(importLine.length + 1).replaceAll('</script', '<\\/script')
};
let output = read('courses/counting-principles-explorer.template.html');
for (const [marker, value] of Object.entries(replacements)) {
  if (output.split(marker).length !== 2) throw new Error('Missing or repeated build marker: ' + marker);
  output = output.replace(marker, () => value);
}
if (output.includes('@@COUNTING_')) throw new Error('Unresolved build marker.');
const target = root + 'courses/counting-principles-explorer.html';
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== output) throw new Error('Generated counting explorer is stale. Run this tool without --check.');
  console.log('COUNTING_BUILD_OK current=1 questions=' + parsed.items.length);
} else {
  writeFileSync(target, output);
  console.log('COUNTING_BUILD_OK written=1 questions=' + parsed.items.length);
}
