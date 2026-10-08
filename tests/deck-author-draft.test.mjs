import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraft, addConcept, addQuestion, addOption, moveOption, checkDraft, draftFromDeck } from '../src/deck-author.mjs';
import { parseDeck } from '../src/deck.mjs';
import { DRAFT_FORMAT, MAX_DRAFT_BYTES, parseAuthorDraft, serializeAuthorDraft } from '../src/deck-author-draft.mjs';

function envelope(draft, format = DRAFT_FORMAT) {
  return JSON.stringify({ format, draft });
}

// A content/reference projection independent of the saved private key spelling.
function meaning(draft) {
  const concepts = draft.concepts.map(concept => concept.key);
  return {
    title: draft.title, attribution: draft.attribution, license: draft.license,
    concepts: draft.concepts.map(concept => concept.name),
    questions: draft.questions.map(question => ({
      id: question.id, prompt: question.prompt,
      concept: question.conceptKey === null ? null : concepts.indexOf(question.conceptKey),
      prerequisites: question.prerequisiteKeys.map(key => concepts.indexOf(key)),
      options: question.options.map(option => option.text),
      answer: question.answerKey === null ? null : question.options.findIndex(option => option.key === question.answerKey),
      explanation: question.explanation, transfer: question.transfer,
    })),
  };
}

function fillQuestion(question, suffix = '') {
  question.prompt = `Which route ${suffix}?`;
  question.options.forEach((option, index) => { option.text = `Route ${index + 1} ${suffix}`; });
  question.answerKey = question.options.at(-1).key;
  question.explanation = 'The route follows the given map.';
  question.transfer = 'Explain a different map.';
}

function readyDraft() {
  const draft = createDraft();
  draft.title = 'A map “with quotes” <not markup> 🧭';
  draft.attribution = 'Original local test author\nNo imported course text.';
  draft.license = 'Synthetic receiving fixture.';
  draft.concepts[0].name = 'Routes';
  fillQuestion(draft.questions[0]);
  return draft;
}

test('unfinished and completely empty drafts save without claiming lesson validity', () => {
  const empty = { nextKey: 99, title: '', attribution: '', license: '', concepts: [], questions: [] };
  const noConcept = structuredClone(empty);
  addQuestion(noConcept);
  for (const draft of [createDraft(), empty, noConcept]) {
    const before = structuredClone(draft);
    const saved = serializeAuthorDraft(draft);
    const restored = parseAuthorDraft(saved);
    assert.deepEqual(meaning(restored), meaning(draft));
    assert.equal(checkDraft(restored).ok, false);
    assert.throws(() => parseDeck(saved), /Unsupported deck format/);
    assert.equal(serializeAuthorDraft(restored), saved);
    assert.deepEqual(draft, before);
  }
});

test('duplicate text, cyclic and self prerequisites, and unfinished selections survive for repair', () => {
  const draft = createDraft();
  const secondConcept = addConcept(draft);
  const secondQuestion = addQuestion(draft);
  draft.concepts[0].name = secondConcept.name = 'Unfinished duplicate';
  const first = draft.questions[0];
  first.prerequisiteKeys = [secondConcept.key, draft.concepts[0].key];
  first.options.forEach(option => { option.text = 'Same answer text'; });
  first.prompt = '\n Literal <script> & quotes “ ” \u0000 🧭\n';
  secondQuestion.conceptKey = secondConcept.key;
  secondQuestion.prerequisiteKeys = [draft.concepts[0].key];
  secondQuestion.answerKey = null;
  const before = structuredClone(draft);
  const restored = parseAuthorDraft(serializeAuthorDraft(draft));
  assert.deepEqual(meaning(restored), meaning(draft));
  assert.equal(checkDraft(restored).ok, false);
  assert.deepEqual(draft, before);

  const repair = structuredClone(restored);
  repair.title = 'Repaired map'; repair.attribution = 'Local author'; repair.license = 'Test';
  repair.concepts.forEach((concept, index) => { concept.name = `Idea ${index + 1}`; });
  repair.questions.forEach((question, index) => { question.prerequisiteKeys = []; fillQuestion(question, String(index)); });
  assert.equal(checkDraft(repair).ok, true);
});

test('ready imported lessons retain public IDs, ordered content, answer identity and checked bytes', () => {
  const input = readyDraft();
  const secondConcept = addConcept(input); secondConcept.name = 'Reading a map';
  const second = addQuestion(input); second.conceptKey = secondConcept.key;
  second.prerequisiteKeys = [input.concepts[0].key];
  fillQuestion(second, 'two');
  const third = addOption(input, second.key); third.text = 'A third route'; second.answerKey = third.key;
  moveOption(input, second.key, third.key, -1);
  second.id = 'public/course/問題-2';
  const checked = checkDraft(input); assert.equal(checked.ok, true);
  const imported = draftFromDeck(JSON.parse(checked.json));
  const before = structuredClone(imported);
  const saved = serializeAuthorDraft(imported);
  const restored = parseAuthorDraft(saved);
  assert.deepEqual(meaning(restored), meaning(imported));
  assert.equal(checkDraft(restored).json, checked.json);
  assert.equal(serializeAuthorDraft(restored), saved);
  assert.deepEqual(imported, before);
});

