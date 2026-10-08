import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDeck, serializeDeck, MAX_DECK_BYTES } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from '../src/review.mjs';
import { createStudyNotes } from '../src/session-export.mjs';

const raw = await readFile(new URL('../courses/binary-search.json', import.meta.url), 'utf8');
const deck = parseDeck(raw);
const item = id => deck.items.find(question => question.id === id);
const selected = id => { const question = item(id); assert.ok(question); return question.options[question.answer]; };
const firstAtLeast = (values, target) => { const found = values.findIndex(value => value >= target); return found < 0 ? values.length : found; };

test('the binary-search course round-trips through the published deck contract', () => {
  assert.ok(Buffer.byteLength(raw, 'utf8') < MAX_DECK_BYTES);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.deepEqual(JSON.parse(raw), JSON.parse(serializeDeck(deck)));
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  for (const concept of deck.concepts) assert.equal(deck.items.filter(question => question.concept === concept).length, 3);
  assert.deepEqual([0, 1, 2, 3].map(index => deck.items.filter(question => question.answer === index).length), [3, 3, 3, 3]);
});

test('worked first-occurrence and absent examples agree with an independent linear partition', () => {
  const duplicate = firstAtLeast([1, 3, 5, 5, 9], 5);
  assert.equal(selected('bs-contract-duplicates'), `Index ${duplicate}`);
  const missing = [-3, 1, 4, 8];
  const boundary = firstAtLeast(missing, 6);
  assert.equal(selected('bs-contract-absent'), `Boundary ${boundary}; target ${missing.includes(6) ? 'present' : 'absent'}.`);
  const before = [-5, 0, 8];
  assert.equal(selected('bs-boundary-before'), `Boundary ${firstAtLeast(before, -9)}; the target is ${before.includes(-9) ? 'present' : 'absent'}.`);
  assert.equal(firstAtLeast([-2, 0, 6], 8), 3);
  assert.equal(selected('bs-boundary-after'), 'The target is absent; boundary 3 is after the final element.');
  assert.equal(firstAtLeast([], 7), 0);
  assert.equal(selected('bs-boundary-empty'), 'Boundary 0, with zero comparisons.');
});

test('midpoint and branch answers use the course’s half-open interval convention', () => {
  const mid = 2 + Math.floor((9 - 2) / 2);
  assert.equal(selected('bs-interval-midpoint'), `Index ${mid}`);
  const values = [-6, -2, 1, 4, 9, 12];
  const firstMid = Math.floor(values.length / 2);
  assert.ok(values[firstMid] < 8);
  assert.equal(selected('bs-interval-less'), `[${firstMid + 1}, ${values.length})`);
  const equalityMid = Math.floor(5 / 2);
  assert.equal(selected('bs-interval-equality'), `Set hi = ${equalityMid}, making [0, ${equalityMid}).`);
  assert.equal(selected('bs-progress-single'), 'Set lo = mid + 1, producing [6, 6).');
});

test('the worked trace and worst-case count follow strictly shrinking intervals', () => {
  // This small receiver executes the guide's declared algorithm and checks it
  // against a separate linear oracle; it is not application runtime code.
  function trace(values, target) {
    let lo = 0, hi = values.length, count = 0;
    while (lo < hi) {
      const length = hi - lo;
      const mid = lo + Math.floor(length / 2);
      if (values[mid] < target) lo = mid + 1; else hi = mid;
      assert.ok(hi - lo < length);
      assert.ok(values.slice(0, lo).every(value => value < target));
      assert.ok(values.slice(hi).every(value => value >= target));
      count++;
    }
    assert.equal(lo, firstAtLeast(values, target));
    return { boundary: lo, count };
  }
  assert.deepEqual(trace([2, 4, 6, 8, 10, 12, 14, 16], 7), { boundary: 3, count: 3 });
  assert.equal(selected('bs-progress-trace'), 'Three comparisons; insertion boundary 3.');
  for (let length = 0; length <= 32; length++) {
    const values = Array.from({ length }, (_, index) => Math.floor(index / 2) * 3 - 10);
    let maximum = 0;
    for (let target = -11; target <= 40; target++) maximum = Math.max(maximum, trace(values, target).count);
    assert.equal(maximum, Math.ceil(Math.log2(length + 1)), `maximum for ${length} values`);
  }
  assert.equal(selected('bs-progress-bound'), '5, because the unresolved length can fall 31 → 15 → 7 → 3 → 1 → 0.');
});

test('the actual adaptive learner visits every new question and preserves worked feedback', () => {
  for (const mode of ['all-correct', 'all-missed', 'mixed']) {
    const mastery = initialMastery(deck.concepts);
    const asked = new Set();
    const answers = [];
    while (asked.size < deck.items.length) {
      const question = selectNextItem(deck.items, asked, mastery);
      assert.ok(question);
      assert.ok(!asked.has(question.id));
      const correct = mode === 'all-correct' || (mode === 'mixed' && asked.size % 3 !== 0);
      const choice = correct ? question.answer : (question.answer + 1) % question.options.length;
      asked.add(question.id);
      answers.push({ item: question.id, choice });
      mastery[question.concept] = updateMastery(mastery[question.concept], correct);
    }
    assert.equal(selectNextItem(deck.items, asked, mastery), null);
    const review = createReview(deck.items, answers);
    const frozenReview = JSON.stringify(review);
    const frozenMastery = JSON.stringify(mastery);
    let practice = beginPractice(review);
    while (currentPracticeItem(practice)) {
      const question = currentPracticeItem(practice);
      practice = answerPractice(practice, question.id, question.answer);
    }
    assert.equal(JSON.stringify(review), frozenReview);
    assert.equal(JSON.stringify(mastery), frozenMastery);
    assert.ok(practice.answers.every(answer => answer.correct));
    const notes = createStudyNotes({ deck, review, mastery, practice, exportedAt: '2026-10-08T12:00:00Z' });
    for (const question of deck.items) {
      assert.ok(notes.text.includes(question.prompt));
      assert.ok(notes.text.includes(`Correct answer: ${question.options[question.answer]}`));
      assert.ok(notes.text.includes(question.explanation));
      assert.ok(notes.text.includes(question.transfer));
    }
    assert.ok(notes.text.includes(deck.attribution));
    assert.ok(notes.text.includes(deck.license));
  }
});
