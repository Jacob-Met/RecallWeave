import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDeck, serializeDeck, MAX_DECK_BYTES } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from '../src/review.mjs';
import { createReflections, updateReflection, updateApplicationReflection } from '../src/reflections.mjs';
import { createStudyNotes } from '../src/session-export.mjs';

const raw = await readFile(new URL('../courses/bloom-filters.json', import.meta.url), 'utf8');
const guide = await readFile(new URL('../courses/bloom-filters.md', import.meta.url), 'utf8');
const deck = parseDeck(raw);
const item = id => { const q = deck.items.find(q => q.id === id); assert.ok(q, id); return q; };
const answer = id => { const q = item(id); return q.options[q.answer]; };
const positions = { A: [1, 4], B: [4, 6], X: [1, 6], C: [4, 4], D: [4, 1] };
const bitsFor = keys => keys.reduce((mask, key) => positions[key].reduce((m, p) => m | (1 << p), mask), 0);
const query = (mask, pair) => pair.every(p => (mask & (1 << p)) !== 0);
const indices = mask => Array.from({length: 8}, (_, p) => p).filter(p => mask & (1 << p));
const setText = values => '{' + values.join(', ') + '}';

test('original 16-question Bloom lesson round-trips through the maintained deck contract', () => {
  assert.ok(Buffer.byteLength(raw) < MAX_DECK_BYTES);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.deepEqual(JSON.parse(serializeDeck(deck)), JSON.parse(raw));
  assert.deepEqual(deck.concepts, ['bit-updates', 'membership-evidence', 'composition-limits', 'probability-and-use']);
  assert.equal(deck.items.length, 16);
  for (const c of deck.concepts) assert.equal(deck.items.filter(q => q.concept === c).length, 4);
  assert.deepEqual([0, 1, 2, 3].map(n => deck.items.filter(q => q.answer === n).length), [4, 4, 4, 4]);
  for (const q of deck.items) {
    assert.equal(new Set(q.options).size, 4, q.id);
    assert.ok(guide.includes(q.id), q.id);
    assert.ok(guide.includes(q.options[q.answer]), q.id);
    assert.ok(q.explanation.length > 80 && q.transfer.length > 30, q.id);
  }
  assert.match(deck.attribution, /Original questions/);
  assert.match(deck.attribution, /tsapps\.nist\.gov/);
  assert.match(deck.attribution, /kernel\.org/);
  assert.match(deck.license, /CC BY 4\.0/);
});

test('actual bit operations witness insertion, repeated positions, ambiguous cardinality and membership answers', () => {
  const ab = bitsFor(['A', 'B']);
  assert.deepEqual(indices(ab), [1, 4, 6]);
  assert.equal(answer('bf-insert'), setText(indices(ab)));
  assert.equal(bitsFor(['A', 'B', 'A']), ab);
  assert.equal(answer('bf-reinsert'), 'The bit array stays unchanged.');
  assert.equal(bitsFor(['A']), bitsFor(['A', 'D']));
  assert.equal(answer('bf-cardinality'), 'They cannot distinguish H1 from H2: both leave exactly {1, 4} set.');
  const same = [2, 2].reduce((mask, p) => mask | (1 << p), 0);
  assert.deepEqual(indices(same), [2]);
  assert.equal(query(same, [2, 2]), true);
  assert.equal(answer('bf-same-position'), 'Only bit 2 becomes 1, and a later query for C checks that bit twice.');
  assert.equal(query(ab, positions.X), true);
  assert.equal(answer('bf-false-positive'), 'Maybe present: this is a false positive.');
  assert.equal(query(ab, [3, 6]), false);
  assert.equal(answer('bf-zero-witness'), 'Y was not among those completed insertions, because bit 3 is 0.');
  for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) assert.equal(query(255, [a, b]), true);
  assert.equal(answer('bf-saturation'), 'Every query returns maybe present; the array can no longer rule out any key.');
});

test('deletion and incompatible mapping counterexamples are concrete; compatible OR and AND have distinct meanings', () => {
  const a = bitsFor(['A']), b = bitsFor(['B']);
  const deleted = (a | b) & ~a;
  assert.deepEqual(indices(deleted), [6]);
  assert.equal(query(deleted, positions.B), false);
  assert.equal(answer('bf-naive-delete'), 'It returns definitely absent because shared bit 4 was cleared: a false negative.');
  assert.equal(a | b, bitsFor(['A', 'B']));
  assert.equal(answer('bf-union'), 'Set bits {1, 4, 6}, exactly the array obtained by inserting both A and B into one empty filter.');
  assert.deepEqual(indices(a & b), [4]);
  assert.equal(query(a & b, positions.C), true);
  assert.equal(answer('bf-intersection'), 'The AND leaves bit 4 set, so C returns maybe; it is not an exact test of set intersection.');
  const secondMappingB = [2, 7].reduce((mask, p) => mask | (1 << p), 0);
  assert.equal(query(secondMappingB, [2, 7]), true);
  assert.equal(query(a | secondMappingB, positions.B), false);
  assert.equal(answer('bf-configuration'), 'Equal length is insufficient; the second filter’s members may be missed under the first mapping.');
});

