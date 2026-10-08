import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULT_BKT, initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { answerPractice, beginPractice, createReview, currentPracticeItem } from '../src/review.mjs';
import { createTraceArchive, readTraceArchive, TRACE_ARCHIVE_MAX_BYTES } from '../src/trace-archive.mjs';

const deck = JSON.parse(await readFile(new URL('../data/deck.json', import.meta.url), 'utf8'));
const savedAt = '2026-10-08T10:00:00.000Z';

function completed(mode = 'mixed') {
  const answers = [];
  const mastery = initialMastery(deck.concepts);
  const asked = new Set();
  while (asked.size < deck.items.length) {
    const item = selectNextItem(deck.items, asked, mastery);
    const correct = mode === 'correct' || (mode === 'mixed' && answers.length % 2 === 1);
    const choice = correct ? item.answer : (item.answer + 1) % item.options.length;
    asked.add(item.id);
    answers.push(Object.freeze({item: item.id, concept: item.concept, choice, correct}));
    mastery[item.concept] = updateMastery(mastery[item.concept], correct);
  }
  return {deck, answers, mastery, practice: null, savedAt};
}

function documentFor(state = completed()) {
  return JSON.parse(createTraceArchive(state).text);
}

function rejectMutation(mutate, pattern) {
  const document = documentFor();
  mutate(document);
  assert.throws(() => readTraceArchive(JSON.stringify(document), deck), pattern);
}

test('completed first answers restore in their original adaptive order with exact, unrounded estimates', () => {
  const state = completed();
  const before = JSON.stringify(state);
  const archive = createTraceArchive(state);
  const result = readTraceArchive(archive.text, deck);
  assert.deepEqual(result.answers, state.answers);
  assert.deepEqual(result.mastery, state.mastery);
  assert.deepEqual(result.review, createReview(deck.items, state.answers));
  assert.equal(result.practice, null);
  assert.ok(Object.values(result.mastery).some(value => value !== Math.round(value * 100) / 100));
  assert.equal(JSON.stringify(state), before);
  assert.equal(result.savedAt, savedAt);
  assert.equal(archive.filename, 'recallweave-learning-trace-2026-10-08.json');
  assert.equal(archive.mediaType, 'application/json;charset=utf-8');
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.answers) && Object.isFrozen(result.answers[0]));
  assert.ok(Object.isFrozen(result.mastery) && Object.isFrozen(result.review));
});

test('unstarted, zero-answer, paused and complete practice remain distinct and can resume once', () => {
  for (const count of [null, 0, 1, 3]) {
    const state = completed();
    const review = createReview(deck.items, state.answers);
    if (count !== null) {
      state.practice = beginPractice(review);
      for (let index = 0; index < count; index++) {
        const item = currentPracticeItem(state.practice);
        state.practice = answerPractice(state.practice, item.id, index % 2 ? (item.answer + 1) % item.options.length : item.answer);
      }
    }
    const restored = readTraceArchive(createTraceArchive(state).text, deck);
    assert.deepEqual(restored.practice, state.practice);
    assert.deepEqual(restored.mastery, state.mastery);
    assert.deepEqual(restored.answers, state.answers);
    assert.equal(restored.summary.practiceStarted, count !== null);
    assert.equal(restored.summary.practiceAnswers, count ?? 0);
    assert.equal(restored.summary.practiceTotal, 3);
    let resumed = restored.practice ?? beginPractice(restored.review);
    while (currentPracticeItem(resumed)) {
      const item = currentPracticeItem(resumed);
      resumed = answerPractice(resumed, item.id, item.answer);
    }
    assert.equal(resumed.answers.length, 3);
    assert.deepEqual(resumed.answers.slice(0, count ?? 0), state.practice?.answers ?? []);
    assert.deepEqual(restored.mastery, state.mastery, 'Practice never updates first mastery');
    assert.deepEqual(restored.answers, state.answers, 'Practice never updates first answers');
  }
});

test('all-correct and all-missed completed traces use canonical answer indices', () => {
  for (const mode of ['correct', 'missed']) {
    const state = completed(mode);
    const result = readTraceArchive(createTraceArchive(state).text, deck);
    assert.equal(result.summary.correctFirst, mode === 'correct' ? deck.items.length : 0);
    assert.equal(result.summary.practiceTotal, mode === 'correct' ? 0 : deck.items.length);
    assert.deepEqual(result.answers.map(answer => answer.choice), state.answers.map(answer => answer.choice));
  }
});

