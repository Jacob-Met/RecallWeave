import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_DECK_BYTES, parseDeck, serializeDeck, validateDeck } from '../src/deck.mjs';
import { createDraft, draftFromDeck, addConcept, removeConcept, addQuestion, removeQuestion,
  restoreQuestion, moveQuestion, addOption, removeOption, moveOption, checkDraft, downloadName } from '../src/deck-author.mjs';

function lesson() {
  return { title: 'An authored map “A → B”', attribution: 'Synthetic receiving author\nOriginal test content.',
    license: 'Original synthetic test fixture.', concepts: ['symbols', 'connections'], items: [
      { id: 'sign', concept: 'symbols', prerequisites: [], prompt: 'In this example, which label marks the start?',
        options: ['End', 'Start', 'Middle', 'North', 'South', 'West'], answer: 1,
        explanation: 'The authored map explicitly labels its start.', transfer: 'Choose a clear label for a different map.' },
      { id: 'join', concept: 'connections', prerequisites: ['symbols'], prompt: 'Which connection did this author describe?',
        options: ['A → B', 'B → A'], answer: 0, explanation: 'The author specified A → B.', transfer: 'Describe the reversed connection.' }
    ] };
}

test('blank editor requires authored metadata and a deliberate answer', () => {
  const draft = createDraft();
  assert.equal(draft.questions[0].answerKey, null);
  assert.deepEqual(checkDraft(draft).target, { field: 'title' });
  draft.title = 'A local lesson'; draft.attribution = 'Test author'; draft.license = 'Test permission';
  draft.concepts[0].name = 'idea';
  const item = draft.questions[0];
  item.prompt = 'A test question'; item.options[0].text = 'First'; item.options[1].text = 'Second';
  item.explanation = 'An authored explanation'; item.transfer = 'Apply this example';
  const refused = checkDraft(draft);
  assert.equal(refused.ok, false); assert.equal(refused.target.field, 'answer');
  item.answerKey = item.options[1].key;
  const accepted = checkDraft(draft);
  assert.equal(accepted.ok, true); assert.equal(accepted.deck.items[0].answer, 1);
});

test('opening a validated lesson makes an independent editable draft and preserves IDs and literals', () => {
  const source = validateDeck(lesson());
  const before = JSON.stringify(source);
  const draft = draftFromDeck(source);
  assert.deepEqual(checkDraft(draft).deck, source);
  draft.title = '</script><img src=x onerror=alert(1)> café';
  draft.questions[0].options[1].text = 'A "quoted" answer\nwith a new line';
  assert.equal(JSON.stringify(source), before);
  const exported = checkDraft(draft);
  assert.equal(exported.ok, true);
  assert.equal(parseDeck(exported.json).title, draft.title);
  assert.equal(exported.deck.items[0].id, 'sign');
  assert.equal(exported.deck.items[0].options[exported.deck.items[0].answer], draft.questions[0].options[1].text);
});

test('correctness follows an option when moved or when a preceding option is removed', () => {
  const draft = draftFromDeck(lesson()); const item = draft.questions[0];
  const correct = item.options[1]; const unrelated = draft.questions[1].prompt;
  moveOption(draft, item.key, correct.key, 1);
  let checked = checkDraft(draft);
  assert.equal(checked.deck.items[0].answer, 2);
  assert.equal(checked.deck.items[0].options[2], 'Start');
  removeOption(draft, item.key, item.options[0].key);
  checked = checkDraft(draft);
  assert.equal(checked.deck.items[0].answer, 1);
  assert.equal(checked.deck.items[0].options[1], 'Start');
  assert.equal(item.answerKey, correct.key); assert.equal(draft.questions[1].prompt, unrelated);
  assert.equal(removeOption(draft, item.key, correct.key).removedCorrectAnswer, true);
  assert.equal(item.answerKey, null); assert.equal(checkDraft(draft).target.field, 'answer');
  item.answerKey = item.options[2].key;
  assert.equal(checkDraft(draft).deck.items[0].answer, 2);
});

test('option limits refuse without deleting text or changing the answer', () => {
  const draft = draftFromDeck(lesson()); const item = draft.questions[0];
  const full = JSON.stringify(draft);
  assert.throws(() => addOption(draft, item.key), /six/); assert.equal(JSON.stringify(draft), full);
  while (item.options.length > 2) removeOption(draft, item.key, item.options.at(-1).key);
  const minimum = JSON.stringify(draft);
  assert.throws(() => removeOption(draft, item.key, item.options[0].key), /two/);
  assert.equal(JSON.stringify(draft), minimum);
});

