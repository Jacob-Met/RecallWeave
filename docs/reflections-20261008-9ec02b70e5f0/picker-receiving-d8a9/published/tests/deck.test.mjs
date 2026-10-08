import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DECK_FORMAT, MAX_DECK_BYTES, parseDeck, serializeDeck, validateDeck } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, answerPractice } from '../src/review.mjs';

const bundled = JSON.parse(await readFile(new URL('../data/deck.json', import.meta.url), 'utf8'));
const example = () => ({
  format: DECK_FORMAT, title: 'Workshop decisions', attribution: 'Original test fixture', license: 'Test fixture',
  concepts: ['observation', 'decision'],
  items: [
    {id:'observe', concept:'observation', prerequisites:[], prompt:'What did you observe?', options:['Guess', 'Read the record'], answer:1, explanation:'Use the record.', transfer:'Describe one observation.'},
    {id:'decide', concept:'decision', prerequisites:['observation'], prompt:'Which action follows?', options:['Ignore it', 'Guess again', 'Use the observation'], answer:2, explanation:'Connect action to observation.', transfer:'Name the connection.'}
  ]
});

test('the existing bundled deck imports unchanged without a format field', () => {
  const deck = parseDeck(JSON.stringify(bundled));
  assert.equal(deck.format, DECK_FORMAT);
  assert.deepEqual(deck.items, bundled.items);
  assert.deepEqual(deck.concepts, bundled.concepts);
  assert.equal(deck.title, bundled.title);
  assert.equal(deck.attribution, bundled.attribution);
  assert.equal(deck.license, bundled.license);
});

test('a deck is an immutable copy, and unknown fields cannot configure the runtime', () => {
  const source = example();
  source.parameters = {initial:1, guess:0};
  source.items[0].correct = true;
  const deck = validateDeck(source);
  source.concepts.push('another');
  source.items[0].answer = 0;
  source.items[0].options[1] = 'changed';
  source.items[1].prerequisites.length = 0;
  assert.equal(deck.items[0].answer, 1);
  assert.equal(deck.items[0].options[1], 'Read the record');
  assert.deepEqual(deck.items[1].prerequisites, ['observation']);
  assert.deepEqual(deck.concepts, ['observation', 'decision']);
  assert.equal(Object.hasOwn(deck, 'parameters'), false);
  assert.equal(Object.hasOwn(deck.items[0], 'correct'), false);
  for (const value of [deck, deck.concepts, deck.items, ...deck.items, ...deck.items.flatMap(item => [item.options, item.prerequisites])]) {
    assert.equal(Object.isFrozen(value), true);
  }
  assert.throws(() => {deck.items[0].answer = 0;}, TypeError);
});

test('malformed JSON, unsupported versions and wrong top-level values give actionable errors', () => {
  assert.throws(() => parseDeck('{'), /not valid JSON/);
  for (const value of [null, [], 0, 'deck']) assert.throws(() => validateDeck(value), /must be an object/);
  const source = example();
  source.format = 'recallweave-deck/2';
  assert.throws(() => validateDeck(source), /Unsupported deck format/);
});

test('JSON byte limit counts multibyte text and accepts the exact boundary', () => {
  const json = JSON.stringify(example());
  const bytes = new TextEncoder().encode(json).length;
  assert.equal(parseDeck(json + ' '.repeat(MAX_DECK_BYTES - bytes)).title, example().title);
  assert.throws(() => parseDeck(json + ' '.repeat(MAX_DECK_BYTES - bytes + 1)), /256 KiB/);
  const large = {...example(), title:'é'.repeat(80), extra:'é'.repeat(MAX_DECK_BYTES / 2)};
  assert.throws(() => parseDeck(JSON.stringify(large)), /256 KiB/);
});

test('required readable metadata and bounded question fields are validated', () => {
  for (const key of ['title', 'attribution', 'license']) {
    for (const value of [undefined, '', '   ', 12, {}]) {
      const source = example(); source[key] = value;
      assert.throws(() => validateDeck(source), new RegExp(key));
    }
  }
  for (const [key, limit] of [['id',80], ['prompt',2000], ['explanation',4000], ['transfer',2000]]) {
    const source = example(); source.items[0][key] = 'x'.repeat(limit + 1);
    assert.throws(() => validateDeck(source), new RegExp(key));
  }
  const tooLong = example(); tooLong.title = 'x'.repeat(161);
  assert.throws(() => validateDeck(tooLong), /title/);
});

test('empty and oversized collections and duplicate identities are refused', () => {
  for (const key of ['concepts', 'items']) {
    const source = example(); source[key] = [];
    assert.throws(() => validateDeck(source), new RegExp(key));
  }
  const tooManyConcepts = example(); tooManyConcepts.concepts = Array.from({length:33}, (_,i) => `c${i}`);
  assert.throws(() => validateDeck(tooManyConcepts), /concepts/);
  const tooManyItems = example(); tooManyItems.items = Array.from({length:101}, (_,i) => ({...tooManyItems.items[0], id:`q${i}`}));
  assert.throws(() => validateDeck(tooManyItems), /items/);
  const duplicateConcept = example(); duplicateConcept.concepts.push('observation');
  assert.throws(() => validateDeck(duplicateConcept), /unique/);
  const duplicateItem = example(); duplicateItem.items[1].id = 'observe';
  assert.throws(() => validateDeck(duplicateItem), /duplicates/);
});