test('incomplete, duplicate, unknown and out-of-range first answers are refused', () => {
  rejectMutation(document => document.firstAnswers.pop(), /complete first session/);
  rejectMutation(document => document.firstAnswers[1] = document.firstAnswers[0], /invalid first answers/);
  rejectMutation(document => document.firstAnswers[0].item = 'missing-item', /invalid first answers/);
  rejectMutation(document => document.firstAnswers[0].choice = -1, /invalid first answers/);
  rejectMutation(document => document.firstAnswers[0].choice = 0.5, /invalid first answers/);
  rejectMutation(document => document.firstAnswers[0].choice = 999, /invalid first answers/);
  rejectMutation(document => document.firstAnswers[0].correct = true, /invalid first answers/);
  const state = completed();
  state.answers.pop();
  assert.throws(() => createTraceArchive(state), /complete first session/);
});

test('a different course revision cannot replace the current deck; property order is immaterial', () => {
  rejectMutation(document => document.deck.items[0].options.reverse(), /different course/);
  rejectMutation(document => document.deck.title += ' changed', /different course/);
  rejectMutation(document => document.deck.attribution += ' changed', /different course/);
  const document = documentFor();
  document.deck = Object.fromEntries(Object.entries(document.deck).reverse());
  assert.deepEqual(readTraceArchive(JSON.stringify(document), deck).answers, completed().answers);
  assert.equal(deck.items[0].answer, 0);
});

test('changed model parameters, rounded estimates and incompatible versions are refused', () => {
  rejectMutation(document => document.model.parameters.learn = DEFAULT_BKT.learn + 0.01, /different learning model/);
  rejectMutation(document => document.model.name = 'other-model', /different learning model/);
  rejectMutation(document => document.mastery[deck.concepts[0]] = 0.5, /original model estimates/);
  rejectMutation(document => delete document.mastery[deck.concepts[0]], /original model estimates/);
  rejectMutation(document => document.version = 2, /format is not supported/);
  rejectMutation(document => document.reflections = {text: 'unrecognized future content'}, /format is not supported/);
  rejectMutation(document => document.savedAt = 'yesterday', /invalid save time/);
});

test('practice replay refuses duplicate, reordered, correct-first and extra answers', () => {
  const state = completed();
  state.practice = beginPractice(createReview(deck.items, state.answers));
  const first = currentPracticeItem(state.practice);
  state.practice = answerPractice(state.practice, first.id, first.answer);
  const baseline = documentFor(state);
  for (const mutate of [
    document => document.practice.answers.push(document.practice.answers[0]),
    document => document.practice.answers[0].item = state.practice.items[1].id,
    document => document.practice.answers[0].item = state.answers.find(answer => answer.correct).item,
    document => document.practice.answers[0].choice = 999,
    document => document.practice.answers[0].correct = true,
    document => document.practice = {},
    document => document.practice.answers = 'not an array'
  ]) {
    const document = structuredClone(baseline);
    mutate(document);
    assert.throws(() => readTraceArchive(JSON.stringify(document), deck), /invalid practice progress/);
  }
  const wrongItems = {...state, practice: {...state.practice, items: [...state.practice.items].reverse()}};
  assert.throws(() => createTraceArchive(wrongItems), /invalid practice progress/);
});

test('bounded parsing refuses invalid JSON and oversized UTF-8 before exposing state', () => {
  for (const text of ['', '{', 'null', '[]', '{"format":"notes"}']) {
    assert.throws(() => readTraceArchive(text, deck), /learning trace/);
  }
  const multibyte = 'é'.repeat(Math.floor(TRACE_ARCHIVE_MAX_BYTES / 2) + 1);
  assert.ok(multibyte.length < TRACE_ARCHIVE_MAX_BYTES);
  assert.throws(() => readTraceArchive(multibyte, deck), /no larger than 2 MiB/);
  assert.throws(() => readTraceArchive({}, deck), /no larger than 2 MiB/);
  assert.throws(() => createTraceArchive({...completed(), savedAt: 'invalid'}), /valid save time/);
});
