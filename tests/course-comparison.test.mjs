import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, mkdir, open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { compareCourses } from '../src/course-comparison.mjs';
import { MAX_DECK_BYTES } from '../src/deck.mjs';

const cli = fileURLToPath(new URL('../tools/compare-course.mjs', import.meta.url));
const item = (id, concept = 'foundation', prerequisites = []) => ({
  id, concept, prerequisites, prompt: 'Choose a connection for ' + id,
  options: ['Keep the stated relationship', 'Reverse the stated relationship'], answer: 0,
  explanation: 'The first relationship follows from the stated example.',
  transfer: 'Explain the same relationship with a second example.'
});
const deck = () => ({
  format: 'recallweave-deck/1', title: 'A small course', attribution: 'Original test content',
  license: 'Test fixture', concepts: ['foundation', 'application'],
  items: [item('start'), item('apply', 'application', ['foundation']), item('extra')]
});
const json = value => JSON.stringify(value);
const compare = (a, b) => compareCourses(json(a), json(b));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('normalization is separate from literal admitted strings and complete nested freezing', () => {
  const a = deck();
  const b = structuredClone(a);
  delete b.format;
  b.extension = { ignored: true };
  const result = compareCourses(JSON.stringify(a), JSON.stringify(b, null, 4) + '\n');
  assert.equal(result.sameContent, true);
  assert.deepEqual(result.questions.summary, {
    beforeCount: 3, afterCount: 3, added: 0, removed: 0, changed: 0, unchanged: 3, positionChanged: 0
  });
  const frozen = value => {
    if (value && typeof value === 'object') {
      assert.ok(Object.isFrozen(value));
      Object.values(value).forEach(frozen);
    }
  };
  frozen(result);
  assert.throws(() => result.questions.retained[0].after.options.push('new'), TypeError);
  b.items[0].prompt += ' ';
  assert.deepEqual(compare(a, b).questions.retained[0].changedFields, ['prompt']);
  assert.equal(a.items[0].prompt, 'Choose a connection for start');
});

test('insertion changes absolute positions without claiming retained reordering', () => {
  const a = deck(), b = structuredClone(a);
  b.items.unshift(item('new'));
  const r = compare(a, b);
  assert.deepEqual(r.questions.added.map(x => x.id), ['new']);
  assert.equal(r.questions.retainedOrderChanged, false);
  assert.deepEqual(r.questions.retained.map(x => [x.beforeIndex, x.afterIndex]), [[0, 1], [1, 2], [2, 3]]);
  assert.deepEqual(r.questions.summary, {
    beforeCount: 3, afterCount: 4, added: 1, removed: 0, changed: 0, unchanged: 3, positionChanged: 3
  });
});

test('option and answer index moves differ from correct-option text changes', () => {
  const a = deck(), b = structuredClone(a);
  b.items[0].options.reverse(); b.items[0].answer = 1;
  b.items[1].options[0] = 'Keep the explicitly stated relationship';
  const r = compare(a, b);
  assert.deepEqual(r.questions.retained[0].changedFields, ['options', 'answer']);
  assert.equal(r.questions.retained[0].answerIndexChanged, true);
  assert.equal(r.questions.retained[0].answerTextChanged, false);
  assert.deepEqual(r.questions.retained[1].changedFields, ['options']);
  assert.equal(r.questions.retained[1].answerIndexChanged, false);
  assert.equal(r.questions.retained[1].answerTextChanged, true);
  assert.deepEqual(r.questions.retained[0].before, a.items[0]);
  assert.deepEqual(r.questions.retained[0].after, b.items[0]);
});

test('IDs alone pair records, including object-property-like literal IDs', () => {
  const a = deck(), b = structuredClone(a);
  a.items[0].id = '__proto__'; b.items[0].id = '__proto__';
  b.items[2].id = 'renamed';
  b.items = [b.items[1], b.items[0], b.items[2]];
  const r = compare(a, b);
  assert.deepEqual(r.questions.retained.map(x => x.id), ['__proto__', 'apply']);
  assert.deepEqual(r.questions.removed.map(x => x.id), ['extra']);
  assert.deepEqual(r.questions.added.map(x => x.id), ['renamed']);
  assert.equal(r.questions.retainedOrderChanged, true);
  assert.equal(r.questions.retained[0].changedFields.length, 0);
});

test('metadata, concept ordering and exact Unicode remain visible', () => {
  const a = deck(), b = structuredClone(a);
  a.items[0].prompt = 'Café';
  b.items[0].prompt = 'Cafe\u0301';
  b.title = ' Revised course ';
  b.attribution += '\nContributor';
  b.license = 'Other fixture license';
  b.concepts.reverse();
  const r = compare(a, b);
  assert.deepEqual(r.metadataChanges.map(x => x.field), ['title', 'attribution', 'license']);
  assert.equal(r.concepts.retainedOrderChanged, true);
  assert.deepEqual(r.concepts.added, []);
  assert.deepEqual(r.questions.retained[0].changedFields, ['prompt']);
  assert.equal(r.questions.retained[0].before.prompt, 'Café');
  assert.equal(r.questions.retained[0].after.prompt, 'Cafe\u0301');
});

