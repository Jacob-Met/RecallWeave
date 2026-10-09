import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDeck, serializeDeck, MAX_DECK_BYTES } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from '../src/review.mjs';
import { createReflections, updateReflection, updateApplicationReflection } from '../src/reflections.mjs';
import { createStudyNotes } from '../src/session-export.mjs';

const raw = await readFile(new URL('../courses/logical-clocks.json', import.meta.url), 'utf8');
const guide = await readFile(new URL('../courses/logical-clocks.md', import.meta.url), 'utf8');
const deck = parseDeck(raw);
const item = id => {
  const result = deck.items.find(question => question.id === id);
  assert.ok(result, id);
  return result;
};
const answer = id => { const question = item(id); return question.options[question.answer]; };
const vectorText = vector => '[' + vector.join(', ') + ']';

test('logical clocks is a complete existing-format deck with four connected concepts', () => {
  assert.ok(Buffer.byteLength(raw, 'utf8') < MAX_DECK_BYTES);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.deepEqual(JSON.parse(serializeDeck(deck)), JSON.parse(raw));
  assert.deepEqual(deck.concepts, ['causal-order', 'lamport-clocks', 'vector-clocks', 'reading-concurrency']);
  assert.equal(deck.items.length, 16);
  for (const concept of deck.concepts) {
    assert.equal(deck.items.filter(question => question.concept === concept).length, 4);
  }
  assert.deepEqual([0, 1, 2, 3].map(value => deck.items.filter(question => question.answer === value).length), [4, 4, 4, 4]);
  assert.match(deck.attribution, /Original questions/);
  assert.match(deck.attribution, /lamport\.azurewebsites\.net\/pubs\/time-clocks\.pdf/);
  assert.match(deck.attribution, /vs\.inf\.ethz\.ch\/publ\/papers\/VirtTimeGlobStates\.pdf/);
  assert.match(deck.license, /CC BY 4\.0/);
  for (const question of deck.items) assert.ok(guide.includes(question.id), question.id);
});

test('the selected calculation answers follow the stated increment and merge rules', () => {
  const tick = counter => counter + 1;
  const receive = (counter, message) => Math.max(counter, message) + 1;
  assert.equal(answer('lc-lamport-send'), String(tick(tick(tick(0)))));
  assert.equal(answer('lc-lamport-receive-low'), String(receive(7, 3)));
  const first = receive(2, 8);
  assert.equal(answer('lc-lamport-receive-high'), first + ', then ' + tick(first));
  const sendVector = [0, 0, 0];
  sendVector[1]++;
  sendVector[1]++;
  assert.equal(answer('lc-vector-send'), vectorText(sendVector));
  const merged = [2, 0, 4].map((value, index) => Math.max(value, [1, 3, 2][index]));
  merged[2]++;
  assert.equal(answer('lc-vector-receive'), vectorText(merged));
});

test('the authored distinctions retain partial order, strict vector comparison and their limits', () => {
  const edges = [['A1', 'A2'], ['A2', 'A3'], ['B1', 'B2'], ['B2', 'B3'], ['A2', 'B2']];
  const reaches = (from, target, seen = new Set()) => {
    if (seen.has(from)) return false;
    seen.add(from);
    return edges.filter(([left]) => left === from)
      .some(([, right]) => right === target || reaches(right, target, seen));
  };
  assert.equal(reaches('A3', 'B3'), false);
  assert.equal(reaches('B3', 'A3'), false);
  assert.equal(answer('lc-causal-fork'), 'They are concurrent: neither has a directed path to the other.');
  assert.equal(answer('lc-causal-send'), 'S happens before R.');
  assert.equal(answer('lc-causal-chain'), 'A1 happens before C2.');
  assert.equal(answer('lc-causal-wall-time'), 'Neither a causal relation nor which event physically occurred first.');

  const less = (left, right) => left.every((value, index) => value <= right[index])
    && left.some((value, index) => value < right[index]);
  assert.equal(less([2, 1, 0], [2, 3, 1]), true);
  assert.equal(less([2, 1, 0], [2, 1, 0]), false);
  assert.equal(less([3, 1, 0], [2, 2, 0]), false);
  assert.equal(less([2, 2, 0], [3, 1, 0]), false);
  assert.equal(less([3, 0, 0], [2, 3, 3]), false);
  assert.equal(less([2, 3, 3], [3, 0, 0]), false);
  assert.equal(less([2, 3, 0], [2, 3, 2]), true);
  assert.equal(answer('lc-vector-strict-order'), 'The first event causally precedes the second.');
  assert.equal(answer('lc-vector-incomparable'), 'The events are concurrent: each vector exceeds the other in a different component.');
  assert.equal(answer('lc-lamport-one-way'), 'b cannot causally precede a; a may precede b or be concurrent with b.');
  assert.equal(answer('lc-reading-scalar-trap'), 'A3 and C3 are concurrent; the scalar inequality does not prove causality.');
  assert.equal(answer('lc-reading-equal-components'), 'B3 causally precedes C2; equality in A and B does not prevent strict vector order.');
  assert.equal(answer('lc-reading-tie-break'), 'The tie-break chooses an order for these concurrent events; it creates no causal edge.');
  assert.equal(answer('lc-reading-conflict-policy'), 'The edits are concurrent; a content or conflict-resolution policy must still decide how to handle them.');
  assert.match(guide, /Order unknown from the evidence/);
  assert.match(guide, /not a validated assessment/);
});