test('all 256 pairs of small exact sets preserve inserted members, exact union bit states and true intersection members', () => {
  const keys = ['A', 'B', 'X', 'C'];
  const subsets = Array.from({length: 16}, (_, code) => keys.filter((_, i) => code & (1 << i)));
  for (const left of subsets) {
    const lm = bitsFor(left);
    for (const key of left) assert.equal(query(lm, positions[key]), true);
    for (const right of subsets) {
      const rm = bitsFor(right);
      assert.equal(lm | rm, bitsFor([...new Set([...left, ...right])]));
      for (const key of left.filter(k => right.includes(k))) assert.equal(query(lm & rm, positions[key]), true);
    }
  }
  assert.equal(answer('bf-guarantee'), 'Query with the same mapping after completed insertions, while retaining every bit those insertions set.');
});

test('exact enumeration distinguishes fixed-state 9/64 from random-construction 10/16', () => {
  const accepted = [];
  for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) if (query(bitsFor(['A', 'B']), [a, b])) accepted.push([a, b]);
  assert.equal(accepted.length, 9);
  assert.deepEqual(accepted, [[1,1],[1,4],[1,6],[4,1],[4,4],[4,6],[6,1],[6,4],[6,6]]);
  assert.equal(answer('bf-fixed-probability'), accepted.length + ' of 64');
  const acceptedByInsertion = [], occupancies = [];
  let outcomes = 0, positives = 0;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const mask = (1 << i) | (1 << j);
    let count = 0;
    occupancies.push(indices(mask).length / 2);
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
      outcomes++;
      if (query(mask, [a, b])) { count++; positives++; }
    }
    acceptedByInsertion.push(count);
  }
  assert.deepEqual(acceptedByInsertion, [1, 4, 4, 1]);
  assert.equal(outcomes, 16); assert.equal(positives, 10);
  assert.equal(answer('bf-random-construction'), positives + '/' + outcomes + ' = 5/8');
  const mean = occupancies.reduce((sum, p) => sum + p, 0) / 4;
  assert.equal(mean ** 2, 9 / 16);
  assert.equal(occupancies.reduce((sum, p) => sum + p ** 2, 0) / 4, positives / outcomes);
  assert.notEqual(mean ** 2, positives / outcomes);
});

test('repeated fixed queries do not resample; exact backing lookup distinguishes the shared-bit false positive', () => {
  const exact = new Set(['A', 'B']), mask = bitsFor([...exact]);
  const repeated = Array.from({length: 64}, () => query(mask, positions.X));
  assert.equal(repeated.filter(Boolean).length, 64);
  assert.equal(exact.has('X'), false);
  assert.equal(query(mask, positions.B), true); assert.equal(exact.has('B'), true);
  assert.equal(answer('bf-fixed-key'), 'No. The same fixed key checks the same positions and returns the same result each time.');
  assert.equal(answer('bf-exact-lookup'), 'Check the exact ID set before classifying it as a duplicate.');
});

test('all 16 questions traverse unchanged adaptive selection, missed-answer retry and complete study-note export', () => {
  const mastery = initialMastery(deck.concepts), asked = new Set(), answers = [];
  const missedId = 'bf-random-construction', wrong = (item(missedId).answer + 1) % 4;
  while (asked.size < deck.items.length) {
    const q = selectNextItem(deck.items, asked, mastery);
    assert.ok(q); assert.equal(asked.has(q.id), false); asked.add(q.id);
    const choice = q.id === missedId ? wrong : q.answer, correct = choice === q.answer;
    answers.push({ item: q.id, choice, correct });
    mastery[q.concept] = updateMastery(mastery[q.concept], correct);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  assert.equal(asked.size, 16);
  const review = createReview(deck.items, answers), original = JSON.stringify({review, mastery});
  assert.equal(review.filter(q => q.correct).length, 15);
  let reflections = createReflections(deck.items);
  const reflection = 'The insertion pairs leave one, two, two and one set bits.\nCount 1 + 4 + 4 + 1 accepted outcomes before averaging.';
  const application = 'Check the exact document-ID set after maybe, so a shared-bit collision cannot discard a new document.';
  reflections = updateReflection(reflections, missedId, reflection);
  reflections = updateApplicationReflection(reflections, application);
  let practice = beginPractice(review);
  assert.deepEqual(practice.items.map(q => q.id), [missedId]);
  assert.equal(currentPracticeItem(practice).id, missedId);
  practice = answerPractice(practice, missedId, item(missedId).answer);
  assert.equal(currentPracticeItem(practice), null);
  assert.equal(practice.answers[0].correct, true);
  const applicationPrompt = 'Choose one connection from this deck and explain how it relates to another idea in your own words.';
  const notes = createStudyNotes({deck, review, mastery, practice, reflections, applicationPrompt, exportedAt:'2026-10-13T00:00:00Z'});
  assert.ok(notes.text.includes('15 of 16 connections correct on the first try.'));
  assert.ok(notes.text.includes('Complete: 1 of 1 practice answers recorded; 1 correct on retry.'));
  assert.ok(notes.text.includes('Your first answer: ' + item(missedId).options[wrong]));
  assert.ok(notes.text.includes('Practice answer: ' + answer(missedId)));
  for (const line of reflection.split('\n')) assert.ok(notes.text.includes('  > ' + line));
  assert.ok(notes.text.includes('  > ' + application));
  for (const q of deck.items) for (const value of [q.prompt, q.options[q.answer], q.explanation, q.transfer]) assert.ok(notes.text.includes(value), q.id);
  assert.ok(notes.text.includes(deck.attribution)); assert.ok(notes.text.includes(deck.license));
  assert.equal(JSON.stringify({review, mastery}), original);
});
