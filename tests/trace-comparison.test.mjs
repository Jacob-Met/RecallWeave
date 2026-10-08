import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialMastery, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, answerPractice } from '../src/review.mjs';
import { createTraceArchive, TRACE_ARCHIVE_MAX_BYTES } from '../src/trace-archive.mjs';
import { compareTraceArchives, inspectTraceForComparison } from '../src/trace-comparison.mjs';
import { createTracePairController } from '../src/trace-comparison-ui.mjs';

const fixtureDeck = {
  format: 'recallweave-deck/1', title: 'Authored comparison fixture',
  attribution: 'Synthetic test content <literal>', license: 'Test fixture only',
  concepts: ['foundation', 'constructor'],
  items: ['alpha', 'beta', 'gamma', 'delta', 'epsilon', '__proto__'].map((id, index) => ({
    id, concept: index % 2 ? 'constructor' : 'foundation', prerequisites: [],
    prompt: 'Choose the stated fixture tag for ' + id + '.',
    options: ['Expected tag', 'Other tag', 'Third tag'], answer: 0,
    explanation: 'The expected fixture tag is specified by the fixture.',
    transfer: 'Compare the two recorded choices without changing them.',
  })),
};
const savedA = '2026-10-08T14:00:00.000Z';
const savedB = '2026-10-01T12:00:00.000Z';

function archive({ deck = fixtureDeck, choices, order, retries = null, savedAt = savedA } = {}) {
  choices ??= deck.items.map(item => item.answer);
  order ??= deck.items.map((_, index) => index);
  const answers = order.map(index => ({ item: deck.items[index].id, choice: choices[index] }));
  const items = new Map(deck.items.map(item => [item.id, item]));
  const mastery = initialMastery(deck.concepts);
  for (const answer of answers) {
    const item = items.get(answer.item);
    mastery[item.concept] = updateMastery(mastery[item.concept], answer.choice === item.answer);
  }
  let practice = null;
  if (retries !== null) {
    practice = beginPractice(createReview(deck.items, answers));
    for (const choice of retries) {
      practice = answerPractice(practice, practice.items[practice.answers.length].id, choice);
    }
  }
  return createTraceArchive({ deck, answers, mastery, practice, savedAt }).text;
}
function altered(text, change) {
  const value = JSON.parse(text);
  change(value);
  return JSON.stringify(value);
}
function file(text, name = 'trace.json') {
  const bytes = new TextEncoder().encode(text);
  return { name, size: bytes.byteLength, arrayBuffer: async () => bytes.buffer };
}
function deferredFile(text, name) {
  let resolve, reject;
  const bytes = new TextEncoder().encode(text);
  const promise = new Promise((accept, refuse) => { resolve = accept; reject = refuse; });
  return { file: { name, size: bytes.byteLength, arrayBuffer: () => promise }, resolve: () => resolve(bytes.buffer), reject };
}

test('identical completed files inspect independently with no invented differences or chronology', () => {
  const text = archive();
  const before = text;
  const inspection = inspectTraceForComparison(text);
  assert.equal(inspection.course.questionCount, 6);
  assert.equal(inspection.summary.correctFirst, 6);
  assert.equal(inspection.summary.practiceStarted, false);
  const pair = compareTraceArchives(text, text);
  assert.deepEqual(pair.changes, { firstAnswers: 0, practice: 0 });
  assert.deepEqual(pair.rows.map(row => row.id), fixtureDeck.items.map(item => item.id));
  assert.ok(pair.rows.every(row => row.left.practice.state === 'not-needed'));
  assert.equal(text, before);
  const dated = compareTraceArchives(text, archive({ savedAt: savedB }));
  assert.equal(dated.left.savedAt, savedA);
  assert.equal(dated.right.savedAt, savedB);
  assert.deepEqual(dated.changes, { firstAnswers: 0, practice: 0 });
});

test('canonical joins preserve both orders, all correctness transitions and two different wrong answers', () => {
  const a = archive({ choices: [0, 0, 1, 1, 1, 0], order: [5, 1, 3, 0, 4, 2], retries: [0] });
  const b = archive({ choices: [0, 1, 0, 1, 2, 0], order: [2, 4, 0, 5, 1, 3], retries: [2, 0], savedAt: savedB });
  const pair = compareTraceArchives(a, b);
  assert.deepEqual(pair.changes, { firstAnswers: 3, practice: 4 });
  assert.deepEqual(pair.rows.map(row => [row.left.first.correct, row.right.first.correct]), [
    [true, true], [true, false], [false, true], [false, false], [false, false], [true, true],
  ]);
  assert.deepEqual(pair.rows.map(row => [row.left.first.position, row.right.first.position]), [
    [4, 3], [2, 5], [6, 1], [3, 6], [5, 2], [1, 4],
  ]);
  assert.equal(pair.rows[4].firstChanged, true);
  assert.equal(pair.rows[4].right.practice.correct, false);
  assert.equal(pair.rows[3].left.first.correct, false);
  assert.equal(pair.rows[3].left.practice.correct, true);
  assert.equal(pair.left.summary.correctFirst, 3);
  assert.equal(pair.right.summary.correctFirst, 3);
});

