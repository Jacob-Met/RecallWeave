import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectCoursePrerequisites } from '../src/course-prerequisites.mjs';
import { MAX_DECK_BYTES } from '../src/deck.mjs';

const item = (id, concept, prerequisites = []) => ({
  id, concept, prerequisites, prompt: 'Prompt ' + id,
  options: ['zero', 'one'], answer: 1, explanation: 'Because.', transfer: 'Try it.'
});
const deck = (concepts, items) => ({
  title: 'Literal course', attribution: 'Author Ω', license: 'Original',
  concepts, items
});
const encode = value => JSON.stringify(value);
const example = () => deck(['Intro', 'A', 'B', 'Merge', 'Else'], [
  item('merge-first', 'Merge', ['B']),
  item('else', 'Else'), item('a', 'A', ['Intro']), item('intro', 'Intro'),
  item('b', 'B', ['A']), item('merge-second', 'Merge', ['Intro', 'A']),
  item('merge-third', 'Merge', ['B'])
]);

test('later questions contribute distinct direct-link witnesses in original order', () => {
  const result = inspectCoursePrerequisites(encode(example()), 3);
  assert.deepEqual(result.concepts.map(c => c.level), [0, 1, 2, 3, 0]);
  assert.deepEqual(result.concepts[3].questionIndices, [0, 5, 6]);
  assert.deepEqual(result.concepts[3].directPrerequisites, [0, 1, 2]);
  assert.deepEqual(result.concepts[3].required, [0, 1, 2]);
  assert.deepEqual(result.links.filter(e => e.conceptIndex === 3), [
    { prerequisiteIndex: 0, conceptIndex: 3, questionIndices: [5] },
    { prerequisiteIndex: 1, conceptIndex: 3, questionIndices: [5] },
    { prerequisiteIndex: 2, conceptIndex: 3, questionIndices: [0, 6] }
  ]);
  assert.deepEqual(result.questions[5].prerequisiteIndices, [0, 1]);
  assert.deepEqual(result.selection.requirementPaths, [
    { index: 0, path: [3, 0] }, { index: 1, path: [3, 1] }, { index: 2, path: [3, 2] }
  ]);
});

test('reverse relationships include transitive dependents but exclude unrelated concepts', () => {
  const result = inspectCoursePrerequisites(encode(example()), 0);
  assert.deepEqual(result.concepts[0].directDependents, [1, 3]);
  assert.deepEqual(result.concepts[0].downstream, [1, 2, 3]);
  assert.deepEqual(result.selection.dependentPaths, [
    { index: 1, path: [1, 0] }, { index: 2, path: [2, 1, 0] }, { index: 3, path: [3, 0] }
  ]);
  assert.deepEqual(result.selection.requirementPaths, []);
});

test('diamond paths are shortest and source-order deterministic despite authored link order', () => {
  const input = deck(['Root', 'Left', 'Right', 'End'], [
    item('r', 'Root'), item('l', 'Left', ['Root']), item('q', 'Right', ['Root']),
    item('e', 'End', ['Right', 'Left'])
  ]);
  const result = inspectCoursePrerequisites(encode(input), 3);
  assert.deepEqual(result.selection.requirementPaths[0], { index: 0, path: [3, 1, 0] });
  assert.deepEqual(result.questions[3].prerequisiteIndices, [2, 1]);
  assert.deepEqual(result.concepts[3].directPrerequisites, [1, 2]);
});

test('literal whitespace, prototype names, Unicode and HTML-like text remain exact', () => {
  const names = ['Shared topic', 'Shared\ttopic', '__proto__', '<script>🙂</script>'];
  const input = deck(names, names.map((name, i) => item(' id ' + i, name, i ? [names[i - 1]] : [])));
  input.items[2].prompt = '  A\rB\r\nC\n🙂\t <b>literal</b>  ';
  const result = inspectCoursePrerequisites(encode(input), 3);
  assert.deepEqual(result.concepts.map(c => c.name), names);
  assert.equal(result.questions[2].prompt, input.items[2].prompt);
  assert.equal(result.questions[0].id, ' id 0');
  assert.deepEqual(result.selection.requirementPaths[0].path, [3, 2, 1, 0]);
});

test('one concept and no links produce a complete empty relationship view', () => {
  const result = inspectCoursePrerequisites(encode(deck(['Only'], [item('q', 'Only')])));
  assert.equal(result.concepts[0].level, 0);
  for (const key of ['directPrerequisites', 'directDependents', 'required', 'downstream']) {
    assert.deepEqual(result.concepts[0][key], []);
  }
  assert.deepEqual(result.links, []);
  assert.deepEqual(result.selection, { index: 0, requirementPaths: [], dependentPaths: [] });
});

test('maximum chain retains all 32 identities and structural depth31', () => {
  const names = Array.from({ length: 32 }, (_, i) => 'Concept ' + i);
  const input = deck(names, names.map((name, i) => item('q' + i, name, i ? [names[i - 1]] : [])));
  const result = inspectCoursePrerequisites(encode(input), 31);
  assert.equal(result.concepts[31].level, 31);
  assert.equal(result.concepts[31].required.length, 31);
  assert.deepEqual(result.selection.requirementPaths[0].path, Array.from({ length: 32 }, (_, i) => 31 - i));
});

test('admission retains the parser boundaries and strict concept selection', () => {
  const valid = encode(example());
  for (const value of [null, {}, [], 1, '\ufeff' + valid, valid + 'x']) {
    assert.throws(() => inspectCoursePrerequisites(value));
  }
  for (const selected of [-1, 5, 0.5, '0', null, NaN, Infinity]) {
    assert.throws(() => inspectCoursePrerequisites(valid, selected));
  }
  for (const change of [
    d => d.items[3].prerequisites.push('Merge'),
    d => d.items[3].prerequisites.push('Intro'),
    d => d.items[3].prerequisites.push('Unknown'),
    d => d.concepts.push('Uncovered'),
    d => d.items[3].prerequisites.push('A', 'A')
  ]) { const d = example(); change(d); assert.throws(() => inspectCoursePrerequisites(encode(d))); }
});

test('exact source byte cap applies independently of optional discarded JSON fields', () => {
  const input = deck(['Only'], [item('q', 'Only')]);
  input.padding = '';
  const base = encode(input);
  input.padding = 'x'.repeat(MAX_DECK_BYTES - new TextEncoder().encode(base).length);
  const exact = encode(input);
  assert.equal(new TextEncoder().encode(exact).length, MAX_DECK_BYTES);
  assert.equal(inspectCoursePrerequisites(exact).concepts.length, 1);
  assert.throws(() => inspectCoursePrerequisites(exact + ' '));
});

test('report is deeply frozen, detached, repeatable and excludes answer-key fields', () => {
  const input = example(), text = encode(input);
  const result = inspectCoursePrerequisites(text, 3);
  const visit = value => {
    if (value && typeof value === 'object') {
      assert.ok(Object.isFrozen(value));
      Object.values(value).forEach(visit);
    }
  };
  visit(result);
  assert.throws(() => result.concepts[0].required.push(3), TypeError);
  assert.throws(() => { result.questions[0].prompt = 'changed'; }, TypeError);
  input.title = 'changed'; input.items[0].prerequisites.length = 0;
  assert.equal(result.course.title, 'Literal course');
  assert.deepEqual(result, inspectCoursePrerequisites(text, 3));
  for (const q of result.questions) {
    assert.deepEqual(Object.keys(q), ['index', 'id', 'conceptIndex', 'prompt', 'prerequisiteIndices']);
  }
});