test('canonical private keys recover near-limit counters without changing public IDs or live state', () => {
  const draft = readyDraft();
  const concept = `concept-${Number.MAX_SAFE_INTEGER - 1}`;
  draft.concepts[0].key = concept;
  draft.questions[0].conceptKey = concept;
  draft.questions[0].id = 'question-5';
  draft.nextKey = Number.MAX_SAFE_INTEGER;
  const before = structuredClone(draft);
  const restored = parseAuthorDraft(envelope(draft));
  assert.deepEqual(meaning(restored), meaning(draft));
  assert.equal(restored.nextKey, 5);
  const editable = structuredClone(restored);
  const added = addQuestion(editable);
  assert.notEqual(added.id, 'question-5');
  assert.ok(editable.nextKey < 20);
  assert.doesNotThrow(() => serializeAuthorDraft(editable));
  assert.deepEqual(draft, before);
});

test('staged drafts are deeply frozen and replacement copies remain editable', () => {
  const admitted = parseAuthorDraft(serializeAuthorDraft(readyDraft()));
  for (const object of [admitted, admitted.concepts, admitted.concepts[0], admitted.questions,
    admitted.questions[0], admitted.questions[0].options, admitted.questions[0].options[0], admitted.questions[0].prerequisiteKeys]) {
    assert.equal(Object.isFrozen(object), true);
  }
  assert.throws(() => { admitted.questions[0].options[0].text = 'Changed'; }, TypeError);
  const editable = structuredClone(admitted);
  editable.questions[0].options[0].text = 'Changed in the new editor';
  assert.notEqual(admitted.questions[0].options[0].text, editable.questions[0].options[0].text);
});

test('missing or ambiguous internal references, malformed shape and unsafe counters refuse before admission', () => {
  const mutations = [
    draft => { draft.nextKey = 1; },
    draft => { draft.nextKey = Number.MAX_SAFE_INTEGER + 1; },
    draft => { draft.questions[0].conceptKey = 'concept-999'; },
    draft => { draft.questions[0].prerequisiteKeys = ['concept-999']; },
    draft => { draft.questions[0].prerequisiteKeys = [draft.concepts[0].key, draft.concepts[0].key]; },
    draft => { draft.questions[0].answerKey = 'option-999'; },
    draft => { draft.questions[0].options[1].key = draft.questions[0].options[0].key; },
    draft => { draft.questions[0].key = 'question-0'; },
    draft => { draft.questions[0].options = []; },
    draft => { draft.questions[0].prompt = {}; },
    draft => { draft.questions[0].id = ''; },
    draft => { draft.title = 'x'.repeat(161); },
    draft => { delete draft.questions[0].answerKey; },
    draft => { addQuestion(draft).id = draft.questions[0].id; },
    draft => { draft.concepts = null; },
  ];
  for (const mutate of mutations) {
    const draft = readyDraft(); mutate(draft);
    const before = structuredClone(draft);
    assert.throws(() => parseAuthorDraft(envelope(draft)));
    assert.throws(() => serializeAuthorDraft(draft));
    assert.deepEqual(draft, before);
  }
  for (const source of ['null', '[]', '{', envelope(readyDraft(), 'recallweave-author-draft/2')]) {
    assert.throws(() => parseAuthorDraft(source));
  }
});

test('only recognized editor fields cross the draft boundary', () => {
  const draft = readyDraft();
  draft.model = { execute: 'untrusted extra data' };
  draft.questions[0].extra = { text: 'not editor content' };
  Object.defineProperty(draft, '__proto__', { value: { polluted: true }, enumerable: true });
  const restored = parseAuthorDraft(envelope(draft));
  assert.equal(Object.hasOwn(restored, 'model'), false);
  assert.equal(Object.hasOwn(restored, '__proto__'), false);
  assert.equal(Object.hasOwn(restored.questions[0], 'extra'), false);
  assert.equal({}.polluted, undefined);
  draft.model.toJSON = () => { throw new Error('An ignored field must not be serialized.'); };
  assert.doesNotThrow(() => serializeAuthorDraft(draft));
});

test('a lesson larger than its admission limit can be saved as a draft and repaired later', () => {
  const draft = readyDraft();
  while (draft.questions.length < 32) addQuestion(draft);
  draft.questions.forEach((question, index) => {
    fillQuestion(question, String(index));
    question.prompt = 'p'.repeat(2000);
    question.explanation = 'e'.repeat(4000);
    question.transfer = 't'.repeat(2000);
    question.options[0].text = 'a'.repeat(1000);
    question.options[1].text = 'b'.repeat(1000);
  });
  assert.equal(checkDraft(draft).ok, false);
  const saved = serializeAuthorDraft(draft);
  assert.ok(new TextEncoder().encode(saved).length > 262144);
  const restored = structuredClone(parseAuthorDraft(saved));
  assert.deepEqual(meaning(restored), meaning(draft));
  restored.questions.forEach((question, index) => { fillQuestion(question, String(index)); });
  assert.equal(checkDraft(restored).ok, true);
});

test('draft size limits count actual UTF-8 bytes and failed saving leaves writing intact', () => {
  const multibyte = 'é'.repeat(MAX_DRAFT_BYTES / 2 + 1);
  assert.ok(multibyte.length < MAX_DRAFT_BYTES);
  assert.throws(() => parseAuthorDraft(multibyte), /2 MiB/);
  const draft = readyDraft();
  while (draft.questions.length < 100) addQuestion(draft);
  draft.questions.forEach(question => {
    while (question.options.length < 6) addOption(draft, question.key);
    question.prompt = '界'.repeat(2000);
    question.explanation = '界'.repeat(4000);
    question.transfer = '界'.repeat(2000);
    question.options.forEach(option => { option.text = '界'.repeat(1000); });
  });
  const before = structuredClone(draft);
  assert.throws(() => serializeAuthorDraft(draft), /2 MiB/);
  assert.deepEqual(draft, before);
});
