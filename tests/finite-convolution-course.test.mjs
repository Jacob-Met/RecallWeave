import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { parseDeck, serializeDeck } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from '../src/review.mjs';
import { createStudyNotes } from '../src/session-export.mjs';
import { finiteConvolution } from '../src/finite-convolution.mjs';
import { buildFiniteConvolutionLab, finiteConvolutionLabPath } from '../tools/build-finite-convolution.mjs';

const text = readFileSync(new URL('../courses/finite-convolution.json', import.meta.url), 'utf8');
const deck = parseDeck(text);
const byId = new Map(deck.items.map(item => [item.id, item]));

test('the original twelve-question course satisfies the current public deck contract', () => {
  assert.equal(deck.format, 'recallweave-deck/1');
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.ok(Buffer.byteLength(text) < 262144);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.deepEqual([0, 1, 2, 3].map(answer => deck.items.filter(item => item.answer === answer).length), [3, 3, 3, 3]);
  assert.ok(deck.items.every(item => item.explanation.length > 100 && item.transfer.length > 40));
  assert.match(deck.attribution, /ocw\.mit\.edu/);
});

test('course answer identities agree with separately specified arithmetic and conventions', () => {
  const correct = id => byId.get(id).options[byId.get(id).answer];
  assert.equal(correct('fc01'), '0');
  assert.equal(correct('fc02'), '0 through 5: six entries');
  for (const [id, x, h] of [
    ['fc03', [2, -1, 3], [0, 1]],
    ['fc05', [2, -1, 3], [1, 2]],
    ['fc07', [0, 4, 0], [0.5, 0.5]],
    ['fc08', [2, 2, 2], [1, -1]],
    ['fc09', [1, 0, 0], [2, -1]],
    ['fc12', [-1, 3], [1, 0, 2]]
  ]) {
    const choice = JSON.parse(correct(id).replaceAll('−', '-'));
    assert.deepEqual(choice, finiteConvolution(x, h), id);
  }
  assert.equal(correct('fc04'), String(2 * 2 - 1));
  assert.equal(correct('fc06'), '1 × 2 + 2 × (−1) = 0');
  assert.deepEqual(JSON.parse(correct('fc10')), [1 + 3, 3 + 2, 2 - 1]);
  assert.equal(correct('fc11'), 'y[0] = 3 and r[0] = 11');
});

test('the actual adaptive, review, retry, and study-note consumers receive all course content', () => {
  const mastery = initialMastery(deck.concepts), asked = new Set(), answers = [];
  const missed = new Set(['fc04', 'fc11']);
  while (asked.size < deck.items.length) {
    const item = selectNextItem(deck.items, asked, mastery);
    assert.ok(item && !asked.has(item.id));
    const choice = missed.has(item.id) ? (item.answer + 1) % item.options.length : item.answer;
    asked.add(item.id);
    answers.push({ item: item.id, choice });
    mastery[item.concept] = updateMastery(mastery[item.concept], choice === item.answer);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  const review = createReview(deck.items, answers);
  assert.equal(review.filter(row => row.correct).length, 10);
  const original = JSON.stringify({ review, mastery });
  let round = beginPractice(review);
  assert.deepEqual(new Set(round.items.map(row => row.id)), missed);
  while (currentPracticeItem(round)) {
    const item = currentPracticeItem(round);
    round = answerPractice(round, item.id, item.answer);
  }
  assert.equal(round.answers.length, 2);
  assert.ok(round.answers.every(row => row.correct));
  assert.equal(JSON.stringify({ review, mastery }), original);
  const notes = createStudyNotes({ deck, review, mastery, practice: round, exportedAt: '2026-10-08T00:00:00Z' });
  for (const item of deck.items) {
    for (const value of [item.prompt, item.explanation, item.transfer, item.options[item.answer]]) assert.ok(notes.text.includes(value), item.id);
  }
  assert.ok(notes.text.includes(deck.title) && notes.text.includes(deck.attribution));
  assert.match(notes.text, /10 of 12 connections correct on the first try/);
  assert.match(notes.text, /2 of 2 practice answers recorded; 2 correct on retry/);
});

test('the direct-file lab is an exact build with the original downloadable course bytes', () => {
  const html = buildFiniteConvolutionLab();
  assert.equal(readFileSync(finiteConvolutionLabPath, 'utf8'), html);
  const embedded = html.match(/const FINITE_CONVOLUTION_DECK_TEXT = (.+);\n/);
  assert.ok(embedded);
  assert.equal(JSON.parse(embedded[1]), text);
  const script = html.match(/<script>\n([\s\S]+?)\n<\/script>/);
  assert.ok(script);
  new Script(script[1]);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+(?:href|rel)=/i);
  assert.doesNotMatch(html, /\/\* CONVOLUTION_(?:MODEL|UI|DECK_TEXT) \*\//);
  assert.match(html, /Bring your own lesson/);
});
