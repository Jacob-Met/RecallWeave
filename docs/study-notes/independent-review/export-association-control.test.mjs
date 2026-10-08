/** Independent receiving: associate answers with their own question and pass. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createReview, beginPractice, answerPractice} from './source/src/review.mjs';
import {createStudyNotes} from './source/src/session-export.mjs';

test('varied answer positions and retries retain each question’s original choice', () => {
  const makeItem = (id, answer) => ({
    id, concept: 'energy', prompt: `Question ${id} → 光`,
    options: [0, 1, 2, 3].map(n => `${id}: answer ${n}`), answer,
    explanation: `Explain ${id}`, transfer: `Transfer ${id}`
  });
  const deck = {title: 'Association contract', concepts: ['energy'],
    items: [makeItem('a', 0), makeItem('b', 2), makeItem('c', 3)],
    attribution: 'Synthetic receiving fixture', license: 'Synthetic data'};
  const firstAnswers = [
    {item: 'c', choice: 1}, {item: 'b', choice: 2}, {item: 'a', choice: 3}
  ];
  const review = createReview(deck.items, firstAnswers);
  const mastery = {energy: 0.425};
  let practice = beginPractice(review);
  practice = answerPractice(practice, 'c', 3);
  practice = answerPractice(practice, 'a', 1);
  const before = JSON.stringify({deck, firstAnswers, review, mastery, practice});
  const notes = createStudyNotes({deck, review, mastery, practice,
    exportedAt: '2026-10-08T23:59:59.999Z', conceptLabel: () => 'Energy transfer'});
  const blocks = notes.text.split(/\n\n(?=\d+\. Question )/).slice(1);
  assert.equal(blocks.length, 3);
  for (const [position, item] of review.entries()) {
    const block = blocks[position];
    const lines = block.split('\n');
    assert.ok(block.startsWith(`${position + 1}. ${item.prompt}\n`));
    assert.ok(lines.includes(`Your first answer: ${item.options[item.choice]}`));
    assert.ok(lines.includes(`Correct answer: ${item.options[item.answer]}`));
    assert.ok(lines.includes(`Explanation: ${item.explanation}`));
    assert.ok(lines.includes(`Apply the idea: ${item.transfer}`));
    const retry = practice.answers.find(answer => answer.item === item.id);
    if (retry) assert.ok(lines.includes(`Practice answer: ${item.options[retry.choice]}`));
    else assert.doesNotMatch(block, /Practice answer:/);
  }
  assert.match(notes.text, /1 of 3 connections correct on the first try\./);
  assert.match(notes.text, /Complete: 2 of 2 practice answers recorded; 1 correct on retry\./);
  assert.match(notes.text, /Energy transfer: 43%/);
  assert.match(notes.text, /MODEL STATE, NOT A GRADE/);
  assert.equal(JSON.stringify({deck, firstAnswers, review, mastery, practice}), before);
});
