import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseDeck, serializeDeck} from '../src/deck.mjs';
import {initialMastery, selectNextItem, updateMastery} from '../src/knowledge.mjs';
import {createReview, beginPractice, currentPracticeItem, answerPractice} from '../src/review.mjs';
import {createReflections, updateReflection, updateApplicationReflection} from '../src/reflections.mjs';
import {createStudyNotes} from '../src/session-export.mjs';

const raw = await readFile(new URL('../courses/refraction-foundations.json', import.meta.url), 'utf8');
const deck = parseDeck(raw);
const applicationPrompt = 'Explain how to distinguish a critical boundary from total internal reflection.';

function firstSession() {
  const mastery = initialMastery(deck.concepts);
  const asked = new Set();
  const answers = [];
  while (asked.size < deck.items.length) {
    const item = selectNextItem(deck.items, asked, mastery);
    assert.ok(item && !asked.has(item.id));
    const choice = item.id === 'refract-critical-boundary' ? 1 : item.answer;
    const correct = choice === item.answer;
    answers.push({item: item.id, concept: item.concept, choice, correct});
    asked.add(item.id);
    mastery[item.concept] = updateMastery(mastery[item.concept], correct);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  return {mastery, answers};
}

test('the original refraction course round-trips through the native deck contract', () => {
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.deepEqual(JSON.parse(raw), deck);
  assert.equal(deck.items.length, 16);
  assert.equal(deck.concepts.length, 4);
  for (const concept of deck.concepts) {
    assert.equal(deck.items.filter(item => item.concept === concept).length, 4);
  }
  assert.match(deck.attribution, /normal/);
  assert.match(deck.attribution, /not measured material data/);
  assert.match(deck.license, /CC0-1.0/);
});

test('answer identities agree with two separately frozen question-only reviews', () => {
  // Root review5a7b6670 and production reviewe4e0ba06 independently received
  // question-only packet45522a30 before candidate answer/explanation exposure.
  const blind = [1,2,0,3,2,0,3,1,3,1,2,0,2,1,0,3];
  assert.deepEqual(deck.items.map(item => item.answer), blind);
  const correct = id => {
    const item = deck.items.find(item => item.id === id);
    return item.options[item.answer];
  };
  const degrees = radians => radians * 180 / Math.PI;
  assert.ok(Math.abs(parseFloat(correct('refract-higher-index')) - degrees(Math.asin(1/3))) < 0.005);
  assert.ok(Math.abs(parseFloat(correct('refract-lower-index')) - degrees(Math.asin(0.625))) < 0.005);
  assert.equal(correct('refract-equal-index'), '47°');
  assert.ok(Math.abs(degrees(Math.asin(1/2)) - 30) < 1e-12);
  assert.ok(2 * Math.sin(35 * Math.PI / 180) > 1);
  assert.match(correct('refract-critical-boundary'), /limiting.*90°/);
  assert.match(correct('refract-above-critical'), /No propagating transmitted ray/);
  assert.match(correct('refract-power-limit'), /not determined/);
});

test('the unchanged adaptive selector reaches all16 items with bounded model state', () => {
  const {mastery, answers} = firstSession();
  assert.equal(new Set(answers.map(answer => answer.item)).size, 16);
  assert.equal(answers.filter(answer => answer.correct).length, 15);
  for (const value of Object.values(mastery)) {
    assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
  }
});

test('native review and practice retain the first critical-boundary mistake separately', () => {
  const {mastery, answers} = firstSession();
  const review = createReview(deck.items, answers);
  const before = JSON.stringify({mastery, answers, review});
  const firstPractice = beginPractice(review);
  const current = currentPracticeItem(firstPractice);
  assert.equal(current.id, 'refract-critical-boundary');
  const practice = answerPractice(firstPractice, current.id, current.answer);
  assert.equal(currentPracticeItem(practice), null);
  assert.equal(practice.answers.length, 1);
  assert.equal(practice.answers[0].correct, true);
  assert.equal(firstPractice.answers.length, 0);
  assert.equal(JSON.stringify({mastery, answers, review}), before);
  const missed = review.find(item => item.id === current.id);
  assert.equal(missed.choice, 1);
  assert.equal(missed.correct, false);
});

test('native study notes preserve all authored content, reflection and separate retry', () => {
  const {mastery, answers} = firstSession();
  const review = createReview(deck.items, answers);
  const initial = beginPractice(review);
  const current = currentPracticeItem(initial);
  const practice = answerPractice(initial, current.id, current.answer);
  let reflections = createReflections(deck.items);
  reflections = updateReflection(reflections, current.id, 'At equality the limiting direction is grazing; above it there is no propagating transmitted ray.');
  reflections = updateApplicationReflection(reflections, 'Measure from the normal and keep the medium order explicit.');
  const before = JSON.stringify({deck, review, mastery, practice, reflections});
  const notes = createStudyNotes({deck, review, mastery, practice, reflections,
    exportedAt: '2026-10-09T00:00:00Z', applicationPrompt});
  assert.equal(notes.filename, 'recallweave-study-notes-2026-10-09.txt');
  assert.match(notes.text, /15 of 16 connections correct on the first try/);
  assert.match(notes.text, /1 of 1 practice answers recorded; 1 correct on retry/);
  for (const item of deck.items) {
    for (const text of [item.prompt, item.options[item.answer], item.explanation, item.transfer]) {
      assert.ok(notes.text.includes(text), item.id);
    }
  }
  assert.ok(notes.text.includes(reflections.application));
  assert.ok(notes.text.includes(applicationPrompt));
  assert.ok(notes.text.includes(deck.attribution));
  assert.equal(JSON.stringify({deck, review, mastery, practice, reflections}), before);
});

test('existing consumer refusals remain explicit for malformed or incomplete input', () => {
  const duplicate = JSON.parse(raw);
  duplicate.items[1].id = duplicate.items[0].id;
  assert.throws(() => parseDeck(JSON.stringify(duplicate)), /duplicates another question ID/);
  const cyclic = JSON.parse(raw);
  cyclic.items[0].prerequisites = ['snell-paths'];
  assert.throws(() => parseDeck(JSON.stringify(cyclic)), /must not form a cycle/);
  const {mastery, answers} = firstSession();
  const review = createReview(deck.items, answers);
  assert.throws(() => createStudyNotes({deck, mastery, review:review.slice(1)}), /Finish the learning session/);
  const practice = beginPractice(review);
  assert.throws(() => answerPractice(practice, 'refract-speed-index', 2), /Only the current unanswered/);
  assert.equal(practice.answers.length, 0);
});
