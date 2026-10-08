import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRecall, currentRecall, writeRecall, revealRecall, judgeRecall, beginRevisit, recallSummary, MAX_RECALL_TEXT } from '../src/recall-first.mjs';

const deck = JSON.parse(readFileSync(new URL('../data/deck.json', import.meta.url), 'utf8'));
const finish = (session, choices) => choices.reduce((value, choice, i) =>
  judgeRecall(revealRecall(writeRecall(value, 'attempt ' + i)), choice), session);

test('checked independent content and immutable snapshots', () => {
  const input = structuredClone(deck);
  const initial = createRecall(input);
  input.items[0].prompt = 'changed after admission';
  assert.equal(currentRecall(initial).prompt, deck.items[0].prompt);
  const written = writeRecall(initial, 'My own explanation\n<literal text>');
  assert.equal(initial.draft, '');
  assert.equal(written.draft, 'My own explanation\n<literal text>');
  const shown = revealRecall(written);
  const next = judgeRecall(shown, 'revisit');
  assert.equal(shown.index, 0);
  assert.equal(next.index, 1);
  assert.equal(next.revealed, false);
  assert.equal(next.draft, '');
  assert.deepEqual(next.first[0], { item: deck.items[0].id, text: written.draft, judgment: 'revisit' });
  for (const value of [initial, initial.deck, initial.deck.items, initial.deck.items[0], initial.queue, next.first, next.first[0]]) assert.ok(Object.isFrozen(value));
  assert.throws(() => { next.first[0].judgment = 'ready'; }, TypeError);
});

test('reveal and judgment guards refuse atomically', () => {
  const initial = createRecall(deck);
  const before = JSON.stringify(initial);
  assert.throws(() => judgeRecall(initial, 'ready'), /Reveal and compare/);
  assert.throws(() => beginRevisit(initial), /Finish the first pass/);
  assert.equal(JSON.stringify(initial), before);
  const shown = revealRecall(initial);
  const shownBefore = JSON.stringify(shown);
  assert.throws(() => revealRecall(shown), /cannot be revealed again/);
  assert.throws(() => writeRecall(shown, 'late edit'), /Write before/);
  for (const bad of ['correct', 'wrong', 'READY', null, {}, 0]) assert.throws(() => judgeRecall(shown, bad), /Choose Ready/);
  assert.equal(JSON.stringify(shown), shownBefore);
});

test('optional text and precise UTF-16 boundary', () => {
  assert.equal(MAX_RECALL_TEXT, 4000);
  const initial = createRecall(deck);
  assert.equal(writeRecall(initial, '').draft, '');
  assert.equal(writeRecall(initial, 'a'.repeat(4000)).draft.length, 4000);
  assert.equal(writeRecall(initial, '🌱'.repeat(2000)).draft.length, 4000);
  for (const bad of ['a'.repeat(4001), '🌱'.repeat(2000) + 'x', null, 42, {}]) assert.throws(() => writeRecall(initial, bad), /4,000/);
  assert.equal(judgeRecall(revealRecall(initial), 'ready').first[0].text, '');
});

test('all first-pass choices and bounded revisit choices preserve order and both records', () => {
  const n = deck.items.length;
  for (let mask = 0; mask < 2 ** n; mask++) {
    const judgments = deck.items.map((_, i) => mask & (1 << i) ? 'revisit' : 'ready');
    const first = finish(createRecall(deck), judgments);
    assert.equal(currentRecall(first), null);
    assert.deepEqual(first.first.map(x => x.item), deck.items.map(x => x.id));
    const marked = first.first.filter(x => x.judgment === 'revisit');
    assert.equal(recallSummary(first).markedFirst, marked.length);
    assert.equal(first.revisit.length, 0);
    assert.throws(() => revealRecall(first));
    assert.throws(() => judgeRecall(first, 'ready'));
    assert.throws(() => writeRecall(first, 'extra'));
    if (!marked.length) { assert.throws(() => beginRevisit(first), /No items/); continue; }
    const revisit = beginRevisit(first);
    assert.equal(revisit.revealed, false);
    assert.equal(revisit.draft, '');
    assert.deepEqual(revisit.queue.map(i => deck.items[i].id), marked.map(x => x.item));
    for (let retryMask = 0; retryMask < 2 ** marked.length; retryMask++) {
      const secondJudgments = marked.map((_, i) => retryMask & (1 << i) ? 'revisit' : 'ready');
      const done = finish(revisit, secondJudgments);
      assert.equal(currentRecall(done), null);
      assert.deepEqual(done.first, first.first);
      assert.deepEqual(done.revisit.map(x => x.item), marked.map(x => x.item));
      assert.equal(done.first.length + done.revisit.length, n + marked.length);
      assert.deepEqual(recallSummary(done), { completed: true, pass: 'revisit', total: n,
        firstChecked: n, revisitChecked: marked.length, markedFirst: marked.length,
        revisitRemaining: secondJudgments.filter(x => x === 'revisit').length });
      assert.throws(() => beginRevisit(done), /Finish the first pass/);
    }
  }
});

test('completion does not claim correctness and restart starts a fresh snapshot', () => {
  const done = finish(createRecall(deck), deck.items.map(() => 'ready'));
  assert.deepEqual(recallSummary(done), { completed: true, pass: 'first', total: deck.items.length,
    firstChecked: deck.items.length, revisitChecked: 0, markedFirst: 0, revisitRemaining: 0 });
  assert.ok(!('correct' in done.first[0]));
  assert.ok(!('mastery' in done));
  const restarted = createRecall(done.deck);
  assert.equal(restarted.first.length, 0);
  assert.equal(restarted.revisit.length, 0);
  assert.equal(currentRecall(restarted).id, deck.items[0].id);
  assert.equal(done.first.length, deck.items.length);
});

test('invalid courses use the existing validator and do not alter accepted work', () => {
  const accepted = writeRecall(createRecall(deck), 'retain me');
  const before = JSON.stringify(accepted);
  for (const input of [null, {}, { ...deck, items: [] }, { ...deck, concepts: [] },
    { ...deck, items: [{ ...deck.items[0], answer: 6 }] }]) assert.throws(() => createRecall(input));
  assert.equal(JSON.stringify(accepted), before);
});

test('existing deck validator and bundled source remain exact', () => {
  for (const [path, expected] of [
    ['src/deck.mjs', 'f0f8a4b234489c2388f427633f548d56c6ed4c03'],
    ['data/deck.json', '8efc98fe278b436a47b245eadd419155ee7af2ad']
  ]) {
    const bytes = readFileSync(new URL('../' + path, import.meta.url));
    const actual = createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
    assert.equal(actual, expected, path);
  }
});

test('standalone output matches the builder and contains no external asset dependency', () => {
  const builder = new URL('../tools/build-recall-first.mjs', import.meta.url);
  const run = spawnSync(process.execPath, [fileURLToPath(builder), '--check'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const html = readFileSync(new URL('../recall-first.html', import.meta.url), 'utf8');
  assert.ok(!/<script[^>]+src=|<link[^>]+href=/.test(html));
  assert.ok(!html.includes('__RECALL_FIRST_DECK__'));
  assert.ok(html.includes('not a secure test'));
  assert.equal((html.match(/<script/g) || []).length, 2);
});
