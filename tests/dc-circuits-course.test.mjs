import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseDeck, serializeDeck } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, answerPractice, currentPracticeItem } from '../src/review.mjs';
import { createStudyNotes } from '../src/session-export.mjs';
import { buildDCLab, dcLabPath } from '../tools/build-dc-circuits.mjs';

const courseText = readFileSync(new URL('../courses/dc-circuits.json', import.meta.url), 'utf8');
const deck = parseDeck(courseText);

test('the existing contract admits twelve original items across four connected concepts', () => {
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.equal(new Set(deck.items.map(item => item.id)).size, 12);
  for (const concept of deck.concepts) assert.equal(deck.items.filter(item => item.concept === concept).length, 3);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.match(deck.attribution, /Original classroom/);
});

test('canonical correct positions are balanced without a universal longest-answer cue', () => {
  assert.deepEqual([0, 1, 2, 3].map(index => deck.items.filter(item => item.answer === index).length), [3, 3, 3, 3]);
  for (const item of deck.items) {
    assert.ok(item.options.some((option, index) => index !== item.answer &&
      option.length >= item.options[item.answer].length), item.id);
  }
});

test('the answer key matches independently worked charge, connection and power values', () => {
  const keyed = Object.fromEntries(deck.items.map(item => [item.id, item]));
  const answer = id => keyed[id].options[keyed[id].answer];
  assert.equal(answer('dc-current-1'), (15 / 5) + ' A');
  assert.equal(answer('dc-current-2'), 'It doubles.');
  assert.equal(answer('dc-current-3'), (0.75 * 8) + ' C');
  assert.equal(answer('dc-series-1'), (12 * 8 / (4 + 8)) + ' V');
  assert.equal(answer('dc-series-2'), '0.5 A');
  assert.equal(answer('dc-series-3'), (18 / (3 + 15)) + ' A');
  assert.equal(answer('dc-parallel-1'), (12 / 6 + 12 / 3) + ' A');
  assert.equal(answer('dc-parallel-2'), '18 V');
  assert.equal(answer('dc-parallel-3'), 'It stays at 2 A.');
  assert.equal(answer('dc-power-1'), (0.5 ** 2 * 12) + ' W');
  assert.equal(answer('dc-power-2'), '× ' + ((12 ** 2 / 4) / (12 ** 2 / 16)));
  assert.equal(answer('dc-power-3'), (6 ** 2 / 3 + 6 ** 2 / 6) + ' W');
});

test('existing selection, review, separate retries and study notes retain every course item', () => {
  const mastery = initialMastery(deck.concepts);
  const asked = new Set();
  const answers = [];
  while (asked.size < deck.items.length) {
    const item = selectNextItem(deck.items, asked, mastery);
    assert.ok(item && !asked.has(item.id));
    const correct = asked.size % 3 !== 0;
    answers.push({ item: item.id, choice: correct ? item.answer : (item.answer + 1) % item.options.length });
    mastery[item.concept] = updateMastery(mastery[item.concept], correct);
    asked.add(item.id);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  const review = createReview(deck.items, answers);
  const firstTrace = JSON.stringify(review);
  const firstMastery = JSON.stringify(mastery);
  let practice = beginPractice(review);
  for (let item = currentPracticeItem(practice); item; item = currentPracticeItem(practice)) {
    practice = answerPractice(practice, item.id, item.answer);
  }
  const notes = createStudyNotes({ deck, review, mastery, practice, exportedAt: '2026-10-08T00:00:00Z' });
  assert.match(notes.text, /8 of 12 connections correct on the first try/);
  assert.match(notes.text, /4 of 4 practice answers recorded; 4 correct on retry/);
  for (const item of deck.items) {
    assert.ok(notes.text.includes(item.prompt));
    assert.ok(notes.text.includes(item.explanation));
    assert.ok(notes.text.includes(item.transfer));
  }
  assert.equal(JSON.stringify(review), firstTrace);
  assert.equal(JSON.stringify(mastery), firstMastery);
  assert.deepEqual(new Set(review.map(row => row.id)), new Set(deck.items.map(item => item.id)));
});

test('the direct-file artifact rebuilds exactly and embeds the original course bytes', () => {
  const rebuilt = buildDCLab();
  assert.equal(readFileSync(dcLabPath, 'utf8'), rebuilt);
  const embedded = rebuilt.match(/<script id="dc-course-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(embedded);
  assert.equal(JSON.parse(embedded[1]), courseText);
  assert.deepEqual(parseDeck(JSON.parse(embedded[1])), deck);
  const scripts = [...rebuilt.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  new vm.Script(scripts[0][1]);
  assert.doesNotMatch(rebuilt, /<script\b[^>]*\bsrc\s*=/i);
  assert.doesNotMatch(rebuilt, /<link\b[^>]*\bhref\s*=/i);
  assert.doesNotMatch(rebuilt, /\/\*__DC_[A-Z]+__\*\//);
});
