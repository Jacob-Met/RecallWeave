import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraft, addConcept, addQuestion, removeConcept, removeQuestion,
  restoreQuestion, setQuestionConcept } from '../src/deck-author.mjs';

function scenario() {
  const draft = createDraft();
  Object.assign(draft, { title: 'Draft to continue', attribution: 'Original local writing', license: 'Author permission' });
  const topic = draft.concepts[0]; topic.name = 'Topic removed later';
  const prerequisite = addConcept(draft); prerequisite.name = 'Earlier idea removed later';
  const retained = addConcept(draft); retained.name = 'An idea still in the draft';
  const original = draft.questions[0];
  Object.assign(original, { prompt: 'Which observation matters?\nKeep the exact words.',
    explanation: 'The written explanation is retained.', transfer: 'Apply <this> idea “elsewhere”.',
    prerequisiteKeys: [prerequisite.key, retained.key], answerKey: original.options[1].key });
  original.options[0].text = 'An unrelated detail'; original.options[1].text = 'The recorded observation';
  const other = addQuestion(draft); setQuestionConcept(draft, other.key, retained.key);
  other.prompt = 'Another question edited after removal';
  return { draft, topic, prerequisite, retained, original, other };
}

test('undo restores all writing while clearing only references to deliberately removed concepts', () => {
  const { draft, topic, prerequisite, retained, original, other } = scenario();
  const before = structuredClone(original);
  const removal = removeQuestion(draft, original.key);
  removeConcept(draft, topic.key);
  removeConcept(draft, prerequisite.key);
  other.prompt = 'A later edit must survive undo';
  const restored = restoreQuestion(draft, removal);
  assert.equal(restored.conceptKey, null, 'a deleted taught concept must become an explicit unselected field');
  assert.deepEqual(restored.prerequisiteKeys, [retained.key], 'only missing prerequisite links are removed');
  assert.deepEqual({ ...restored, conceptKey: before.conceptKey, prerequisiteKeys: before.prerequisiteKeys }, before);
  assert.equal(draft.questions[0], restored);
  assert.equal(other.prompt, 'A later edit must survive undo');
  assert.deepEqual(draft.concepts.map(concept => concept.key), [retained.key], 'undo must not recreate deleted concepts');
  const known = new Set(draft.concepts.map(concept => concept.key));
  for (const item of draft.questions) {
    assert.ok(item.conceptKey === null || known.has(item.conceptKey));
    assert.ok(item.prerequisiteKeys.every(key => known.has(key)));
  }
});

test('undo retains known selections and even unfinished self links while removing a missing prerequisite', () => {
  const { draft, topic, prerequisite, retained, original } = scenario();
  original.prerequisiteKeys = [topic.key, prerequisite.key, retained.key];
  const before = structuredClone(original);
  const removal = removeQuestion(draft, original.key);
  removeConcept(draft, prerequisite.key);
  const restored = restoreQuestion(draft, removal);
  assert.equal(restored.conceptKey, topic.key);
  assert.deepEqual(restored.prerequisiteKeys, [topic.key, retained.key]);
  assert.deepEqual({ ...restored, prerequisiteKeys: before.prerequisiteKeys }, before);
});
