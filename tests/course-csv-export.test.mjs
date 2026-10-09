import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { exportCourseCsv } from '../src/course-csv-export.mjs';
import { COURSE_CSV_COLUMNS, convertCourseCsv } from '../src/course-csv.mjs';
import { MAX_DECK_BYTES, parseDeck, serializeDeck } from '../src/deck.mjs';

const cli = fileURLToPath(new URL('../tools/export_course_csv.mjs', import.meta.url));
const bundledText = await readFile(new URL('../data/deck.json', import.meta.url), 'utf8');
const metadata = { title: 'Local course', attribution: 'Course author', license: 'CC0' };
const item = (id, concept, extra = {}) => ({
  id, concept, prerequisites: [], prompt: 'Which option?', options: ['First', 'Second'],
  answer: 1, explanation: 'The second option is correct.', transfer: 'Try another example.', ...extra
});
const example = () => ({ ...metadata, concepts: ['observing', 'acting'],
  items: [item('observe', 'observing'), item('act', 'acting', { prerequisites: ['observing'] })] });
const text = value => JSON.stringify(value);
const roundTrip = value => {
  const source = typeof value === 'string' ? value : text(value);
  const result = exportCourseCsv(source);
  const imported = convertCourseCsv(result.csv, result.metadata);
  assert.deepEqual(imported.deck, parseDeck(source));
  assert.equal(imported.json, serializeDeck(parseDeck(source)));
  return result;
};
const digest = value => createHash('sha256').update(value).digest('hex');
async function workspace(run) {
  const directory = await mkdtemp(join(tmpdir(), 'recall-csv-export-test-'));
  try { return await run(directory); }
  finally { await rm(directory, { recursive: true, force: true }); }
}
function runCli(args, cwd) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', timeout: 15000 });
}

