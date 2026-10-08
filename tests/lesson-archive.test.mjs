import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_BKT, initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { answerPractice, beginPractice, createReview } from '../src/review.mjs';
import { createTraceArchive, readTraceArchive } from '../src/trace-archive.mjs';
import { createLessonArchive, readLessonArchive, LESSON_ARCHIVE_MAX_BYTES } from '../src/lesson-archive.mjs';

const deck = JSON.parse(readFileSync(new URL('../data/deck.json', import.meta.url), 'utf8'));
const savedAt = '2026-10-08T12:00:00.000Z';
const clone = value => structuredClone(value);
const permutations = course => Object.fromEntries(course.items.map((item, index) =>
  [item.id, item.options.map((_, option) => (option + index + 1) % item.options.length)]));
const choose = (item, index) => index % 2 === 0 ? item.answer : (item.answer + 1) % item.options.length;

function advance(state, count = 1, course = deck) {
  const asked = new Set(state.answers.map(answer => answer.item));
  for (let step = 0; step < count; step++) {
    const item = selectNextItem(course.items, asked, state.mastery);
    if (!item) break;
    const choice = choose(item, state.answers.length);
    const correct = choice === item.answer;
    state.answers.push({item: item.id, concept: item.concept, choice, correct});
    state.mastery[item.concept] = updateMastery(state.mastery[item.concept], correct);
    asked.add(item.id);
  }
  return state;
}

function session(count = 2, phase = 'question', course = deck) {
  const state = advance({answers: [], mastery: initialMastery(course.concepts)}, count, course);
  const next = selectNextItem(course.items, new Set(state.answers.map(answer => answer.item)), state.mastery);
  return {
    deck: course, ...state, savedAt,
    presentation: {
      phase,
      itemId: phase === 'feedback' ? state.answers.at(-1)?.item : next?.id,
      optionOrders: permutations(course)
    }
  };
}

const documentFor = (count = 2, phase = 'question') => JSON.parse(createLessonArchive(session(count, phase)).text);
const readDocument = document => readLessonArchive(JSON.stringify(document), deck);
function reordered(value) {
  if (Array.isArray(value)) return value.map(reordered);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).reverse().map(([key, entry]) => [key, reordered(entry)]));
  }
  return value;
}
function assertFrozen(value) {
  if (value !== null && typeof value === 'object') {
    assert.ok(Object.isFrozen(value));
    Object.values(value).forEach(assertFrozen);
  }
}

test('mixed partial save preserves exact native prefix, next item, option orders and uninterrupted continuation', () => {
  const state = session();
  const before = clone(state);
  assert.deepEqual(state.answers.map(answer => [answer.item, answer.choice]), [['p1', 0], ['p2', 1]]);
  assert.equal(state.mastery.photosynthesis, 0.3283749519784863);
  assert.equal(state.presentation.itemId, 'r1');
  const archive = createLessonArchive(state);
  assert.equal(archive.filename, 'recallweave-unfinished-lesson-2026-10-08.json');
  assert.equal(archive.mediaType, 'application/json;charset=utf-8');
  assert.ok(Object.isFrozen(archive));
  const restored = readLessonArchive(archive.text, deck);
  assert.deepEqual(restored.answers, state.answers);
  assert.deepEqual(restored.mastery, state.mastery);
  assert.deepEqual(restored.presentation, state.presentation);
  assert.equal(restored.nextItemId, 'r1');
  assert.deepEqual(restored.summary, {answered: 2, total: 6, remaining: 4, correctFirst: 1});
  const resumed = advance({answers: clone(restored.answers), mastery: clone(restored.mastery)}, deck.items.length);
  const uninterrupted = advance({answers: [], mastery: initialMastery(deck.concepts)}, deck.items.length);
  assert.deepEqual(resumed, uninterrupted);
  assert.deepEqual(state, before);
});

test('a started lesson with no answers restores the first native question and all initial estimates', () => {
  const state = session(0);
  const restored = readLessonArchive(createLessonArchive(state).text, deck);
  assert.deepEqual(restored.answers, []);
  assert.equal(restored.nextItemId, 'p1');
  assert.equal(restored.presentation.phase, 'question');
  assert.equal(restored.presentation.itemId, 'p1');
  assert.ok(Object.values(restored.mastery).every(value => value === DEFAULT_BKT.initial));
  assert.deepEqual(restored.presentation.optionOrders, state.presentation.optionOrders);
  assert.deepEqual(restored.summary, {answered: 0, total: 6, remaining: 6, correctFirst: 0});
});

