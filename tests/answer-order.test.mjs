import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { orderOptions } from '../src/answer-order.mjs';
import { createReview, beginPractice, answerPractice } from '../src/review.mjs';
import { createStudyNotes } from '../src/session-export.mjs';
import { initialMastery } from '../src/knowledge.mjs';

function randomFromSeed(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

test('display orders retain every canonical option exactly once and are immutable', () => {
  for (let count = 0; count <= 8; count++) {
    for (let seed = 0; seed < 64; seed++) {
      const order = orderOptions(count, randomFromSeed(seed));
      assert.deepEqual([...order].sort((a, b) => a - b), Array.from({length: count}, (_, index) => index));
      assert.ok(Object.isFrozen(order));
    }
  }
  assert.throws(() => orderOptions(4).reverse(), TypeError);
});

test('a stable source replays an order and changed input can put the answer in every display position', () => {
  for (const seed of [3, 7, 41, 9001]) assert.deepEqual(orderOptions(4, randomFromSeed(seed)), orderOptions(4, randomFromSeed(seed)));
  const positions = new Set();
  for (let seed = 0; seed < 128; seed++) positions.add(orderOptions(4, randomFromSeed(seed)).indexOf(0));
  assert.deepEqual([...positions].sort(), [0, 1, 2, 3]);
  assert.deepEqual(orderOptions(4, () => 0), [1, 2, 3, 0]);
  assert.deepEqual(orderOptions(4, () => 1 - Number.EPSILON), [0, 1, 2, 3]);
});

test('invalid counts or random values cannot produce duplicate, missing, or unaddressable choices', () => {
  for (const count of [-1, 1.5, NaN, Infinity, '4']) assert.throws(() => orderOptions(count), RangeError);
  for (const value of [-0.1, 1, Infinity, NaN, null, '0.5']) assert.throws(() => orderOptions(4, () => value), RangeError);
});

test('varied displayed choices keep review, corrected practice and study notes tied to their original text', async () => {
  const deck = JSON.parse(await readFile(new URL('../data/deck.json', import.meta.url), 'utf8'));
  const random = randomFromSeed(41);
  const orders = new Map(deck.items.map(item => [item.id, orderOptions(item.options.length, random)]));
  const choices = deck.items.map(item => ({item: item.id, choice: orders.get(item.id)[0]}));
  const review = createReview(deck.items, choices);
  assert.ok(review.some(item => !item.correct), 'The exact first-position cue in the source deck is absent in this fixed presentation fixture');
  assert.ok(new Set([...orders.values()].map(order => order.indexOf(0))).size > 1);
  let practice = beginPractice(review);
  for (const item of practice.items) {
    const visibleIndex = orders.get(item.id).indexOf(item.answer);
    practice = answerPractice(practice, item.id, orders.get(item.id)[visibleIndex]);
  }
  const notes = createStudyNotes({deck, review, practice, mastery: initialMastery(deck.concepts), exportedAt: '2026-10-08T09:30:00Z'}).text;
  review.forEach((item, index) => {
    assert.equal(item.choice, choices[index].choice);
    assert.ok(notes.includes(`Your first answer: ${item.options[orders.get(item.id)[0]]}`));
    assert.ok(notes.includes(`Correct answer: ${item.options[item.answer]}`));
  });
  assert.ok(practice.answers.every(answer => answer.correct));
  assert.ok(review.some(item => !item.correct), 'A corrected retry cannot rewrite the first answer');
});
