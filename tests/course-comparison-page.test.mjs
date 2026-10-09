import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCourseComparisonPage } from '../src/course-comparison-page.mjs';

const course = title => ({
  title, attribution: 'Teacher <literal>\n日本語', license: 'Original receiving fixture',
  concepts: ['One', 'Two'],
  items: [
    { id: ' q spaced ', concept: 'One', prerequisites: [], prompt: 'First prompt', options: ['First', 'Second'], answer: 1, explanation: 'First explanation', transfer: 'First transfer' },
    { id: '__proto__', concept: 'Two', prerequisites: ['One'], prompt: 'Second prompt', options: ['Yes', 'No'], answer: 0, explanation: 'Second explanation', transfer: 'Second transfer' }
  ]
});
const bytes = value => new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value));
const file = (name, value) => {
  const raw = bytes(value);
  return { name, size: raw.length, async arrayBuffer() { return raw.slice().buffer; } };
};
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const delayedFile = (name, value) => {
  const gate = deferred(), raw = bytes(value);
  return { gate, raw, file: { name, size: raw.length, arrayBuffer: () => gate.promise } };
};
async function ready() {
  const page = createCourseComparisonPage();
  await page.load('before', file(' earlier 日本語.json ', course('Earlier')));
  await page.load('after', file('revised.json', course('Revised')));
  return page;
}

test('captures literal filenames and actual UTF-8 byte/hash identity in the exact downloadable snapshot', async () => {
  const page = await ready(), report = page.compare();
  assert.equal(report.data.format, 'recallweave-course-comparison-browser/1');
  assert.equal(report.data.files.before.name, ' earlier 日本語.json ');
  const original = bytes(course('Earlier'));
  assert.equal(report.data.files.before.bytes, original.length);
  assert.equal(report.data.files.before.sha256, createHash('sha256').update(original).digest('hex'));
  assert.equal(report.json, JSON.stringify(report.data, null, 2) + '\n');
  assert.ok(Object.isFrozen(report) && Object.isFrozen(report.data.files.before));
  assert.equal(report.data.comparison.format, 'recallweave-course-comparison/1');
  const old = report.json;
  await page.load('after', file('other.json', course('Other')));
  assert.equal(page.state().report, null);
  assert.equal(report.json, old);
  assert.equal(report.data.files.after.name, 'revised.json');
});

test('cancel preserves a ready report; new selection retires it before the read and failure retains the old accepted copy', async () => {
  const page = await ready(), report = page.compare();
  assert.equal((await page.load('before', null)).status, 'cancelled');
  assert.equal(page.state().report, report);
  const slow = delayedFile('new.json', course('Later'));
  const pending = page.load('before', slow.file);
  assert.equal(page.state().pending.before, true);
  assert.equal(page.state().report, null);
  assert.equal(page.state().canCompare, false);
  assert.throws(() => page.compare(), /Wait/);
  slow.gate.reject(new Error('Synthetic read refusal'));
  assert.equal((await pending).status, 'refused');
  assert.equal(page.state().slots.before.name, ' earlier 日本語.json ');
  assert.equal(page.state().canCompare, true);
  assert.equal(page.state().report, null);
  assert.match(page.state().errors.before, /previous accepted copy/);
  assert.equal(page.compare().json, report.json);
});

test('newer same-role selection and Clear retire unfinished reads and hashes without affecting the other accepted role', async () => {
  const page = await ready();
  const old = delayedFile('obsolete.json', course('Obsolete'));
  const pending = page.load('before', old.file);
  await page.load('before', file('current.json', course('Current')));
  old.gate.resolve(old.raw.buffer);
  assert.equal((await pending).status, 'stale');
  assert.equal(page.state().slots.before.name, 'current.json');
  const next = delayedFile('cleared.json', course('Cleared'));
  const nextPromise = page.load('before', next.file);
  page.clear('before');
  next.gate.resolve(next.raw.buffer);
  assert.equal((await nextPromise).status, 'stale');
  assert.equal(page.state().slots.before, null);
  assert.equal(page.state().slots.after.name, 'revised.json');
  assert.equal(page.state().canCompare, false);
});

