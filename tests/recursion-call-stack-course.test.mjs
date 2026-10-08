import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDeck, serializeDeck, MAX_DECK_BYTES } from '../src/deck.mjs';
import { draftFromDeck, checkDraft } from '../src/deck-author.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from '../src/review.mjs';
import { createStudyNotes } from '../src/session-export.mjs';

const raw = await readFile(new URL('../courses/recursion-call-stack.json', import.meta.url), 'utf8');
const guide = await readFile(new URL('../courses/recursion-call-stack.md', import.meta.url), 'utf8');
const deck = parseDeck(raw);
const item = id => { const value = deck.items.find(row => row.id === id); assert.ok(value, id); return value; };
const selected = id => { const row = item(id); return row.options[row.answer]; };

// This is a mathematical reference, not another recursive event tracer.
// F(n) counts compositions of n-1 into 1s and 2s: sum choose(n-1-k, k).
function choose(n, k) {
  let result = 1n;
  for (let i = 1; i <= k; i++) result = result * BigInt(n - k + i) / BigInt(i);
  return result;
}
function fibonacci(n) {
  if (n === 0) return 0n;
  let result = 0n;
  for (let k = 0; k <= Math.floor((n - 1) / 2); k++) result += choose(n - 1 - k, k);
  return result;
}
function factorial(n) {
  let result = 1n;
  for (let factor = 2; factor <= n; factor++) result *= BigInt(factor);
  return result;
}
const naiveCalls = n => Number(2n * fibonacci(n + 1) - 1n);
const depth = n => Math.max(1, n);
const memoCounts = n => n < 2
  ? { calls: 1, computed: 1, hits: 0, depth: 1 }
  : { calls: 2 * n - 1, computed: n + 1, hits: n - 2, depth: n };

test('the twelve-question course is an exact native importer/serializer round trip', () => {
  assert.ok(Buffer.byteLength(raw, 'utf8') < MAX_DECK_BYTES);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.deepEqual(JSON.parse(raw), JSON.parse(serializeDeck(deck)), 'no ignored or discarded fields');
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.deepEqual(deck.concepts.map(concept => deck.items.filter(row => row.concept === concept).length), [3, 3, 3, 3]);
  assert.deepEqual([0, 1, 2, 3].map(answer => deck.items.filter(row => row.answer === answer).length), [3, 3, 3, 3]);
  assert.ok(Object.isFrozen(deck) && Object.isFrozen(deck.items) && Object.isFrozen(deck.concepts));
  for (const row of deck.items) {
    assert.equal(row.options.length, 4);
    assert.ok(Object.isFrozen(row) && Object.isFrozen(row.options) && Object.isFrozen(row.prerequisites));
    assert.ok(guide.includes('| ' + row.id + ' |'), 'worked transfer table includes ' + row.id);
  }
});

test('base cases and the unreachable countdown use their declared inputs', () => {
  assert.equal(factorial(0), 1n);
  assert.equal(factorial(1), 1n);
  assert.equal(selected('rc-base-zero'), 'It returns 1 after one call, at maximum depth 1.');
  const oddSequence = Array.from({ length: 8 }, (_, i) => 5 - 2 * i);
  assert.deepEqual(oddSequence.slice(0, 4), [5, 3, 1, -1]);
  assert.ok(oddSequence.every(n => Math.abs(n % 2) === 1));
  assert.equal(selected('rc-progress-reachable'), 'No. The inputs stay odd: 5, 3, 1, −1, …, so the equality test never sees 0.');
  assert.deepEqual(Array.from({ length: 6 }, (_, i) => 5 - i), [5, 4, 3, 2, 1, 0]);
  assert.equal(fibonacci(0), 0n);
  assert.equal(fibonacci(1), 1n);
  assert.equal(fibonacci(2), 1n);
  assert.equal(selected('rc-fib-bases'), 'It calls F(1), then F(0), and returns 1 + 0 = 1.');
});

test('waiting-parent, completion-order and second-child answers preserve unfinished work', () => {
  const child = factorial(2);
  assert.equal(3n * child, factorial(3));
  assert.equal(4n * 3n * child, factorial(4));
  assert.equal(selected('rc-suspended-parent'), "factorial(3) must multiply its child's result by 3, then factorial(4) must multiply that result by 4.");
  const returned = [0, 1, 2, 3].map(n => factorial(n).toString());
  assert.deepEqual(returned, ['1', '1', '2', '6']);
  assert.equal(selected('rc-return-order'), 'factorial(0), factorial(1), factorial(2), factorial(3), returning ' + returned.join(', ') + '.');
  assert.equal(fibonacci(2) + fibonacci(1), 2n);
  assert.equal(selected('rc-second-child'), "Keep the left result 1, call F(1), and then add that child's return.");
  assert.ok(guide.includes('active frames are **F(3), F(1)**'));
});

test('chain and branching call counts agree with independent products and binomial sums', () => {
  assert.equal(factorial(5), 120n);
  assert.equal(factorial(6), 720n);
  assert.equal(selected('rc-chain-cost'), '6 total calls and maximum depth 6.');
  assert.equal(selected('rc-tree-cost'), naiveCalls(5) + ' total calls and maximum depth ' + depth(5) + '.');
  assert.equal(naiveCalls(6), 25);
  assert.equal(fibonacci(6), 8n);
  assert.equal(depth(6), 6);
  assert.equal(naiveCalls(10), 177);
  assert.equal(factorial(10), 3628800n);
  // A manually enumerated whole F(4) invocation tree is distinct from active depth.
  const callsF4 = [4, 3, 2, 1, 0, 1, 2, 1, 0];
  assert.equal(callsF4.length, naiveCalls(4));
  assert.equal(callsF4.filter(n => n === 2).length, 2);
  assert.equal(selected('rc-repeated-subproblem'), "Two: one lies inside the F(3) branch, and the other is the root's right child.");
  assert.equal(Number(fibonacci(3)) + Number(fibonacci(2)), 3, 'F(2) occurrences in F(5)');
});