test('changed question order alone is not an answer difference', () => {
  const pair = compareTraceArchives(archive(), archive({ order: [5, 4, 3, 2, 1, 0] }));
  assert.deepEqual(pair.changes, { firstAnswers: 0, practice: 0 });
  assert.equal(pair.rows[0].left.first.position, 1);
  assert.equal(pair.rows[0].right.first.position, 6);
});

test('unstarted, pending, incorrect retry and correct retry remain separate from first answers', () => {
  const choices = [1, 0, 1, 0, 0, 0];
  const unstarted = archive({ choices });
  const pending = archive({ choices, retries: [] });
  const partial = archive({ choices, retries: [2] });
  const complete = archive({ choices, retries: [2, 0] });
  assert.equal(compareTraceArchives(unstarted, pending).rows[0].left.practice.state, 'unstarted');
  assert.equal(compareTraceArchives(unstarted, pending).rows[0].right.practice.state, 'pending');
  const pair = compareTraceArchives(partial, complete);
  assert.equal(pair.rows[0].left.practice.correct, false);
  assert.equal(pair.rows[2].left.practice.state, 'pending');
  assert.equal(pair.rows[2].right.practice.state, 'answered');
  assert.equal(pair.rows[2].right.practice.correct, true);
  assert.equal(pair.rows[2].right.first.correct, false);
  assert.equal(pair.changes.firstAnswers, 0);
  assert.equal(pair.changes.practice, 1);
});

test('the current raw bundled deck remains compatible without normalizing its archive identity', () => {
  const deck = JSON.parse(readFileSync(new URL('../data/deck.json', import.meta.url), 'utf8'));
  assert.equal(Object.hasOwn(deck, 'format'), false);
  const text = archive({ deck });
  const pair = compareTraceArchives(text, text);
  assert.equal(pair.course.title, deck.title);
  assert.equal(pair.rows.length, deck.items.length);
  const normalized = archive({ deck: { format: 'recallweave-deck/1', ...deck } });
  assert.throws(() => compareTraceArchives(text, normalized), /different course/);
});

test('object property ordering preserves identity while changed course content refuses the pair', () => {
  const text = archive();
  const reordered = altered(text, value => {
    value.deck = Object.fromEntries(Object.entries(value.deck).reverse());
    value.deck.items = value.deck.items.map(item => Object.fromEntries(Object.entries(item).reverse()));
  });
  assert.equal(compareTraceArchives(text, reordered).rows.length, 6);
  for (const change of [
    value => { value.deck.title += ' changed'; },
    value => { value.deck.attribution += ' changed'; },
    value => { value.deck.items[0].prompt += ' changed'; },
    value => { value.deck.items[0].options.reverse(); },
    value => { value.deck.items[0].answer = 1; },
    value => { value.deck.items.reverse(); },
  ]) assert.throws(() => compareTraceArchives(text, altered(text, change)), /different course/);
});

test('incomplete, malformed, changed-model and altered-estimate inputs keep the native refusals', () => {
  const text = archive();
  for (const change of [
    value => { value.firstAnswers.pop(); },
    value => { value.firstAnswers[1].item = value.firstAnswers[0].item; },
    value => { value.firstAnswers[0].choice = 20; },
    value => { value.mastery.foundation = 0.5; },
    value => { value.model.parameters.guess = 0.3; },
    value => { value.savedAt = 'yesterday'; },
    value => { value.practice = { answers: [{ item: 'alpha', choice: 0 }] }; },
  ]) {
    const invalid = altered(text, change);
    assert.throws(() => inspectTraceForComparison(invalid));
    assert.throws(() => compareTraceArchives(text, invalid));
  }
  for (const invalid of ['', '{', 'null', '[]', JSON.stringify({ deck: fixtureDeck })]) {
    assert.throws(() => inspectTraceForComparison(invalid));
  }
});

test('inspection validates bounded deck content before using an archived deck as context', () => {
  const text = archive();
  for (const change of [
    value => { value.deck.items[0].options = ['one']; },
    value => { value.deck.items[0].concept = 'missing'; },
    value => { value.deck.items[0].prerequisites = ['foundation']; },
  ]) assert.throws(() => inspectTraceForComparison(altered(text, change)));
  assert.throws(() => inspectTraceForComparison(' '.repeat(TRACE_ARCHIVE_MAX_BYTES + 1)), /2 MiB/);
  assert.throws(() => inspectTraceForComparison('é'.repeat(TRACE_ARCHIVE_MAX_BYTES / 2 + 1)), /2 MiB/);
});

test('literal course content and prototype-looking IDs survive without mutable returned records', () => {
  const deck = structuredClone(fixtureDeck);
  deck.title = '<img src=x onerror=alert(1)> 雨';
  deck.items[0].prompt = '<script>literal</script> & "question"';
  const pair = compareTraceArchives(archive({ deck }), archive({ deck }));
  assert.equal(pair.course.title, deck.title);
  assert.equal(pair.rows[0].prompt, deck.items[0].prompt);
  assert.equal(pair.rows[5].id, '__proto__');
  assert.equal(pair.rows[1].concept, 'constructor');
  assert.throws(() => { pair.rows[0].left.first.choice = 2; }, TypeError);
  assert.throws(() => { pair.rows[0].options[0] = 'changed'; }, TypeError);
  assert.equal(pair.rows[0].options[0], 'Expected tag');
});

