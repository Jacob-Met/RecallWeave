import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createReview, beginPractice, answerPractice } from '../src/review.mjs';
import { initialMastery, updateMastery } from '../src/knowledge.mjs';
import { createStudyNotes } from '../src/session-export.mjs';

const deck = JSON.parse(await readFile(new URL('../data/deck.json', import.meta.url), 'utf8'));
const exportedAt = '2026-10-08T08:45:00.000Z';
function session(mode = 'mixed') {
  const ordered = [...deck.items].reverse();
  const answers = ordered.map((item, index) => ({
    item: item.id, choice: mode === 'correct' || (mode === 'mixed' && index % 2) ? item.answer : (item.answer + 1) % item.options.length
  }));
  const mastery = initialMastery(deck.concepts);
  ordered.forEach((item, index) => { mastery[item.concept] = updateMastery(mastery[item.concept], answers[index].choice === item.answer); });
  return {deck, mastery, review: createReview(deck.items, answers), exportedAt};
}

test('notes retain the actual first choices, session order, corrections, transfers, and attribution', () => {
  const input = session();
  const {text, filename, mediaType} = createStudyNotes(input);
  assert.equal(filename, 'recallweave-study-notes-2026-10-08.txt');
  assert.equal(mediaType, 'text/plain;charset=utf-8');
  assert.match(text, /3 of 6 connections correct on the first try/);
  let previous = -1;
  for (const item of input.review) {
    const position = text.indexOf(item.prompt);
    assert.ok(position > previous);
    previous = position;
    assert.ok(text.includes(`Your first answer: ${item.options[item.choice]}`));
    assert.ok(text.includes(`Correct answer: ${item.options[item.answer]}`));
    assert.ok(text.includes(`Explanation: ${item.explanation}`));
    assert.ok(text.includes(`Apply the idea: ${item.transfer}`));
  }
  assert.ok(text.includes(deck.attribution));
  assert.ok(text.includes(deck.license));
  assert.match(text, /MODEL STATE, NOT A GRADE/);
  assert.match(text, /not a validated assessment/);
});

test('paused and completed retries cannot replace the first answers or alter the model', () => {
  const input = session();
  const before = JSON.stringify(input);
  const start = beginPractice(input.review);
  const first = start.items[0];
  const paused = answerPractice(start, first.id, first.answer);
  const text = createStudyNotes({...input, practice: paused}).text;
  assert.match(text, /Paused: 1 of 3 practice answers recorded; 1 correct on retry/);
  assert.ok(text.includes(`Your first answer: ${first.options[first.choice]}`));
  assert.ok(text.includes(`Practice answer: ${first.options[first.answer]}`));
  assert.match(text, /3 of 6 connections correct on the first try/);
  assert.equal((text.match(/Practice answer: not recorded\./g) ?? []).length, 2);
  let complete = paused;
  for (const item of start.items.slice(1)) complete = answerPractice(complete, item.id, (item.answer + 1) % item.options.length);
  assert.match(createStudyNotes({...input, practice: complete}).text, /Complete: 3 of 3 practice answers recorded; 1 correct on retry/);
  assert.equal(JSON.stringify(input), before);
  assert.equal(start.answers.length, 0);
  assert.equal(paused.answers.length, 1);
});

test('unstarted, zero-answer paused, and all-correct sessions have honest practice labels', () => {
  const mixed = session();
  assert.match(createStudyNotes(mixed).text, /Not started\. 3 missed connections/);
  assert.match(createStudyNotes({...mixed, practice: beginPractice(mixed.review)}).text, /Paused: 0 of 3 practice answers recorded/);
  const correct = session('correct');
  assert.match(createStudyNotes(correct).text, /No missed connections/);
  assert.doesNotMatch(createStudyNotes(correct).text, /Practice answer: not recorded/);
  assert.match(createStudyNotes(correct).text, /6 of 6 connections correct/);
});

test('incomplete, duplicate, legacy choice-less or malformed traces are refused rather than fabricated', () => {
  const input = session();
  assert.throws(() => createStudyNotes({...input, review: input.review.slice(1)}), RangeError);
  assert.throws(() => createStudyNotes({...input, review: input.review.map(() => input.review[0])}), RangeError);
  for (const choice of [undefined, null, '0', -1, 4]) {
    const review = input.review.map((item, index) => index === 0 ? {...item, choice} : item);
    assert.throws(() => createStudyNotes({...input, review}), RangeError);
  }
  const practice = beginPractice(input.review);
  assert.throws(() => createStudyNotes({...input, practice: {...practice, answers: [{item: practice.items[1].id, choice: 0}]}}), RangeError);
  assert.throws(() => createStudyNotes({...input, exportedAt: 'invalid'}), RangeError);
  for (const value of [NaN, Infinity, -0.1, 1.1, null, '0.5']) {
    assert.throws(() => createStudyNotes({...input, mastery: {...input.mastery, atp: value}}), RangeError);
  }
});

test('plain-text output preserves Unicode and literal markup without creating executable content', () => {
  const input = session();
  const literal = 'Café → 光 <script>alert("study")</script> & 2 < 3';
  const review = input.review.map((item, index) => index ? item : {...item, prompt: literal});
  const notes = createStudyNotes({...input, review});
  assert.equal(notes.mediaType, 'text/plain;charset=utf-8');
  assert.ok(notes.text.includes(literal));
  assert.equal(Buffer.from(notes.text, 'utf8').toString('utf8'), notes.text);
});