test('feedback retains the last chosen option while Next remains the next unanswered question', () => {
  const state = session(2, 'feedback');
  const restored = readLessonArchive(createLessonArchive(state).text, deck);
  assert.equal(restored.presentation.itemId, 'p2');
  assert.equal(restored.presentation.phase, 'feedback');
  assert.equal(restored.answers.at(-1).choice, 1);
  assert.equal(restored.answers.at(-1).correct, false);
  assert.equal(restored.nextItemId, 'r1');
  const asked = new Set(restored.answers.map(answer => answer.item));
  const before = clone(restored.mastery);
  const next = selectNextItem(deck.items, asked, restored.mastery);
  assert.equal(next.id, restored.nextItemId);
  assert.equal(asked.has(next.id), false);
  assert.deepEqual(restored.mastery, before);
});

test('complete sessions remain in the existing trace format, including its separate practice state', () => {
  const state = session(deck.items.length, 'feedback');
  const before = clone(state);
  assert.throws(() => createLessonArchive(state), /complete.*completed learning trace/i);
  assert.deepEqual(state, before);
  let practice = beginPractice(createReview(deck.items, state.answers));
  const missed = practice.items[0];
  practice = answerPractice(practice, missed.id, missed.answer);
  const archive = createTraceArchive({...state, practice});
  const restored = readTraceArchive(archive.text, deck);
  assert.deepEqual(restored.answers, state.answers);
  assert.deepEqual(restored.mastery, state.mastery);
  assert.equal(restored.practice.answers.length, 1);
  assert.equal(restored.practice.answers[0].item, missed.id);
  assert.throws(() => readLessonArchive(archive.text, deck), /format is not supported/);
  assert.throws(() => readTraceArchive(createLessonArchive(session()).text, deck), /format is not supported/);
});

test('course content and array order are bound; harmless JSON object key order is accepted', () => {
  const original = documentFor();
  const mutations = [
    doc => { doc.deck.title += ' changed'; },
    doc => { doc.deck.attribution += ' changed'; },
    doc => { doc.deck.license += ' changed'; },
    doc => { doc.deck.items[0].prompt += ' changed'; },
    doc => { doc.deck.items[0].options.reverse(); },
    doc => { doc.deck.items[0].answer = 1; },
    doc => { doc.deck.items[0].explanation += ' changed'; },
    doc => { doc.deck.items[0].transfer += ' changed'; },
    doc => { doc.deck.items[0].prerequisites.push('atp'); },
    doc => { doc.deck.items.reverse(); },
    doc => { doc.deck.concepts.reverse(); },
    doc => { doc.deck.added = 'unadmitted source'; }
  ];
  for (const mutate of mutations) {
    const changed = clone(original);
    mutate(changed);
    assert.throws(() => readDocument(changed), /different course or course version/);
  }
  const otherDeck = clone(deck);
  otherDeck.items[0].prompt += ' current course changed';
  assert.throws(() => readLessonArchive(JSON.stringify(original), otherDeck), /different course or course version/);
  assert.deepEqual(readDocument(reordered(original)), readDocument(original));
  assert.deepEqual(readLessonArchive(JSON.stringify(original), reordered(deck)), readDocument(original));
});

test('model identity and every BKT parameter must match the native model', () => {
  const original = documentFor();
  for (const key of ['initial', 'learn', 'guess', 'slip']) {
    const changed = clone(original);
    changed.model.parameters[key] += 0.01;
    assert.throws(() => readDocument(changed), /different learning model/);
  }
  for (const model of [null, {}, {name: 'recallweave-bkt-v2', parameters: DEFAULT_BKT},
    {name: 'recallweave-bkt-v1', parameters: {...DEFAULT_BKT, fitted: true}}]) {
    assert.throws(() => readDocument({...original, model}), /different learning model/);
  }
});

