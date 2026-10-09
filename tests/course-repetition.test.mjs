import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectCourseRepetition } from '../src/course-repetition.mjs';
import { parseDeck } from '../src/deck.mjs';

const item = (id, fields = {}) => ({
  id, concept: 'Review', prerequisites: [], prompt: 'A distinct prompt: ' + id,
  options: ['Oak', 'Pine'], answer: 0, explanation: 'Review the literal choices.',
  transfer: 'Explain your choice.', ...fields
});
const deck = items => ({
  title: 'Repetition review', attribution: 'Original test cases', license: 'CC0-1.0',
  concepts: ['Review'], items
});
const inspect = items => inspectCourseRepetition(JSON.stringify(deck(items)));
const deeplyFrozen = value => {
  if (!value || typeof value !== 'object') return true;
  return Object.isFrozen(value) && Object.values(value).every(deeplyFrozen);
};

test('a checked course without repeated prompts has no review groups', () => {
  const result = inspect([item('a'), item('b'), item('c')]);
  assert.deepEqual(result, {
    format: 'recallweave-course-repetition/1',
    course: { title: 'Repetition review', attribution: 'Original test cases', license: 'CC0-1.0' },
    summary: {
      questionCount: 3, repeatedPromptGroups: 0, repeatedQuestionCount: 0,
      equivalentChoiceGroups: 0, answerDisagreementGroups: 0
    },
    prompts: []
  });
  assert.equal(deeplyFrozen(result), true);
});

test('the same index can disagree while a moved index can keep the selected text', () => {
  const input = [
    item('first', { prompt: 'Choose a tree.' }),
    item('moved', { prompt: 'Choose a tree.', options: ['Pine', 'Oak'], answer: 1 }),
    item('changed', { prompt: 'Choose a tree.', options: ['Pine', 'Oak'], answer: 0 })
  ];
  const result = inspect(input);
  assert.deepEqual(result.summary, {
    questionCount: 3, repeatedPromptGroups: 1, repeatedQuestionCount: 3,
    equivalentChoiceGroups: 1, answerDisagreementGroups: 1
  });
  assert.deepEqual(result.prompts, [{
    prompt: 'Choose a tree.',
    members: input.map((entry, index) => ({ index, item: entry })),
    choiceGroups: [{
      options: ['Oak', 'Pine'], questionIds: ['first', 'moved', 'changed'],
      authoredAnswers: [
        { text: 'Oak', questionIds: ['first', 'moved'] },
        { text: 'Pine', questionIds: ['changed'] }
      ],
      answerDisagreement: true
    }]
  }]);
});

test('interleaved groups retain source order and singleton choice sets stay ungrouped', () => {
  const input = [
    item('p0', { prompt: 'P' }),
    item('q0', { prompt: 'Q', options: ['Q1', 'Q2'] }),
    item('p-single', { prompt: 'P', options: ['Only', 'This'] }),
    item('q1', { prompt: 'Q', options: ['Different', 'Set'] }),
    item('p1', { prompt: 'P', options: ['Pine', 'Oak'], answer: 1 }),
    item('p-other0', { prompt: 'P', options: ['Maple', 'Elm'] }),
    item('p-other1', { prompt: 'P', options: ['Elm', 'Maple'], answer: 1 }),
    item('unique')
  ];
  const result = inspect(input);
  assert.deepEqual(result.summary, {
    questionCount: 8, repeatedPromptGroups: 2, repeatedQuestionCount: 7,
    equivalentChoiceGroups: 2, answerDisagreementGroups: 0
  });
  assert.deepEqual(result.prompts.map(group => [group.prompt, group.members.map(member => member.index)]),
    [['P', [0, 2, 4, 5, 6]], ['Q', [1, 3]]]);
  assert.deepEqual(result.prompts[0].choiceGroups, [
    { options: ['Oak', 'Pine'], questionIds: ['p0', 'p1'],
      authoredAnswers: [{ text: 'Oak', questionIds: ['p0', 'p1'] }], answerDisagreement: false },
    { options: ['Maple', 'Elm'], questionIds: ['p-other0', 'p-other1'],
      authoredAnswers: [{ text: 'Maple', questionIds: ['p-other0', 'p-other1'] }], answerDisagreement: false }
  ]);
  assert.deepEqual(result.prompts[1].choiceGroups, []);
});