test('the real bundled checked lesson round trips through the existing importer', () => {
  const result = roundTrip(bundledText);
  assert.equal(result.questionCount, parseDeck(bundledText).items.length);
  assert.equal(result.conceptCount, parseDeck(bundledText).concepts.length);
  assert.deepEqual(result.metadata, {
    title: parseDeck(bundledText).title, attribution: parseDeck(bundledText).attribution,
    license: parseDeck(bundledText).license
  });
});
test('the existing importer example becomes an editable bank again', async () => {
  const csv = await readFile(new URL('../examples/course-question-bank.csv', import.meta.url), 'utf8');
  const original = convertCourseCsv(csv, metadata);
  assert.deepEqual(convertCourseCsv(roundTrip(original.json).csv, metadata).deck, original.deck);
});
test('all thirteen columns are exact, quoted and ordered, with CRLF and no BOM', () => {
  const result = roundTrip(example());
  assert.deepEqual(COURSE_CSV_COLUMNS, ['id', 'concept', 'prompt', 'option_1', 'option_2',
    'option_3', 'option_4', 'option_5', 'option_6', 'correct_option', 'explanation',
    'transfer', 'prerequisites']);
  assert.equal(result.csv.split('\r\n')[0], COURSE_CSV_COLUMNS.map(x => '"' + x + '"').join(','));
  assert.ok(result.csv.endsWith('\r\n'));
  assert.ok(!result.csv.startsWith('\uFEFF'));
  assert.equal(result.csv.replaceAll('\r\n', '').includes('\n'), false);
});
test('every option count and answer position survives without empty option expansion', () => {
  for (let count = 2; count <= 6; count++) {
    for (let answer = 0; answer < count; answer++) {
      const deck = example();
      deck.items[0].options = Array.from({ length: count }, (_, n) => 'Choice ' + n);
      deck.items[0].answer = answer;
      roundTrip(deck);
    }
  }
});
test('literal commas, quotes, CR, LF, CRLF, whitespace, formula text and Unicode survive', () => {
  const deck = example();
  deck.items[0].prompt = '  =SUM(1,2), "quoted"\r\nnext\nlast\rtail 😀 e\u0301 <b>literal</b>\u0000\uFEFF  ';
  deck.items[0].options = ['\t+2', '-2', '@name', 'normal\u2028line'];
  deck.items[0].answer = 2;
  deck.items[0].explanation = 'Élève 日本語 "why",\r\nbecause';
  deck.title = '  Explicit "title" 😀  ';
  deck.attribution = 'Author,\nline';
  deck.license = 'License\rtext';
  roundTrip(deck);
});
test('first-seen concept order and interleaved question order remain exact', () => {
  const deck = example();
  deck.items.push(item('observe-again', 'observing'), item('act-again', 'acting', { prerequisites: ['observing'] }));
  roundTrip(deck);
});
test('ordered multiple prerequisites with punctuation survive JSON-inside-CSV', () => {
  const deck = example();
  deck.concepts = ['first,"x"', 'second\nline', 'third'];
  deck.items = [item('a', deck.concepts[0]), item('b', deck.concepts[1]),
    item('c', 'third', { prerequisites: [deck.concepts[1], deck.concepts[0]] })];
  roundTrip(deck);
});
test('results and metadata are immutable, deterministic, and input data is unchanged', () => {
  const source = text(example());
  const result = exportCourseCsv(source);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.metadata), true);
  assert.deepEqual(result, exportCourseCsv(source));
  assert.equal(source, text(example()));
});
test('an optional native format field is normalized by the existing validator', () => {
  const deck = example();
  const without = roundTrip(deck);
  deck.format = 'recallweave-deck/1';
  assert.deepEqual(roundTrip(deck), without);
});
test('declared concept order that the importer cannot preserve is refused', () => {
  const deck = example();
  deck.concepts.reverse();
  assert.throws(() => exportCourseCsv(text(deck)), /concept order/i);
});
test('unknown top-level and question fields are refused instead of silently discarded', () => {
  for (const field of ['notes', 'parameters', '__proto__']) {
    const source = text(example()).replace(/^\{/, '{"' + field + '":"retain me",');
    assert.throws(() => exportCourseCsv(source), /unsupported.*field/i);
  }
  const deck = example();
  deck.items[0].rubric = 'Retain this question data';
  assert.throws(() => exportCourseCsv(text(deck)), /items\[0\].*rubric/);
});
test('lone UTF-16 surrogates in question text or metadata are refused before UTF-8 replacement', () => {
  for (const bad of ['\uD800', '\uDC00', 'ok\uD800x']) {
    const deck = example();
    deck.items[0].prompt = bad;
    assert.throws(() => exportCourseCsv(text(deck)), /Unicode|surrogate/);
    const other = example();
    other.title = bad;
    assert.throws(() => exportCourseCsv(text(other)), /Unicode|surrogate/);
  }
});
test('invalid native data still uses the existing validation gate', () => {
  for (const mutate of [
    d => { d.items[0].answer = 4; },
    d => { d.items[0].options = ['same', 'same']; },
    d => { d.items[0].prerequisites = ['acting']; },
    d => { d.items[0].explanation = ''; },
    d => { d.items[1].id = d.items[0].id; },
    d => { d.license = ''; }
  ]) {
    const deck = example(); mutate(deck);
    assert.throws(() => exportCourseCsv(text(deck)));
  }
  for (const source of ['', '{', 'null', '[]', '\uFEFF' + text(example())]) {
    assert.throws(() => exportCourseCsv(source));
  }
});
test('UTF-8 input budget is enforced, including multibyte text', () => {
  assert.throws(() => exportCourseCsv(' '.repeat(MAX_DECK_BYTES + 1)), /256 KiB/);
  const deck = example();
  deck.items = Array.from({ length: 100 }, (_, n) => item('q' + n, n ? 'acting' : 'observing', {
    prompt: '界'.repeat(1000), explanation: 'Literal explanation'
  }));
  const source = text(deck);
  assert.ok(source.length < MAX_DECK_BYTES);
  assert.ok(Buffer.byteLength(source) > MAX_DECK_BYTES);
  assert.throws(() => exportCourseCsv(source), /256 KiB/);
});
test('a compact deck that exceeds the importer pretty-JSON budget is refused', () => {
  const deck = example();
  deck.items = Array.from({ length: 100 }, (_, n) => item('q' + n, n ? 'acting' : 'observing', {
    prompt: 'p'.repeat(1900), explanation: 'e'.repeat(475)
  }));
  const source = text(deck);
  assert.ok(Buffer.byteLength(source) <= MAX_DECK_BYTES);
  assert.ok(Buffer.byteLength(serializeDeck(parseDeck(source))) > MAX_DECK_BYTES);
  assert.throws(() => exportCourseCsv(source), /256 KiB/);
});
test('maximum question count survives the existing schema', () => {
  const deck = example();
  deck.items = Array.from({ length: 100 }, (_, n) => item('q' + n, n ? 'acting' : 'observing'));
  assert.equal(roundTrip(deck).questionCount, 100);
});
test('CLI exports a real course to one create-only CSV with complete metadata and hashes', async () => workspace(async dir => {
  const input = join(dir, 'source lesson.json'), output = join(dir, 'question bank.csv');
  await writeFile(input, bundledText);
  const result = runCli(['--input', input, '--output', output], dir);
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(result.stdout);
  const csv = await readFile(output, 'utf8');
  assert.equal(receipt.input_sha256, digest(Buffer.from(bundledText)));
  assert.equal(receipt.csv_sha256, digest(Buffer.from(csv)));
  assert.equal(receipt.output, resolve(output));
  assert.deepEqual(convertCourseCsv(csv, receipt.metadata).deck, parseDeck(bundledText));
  assert.deepEqual((await readdir(dir)).sort(), ['question bank.csv', 'source lesson.json']);
}));
test('CLI validation refusals create no output or temporary artifact', async () => workspace(async dir => {
  const input = join(dir, 'source.json'), output = join(dir, 'bank.csv');
  const extra = example(); extra.items[0].grading = 'unrepresentable';
  const order = example(); order.concepts.reverse();
  const surrogate = example(); surrogate.items[0].prompt = '\uD800';
  for (const source of ['{', text(extra), text(order), text(surrogate),
    '\uFEFF' + text(example()), ' '.repeat(MAX_DECK_BYTES + 1)]) {
    await writeFile(input, source);
    const result = runCli(['--input', input, '--output', output], dir);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
    assert.deepEqual(await readdir(dir), ['source.json']);
  }
}));
test('CLI refuses invalid UTF-8 without replacement and leaves no output', async () => workspace(async dir => {
  const input = join(dir, 'source.json');
  await writeFile(input, Buffer.concat([Buffer.from('{"title":"'), Buffer.from([0xC3, 0x28]), Buffer.from('"}')]));
  const result = runCli(['--input', input, '--output', join(dir, 'bank.csv')], dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /UTF-8/);
  assert.deepEqual(await readdir(dir), ['source.json']);
}));
test('CLI preserves existing output files, symlinks, and the source path', async () => workspace(async dir => {
  const input = join(dir, 'source.json'), output = join(dir, 'bank.csv'), target = join(dir, 'target.csv');
  await writeFile(input, text(example()));
  await writeFile(output, 'original');
  let result = runCli(['--input', input, '--output', output], dir);
  assert.notEqual(result.status, 0);
  assert.equal(await readFile(output, 'utf8'), 'original');
  await rm(output);
  await writeFile(target, 'target');
  await symlink(target, output);
  result = runCli(['--input', input, '--output', output], dir);
  assert.notEqual(result.status, 0);
  assert.equal(await readFile(target, 'utf8'), 'target');
  result = runCli(['--input', input, '--output', input], dir);
  assert.notEqual(result.status, 0);
  assert.equal(await readFile(input, 'utf8'), text(example()));
  assert.deepEqual((await readdir(dir)).sort(), ['bank.csv', 'source.json', 'target.csv']);
}));
test('CLI help and invalid arguments have no filesystem effects', async () => workspace(async dir => {
  const help = runCli(['--help'], dir);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--input.*--output/);
  for (const args of [[], ['--wat'], ['--input'], ['--input', 'x'],
    ['--input', 'x', '--output'], ['--input', 'x', '--input', 'y', '--output', 'z'],
    ['--help', '--output', 'z'], ['--input', 'x', '--output', 'z', 'extra']]) {
    const result = runCli(args, dir);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
  }
  assert.deepEqual(await readdir(dir), []);
}));
test('CLI refuses missing input and missing output parent without creating directories', async () => workspace(async dir => {
  const input = join(dir, 'source.json');
  let result = runCli(['--input', input, '--output', join(dir, 'bank.csv')], dir);
  assert.notEqual(result.status, 0);
  assert.deepEqual(await readdir(dir), []);
  await writeFile(input, text(example()));
  result = runCli(['--input', input, '--output', join(dir, 'missing', 'bank.csv')], dir);
  assert.notEqual(result.status, 0);
  assert.deepEqual(await readdir(dir), ['source.json']);
}));