test('existing parser refuses malformed decks and bounds rather than comparing partial data', () => {
  const good = json(deck());
  for (const bad of [null, '', '{', '\ufeff' + good, ' '.repeat(MAX_DECK_BYTES + 1)]) {
    assert.throws(() => compareCourses(good, bad));
  }
  const a = deck();
  a.items[1].id = a.items[0].id;
  assert.throws(() => compareCourses(good, json(a)), /duplicates/);
  const b = deck();
  b.items[0].answer = 20;
  assert.throws(() => compareCourses(json(b), good), /zero-based/);
});

async function files(run) {
  const root = await mkdtemp(join(tmpdir(), 'recall-course-comparison-'));
  try { await run(root); } finally { await rm(root, { recursive: true, force: true }); }
}
function invoke(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8', timeout: 10000, maxBuffer: 4 * 1024 * 1024
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return result;
}

test('actual CLI distinguishes exact file bytes and preserves both sources in JSON and text', async () => {
  await files(async root => {
    const before = join(root, 'before café.json'), after = join(root, 'after.json');
    const a = Buffer.from(json(deck())), b = Buffer.from(JSON.stringify(deck(), null, 2) + '\n');
    await writeFile(before, a); await writeFile(after, b);
    const result = invoke([before, after]);
    assert.equal(result.status, 0); assert.equal(result.stderr, '');
    const report = JSON.parse(result.stdout);
    assert.equal(report.format, 'recallweave-course-comparison-files/1');
    assert.equal(report.sameBytes, false);
    assert.equal(report.comparison.sameContent, true);
    assert.deepEqual(report.files, {
      before: { path: before, bytes: a.length, sha256: hash(a) },
      after: { path: after, bytes: b.length, sha256: hash(b) }
    });
    assert.equal(result.stdout, JSON.stringify(report, null, 2) + '\n');
    const changed = deck(); changed.items[0].explanation += '\nLiteral <tag> & "quote".';
    const changedBytes = Buffer.from(json(changed));
    await writeFile(after, changedBytes);
    const text = invoke([before, after, '--format', 'text']);
    assert.equal(text.status, 0); assert.equal(text.stderr, '');
    assert.ok(text.stdout.includes('Same validated content: false'));
    assert.ok(text.stdout.includes(JSON.stringify(changed.items[0])));
    assert.deepEqual(await readFile(before), a);
    assert.deepEqual(await readFile(after), changedBytes);
  });
});

test('actual CLI prepares both inputs before output and classifies usage/content/I/O', async () => {
  await files(async root => {
    const before = join(root, 'valid.json'), after = join(root, 'other.json'), missing = join(root, 'missing.json');
    const good = Buffer.from(json(deck()));
    await writeFile(before, good);
    const cases = [
      { args: [], exit: 2 },
      { args: ['--unknown', missing], exit: 2 },
      { args: [missing, missing, '--format', 'xml'], exit: 2 },
      { args: [before, missing], exit: 1 }
    ];
    for (const row of cases) {
      const result = invoke(row.args);
      assert.equal(result.status, row.exit); assert.equal(result.stdout, '');
      assert.equal(typeof JSON.parse(result.stderr).error, 'string');
    }
    for (const bytes of [Buffer.from('{'), Buffer.from([0xff]), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), good])]) {
      await writeFile(after, bytes);
      const result = invoke([before, after]);
      assert.equal(result.status, 2); assert.equal(result.stdout, '');
      assert.deepEqual(await readFile(after), bytes);
    }
    const folder = join(root, 'directory');
    await mkdir(folder);
    let descriptor, statSucceeded = false;
    try {
      descriptor = await open(folder, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0));
      await descriptor.stat();
      statSucceeded = true;
    } catch (error) {
      assert.equal(typeof error.code, 'string', 'Observed platform filesystem refusal');
    } finally {
      if (descriptor) await descriptor.close();
    }
    const directory = invoke([before, folder]);
    assert.equal(directory.status, statSucceeded ? 2 : 1);
    assert.equal(directory.stdout, '');
    assert.deepEqual(await readFile(before), good);
    const help = invoke(['--help']);
    assert.equal(help.status, 0); assert.equal(help.stderr, '');
    assert.ok(help.stdout.startsWith('Usage:'));
  });
});

test('actual CLI counts raw UTF-8 bytes at the shared 256 KiB boundary', async () => {
  await files(async root => {
    const before = join(root, 'before.json'), after = join(root, 'after.json');
    const source = deck(); source.extra = '';
    const prefix = json(source);
    source.extra = 'x'.repeat(MAX_DECK_BYTES - Buffer.byteLength(prefix));
    const exact = Buffer.from(json(source));
    assert.equal(exact.length, MAX_DECK_BYTES);
    await writeFile(before, exact); await writeFile(after, exact);
    const accepted = invoke([before, after]);
    assert.equal(accepted.status, 0); assert.equal(JSON.parse(accepted.stdout).sameBytes, true);
    const large = Buffer.concat([exact, Buffer.from(' ')]);
    await writeFile(after, large);
    const rejected = invoke([before, after]);
    assert.equal(rejected.status, 2); assert.equal(rejected.stdout, '');
    assert.deepEqual(await readFile(before), exact); assert.deepEqual(await readFile(after), large);
  });
});
