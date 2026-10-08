import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDeck, serializeDeck, MAX_DECK_BYTES } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from '../src/review.mjs';
import { createStudyNotes } from '../src/session-export.mjs';
import { parseForestInput, traceMinimumSpanningForest } from '../src/minimum-spanning-forest.mjs';

const raw = await readFile(new URL('../courses/minimum-spanning-forest.json', import.meta.url), 'utf8');
const deck = parseDeck(raw);
const correct = id => { const item = deck.items.find(item => item.id === id); assert.ok(item); return item.options[item.answer]; };

test('the original course uses the existing deck contract with complete balanced concept coverage', () => {
  assert.ok(Buffer.byteLength(raw) < MAX_DECK_BYTES);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.deepEqual(JSON.parse(serializeDeck(deck)), JSON.parse(raw));
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  for (const concept of deck.concepts) assert.equal(deck.items.filter(item => item.concept === concept).length, 3);
  assert.deepEqual([0, 1, 2, 3].map(answer => deck.items.filter(item => item.answer === answer).length), [3, 3, 3, 3]);
  assert.match(deck.license, /CC0-1.0/);
  assert.match(deck.attribution, /Original questions/);
});

test('the stated worked answers retain the numeric and graph-objective distinctions', () => {
  assert.equal(correct('msf-not-shortest'), 'Its tree route weighs 4, although the original graph has a direct route weighing 3.');
  const graph = parseForestInput('4', 'A B 4\nA C 1\nB C 2\nB D 5\nC D 3');
  const trace = traceMinimumSpanningForest(graph.vertexCount, graph.edges);
  assert.equal(trace.totalWeight, 6);
  assert.equal(correct('msf-weight-order'), 'A–C, B–C, C–D, A–B, B–D.');
  assert.equal(correct('msf-negative'), '−3, from A–B, B–C and C–D.');
  assert.equal(correct('msf-disconnected'), 'A minimum spanning forest with two components, three accepted edges and total 1.');
  assert.equal(correct('msf-count'), 'Three accepted edges and five decisions.');
  assert.match(correct('msf-cut-choice'), /minimum spanning forest/);
});

test('the actual learner imports every question and keeps practice separate from original answers', () => {
  for (const mode of ['all-correct', 'mixed']) {
    const mastery = initialMastery(deck.concepts), asked = new Set(), answers = [];
    while (asked.size < deck.items.length) {
      const question = selectNextItem(deck.items, asked, mastery);
      assert.ok(question);
      assert.ok(!asked.has(question.id));
      const passed = mode === 'all-correct' || asked.size % 2 === 0;
      const choice = passed ? question.answer : (question.answer + 1) % question.options.length;
      asked.add(question.id);
      answers.push({ item: question.id, choice });
      mastery[question.concept] = updateMastery(mastery[question.concept], passed);
    }
    assert.equal(selectNextItem(deck.items, asked, mastery), null);
    const review = createReview(deck.items, answers);
    const firstPass = JSON.stringify(review), estimate = JSON.stringify(mastery);
    let practice = beginPractice(review);
    while (currentPracticeItem(practice)) {
      const question = currentPracticeItem(practice);
      practice = answerPractice(practice, question.id, question.answer);
    }
    assert.equal(JSON.stringify(review), firstPass);
    assert.equal(JSON.stringify(mastery), estimate);
    assert.ok(practice.answers.every(answer => answer.correct));
    const notes = createStudyNotes({ deck, review, mastery, practice, exportedAt: '2026-10-08T17:00:00Z' });
    for (const question of deck.items) {
      assert.ok(notes.text.includes(question.prompt));
      assert.ok(notes.text.includes('Correct answer: ' + question.options[question.answer]));
      assert.ok(notes.text.includes(question.explanation));
      assert.ok(notes.text.includes(question.transfer));
    }
    assert.ok(notes.text.includes(deck.attribution));
    assert.ok(notes.text.includes(deck.license));
  }
});