test('CLI reports a complete CSV when private-stage cleanup fails after publication', async () => workspace(async dir => {
  const input = join(dir, 'source.json'), output = join(dir, 'bank.csv');
  const preload = join(dir, 'fail-cleanup.mjs');
  await writeFile(input, bundledText);
  await writeFile(preload,
    "import fs from 'node:fs/promises';\nimport { syncBuiltinESMExports } from 'node:module';\n" +
    "const original = fs.rm;\nfs.rm = async function(path, options) {\n" +
    " if (String(path).includes('.recallweave-csv-')) throw new Error('Injected cleanup failure');\n" +
    " return original.call(this, path, options);\n};\nsyncBuiltinESMExports();\n");
  const result = spawnSync(process.execPath,
    ['--import', preload, cli, '--input', input, '--output', output],
    { cwd: dir, encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 1);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /complete CSV was created/);
  assert.ok(result.stderr.includes(output));
  assert.match(result.stderr, /Injected cleanup failure/);
  assert.equal(await readFile(output, 'utf8'), exportCourseCsv(bundledText).csv);
  assert.equal(await readFile(input, 'utf8'), bundledText);
  assert.equal((await readdir(dir)).filter(name => name.startsWith('.recallweave-csv-')).length, 1);
}));

test('CLI reports publication when a real closed stdout pipe rejects the receipt', async () => workspace(async dir => {
  const input = join(dir, 'source.json'), output = join(dir, 'bank.csv');
  await writeFile(input, bundledText);
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, '--input', input, '--output', output],
      { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000 });
    let stderr = '';
    child.stdout.destroy();
    child.stderr.on('data', bytes => { stderr += bytes; });
    child.on('error', reject);
    child.on('close', (status, signal) => resolve({ status, signal, stderr }));
  });
  assert.equal(result.status, 1);
  assert.equal(result.signal, null);
  assert.match(result.stderr, /complete CSV was created/);
  assert.ok(result.stderr.includes(output));
  assert.match(result.stderr, /EPIPE|broken pipe/i);
  assert.doesNotMatch(result.stderr, /Unhandled 'error' event/);
  assert.equal(await readFile(output, 'utf8'), exportCourseCsv(bundledText).csv);
  assert.equal(await readFile(input, 'utf8'), bundledText);
  assert.deepEqual((await readdir(dir)).filter(name => name.startsWith('.recallweave-csv-')), []);
}));
