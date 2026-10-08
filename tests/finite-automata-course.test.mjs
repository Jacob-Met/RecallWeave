import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseDeck, serializeDeck} from '../src/deck.mjs';
import {initialMastery, selectNextItem, updateMastery} from '../src/knowledge.mjs';
import {createReview} from '../src/review.mjs';
import {getPreset, traceWord, compareMachines} from '../src/finite-automata.mjs';
import {buildFiniteAutomata} from '../tools/build-finite-automata.mjs';

const bytes = await readFile(new URL('../courses/finite-automata.json', import.meta.url), 'utf8');
const deck = parseDeck(bytes);

test('the original course satisfies the existing importer contract and balances four concept layers', () => {
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.deepEqual(deck.concepts.map(concept => deck.items.filter(item => item.concept === concept).length), [3, 3, 3, 3]);
  assert.deepEqual([0, 1, 2, 3].map(answer => deck.items.filter(item => item.answer === answer).length), [3, 3, 3, 3]);
  assert.equal(serializeDeck(deck), bytes);
  assert.match(deck.attribution, /Original questions/);
  for (const item of deck.items) {
    assert.equal(item.options.length, 4);
    assert.ok(item.explanation.length > 100);
    assert.ok(item.transfer.length > 40);
  }
});

test('the unchanged selector, answer update and review model complete this imported course', () => {
  const asked = new Set(), answers = [], mastery = initialMastery(deck.concepts);
  for (let index = 0; index < 12; index++) {
    const item = selectNextItem(deck.items, asked, mastery);
    assert.ok(item);
    asked.add(item.id);
    const correct = index % 3 !== 0;
    const choice = correct ? item.answer : (item.answer + 1) % item.options.length;
    answers.push({item: item.id, concept: item.concept, choice, correct});
    mastery[item.concept] = updateMastery(mastery[item.concept], correct);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  const review = createReview(deck.items, answers);
  assert.equal(review.length, 12);
  assert.equal(review.filter(item => item.correct).length, 8);
  assert.equal(new Set(review.map(item => item.id)).size, 12);
  assert.deepEqual(Object.keys(mastery), deck.concepts);
});

test('worked numeric traces and counterexamples agree with the admitted machines', () => {
  const parity = getPreset('even-ones').machine;
  const suffix = getPreset('ends-01').machine;
  const safe = getPreset('no-11').machine;
  assert.deepEqual(traceWord(parity, '1011').states, [0, 1, 1, 0, 1]);
  assert.equal(traceWord(parity, '').accepted, true);
  assert.equal(traceWord(parity, '1').accepted, false);
  assert.deepEqual(traceWord(suffix, '010').states, [0, 1, 2, 1]);
  assert.equal(traceWord(suffix, '0101').accepted, true);
  assert.deepEqual(traceWord(safe, '10110').states, [0, 1, 0, 1, 2, 2]);
  assert.equal(traceWord(safe, '10110').accepted, false);
  assert.equal(compareMachines(parity, getPreset('all-words').machine).witness, '1');
  assert.equal(compareMachines(parity, suffix).witness, '');
  const byId = Object.fromEntries(deck.items.map(item => [item.id, item]));
  assert.match(byId['dfa-parity-trace'].options[byId['dfa-parity-trace'].answer], /q1, rejected/);
  assert.match(byId['dfa-suffix-trace'].options[byId['dfa-suffix-trace'].answer], /q0→q1→q2→q1, rejected/);
  assert.equal(byId['dfa-short-witness'].options[byId['dfa-short-witness'].answer], '1');
  assert.match(byId['dfa-witness-bound'].options[byId['dfa-witness-bound'].answer], /At most 5/);
});

test('the standalone artifact is deterministic and embeds the exact validated course without runtime dependencies', async () => {
  const generated = await buildFiniteAutomata();
  assert.equal(generated, await buildFiniteAutomata());
  assert.equal(generated, await readFile(new URL('../courses/finite-automata-explorer.html', import.meta.url), 'utf8'));
  assert.equal((generated.match(/<script>/g) || []).length, 1);
  assert.doesNotMatch(generated, /<script[^>]+src=/i);
  assert.doesNotMatch(generated, /(?:fetch\(|localStorage|sessionStorage|https?:\/\/)/);
  assert.ok(generated.includes(JSON.stringify(bytes).replace(/</g, '\\u003c')));
});
