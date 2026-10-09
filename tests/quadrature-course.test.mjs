import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDeck, serializeDeck } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from '../src/review.mjs';
import { createStudyNotes } from '../src/session-export.mjs';

const deckText = await readFile(new URL('../courses/quadrature.json', import.meta.url), 'utf8');
const deck = parseDeck(deckText);

test('the original twelve-question course is admitted by the unchanged deck consumer', () => {
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 6);
  assert.equal(new Set(deck.items.map(item => item.id)).size, 12);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.ok(deck.attribution.includes('https://dlmf.nist.gov/3.5'));
  assert.ok(deck.attribution.includes('https://math.umd.edu/~petersd/460/numint460.pdf'));
  assert.ok(deck.license.trim());
  assert.ok(Object.isFrozen(deck) && deck.items.every(item =>
    Object.isFrozen(item) && Object.isFrozen(item.options) && Object.isFrozen(item.prerequisites)));
});

test('adaptive first attempts, separate practice and local notes retain this course content', () => {
  const inputBefore = JSON.stringify(deck);
  const mastery = initialMastery(deck.concepts);
  const asked = new Set();
  const answers = [];
  while (asked.size < deck.items.length) {
    const item = selectNextItem(deck.items, asked, mastery);
    assert.ok(item && !asked.has(item.id));
    const correct = answers.length % 2 === 0;
    const choice = correct ? item.answer : (item.answer + 1) % item.options.length;
    asked.add(item.id);
    answers.push({item: item.id, choice});
    mastery[item.concept] = updateMastery(mastery[item.concept], correct);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  assert.deepEqual([...asked].sort(), deck.items.map(item => item.id).sort());
  assert.equal(answers.length, 12);
  const review = createReview(deck.items, answers);
  const reviewBefore = JSON.stringify(review);
  const masteryBefore = JSON.stringify(mastery);
  assert.equal(review.filter(item => item.correct).length, 6);
  let practice = beginPractice(review);
  assert.equal(practice.items.length, 6);
  while (currentPracticeItem(practice)) {
    const item = currentPracticeItem(practice);
    practice = answerPractice(practice, item.id, item.answer);
  }
  assert.equal(practice.answers.length, 6);
  assert.ok(practice.answers.every(answer => answer.correct));
  assert.equal(JSON.stringify(review), reviewBefore);
  assert.equal(JSON.stringify(mastery), masteryBefore);
  assert.equal(JSON.stringify(deck), inputBefore);
  const notes = createStudyNotes({
    deck, review, mastery, practice, exportedAt: new Date('2026-10-08T00:00:00Z')
  });
  assert.match(notes.text, /6 of 12 connections correct on the first try/);
  assert.match(notes.text, /Complete: 6 of 6 practice answers recorded; 6 correct on retry/);
  for (const item of review) {
    for (const text of [item.prompt, item.options[item.choice], item.options[item.answer],
      item.explanation, item.transfer]) assert.ok(notes.text.includes(text));
  }
  assert.ok(notes.text.includes(deck.attribution));
  assert.ok(notes.text.includes(deck.license));
  assert.ok(notes.text.includes('Practice does not change the first-session estimates.'));
  assert.throws(() => createStudyNotes({deck, review: review.slice(1), mastery}), RangeError);
});

test('the standalone download embeds the exact original course and worked guide', async () => {
  const html = await readFile(new URL('../courses/quadrature-lab.html', import.meta.url), 'utf8');
  const guide = await readFile(new URL('../courses/quadrature.md', import.meta.url), 'utf8');
  const readEmbedded = name => {
    const match = html.match(new RegExp('const ' + name + ' = ([^\\n]+);\\n'));
    assert.ok(match, 'missing embedded ' + name);
    return JSON.parse(match[1]);
  };
  assert.equal(readEmbedded('deckText'), deckText);
  assert.equal(readEmbedded('guideText'), guide);
  assert.ok(html.includes('href="../demo.html"'));
  assert.ok(!html.includes('@@SCRIPT@@'));
});
