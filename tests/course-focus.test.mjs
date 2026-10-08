import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planCourseFocus, createFocusedLesson } from '../src/course-focus.mjs';
import { MAX_DECK_BYTES, parseDeck, validateDeck } from '../src/deck.mjs';

function question(id, concept, prerequisites = []) {
  return { id, concept, prerequisites, prompt: `Question ${id}: <literal>\n“why?”`,
    options: ['first', 'second', 'correct', 'fourth', 'fifth', 'sixth'], answer: 2,
    explanation: `Explanation ${id}`, transfer: `Transfer ${id}` };
}
function branchingDeck() {
  return { title: 'Source lesson', attribution: 'Original author\nSource <text>', license: 'Permission unchanged',
    concepts: ['Application', 'Independent', 'Bridge', 'Basics', 'Other bridge'],
    items: [question('application-a', 'Application', ['Bridge']), question('independent', 'Independent'),
      question('basics', 'Basics'), question('application-b', 'Application', ['Other bridge']),
      question('bridge', 'Bridge', ['Basics']), question('other-bridge', 'Other bridge', ['Basics'])] };
}

test('all questions and both prerequisite branches survive a focused lesson', () => {
  const source = branchingDeck();
  const before = structuredClone(source);
  const result = createFocusedLesson(source, ['Application'], 'Only the connected topic');
  assert.deepEqual(result.requested, ['Application']);
  assert.deepEqual(result.required, ['Bridge', 'Basics', 'Other bridge']);
  assert.deepEqual(result.concepts, ['Application', 'Bridge', 'Basics', 'Other bridge']);
  assert.deepEqual(result.items.map(item => item.id), ['application-a', 'basics', 'application-b', 'bridge', 'other-bridge']);
  assert.deepEqual(result.inclusions.find(row => row.concept === 'Basics').requiredBy, ['Bridge', 'Other bridge']);
  assert.equal(result.inclusions[0].questionCount, 2);
  assert.deepEqual(result.deck.items, validateDeck(source).items.filter(item => item.concept !== 'Independent'));
  assert.equal(result.deck.attribution, source.attribution);
  assert.equal(result.deck.license, source.license);
  assert.equal(result.deck.title, 'Only the connected topic');
  assert.deepEqual(parseDeck(result.json), result.deck);
  assert.equal(Buffer.byteLength(result.json), result.bytes);
  assert.deepEqual(source, before);
});

test('requested concepts remain explicit when they are also a prerequisite', () => {
  const source = branchingDeck();
  const result = planCourseFocus(source, ['Basics', 'Application']);
  assert.deepEqual(result.requested, ['Application', 'Basics']);
  assert.deepEqual(result.required, ['Bridge', 'Other bridge']);
  const basics = result.inclusions.find(row => row.concept === 'Basics');
  assert.equal(basics.requested, true);
  assert.deepEqual(basics.requiredBy, ['Bridge', 'Other bridge']);
  assert.deepEqual(result, planCourseFocus(source, ['Application', 'Basics']));
});

test('clearing or changing targets never retains an earlier closure', () => {
  const source = branchingDeck();
  planCourseFocus(source, ['Application']);
  const empty = planCourseFocus(source, []);
  assert.deepEqual(empty, { requested: [], required: [], concepts: [], items: [], inclusions: [] });
  assert.throws(() => createFocusedLesson(source, [], 'Empty'), /at least one/);
  const independent = createFocusedLesson(source, ['Independent'], 'A different topic');
  assert.deepEqual(independent.concepts, ['Independent']);
  assert.deepEqual(independent.items.map(item => item.id), ['independent']);
});

test('literal names, answer identities and immutable copied results', () => {
  const source = { title: 'Literal source', attribution: 'Author', license: 'Permission',
    concepts: ['__proto__', '<b>topic</b>', 'constructor'],
    items: [question('id-1', '__proto__'), question('id-2', '<b>topic</b>', ['__proto__']),
      question('id-3', 'constructor', ['<b>topic</b>'])] };
  const result = createFocusedLesson(source, ['constructor'], '引用 “title”\n<script>literal</script>');
  for (const value of [result, result.deck, result.deck.items, result.items[0], result.items[0].options,
    result.inclusions, result.inclusions[0], result.inclusions[0].requiredBy]) assert.ok(Object.isFrozen(value));
  source.items[0].options[2] = 'Changed after selection';
  source.items[0].prerequisites.push('constructor');
  assert.equal(result.items[0].options[result.items[0].answer], 'correct');
  assert.deepEqual(result.items[0].prerequisites, []);
  assert.equal(result.deck.title, '引用 “title”\n<script>literal</script>');
  assert.deepEqual(parseDeck(result.json), result.deck);
});

test('invalid source, selection and title are refused before producing a lesson', () => {
  const source = branchingDeck();
  for (const targets of [null, 'Application', new Set(['Application']), ['missing'], ['Basics', 'Basics'], [null]]) {
    assert.throws(() => createFocusedLesson(source, targets, 'Title'));
  }
  for (const title of ['', '  ', null, 'x'.repeat(161)]) assert.throws(() => createFocusedLesson(source, ['Basics'], title), /title/);
  const cyclic = branchingDeck(); cyclic.items[2].prerequisites = ['Application'];
  assert.throws(() => planCourseFocus(cyclic, ['Independent']), /cycle/);
  const uncovered = branchingDeck(); uncovered.concepts.push('Uncovered');
  assert.throws(() => createFocusedLesson(uncovered, ['Independent'], 'Title'), /Every concept/);
});

test('real supplied courses retain all content when all concepts are chosen', () => {
  for (const path of ['data/deck.json', 'courses/dependency-graphs.json', 'courses/reading-data-and-evidence.json']) {
    const source = parseDeck(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
    const result = createFocusedLesson(source, [...source.concepts].reverse(), source.title);
    assert.deepEqual(result.deck, source);
    assert.deepEqual(result.required, []);
    assert.equal(createFocusedLesson(source, source.concepts, source.title).json, result.json);
  }
});

test('compact output fits the real file limit and an oversized result is refused', () => {
  const source = { title: 'T', attribution: 'A', license: 'L', concepts: ['Topic'], items: [] };
  for (let n = 0; n < 30; n++) {
    const item = question('item-' + n, 'Topic');
    item.prompt = 'é'.repeat(1000);
    item.explanation = 'x'.repeat(4000);
    item.transfer = 'y'.repeat(1000);
    source.items.push(item);
  }
  const candidate = validateDeck(source);
  const compact = JSON.stringify(candidate);
  assert.ok(Buffer.byteLength(compact) < MAX_DECK_BYTES);
  const remaining = MAX_DECK_BYTES - Buffer.byteLength(compact);
  // Fill individual legal fields to reach the exact UTF-8 cap without changing structure.
  let rest = remaining;
  for (const item of source.items) {
    for (const field of ['transfer', 'prompt']) {
      const count = Math.min(2000 - item[field].length, rest);
      item[field] += 'z'.repeat(count); rest -= count;
    }
  }
  assert.equal(rest, 0);
  const exactInput = JSON.stringify(validateDeck(source));
  assert.equal(Buffer.byteLength(exactInput), MAX_DECK_BYTES);
  const admitted = parseDeck(exactInput);
  const result = createFocusedLesson(admitted, ['Topic'], 'T');
  assert.equal(result.json, exactInput);
  assert.equal(result.bytes, MAX_DECK_BYTES);
  assert.throws(() => createFocusedLesson(admitted, ['Topic'], 'TT'), /256 KiB/);
  assert.equal(admitted.title, 'T');
});