test('first answers must form the actual native adaptive prefix with canonical option indices', () => {
  const original = documentFor();
  const mutations = [
    doc => { doc.firstAnswers = null; },
    doc => { doc.firstAnswers[0] = null; },
    doc => { doc.firstAnswers[0].item = 'missing'; },
    doc => { doc.firstAnswers[1].item = doc.firstAnswers[0].item; },
    doc => { doc.firstAnswers.reverse(); },
    doc => { doc.firstAnswers[0].item = 'r1'; },
    doc => { doc.firstAnswers[0].correct = true; },
    doc => { delete doc.firstAnswers[0].choice; }
  ];
  for (const choice of [true, '0', 0.5, -1, deck.items[0].options.length, null]) {
    mutations.push(doc => { doc.firstAnswers[0].choice = choice; });
  }
  for (const mutate of mutations) {
    const changed = clone(original);
    mutate(changed);
    assert.throws(() => readDocument(changed), /invalid first answers/);
  }
  const tooMany = clone(original);
  tooMany.firstAnswers = Array.from({length: deck.items.length + 1}, () => ({item: 'p1', choice: 0}));
  assert.throws(() => readDocument(tooMany), /complete/);
});

test('mastery is replayed at full precision and never accepted from rounded or altered values', () => {
  const original = documentFor();
  const mutations = [
    doc => { doc.mastery.photosynthesis = 0.328375; },
    doc => { doc.mastery.photosynthesis = null; },
    doc => { doc.mastery.photosynthesis = '0.3283749519784863'; },
    doc => { delete doc.mastery.atp; },
    doc => { doc.mastery.unknown = 0.22; },
    doc => { doc.mastery = []; },
    doc => { doc.firstAnswers[1].choice = 0; }
  ];
  for (const mutate of mutations) {
    const changed = clone(original);
    mutate(changed);
    assert.throws(() => readDocument(changed), /original model estimates/);
  }
  const state = session();
  state.mastery.photosynthesis = NaN;
  assert.throws(() => createLessonArchive(state), /original model estimates/);
  assert.ok(Number.isNaN(state.mastery.photosynthesis));
  const extra = session();
  extra.mastery.unexpected = undefined;
  assert.throws(() => createLessonArchive(extra), /original model estimates/);
});

test('question, feedback and complete per-item permutations are checked before restoration', () => {
  const original = documentFor();
  const current = original.presentation.itemId;
  const mutations = [
    doc => { doc.presentation = null; },
    doc => { doc.presentation.phase = 'welcome'; },
    doc => { doc.presentation.itemId = 'p1'; },
    doc => { doc.presentation.phase = 'feedback'; },
    doc => { doc.presentation.extra = true; },
    doc => { doc.presentation.optionOrders = []; },
    doc => { delete doc.presentation.optionOrders[current]; },
    doc => { doc.presentation.optionOrders.unseen = [0, 1]; },
    doc => { doc.presentation.optionOrders[current] = [0]; },
    doc => { doc.presentation.optionOrders[current] = null; }
  ];
  for (const value of [0, true, '2', -1, 0.5, deck.items[0].options.length]) {
    mutations.push(doc => {
      doc.presentation.optionOrders[current] = [0, 1, 2, 3];
      doc.presentation.optionOrders[current][2] = value;
    });
  }
  for (const mutate of mutations) {
    const changed = clone(original);
    mutate(changed);
    assert.throws(() => readDocument(changed), /invalid.*presentation|invalid answer display order/);
  }
  const empty = documentFor(0);
  empty.presentation.phase = 'feedback';
  assert.throws(() => readDocument(empty), /invalid.*presentation/);
});

test('successful and refused reads leave caller state untouched and return deeply immutable independent copies', () => {
  const state = session();
  const before = clone(state);
  const archive = createLessonArchive(state);
  const restored = readLessonArchive(archive.text, deck);
  const second = readLessonArchive(archive.text, deck);
  assertFrozen(restored);
  assert.notEqual(second.answers, restored.answers);
  assert.notEqual(second.mastery, restored.mastery);
  assert.notEqual(second.presentation.optionOrders, restored.presentation.optionOrders);
  assert.throws(() => { restored.answers.push({}); }, TypeError);
  assert.throws(() => { restored.mastery.atp = 1; }, TypeError);
  assert.throws(() => { restored.presentation.optionOrders.p1[0] = 3; }, TypeError);
  const bad = JSON.parse(archive.text);
  bad.firstAnswers[1].item = 'p1';
  const badBefore = clone(bad);
  assert.throws(() => readDocument(bad), /invalid first answers/);
  assert.deepEqual(bad, badBefore);
  assert.deepEqual(state, before);
  assert.deepEqual(second, restored);
});

