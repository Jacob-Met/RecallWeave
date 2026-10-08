import {readFile, writeFile, rename, unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {parseDeck} from '../src/deck.mjs';
const root = new URL('../', import.meta.url);
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) throw new Error('Usage: node tools/build-mathematical-induction.mjs [--check]');
const read = path => readFile(new URL(path, root), 'utf8');
const [core, ui, template, deck, guide] = await Promise.all([
  read('src/mathematical-induction.mjs'), read('src/mathematical-induction-ui.mjs'),
  read('templates/mathematical-induction-lab.html'), read('courses/mathematical-induction.json'),
  read('courses/mathematical-induction.md')
]);
parseDeck(deck);
const literal = text => JSON.stringify(text).replaceAll('<', String.fromCharCode(92) + 'u003c');
const source = [core,ui].map(text => text.split('\n').filter(line => !line.startsWith('import ')).map(line => line.startsWith('export ') ? line.slice(7) : line).join('\n')).join('\n');
if (source.toLowerCase().includes('</' + 'script')) throw new Error('Unexpected script terminator in source.');
if (template.split('__INDUCTION_SCRIPT__').length !== 2) throw new Error('Expected exactly one script slot.');
const script = '(() => {\n' + source + '\nmountInductionLab(document, ' + literal(deck) + ', ' + literal(guide) + ');\n})();';
const output = template.replace('__INDUCTION_SCRIPT__', () => script);
const target = new URL('courses/mathematical-induction-lab.html', root);
if (args[0] === '--check') {
  if (await readFile(target, 'utf8') !== output) throw new Error('The generated induction lab is stale.');
  console.log('Induction standalone parity passed.');
} else {
  const temporary = fileURLToPath(target) + '.tmp-' + process.pid;
  try { await writeFile(temporary, output, {flag: 'wx'}); await rename(temporary, target); }
  finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  console.log('Built ' + Buffer.byteLength(output) + ' bytes of offline induction lab.');
}