test('fresh-cache answers account for every invocation and preserve a stored zero', () => {
  assert.deepEqual(memoCounts(0), { calls: 1, computed: 1, hits: 0, depth: 1 });
  assert.deepEqual(memoCounts(1), { calls: 1, computed: 1, hits: 0, depth: 1 });
  assert.deepEqual(memoCounts(5), { calls: 9, computed: 6, hits: 3, depth: 5 });
  assert.deepEqual(memoCounts(6), { calls: 11, computed: 7, hits: 4, depth: 6 });
  assert.equal(selected('rc-memo-counts'), '9 total calls, 6 computed calls, 3 hits, maximum depth 5.');
  assert.equal(selected('rc-fresh-run'), 'Again 9 total calls, 6 computed calls, 3 hits and maximum depth 5; the result is again 5.');
  const cache = new Map([[0, 0n], [1, 1n], [2, 1n]]);
  assert.equal(cache.has(0), true);
  assert.equal(cache.get(0), 0n);
  assert.equal(cache.has(5), false);
  assert.equal(cache.get(2), fibonacci(2));
  assert.equal(selected('rc-cache-hit'), 'It counts as one call and one cache hit, returns 1, and makes no child calls.');
  for (let n = 0; n <= 10; n++) {
    const counts = memoCounts(n);
    assert.equal(counts.calls, counts.computed + counts.hits);
    assert.ok(counts.calls <= naiveCalls(n));
    assert.equal(counts.depth, depth(n));
  }
});

test('every numeric Fibonacci guide row matches the separate reference', () => {
  const rows = [...guide.matchAll(/^\| (\d+) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \|$/gm)]
    .map(match => match.slice(1).map(Number));
  assert.equal(rows.length, 11);
  for (let n = 0; n <= 10; n++) {
    const memo = memoCounts(n);
    assert.deepEqual(rows[n], [n, Number(fibonacci(n)), naiveCalls(n), memo.calls, memo.computed, memo.hits, depth(n)]);
  }
});

test('the existing author conversion can reopen and check every content field without loss', () => {
  const draft = draftFromDeck(deck);
  const checked = checkDraft(draft);
  assert.equal(checked.ok, true);
  assert.deepEqual(checked.deck, deck);
  assert.deepEqual(parseDeck(checked.json), deck);
  assert.equal(draft.questions.length, 12);
  for (let i = 0; i < draft.questions.length; i++) {
    const original = deck.items[i], question = draft.questions[i];
    assert.equal(question.options.find(option => option.key === question.answerKey).text, original.options[original.answer]);
    assert.equal(question.explanation, original.explanation);
    assert.equal(question.transfer, original.transfer);
  }
});

test('actual selection, review, practice and study notes retain the imported answer identity', () => {
  for (const mode of ['correct', 'missed', 'mixed']) {
    const mastery = initialMastery(deck.concepts), asked = new Set(), answers = [];
    while (asked.size < deck.items.length) {
      const row = selectNextItem(deck.items, asked, mastery);
      assert.ok(row && !asked.has(row.id));
      const correct = mode === 'correct' || (mode === 'mixed' && asked.size % 3 !== 0);
      const choice = correct ? row.answer : (row.answer + 1) % row.options.length;
      asked.add(row.id);answers.push({ item: row.id, choice });
      mastery[row.concept] = updateMastery(mastery[row.concept], correct);
    }
    assert.equal(selectNextItem(deck.items, asked, mastery), null);
    const review = createReview(deck.items, answers);
    const initial = JSON.stringify({ review, mastery });
    let practice = beginPractice(review);
    while (currentPracticeItem(practice)) {
      const row = currentPracticeItem(practice);
      practice = answerPractice(practice, row.id, row.answer);
    }
    assert.equal(JSON.stringify({ review, mastery }), initial, 'practice leaves first-session evidence intact');
    assert.equal(practice.answers.length, mode === 'correct' ? 0 : mode === 'missed' ? 12 : 4);
    const notes = createStudyNotes({ deck, review, mastery, practice, exportedAt: '2026-10-08T15:00:00Z',
      applicationPrompt: 'Explain how suspended work, returned values and repeated inputs connect.' });
    for (const row of deck.items) {
      assert.ok(notes.text.includes(row.prompt));
      assert.ok(notes.text.includes('Correct answer: ' + row.options[row.answer]));
      assert.ok(notes.text.includes(row.explanation));
      assert.ok(notes.text.includes(row.transfer));
    }
    assert.ok(notes.text.includes(deck.title) && notes.text.includes(deck.attribution) && notes.text.includes(deck.license));
    assert.ok(notes.text.includes('MODEL STATE, NOT A GRADE'));
  }
});

test('a damaged late answer or an explorer trace format is refused by the unmodified importer', () => {
  const before = serializeDeck(deck), invalid = JSON.parse(raw);
  invalid.items.at(-1).answer = 4;
  assert.throws(() => parseDeck(JSON.stringify(invalid)), /answer/);
  assert.equal(serializeDeck(deck), before);
  assert.throws(() => parseDeck(JSON.stringify({ ...JSON.parse(raw), format: 'recallweave-recursion-trace/1' })), /Unsupported deck format/);
});