test('the JSON boundary rejects malformed, unsupported, deep and oversized files with a UTF-8 byte limit', () => {
  const original = documentFor();
  for (const text of ['', '{', 'undefined']) {
    assert.throws(() => readLessonArchive(text, deck), /not valid unfinished lesson JSON/);
  }
  for (const text of ['null', '[]', '1', '"text"', '{}']) {
    assert.throws(() => readLessonArchive(text, deck), /format is not supported/);
  }
  for (const change of [{format: 'another.format'}, {version: 2}, {extra: true}]) {
    assert.throws(() => readDocument({...original, ...change}), /format is not supported/);
  }
  const withPrototypeField = JSON.parse(JSON.stringify(original).slice(0, -1) + ',"__proto__":{}}');
  assert.throws(() => readDocument(withPrototypeField), /format is not supported/);
  assert.equal({}.polluted, undefined);
  let nested = 'leaf';
  for (let level = 0; level < 20; level++) nested = {nested};
  assert.throws(() => readDocument({...original, deck: nested}), /invalid course or model data/);
  const text = JSON.stringify(original);
  const bytes = new TextEncoder().encode(text).byteLength;
  const exact = text + ' '.repeat(LESSON_ARCHIVE_MAX_BYTES - bytes);
  assert.equal(new TextEncoder().encode(exact).byteLength, LESSON_ARCHIVE_MAX_BYTES);
  assert.equal(readLessonArchive(exact, deck).nextItemId, 'r1');
  assert.throws(() => readLessonArchive(exact + ' ', deck), /no larger than 2 MiB/);
  assert.throws(() => readLessonArchive('é'.repeat(LESSON_ARCHIVE_MAX_BYTES / 2 + 1), deck), /no larger than 2 MiB/);
  for (const value of [null, {}, new Uint8Array()]) {
    assert.throws(() => readLessonArchive(value, deck), /no larger than 2 MiB/);
  }
});

test('save times are canonical UTC values and invalid save inputs cannot mutate a session', () => {
  const original = documentFor();
  for (const value of [null, 42, 'invalid', '2026-10-08', '2026-10-08T12:00:00Z',
    '2026-02-30T12:00:00.000Z', '2026-10-08T12:00:00.000+00:00']) {
    assert.throws(() => readDocument({...original, savedAt: value}), /invalid save time/);
  }
  const state = session();
  const before = clone(state);
  assert.throws(() => createLessonArchive({...state, savedAt: 'invalid'}), /valid save time/);
  assert.throws(() => createLessonArchive({...state, answers: null}), /invalid first answers/);
  assert.throws(() => createLessonArchive({...state, answers: [null]}), /invalid first answers/);
  const archive = createLessonArchive({...state, savedAt: '2026-10-08T14:00:00+02:00'});
  assert.equal(readLessonArchive(archive.text, deck).savedAt, savedAt);
  assert.deepEqual(state, before);
});

test('ordinary course identifiers that match object prototype names survive without shared object mutation', () => {
  const course = clone(deck);
  const names = new Map(course.concepts.map((concept, index) =>
    [concept, ['__proto__', 'constructor', 'toString', 'atp'][index]]));
  course.concepts = course.concepts.map(concept => names.get(concept));
  course.items = course.items.map((item, index) => ({
    ...item, id: index === 0 ? '__proto__' : item.id,
    concept: names.get(item.concept), prerequisites: item.prerequisites.map(concept => names.get(concept))
  }));
  const state = session(2, 'question', course);
  const restored = readLessonArchive(createLessonArchive(state).text, course);
  assert.deepEqual(restored.mastery, state.mastery);
  assert.deepEqual(restored.presentation.optionOrders, state.presentation.optionOrders);
  assert.equal(Object.getPrototypeOf(restored.mastery), Object.prototype);
  assert.equal(Object.getPrototypeOf(restored.presentation.optionOrders), Object.prototype);
  assert.equal({}.polluted, undefined);
});
