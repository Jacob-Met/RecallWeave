import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildConvexHullPage } from '../tools/build-convex-hull.mjs';
import { parseDeck, serializeDeck } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from '../src/review.mjs';
import { createStudyNotes } from '../src/session-export.mjs';
import { createReflections, updateReflection, updateApplicationReflection } from '../src/reflections.mjs';

const text = readFileSync(new URL('../courses/convex-hull.json', import.meta.url), 'utf8');
const deck = parseDeck(text);

test('the original hull course round-trips through the unchanged deck contract', () => {
  assert.equal(serializeDeck(deck), text);
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.deepEqual(deck.items.map(item => item.answer), [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3]);
  assert.equal(new Set(deck.items.map(item => item.id)).size, 12);
  for (const concept of deck.concepts) assert.equal(deck.items.filter(item => item.concept === concept).length, 3);
  assert.match(deck.items.find(item => item.id === 'hull-collinear').prompt, /complete point set/);
  assert.match(deck.items.find(item => item.id === 'hull-duplicates').prompt, /^A point set already contains/);
  for (const item of deck.items) {
    assert.ok(item.explanation.length > 100);
    assert.ok(item.transfer.length > 50);
    assert.ok(Object.isFrozen(item) && Object.isFrozen(item.options));
  }
});

test('actual adaptive selection, mixed feedback records, practice and saved notes consume the hull lesson', () => {
  const before = JSON.stringify(deck);
  const mastery = initialMastery(deck.concepts), asked = new Set(), answers = [];
  while (asked.size < deck.items.length) {
    const item = selectNextItem(deck.items, asked, mastery);
    assert.ok(item && !asked.has(item.id));
    const correct = answers.length % 3 !== 0;
    const choice = correct ? item.answer : (item.answer + 1) % item.options.length;
    answers.push({ item: item.id, choice, correct });
    asked.add(item.id);
    mastery[item.concept] = updateMastery(mastery[item.concept], correct);
    assert.ok(Number.isFinite(mastery[item.concept]));
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  const review = createReview(deck.items, answers);
  assert.equal(review.filter(item => item.correct).length, 8);
  const fixedFirst = JSON.stringify({ answers, review, mastery });
  let practice = beginPractice(review);
  assert.equal(practice.items.length, 4);
  while (currentPracticeItem(practice)) {
    const item = currentPracticeItem(practice);
    practice = answerPractice(practice, item.id, item.answer);
  }
  assert.equal(practice.answers.length, 4);
  assert.ok(practice.answers.every(answer => answer.correct));
  assert.equal(JSON.stringify({ answers, review, mastery }), fixedFirst);
  let reflections = createReflections(deck.items);
  reflections = updateReflection(reflections, deck.items[3].id, 'A removed vertex candidate can remain on the boundary.\nInputs and extreme vertices are different records.');
  reflections = updateApplicationReflection(reflections, 'I would retain duplicate IDs while computing unique coordinates.');
  const notes = createStudyNotes({ deck, review, mastery, practice, reflections,
    applicationPrompt: 'Explain the difference between an input occurrence and an extreme hull vertex.',
    exportedAt: '2026-10-08T00:00:00.000Z' });
  assert.match(notes.text, /8 of 12 connections correct on the first try/);
  assert.match(notes.text, /Complete: 4 of 4 practice answers recorded; 4 correct on retry/);
  for (const item of deck.items) for (const value of [item.prompt, item.explanation, item.transfer]) assert.ok(notes.text.includes(value));
  assert.ok(notes.text.includes(deck.attribution) && notes.text.includes(deck.license));
  assert.match(notes.text, /A removed vertex candidate can remain on the boundary/);
  assert.match(notes.text, /I would retain duplicate IDs/);
  assert.equal(JSON.stringify(deck), before);
});

test('the standalone page is deterministic and embeds the exact lesson and guide', () => {
  const generated = buildConvexHullPage();
  assert.equal(buildConvexHullPage(), generated);
  assert.equal(readFileSync(new URL('../courses/convex-hull-explorer.html', import.meta.url), 'utf8'), generated);
  const deckLiteral = generated.match(/^const HULL_DECK_TEXT = (.+);$/m);
  const guideLiteral = generated.match(/^const HULL_GUIDE_TEXT = (.+);$/m);
  assert.ok(deckLiteral && guideLiteral);
  assert.equal(JSON.parse(deckLiteral[1]), text);
  assert.equal(JSON.parse(guideLiteral[1]), readFileSync(new URL('../courses/convex-hull.md', import.meta.url), 'utf8'));
  assert.equal((generated.match(/<script\b/g) ?? []).length, 1);
  assert.equal((generated.match(/<\/script>/g) ?? []).length, 1);
  assert.match(generated, /<script type="module">/);
  assert.doesNotMatch(generated, /\/\* HULL_(?:DECK_TEXT|GUIDE_TEXT|MODEL|UI) \*\//);
  assert.doesNotMatch(generated, /<(?:script|link|img)[^>]+(?:src|href)=["']https?:/i);
});