test('independent concurrent file reads only publish their current pair', async () => {
  const a = deferredFile(archive(), 'left.json');
  const b = deferredFile(archive({ choices: [1, 0, 0, 0, 0, 0] }), 'right.json');
  const control = createTracePairController();
  const left = control.select('left', a.file);
  const right = control.select('right', b.file);
  b.resolve(); await right;
  assert.equal(control.getSnapshot().right.status, 'ready');
  assert.equal(control.getSnapshot().left.status, 'loading');
  assert.equal(control.getSnapshot().comparison, null);
  a.resolve(); await left;
  assert.equal(control.getSnapshot().comparison.changes.firstAnswers, 1);
  assert.equal(control.getSnapshot().left.filename, 'left.json');
  assert.equal(control.getSnapshot().right.filename, 'right.json');
});

test('a replacement retires the old pair immediately and a superseded read cannot overwrite it', async () => {
  const control = createTracePairController();
  await control.select('left', file(archive(), 'first.json'));
  await control.select('right', file(archive(), 'right.json'));
  const old = control.getSnapshot();
  const slow = deferredFile(archive({ choices: [1, 0, 0, 0, 0, 0] }), 'slow.json');
  const pending = control.select('left', slow.file);
  assert.equal(control.getSnapshot().comparison, null);
  assert.equal(control.getSnapshot().left.status, 'loading');
  await control.select('left', file(archive({ choices: [0, 1, 0, 0, 0, 0] }), 'new.json'));
  const accepted = control.getSnapshot();
  slow.resolve(); await pending;
  assert.equal(control.getSnapshot(), accepted);
  assert.equal(accepted.left.filename, 'new.json');
  assert.equal(accepted.comparison.rows[1].firstChanged, true);
  assert.equal(old.comparison.changes.firstAnswers, 0);
});

test('clearing a pending file or receiving its late failure cannot restore comparison state', async () => {
  const control = createTracePairController();
  await control.select('right', file(archive()));
  const slow = deferredFile(archive(), 'slow.json');
  const pending = control.select('left', slow.file);
  control.clear('left');
  slow.reject(new Error('late disk read failure')); await pending;
  assert.equal(control.getSnapshot().left.status, 'empty');
  assert.equal(control.getSnapshot().right.status, 'ready');
  assert.equal(control.getSnapshot().comparison, null);
  await control.select('left', file(archive()));
  assert.ok(control.getSnapshot().comparison);
});

test('rejected or incompatible replacements clear paired output and permit ordinary recovery', async () => {
  const control = createTracePairController();
  await control.select('left', file(archive()));
  await control.select('right', file(archive()));
  await control.select('right', file('{ broken'));
  assert.equal(control.getSnapshot().right.status, 'error');
  assert.equal(control.getSnapshot().comparison, null);
  await control.select('right', file(archive({ deck: { ...fixtureDeck, title: 'Different course' } })));
  assert.equal(control.getSnapshot().right.status, 'ready');
  assert.match(control.getSnapshot().error, /different course/);
  assert.equal(control.getSnapshot().comparison, null);
  await control.select('right', file(archive()));
  assert.equal(control.getSnapshot().error, '');
  assert.ok(control.getSnapshot().comparison);
});

test('file admission refuses oversized metadata before reading and rejects malformed UTF-8 bytes', async () => {
  let reads = 0;
  const control = createTracePairController();
  await control.select('left', { name: 'huge.json', size: TRACE_ARCHIVE_MAX_BYTES + 1, arrayBuffer: async () => { reads++; } });
  assert.equal(reads, 0);
  assert.match(control.getSnapshot().left.error, /2 MiB/);
  await control.select('left', { name: 'bad-utf8.json', size: 1, arrayBuffer: async () => new Uint8Array([255]).buffer });
  assert.match(control.getSnapshot().left.error, /UTF-8/);
  await control.select('left', { name: 'read-failure.json', size: 10, arrayBuffer: async () => { throw new Error('unreadable selected file'); } });
  assert.match(control.getSnapshot().left.error, /unreadable selected file/);
  await control.select('left', { name: 'mismatched-size.json', size: 1, arrayBuffer: async () => new ArrayBuffer(TRACE_ARCHIVE_MAX_BYTES + 1) });
  assert.match(control.getSnapshot().left.error, /2 MiB/);
});

test('cancelled selection preserves accepted files and the immutable paired snapshot', async () => {
  const control = createTracePairController();
  await control.select('left', file(archive(), 'a.json'));
  await control.select('right', file(archive(), 'b.json'));
  const accepted = control.getSnapshot();
  await control.select('left', null);
  assert.equal(control.getSnapshot(), accepted);
  assert.equal(accepted.left.filename, 'a.json');
  assert.equal(accepted.right.filename, 'b.json');
});