test('roles have independent read identities and comparison stays disabled until both captures finish', async () => {
  const page = createCourseComparisonPage();
  const before = delayedFile('a.json', course('A')), after = delayedFile('b.json', course('B'));
  const a = page.load('before', before.file), b = page.load('after', after.file);
  after.gate.resolve(after.raw.buffer); assert.equal((await b).status, 'accepted');
  assert.equal(page.state().canCompare, false);
  before.gate.resolve(before.raw.buffer); assert.equal((await a).status, 'accepted');
  assert.equal(page.state().canCompare, true);
  const report = page.compare();
  assert.equal(report.data.files.before.name, 'a.json');
  assert.equal(report.data.files.after.name, 'b.json');
});

test('oversize is refused before a read and captured oversize, fatal UTF-8, BOM and invalid decks preserve prior copies', async () => {
  const page = await ready();
  let reads = 0;
  assert.equal((await page.load('before', { name: 'huge.json', size: 262145, arrayBuffer() { reads++; throw Error('must not read'); } })).status, 'refused');
  assert.equal(reads, 0);
  const malformed = [
    { name: 'grew.json', size: 1, async arrayBuffer() { return new Uint8Array(262145).buffer; } },
    { name: 'invalid-utf8.json', size: 2, async arrayBuffer() { return Uint8Array.of(0xc3, 0x28).buffer; } },
    file('bom.json', '\ufeff' + JSON.stringify(course('BOM'))),
    file('syntax.json', '{"title":}'),
    file('bad-answer.json', { ...course('Invalid'), items: course('Invalid').items.map(x => ({ ...x, answer: 8 })) })
  ];
  for (const candidate of malformed) {
    page.compare();
    assert.equal((await page.load('before', candidate)).status, 'refused', candidate.name);
    assert.equal(page.state().report, null);
    assert.equal(page.state().slots.before.name, ' earlier 日本語.json ');
    assert.equal(page.state().canCompare, true);
  }
});

test('only exact byte equality sets sameBytes while whitespace and ignored extension fields retain the owner content result', async () => {
  const page = createCourseComparisonPage(), deck = course('Same');
  const raw = JSON.stringify(deck);
  await page.load('before', file('first.json', raw));
  await page.load('after', file('second.json', raw));
  assert.equal(page.compare().data.sameBytes, true);
  await page.load('after', file('pretty.json', JSON.stringify({ ...deck, ignoredExtension: true }, null, 2) + '\n'));
  const report = page.compare();
  assert.equal(report.data.sameBytes, false);
  assert.equal(report.data.comparison.sameContent, true);
  assert.notEqual(report.data.files.before.sha256, report.data.files.after.sha256);
});

test('hash rejection and supersession during hashing never publish an unchecked file or stale report', async () => {
  const gate = deferred();
  let calls = 0;
  const page = createCourseComparisonPage({
    digest: async raw => {
      calls++;
      if (calls === 1) return gate.promise;
      return createHash('sha256').update(raw).digest('hex');
    }
  });
  const first = page.load('before', file('slow-hash.json', course('Slow')));
  await Promise.resolve();
  assert.equal(calls, 1);
  await page.load('before', file('accepted.json', course('Accepted')));
  gate.reject(new Error('obsolete hash refusal'));
  assert.equal((await first).status, 'stale');
  assert.equal(page.state().slots.before.name, 'accepted.json');
  const refused = createCourseComparisonPage({ digest: async () => { throw Error('hash unavailable'); } });
  assert.equal((await refused.load('before', file('no-hash.json', course('Bad')))).status, 'refused');
  assert.equal(refused.state().slots.before, null);
  assert.equal(refused.state().pending.before, false);
});

test('state snapshots cannot mutate accepted files, pending roles, or immutable comparison output', async () => {
  const page = await ready(), snapshot = page.state();
  assert.throws(() => { snapshot.slots.before.name = 'changed'; }, TypeError);
  assert.throws(() => { snapshot.pending.before = true; }, TypeError);
  const report = page.compare();
  assert.throws(() => { report.data.comparison.questions.retained[0].before.options[0] = 'changed'; }, TypeError);
  page.clear('before');
  assert.equal(snapshot.slots.before.name, ' earlier 日本語.json ');
  assert.equal(page.state().slots.before, null);
  assert.equal(page.state().report, null);
  assert.throws(() => page.compare(), /Load an earlier/);
  assert.throws(() => page.clear('__proto__'), /role/);
  await assert.rejects(() => page.load('constructor', file('x', course('X'))), /role/);
});
