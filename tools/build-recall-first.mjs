import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(resolve(root, path), 'utf8');
function bundleModule(source, name, imports) {
  for (const [line, replacement] of imports) {
    if (!source.includes(line)) throw new Error('Expected import missing: ' + line);
    source = source.replace(line, replacement);
  }
  if (/^import /m.test(source)) throw new Error('Unhandled import in ' + name);
  const names = [...source.matchAll(/^export (?:const|function) (\w+)/gm)].map(match => match[1]);
  const body = source.replace(/^export /gm, '');
  return 'const ' + name + ' = (() => {\n' + body + '\nreturn {' + names.join(',') + '};\n})();\n';
}
const deck = bundleModule(read('src/deck.mjs'), 'Deck', []);
const core = bundleModule(read('src/recall-first.mjs'), 'RecallFirst', [
  ["import { validateDeck } from './deck.mjs';", 'const { validateDeck } = Deck;']
]);
let ui = read('src/recall-first-ui.mjs')
  .replace("import { parseDeck, MAX_DECK_BYTES } from './deck.mjs';", 'const { parseDeck, MAX_DECK_BYTES } = Deck;')
  .replace("import { createRecall, currentRecall, writeRecall, revealRecall, judgeRecall, beginRevisit, recallSummary, MAX_RECALL_TEXT } from './recall-first.mjs';",
    'const { createRecall, currentRecall, writeRecall, revealRecall, judgeRecall, beginRevisit, recallSummary, MAX_RECALL_TEXT } = RecallFirst;');
if (/^import /m.test(ui)) throw new Error('Unhandled UI import.');
const script = (deck + core + '(() => {\n' + ui + '\n})();\n').replace(/<\/script/gi, '<\\/script');
const data = JSON.stringify(JSON.parse(read('data/deck.json'))).replace(/</g, '\\u003c');
const html = read('templates/recall-first.html')
  .replace('/* RECALL_FIRST_STYLE */', () => read('recall-first/styles.css'))
  .replace('__RECALL_FIRST_DECK__', () => data)
  .replace('/* RECALL_FIRST_SCRIPT */', () => script);
if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--check')) throw new Error('Usage: node tools/build-recall-first.mjs [--check]');
const output = resolve(root, 'recall-first.html');
if (process.argv[2] === '--check') {
  if (readFileSync(output, 'utf8') !== html) throw new Error('recall-first.html is not in sync; rebuild it.');
  console.log('recall-first.html matches its exact sources.');
} else {
  writeFileSync(output, html);
  console.log('Built recall-first.html (' + Buffer.byteLength(html) + ' bytes).');
}
