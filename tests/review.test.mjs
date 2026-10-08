import test from 'node:test';
import assert from 'node:assert/strict';
import { answerPractice, beginPractice, createReview, currentPracticeItem } from '../src/review.mjs';

const item = (id, answer = 1) => ({
  id, concept: 'energy', prompt: `Prompt ${id}`, options: ['First', 'Second', 'Third'],
  answer, explanation: `Explanation ${id}`, transfer: `Transfer ${id}`
});
const items = [item('a'), item('b', 2), item('c', 0)];
const answers = [{item: 'b', choice: 0}, {item: 'a', choice: 1}, {item: 'c', choice: 2}];

test('review preserves session order and the actual chosen answer', () => {
  const review = createReview(items, answers);
  assert.deepEqual(review.map(row => [row.id, row.choice, row.correct]), [
    ['b', 0, false], ['a', 1, true], ['c', 2, false]
  ]);
  assert.equal(review[0].options[review[0].choice], 'First');
  assert.equal(review[0].options[review[0].answer], 'Third');
  assert.equal(review[0].explanation, 'Explanation b');
  assert.equal(review[0].transfer, 'Transfer b');
});

test('review is an immutable snapshot independent of mutable input arrays', () => {
  const sourceItems = structuredClone(items);
  const sourceAnswers = structuredClone(answers);
  const review = createReview(sourceItems, sourceAnswers);
  sourceItems[1].options[0] = 'Rewritten';
  sourceItems[1].prompt = 'Rewritten';
  sourceAnswers[0].choice = 2;
  sourceAnswers.reverse();
  assert.equal(review[0].prompt, 'Prompt b');
  assert.equal(review[0].options[0], 'First');
  assert.equal(review[0].choice, 0);
  assert.throws(() => { review[0].correct = true; }, TypeError);
  assert.throws(() => { review[0].options[0] = 'Other'; }, TypeError);
  assert.throws(() => review.push(review[0]), TypeError);
});

test('a review rejects unknown, duplicate, or invalid first answers', () => {
  assert.throws(() => createReview(items, [{item: 'missing', choice: 0}]), RangeError);
  assert.throws(() => createReview(items, [answers[0], answers[0]]), RangeError);
  for (const choice of [-1, 3, 0.5, NaN, '0', null]) {
    assert.throws(() => createReview(items, [{item: 'a', choice}]), RangeError);
  }
});

test('practice includes only initially missed questions in first-attempt order', () => {
  const review = createReview(items, answers);
  const before = JSON.stringify(review);
  const round = beginPractice(review);
  assert.deepEqual(round.items.map(row => row.id), ['b', 'c']);
  assert.equal(currentPracticeItem(round).id, 'b');
  assert.equal(JSON.stringify(review), before);
});

test('correct and incorrect retries remain separate from the immutable original trace', () => {
  const review = createReview(items, answers);
  const before = JSON.stringify(review);
  const start = beginPractice(review);
  const first = answerPractice(start, 'b', 2);
  const complete = answerPractice(first, 'c', 1);
  assert.equal(start.answers.length, 0);
  assert.equal(first.answers.length, 1);
  assert.deepEqual(complete.answers, [
    {item: 'b', choice: 2, correct: true}, {item: 'c', choice: 1, correct: false}
  ]);
  assert.equal(currentPracticeItem(complete), null);
  assert.equal(JSON.stringify(review), before);
  assert.throws(() => { complete.answers[0].correct = false; }, TypeError);
  assert.throws(() => complete.items.reverse(), TypeError);
});

test('practice resumes at the next unanswered question and refuses duplicate or out-of-order writes', () => {
  const start = beginPractice(createReview(items, answers));
  assert.throws(() => answerPractice(start, 'c', 0), RangeError);
  const paused = answerPractice(start, 'b', 0);
  assert.equal(currentPracticeItem(paused).id, 'c');
  assert.throws(() => answerPractice(paused, 'b', 2), RangeError);
  for (const choice of [-1, 3, 1.5, Infinity, '1']) {
    assert.throws(() => answerPractice(paused, 'c', choice), RangeError);
  }
  const complete = answerPractice(paused, 'c', 0);
  assert.throws(() => answerPractice(complete, 'c', 0), RangeError);
  assert.equal(paused.answers.length, 1);
});

test('an all-correct or empty review has no practice question', () => {
  for (const firstAnswers of [[], items.map(row => ({item: row.id, choice: row.answer}))]) {
    const round = beginPractice(createReview(items, firstAnswers));
    assert.equal(round.items.length, 0);
    assert.equal(currentPracticeItem(round), null);
    assert.throws(() => answerPractice(round, 'a', 1), RangeError);
  }
});