test('the unchanged learner completes all sixteen questions and preserves the first session through practice and notes', () => {
  const mastery = initialMastery(deck.concepts);
  const asked = new Set(), answers = [];
  const missedId = 'lc-reading-scalar-trap';
  while (asked.size < deck.items.length) {
    const question = selectNextItem(deck.items, asked, mastery);
    assert.ok(question);
    assert.equal(asked.has(question.id), false);
    asked.add(question.id);
    const choice = question.id === missedId ? 0 : question.answer;
    const correct = choice === question.answer;
    answers.push({ item: question.id, choice, correct });
    mastery[question.concept] = updateMastery(mastery[question.concept], correct);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  assert.equal(new Set(answers.map(value => value.item)).size, 16);
  const review = createReview(deck.items, answers);
  assert.equal(review.filter(value => value.correct).length, 15);
  assert.equal(review.find(value => !value.correct).id, missedId);
  const firstSession = JSON.stringify(review), firstMastery = JSON.stringify(mastery);
  let reflections = createReflections(deck.items);
  const reflection = 'A3 is absent from the message sent at A2.\nA smaller scalar alone does not prove a causal path.';
  reflections = updateReflection(reflections, missedId, reflection);
  const application = 'Two concurrent edits need a separate content policy even after their vectors are compared.';
  reflections = updateApplicationReflection(reflections, application);
  let practice = beginPractice(review);
  assert.deepEqual(practice.items.map(value => value.id), [missedId]);
  assert.equal(currentPracticeItem(practice).id, missedId);
  practice = answerPractice(practice, missedId, item(missedId).answer);
  assert.equal(currentPracticeItem(practice), null);
  assert.equal(practice.answers[0].correct, true);
  assert.equal(JSON.stringify(review), firstSession);
  assert.equal(JSON.stringify(mastery), firstMastery);
  const applicationPrompt = 'Choose one connection from this deck and explain how it relates to another idea in your own words.';
  const notes = createStudyNotes({ deck, review, mastery, practice, reflections, applicationPrompt, exportedAt: '2026-10-09T07:40:00Z' });
  assert.ok(notes.text.includes('15 of 16 connections correct on the first try.'));
  assert.ok(notes.text.includes('Complete: 1 of 1 practice answers recorded; 1 correct on retry.'));
  assert.ok(notes.text.includes('Your first answer: ' + item(missedId).options[0]));
  assert.ok(notes.text.includes('Practice answer: ' + answer(missedId)));
  assert.ok(notes.text.includes('Prompt: ' + applicationPrompt));
  for (const line of reflection.split('\n')) assert.ok(notes.text.includes('  > ' + line));
  assert.ok(notes.text.includes('  > ' + application));
  for (const question of deck.items) {
    for (const text of [question.prompt, question.options[question.answer], question.explanation, question.transfer]) {
      assert.ok(notes.text.includes(text), question.id);
    }
  }
  assert.ok(notes.text.includes(deck.attribution));
  assert.ok(notes.text.includes(deck.license));
  assert.equal(JSON.stringify(review), firstSession);
  assert.equal(JSON.stringify(mastery), firstMastery);
});
