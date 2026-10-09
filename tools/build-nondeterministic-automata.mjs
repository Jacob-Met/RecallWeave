import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseDeck } from '../src/deck.mjs';

function standaloneHTML(bundle) {
  const safe = value => JSON.stringify(value).replace(/</g, '\\u003c');
  const program = bundle.model.replace(/^export /gm, '') + '\n'
    + bundle.ui.replace(/^import \{ MACHINE_FORMAT, PRESETS, analyze \} from '\.\/nondeterministic-automata\.mjs';\r?\n/, '');
  const parts = {
    LESSON: safe(bundle.courseText), GUIDE: safe(bundle.guideText), BUNDLE: safe(bundle),
    PROGRAM: program.replace(/<\/script/gi, '<\\/script')
  };
  return bundle.template.replace(/@@(LESSON|GUIDE|BUNDLE|PROGRAM)@@/g, (_, name) => parts[name]);
}

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const bundle = {
  template: await read('templates/nondeterministic-automata-explorer.html'),
  model: await read('src/nondeterministic-automata.mjs'),
  ui: await read('src/nondeterministic-automata-ui.mjs'),
  courseText: await read('courses/nondeterministic-automata.json'),
  guideText: await read('courses/nondeterministic-automata.md')
};
parseDeck(bundle.courseText);
const expectedImport = "import { MACHINE_FORMAT, PRESETS, analyze } from './nondeterministic-automata.mjs';\n";
if (!bundle.ui.startsWith(expectedImport)) throw new Error('Unexpected UI dependency; inspect the builder fence.');
for (const marker of ['LESSON', 'GUIDE', 'BUNDLE', 'PROGRAM']) {
  if (bundle.template.split('@@' + marker + '@@').length !== 2) throw new Error('Template marker must occur exactly once: ' + marker);
}
const result = standaloneHTML(bundle);
const output = new URL('courses/nondeterministic-automata-explorer.html', root);
if (process.argv.length === 3 && process.argv[2] === '--check') {
  if (await readFile(output, 'utf8') !== result) throw new Error('Standalone HTML differs; rebuild it.');
  console.log('Standalone HTML matches its exact source inputs.');
} else if (process.argv.length === 2) {
  await writeFile(output, result, 'utf8');
  console.log(fileURLToPath(output));
} else {
  throw new Error('Usage: node tools/build-nondeterministic-automata.mjs [--check]');
}