test('every question and prerequisite must name a known covered concept', () => {
  const unknown = example(); unknown.items[0].concept = 'missing';
  assert.throws(() => validateDeck(unknown), /not in concepts/);
  const prerequisite = example(); prerequisite.items[1].prerequisites = ['missing'];
  assert.throws(() => validateDeck(prerequisite), /unknown concept/);
  const uncovered = example(); uncovered.concepts.push('uncovered');
  assert.throws(() => validateDeck(uncovered), /at least one question/);
  const repeated = example(); repeated.items[1].prerequisites.push('observation');
  assert.throws(() => validateDeck(repeated), /duplicate/);
});

test('self-requirements and concept cycles across different questions are refused', () => {
  const self = example(); self.items[0].prerequisites = ['observation'];
  assert.throws(() => validateDeck(self), /own concept/);
  const cycle = example(); cycle.items[0].prerequisites = ['decision'];
  assert.throws(() => validateDeck(cycle), /cycle/);
  const crossQuestion = example();
  crossQuestion.items.push({...crossQuestion.items[0], id:'another', prerequisites:['decision']});
  assert.throws(() => validateDeck(crossQuestion), /cycle/);
});

test('choices require distinct readable options and an actual integer answer index', () => {
  for (const answer of [-1, 2, 0.5, '1', null, true, NaN]) {
    const source = example(); source.items[0].answer = answer;
    assert.throws(() => validateDeck(source), /zero-based index/);
  }
  for (const options of [[], ['only'], ['same','same'], ['yes',''], ['yes',{}], Array.from({length:7}, (_,i) => String(i))]) {
    const source = example(); source.items[0].options = options;
    assert.throws(() => validateDeck(source), /options/);
  }
});

test('100 questions and 32 concepts work through the existing selector to exhaustion', () => {
  const source = example();
  source.concepts = Array.from({length:32}, (_,i) => `c${i}`);
  source.items = Array.from({length:100}, (_,i) => ({...source.items[0], id:`q${String(i).padStart(3,'0')}`, concept:`c${i % 32}`, prerequisites:i % 32 ? [`c${i % 32 - 1}`] : []}));
  const deck = validateDeck(source);
  const mastery = initialMastery(deck.concepts);
  const asked = new Set();
  for (let i=0; i<100; i++) {
    const item = selectNextItem(deck.items, asked, mastery);
    assert.ok(item);
    assert.equal(asked.has(item.id), false);
    asked.add(item.id);
    mastery[item.concept] = updateMastery(mastery[item.concept], i % 2 === 0);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  assert.equal(asked.size, 100);
  assert.ok(Object.values(mastery).every(value => value >= 0 && value <= 1));
});

test('imported answer indices, literal text and object-key names survive learning and practice', () => {
  const source = example();
  source.title = '<img src=x onerror="alert(1)">';
  source.concepts = ['__proto__', 'constructor'];
  source.items[0].id = '__proto__';
  source.items[0].concept = '__proto__';
  source.items[1].concept = 'constructor';
  source.items[1].prerequisites = ['__proto__'];
  source.items[0].options[1] = '<b>Literal answer</b>';
  const deck = parseDeck(JSON.stringify(source));
  assert.equal(deck.title, source.title);
  const mastery = initialMastery(deck.concepts);
  const asked = new Set();
  const answers = [];
  for (let item; (item = selectNextItem(deck.items, asked, mastery));) {
    asked.add(item.id);
    const choice = item.id === '__proto__' ? 0 : item.answer;
    const correct = choice === item.answer;
    answers.push({item:item.id, concept:item.concept, choice, correct});
    mastery[item.concept] = updateMastery(mastery[item.concept], correct);
  }
  const review = createReview(deck.items, answers);
  assert.equal(review[0].id, '__proto__');
  assert.equal(review[0].options[review[0].answer], '<b>Literal answer</b>');
  assert.deepEqual(review.map(item => item.correct), [false, true]);
  const practice = answerPractice(beginPractice(review), '__proto__', 1);
  assert.equal(practice.answers[0].correct, true);
  assert.equal(review[0].correct, false);
  assert.equal(Object.hasOwn(mastery, '__proto__'), true);
  assert.equal(typeof mastery.__proto__, 'number');
});

test('downloadable example round-trips through the import contract with full attribution', () => {
  const text = serializeDeck(bundled);
  const deck = parseDeck(text);
  assert.equal(deck.format, DECK_FORMAT);
  assert.deepEqual(deck.items, bundled.items);
  assert.equal(deck.attribution, bundled.attribution);
  assert.equal(deck.license, bundled.license);
});
