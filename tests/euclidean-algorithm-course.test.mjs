import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseDeck } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from '../src/review.mjs';
import { createStudyNotes } from '../src/session-export.mjs';

const courseText = readFileSync(new URL('../courses/euclidean-algorithm.json', import.meta.url), 'utf8');
const deck = parseDeck(courseText);
function complete(misses = new Set()) {
  const mastery = initialMastery(deck.concepts), asked = new Set(), answers = [];
  while (asked.size < deck.items.length) {
    const item = selectNextItem(deck.items, asked, mastery);
    assert.ok(item && !asked.has(item.id));
    const choice = misses.has(item.id) ? (item.answer + 1) % item.options.length : item.answer;
    answers.push({ item: item.id, choice });
    asked.add(item.id);
    mastery[item.concept] = updateMastery(mastery[item.concept], choice === item.answer);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  return { mastery, answers, review: createReview(deck.items, answers) };
}

test('the original twelve-question course enters the unchanged deck contract with all four concepts', () => {
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.ok(Buffer.byteLength(courseText) < 262144);
  for (const concept of deck.concepts) assert.equal(deck.items.filter(item => item.concept === concept).length, 3);
  assert.equal(new Set(deck.items.map(item => item.id)).size, 12);
  assert.ok(Object.isFrozen(deck));
  assert.match(deck.attribution, /Original questions/);
  assert.match(deck.attribution, /ocw\.mit\.edu/);
  assert.match(deck.license, /attribution to RecallWeave contributors/);
});

test('a complete adaptive session retains two first misses while separate practice and notes use this course', () => {
  const missedIds = new Set(['euclid-division-2', 'euclid-combination-1']);
  const session = complete(missedIds);
  const first = JSON.stringify(session);
  assert.equal(session.review.filter(item => !item.correct).length, 2);
  let practice = beginPractice(session.review);
  const initialRound = practice;
  const missedInOrder = session.review.filter(item => !item.correct).map(item => item.id);
  assert.deepEqual(practice.items.map(item => item.id), missedInOrder);
  while (currentPracticeItem(practice)) {
    const item = currentPracticeItem(practice);
    practice = answerPractice(practice, item.id, item.answer);
  }
  assert.equal(practice.answers.length, 2);
  assert.ok(practice.answers.every(answer => answer.correct));
  assert.equal(initialRound.answers.length, 0);
  assert.equal(JSON.stringify(session), first);
  const notes = createStudyNotes({ deck, ...session, practice, exportedAt: '2026-10-08T00:00:00Z' });
  assert.match(notes.text, /10 of 12 connections correct on the first try/);
  assert.match(notes.text, /Complete: 2 of 2 practice answers recorded; 2 correct on retry/);
  assert.match(notes.text, /MODEL STATE, NOT A GRADE/);
  assert.match(notes.text, /Practice does not change the first-session estimates/);
  assert.ok(notes.text.includes(deck.title));
  assert.ok(notes.text.includes(deck.attribution));
  for (const item of session.review) {
    assert.ok(notes.text.includes(item.prompt));
    assert.ok(notes.text.includes('Your first answer: ' + item.options[item.choice]));
    assert.ok(notes.text.includes('Correct answer: ' + item.options[item.answer]));
    assert.ok(notes.text.includes('Explanation: ' + item.explanation));
    assert.ok(notes.text.includes('Apply the idea: ' + item.transfer));
  }
  assert.equal(JSON.stringify(session), first);
});

test('a fully correct course still yields complete review and notes without invented retries', () => {
  const session = complete();
  const practice = beginPractice(session.review);
  assert.equal(session.review.length, 12);
  assert.equal(currentPracticeItem(practice), null);
  const notes = createStudyNotes({ deck, ...session, practice, exportedAt: '2026-10-08T00:00:00Z' });
  assert.match(notes.text, /12 of 12 connections correct on the first try/);
  assert.match(notes.text, /No missed connections in the first session/);
});

test('the committed direct-file explorer matches its exact modular inputs', () => {
  const builder = fileURLToPath(new URL('../tools/build-euclidean-algorithm.mjs', import.meta.url));
  assert.match(execFileSync(process.execPath, [builder, '--check'], { encoding: 'utf8' }), /EUCLID_BUILD_PARITY_OK/);
});