test('literal Unicode, whitespace, reserved names and delimiter strings remain distinct', () => {
  const input = [
    item('__proto__', { prompt: '__proto__', options: ['a', 'b\u0000c'] }),
    item('constructor', { prompt: '__proto__', options: ['a\u0000b', 'c'] }),
    item('third', { prompt: '__proto__', options: ['b\u0000c', 'a'], answer: 1 }),
    item('accent0', { prompt: 'Café' }),
    item('accent1', { prompt: 'Cafe\u0301' }),
    item('space0', { prompt: 'Same' }),
    item('space1', { prompt: 'Same ' }),
    item('case0', { prompt: 'same' }),
    item('accent2', { prompt: 'Café' })
  ];
  const result = inspect(input);
  assert.deepEqual(result.prompts.map(group => group.prompt), ['__proto__', 'Café']);
  assert.deepEqual(result.prompts[0].choiceGroups, [{
    options: ['a', 'b\u0000c'], questionIds: ['__proto__', 'third'],
    authoredAnswers: [{ text: 'a', questionIds: ['__proto__', 'third'] }],
    answerDisagreement: false
  }]);
  assert.deepEqual(result.prompts[1].choiceGroups[0].questionIds, ['accent0', 'accent2']);
  assert.equal(result.summary.repeatedQuestionCount, 5);
  assert.equal(result.summary.answerDisagreementGroups, 0);
});

test('complete admitted context is preserved and ignored fields cannot affect review', () => {
  const a = item('a', { prompt: 'Shared', ignored: { note: 'Not admitted content' } });
  const b = item('b', {
    prompt: 'Shared', concept: 'Advanced', prerequisites: ['Review'],
    explanation: 'A different context.', transfer: 'Compare that context.'
  });
  const input = { ...deck([a, b]), concepts: ['Review', 'Advanced'], unknown: 'ignored' };
  const text = JSON.stringify(input);
  const result = inspectCourseRepetition(text);
  const admitted = parseDeck(text);
  assert.deepEqual(result.prompts[0].members, [
    { index: 0, item: admitted.items[0] }, { index: 1, item: admitted.items[1] }
  ]);
  assert.equal(Object.hasOwn(result.prompts[0].members[0].item, 'ignored'), false);
  assert.deepEqual(result.prompts[0].members[1].item.prerequisites, ['Review']);
  assert.equal(result.prompts[0].choiceGroups[0].answerDisagreement, false);
  assert.equal(JSON.stringify(input), text);
  assert.equal(deeplyFrozen(result), true);
  assert.throws(() => result.prompts[0].members[0].item.options.push('Changed'), TypeError);
  assert.throws(() => result.prompts[0].choiceGroups[0].authoredAnswers[0].questionIds.push('Changed'), TypeError);
  assert.throws(() => { result.summary.questionCount = 99; }, TypeError);
  assert.deepEqual(inspectCourseRepetition(text), result);
});

test('every permutation of four choices preserves an identical selected text', () => {
  const choices = ['fir', 'oak', 'elm', 'pine'];
  const permutations = values => values.length
    ? values.flatMap((value, index) => permutations(values.filter((_, i) => i !== index))
      .map(rest => [value, ...rest]))
    : [[]];
  let received = 0;
  for (let answer = 0; answer < choices.length; answer++) {
    for (const moved of permutations(choices)) {
      const selected = choices[answer];
      const result = inspect([
        item('a', { prompt: 'Permutation', options: choices, answer }),
        item('b', { prompt: 'Permutation', options: moved, answer: moved.indexOf(selected) })
      ]);
      assert.deepEqual(result.prompts[0].choiceGroups, [{
        options: choices, questionIds: ['a', 'b'],
        authoredAnswers: [{ text: selected, questionIds: ['a', 'b'] }],
        answerDisagreement: false
      }]);
      received++;
    }
  }
  assert.equal(received, 96);
});

test('invalid input follows the unchanged parser without partial reports', () => {
  const invalid = [
    null, {}, '', '\ufeff' + JSON.stringify(deck([item('a')])), '{',
    JSON.stringify({ ...deck([item('a')]), format: 'unknown' }),
    JSON.stringify(deck([item('a'), item('a')])),
    JSON.stringify(deck([item('a', { options: ['same', 'same'] })])),
    JSON.stringify(deck([item('a', { prerequisites: ['Review'] })])),
    JSON.stringify(deck([item('a', { answer: 7 })])),
    JSON.stringify({ ...deck([item('a')]), concepts: ['Review', 'Uncovered'] }),
    ' '.repeat(262145)
  ];
  for (const text of invalid) {
    let original;
    try { parseDeck(text); assert.fail('Fixture must be rejected by the original parser'); }
    catch (error) { original = error; }
    assert.throws(() => inspectCourseRepetition(text), error =>
      error.constructor === original.constructor && error.message === original.message);
  }
});
