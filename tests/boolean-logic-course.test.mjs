import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDeck} from '../src/deck.mjs';
import {initialMastery, selectNextItem, updateMastery} from '../src/knowledge.mjs';
import {createReview, beginPractice, answerPractice} from '../src/review.mjs';
import {createTraceArchive, readTraceArchive} from '../src/trace-archive.mjs';
import {createStudyNotes} from '../src/session-export.mjs';

const text = readFileSync(new URL('../courses/boolean-logic.json', import.meta.url), 'utf8');
const deck = parseDeck(text);
// Fixed question-by-question expectations, not taken from the deck's answer fields.
const expected = new Map([
  ['logic-connectives-1', 1], ['logic-connectives-2', 3], ['logic-connectives-3', 0],
  ['logic-implication-1', 2], ['logic-implication-2', 0], ['logic-implication-3', 2],
  ['logic-equivalence-1', 3], ['logic-equivalence-2', 1], ['logic-equivalence-3', 2],
  ['logic-inference-1', 1], ['logic-inference-2', 0], ['logic-inference-3', 3]
]);

test('the original course is admitted by the unchanged deck validator with the fixed answer map', () => {
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.deepEqual(deck.items.map(item => [item.id, item.answer]), [...expected]);
  assert.deepEqual([0, 1, 2, 3].map(answer => deck.items.filter(item => item.answer === answer).length), [3, 3, 3, 3]);
  for (const item of deck.items) {
    assert.equal(item.options.length, 4);
    assert.ok(item.explanation.length > 100);
    assert.ok(item.transfer.length > 30);
    assert.ok(!/\b(first|second|third|fourth) (choice|option)\b/iu.test(item.explanation), 'Explanations must survive shuffled answer presentation');
  }
});

test('independent finite assignments establish the nontrivial authored choice witnesses', () => {
  const options = id => deck.items.find(item => item.id === id).options;
  const assignments = choices => choices.map(option => Object.fromEntries([...option.matchAll(/([ABC])=(True|False)/gu)].map(([, name, value]) => [name, value === 'True'])));
  const permitted = assignments(options('logic-connectives-2')).map(a => a.A === true && a.B === false && a.C === false);
  assert.deepEqual(permitted, [false, false, false, true]);
  const breaksConditional = assignments(options('logic-implication-1')).map(a => a.A === true && a.B === false);
  assert.deepEqual(breaksConditional, [false, false, true, false]);
  const refutesInference = assignments(options('logic-inference-2')).map(a => a.A === false && a.B === true);
  assert.deepEqual(refutesInference, [true, false, false, false]);
});

for (const mode of ['correct', 'missed', 'mixed']) test(`native selector → review → separate practice → archive/notes preserves the ${mode} course trace`, () => {
  const untouched = JSON.stringify(deck);
  const asked = new Set();
  const mastery = initialMastery(deck.concepts);
  const answers = [];
  while (asked.size < deck.items.length) {
    const item = selectNextItem(deck.items, asked, mastery);
    assert.ok(item && !asked.has(item.id));
    const correct = mode === 'correct' || (mode === 'mixed' && asked.size % 2 === 0);
    const choice = correct ? expected.get(item.id) : (expected.get(item.id) + 1) % 4;
    asked.add(item.id);
    answers.push({item: item.id, concept: item.concept, choice, correct});
    mastery[item.concept] = updateMastery(mastery[item.concept], correct);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  const review = createReview(deck.items, answers);
  const beforeMastery = {...mastery};
  const beforeReview = JSON.stringify(review);
  assert.deepEqual(review.map(item => item.id), answers.map(answer => answer.item));
  assert.deepEqual(review.map(item => item.correct), answers.map(answer => answer.correct));
  let practice = beginPractice(review);
  for (const item of practice.items) practice = answerPractice(practice, item.id, expected.get(item.id));
  assert.ok(practice.answers.every(answer => answer.correct));
  assert.equal(practice.answers.length, mode === 'correct' ? 0 : mode === 'missed' ? 12 : 6);
  const archive = createTraceArchive({deck, answers, mastery, practice, savedAt: '2026-10-08T12:00:00.000Z'});
  const restored = readTraceArchive(archive.text, deck);
  assert.deepEqual(restored.answers, answers);
  assert.deepEqual(restored.mastery, beforeMastery);
  assert.deepEqual(restored.practice.answers, practice.answers);
  assert.equal(JSON.stringify(review), beforeReview);
  assert.deepEqual(mastery, beforeMastery);
  assert.equal(JSON.stringify(deck), untouched);
  const notes = createStudyNotes({deck, review, mastery, practice, exportedAt: '2026-10-08T12:00:00.000Z'});
  for (const item of deck.items) {
    assert.ok(notes.text.includes(item.prompt));
    assert.ok(notes.text.includes(item.explanation));
    assert.ok(notes.text.includes(item.transfer));
  }
});