test('concept renaming updates question and prerequisite references while used deletion is refused', () => {
  const draft = draftFromDeck(lesson());
  draft.concepts[0].name = 'New “symbol” <literal> 名称';
  const result = checkDraft(draft);
  assert.equal(result.ok, true);
  assert.equal(result.deck.items[0].concept, draft.concepts[0].name);
  assert.deepEqual(result.deck.items[1].prerequisites, [draft.concepts[0].name]);
  const before = JSON.stringify(draft);
  assert.throws(() => removeConcept(draft, draft.concepts[0].key), /used/);
  assert.equal(JSON.stringify(draft), before);
});

test('cycles, uncovered concepts and duplicate answer text remain repairable drafts', () => {
  const draft = draftFromDeck(lesson());
  draft.questions[0].prerequisiteKeys = [draft.concepts[1].key];
  assert.match(checkDraft(draft).message, /loop/);
  draft.questions[0].prerequisiteKeys = [];
  const concept = addConcept(draft); concept.name = 'An unused idea';
  const uncovered = checkDraft(draft);
  assert.equal(uncovered.ok, false); assert.equal(uncovered.target.conceptKey, concept.key);
  removeConcept(draft, concept.key);
  const item = draft.questions[1]; const original = item.options[1].text;
  item.options[1].text = item.options[0].text;
  assert.match(checkDraft(draft).message, /different text/);
  item.options[1].text = original;
  assert.equal(checkDraft(draft).ok, true);
  assert.equal(draft.questions[0].prompt, lesson().items[0].prompt);
});

test('question reordering and undo restore the removed question without rolling back later edits', () => {
  const draft = draftFromDeck(lesson()); const first = draft.questions[0]; const second = draft.questions[1];
  moveQuestion(draft, second.key, -1);
  assert.deepEqual(checkDraft(draft).deck.items.map(item => item.id), ['join', 'sign']);
  const removal = removeQuestion(draft, first.key);
  assert.equal(checkDraft(draft).ok, false);
  draft.questions[0].prompt = 'A later edit that must survive undo';
  draft.title = 'A later title';
  restoreQuestion(draft, removal);
  const result = checkDraft(draft);
  assert.equal(result.ok, true); assert.equal(result.deck.title, 'A later title');
  assert.equal(result.deck.items[0].prompt, 'A later edit that must survive undo');
  assert.equal(result.deck.items[1].id, 'sign'); assert.equal(result.deck.items[1].answer, 1);
  assert.equal(result.deck.items[1].explanation, lesson().items[0].explanation);
});

test('new question IDs do not overwrite IDs from an opened deck', () => {
  const source = lesson(); source.items[0].id = 'question-13';
  const draft = draftFromDeck(source);
  for (let i = 0; i < 20; i++) addQuestion(draft);
  assert.equal(new Set(draft.questions.map(item => item.id)).size, draft.questions.length);
  assert.equal(draft.questions[0].id, 'question-13');
});

test('checked snapshots are immutable, deterministic, and separate from later draft edits', () => {
  const draft = draftFromDeck(lesson()); const before = JSON.stringify(draft);
  const first = checkDraft(draft); const second = checkDraft(draft);
  assert.equal(first.json, second.json); assert.equal(JSON.stringify(draft), before);
  assert.throws(() => first.deck.items[0].options.push('extra'), TypeError);
  draft.questions[0].options[0].text = 'Changed after preview';
  assert.equal(first.deck.items[0].options[0], 'End');
  assert.equal(checkDraft(draft).deck.items[0].options[0], 'Changed after preview');
});

test('individually valid multibyte content cannot export a file larger than the importer admits', () => {
  const source = { title: 'Multibyte receiving', attribution: 'Synthetic', license: 'Synthetic', concepts: ['a'],
    items: Array.from({ length: 28 }, (_, index) => ({ id: `q${index}`, concept: 'a', prerequisites: [],
      prompt: 'p'.repeat(1600), options: ['a'.repeat(900), 'b'.repeat(900)], answer: 1,
      explanation: 'é'.repeat(3900), transfer: '語'.repeat(1000) })) };
  const serialized = serializeDeck(source);
  assert.ok(serialized.length < MAX_DECK_BYTES, 'character count would wrongly admit this file');
  assert.ok(new TextEncoder().encode(serialized).length > MAX_DECK_BYTES);
  assert.throws(() => parseDeck(serialized), /256 KiB/);
  const draft = draftFromDeck(source); const before = JSON.stringify(draft);
  const refused = checkDraft(draft);
  assert.equal(refused.ok, false); assert.match(refused.message, /256 KiB/);
  assert.equal(JSON.stringify(draft), before);
  draft.questions = draft.questions.slice(0, 2);
  assert.equal(checkDraft(draft).ok, true);
});

test('download filenames are bounded local names', () => {
  assert.equal(downloadName('café / notes'), 'cafe-notes.json');
  assert.equal(downloadName('../'), 'recallweave-deck.json');
  assert.ok(downloadName('x'.repeat(160)).length <= 65);
});
