import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_BKT, entropy, expectedInformationGain, initialMastery, runLearnerSimulation, selectNextItem, updateMastery } from '../src/knowledge.mjs';

const items = [
  {id:'a',concept:'a',prerequisites:[],options:[],answer:0,prompt:'',explanation:'',transfer:''},
  {id:'b',concept:'b',prerequisites:['a'],options:[],answer:0,prompt:'',explanation:'',transfer:''}
];
test('BKT probabilities stay bounded across repeated evidence', () => {
  for (const first of [0, .01, .22, .5, .99, 1]) {
    let p = first;
    for (let i = 0; i < 200; i++) {
      p = updateMastery(p, i % 2 === 0);
      assert.ok(p >= 0 && p <= 1 && Number.isFinite(p));
    }
  }
});
test('correct evidence raises and incorrect evidence lowers posterior for interior prior', () => {
  const prior = .4;
  assert.ok(updateMastery(prior, true) > prior);
  assert.ok(updateMastery(prior, false) < prior);
});
test('parameter validation rejects impossible probabilities', () => {
  assert.throws(() => updateMastery(.5, true, {...DEFAULT_BKT, guess: 2}), RangeError);
});
test('entropy and information gain have expected bounds and peak near uncertainty', () => {
  assert.equal(entropy(0), 0);
  assert.equal(entropy(1), 0);
  assert.equal(entropy(.5), 1);
  assert.ok(expectedInformationGain(.5) > expectedInformationGain(.01));
  for (let i = 0; i <= 1000; i++) {
    const gain = expectedInformationGain(i / 1000);
    assert.ok(gain >= 0 && gain <= 1);
  }
});
test('selector prioritizes a weak prerequisite and is stable after exhaustion', () => {
  const mastery = {a:.1,b:.9};
  const first = selectNextItem(items, new Set(), mastery);
  assert.equal(first.id, 'a');
  assert.equal(selectNextItem(items, new Set(['a']), mastery).id, 'b');
  assert.equal(selectNextItem(items, new Set(['a','b']), mastery), null);
});
test('initial mastery creates independent named concept values', () => {
  assert.deepEqual(initialMastery(['a','b']), {a:.22,b:.22});
});
test('scripted learner simulation is deterministic, bounded, and distinguishes selector modes', () => {
  const truth = {a:.8,b:.4};
  const adaptive = runLearnerSimulation(items, ['a','b'], truth, true, 41);
  const repeated = runLearnerSimulation(items, ['a','b'], truth, true, 41);
  const fixed = runLearnerSimulation([...items].reverse(), ['a','b'], truth, false, 41);
  assert.deepEqual(adaptive, repeated);
  assert.equal(adaptive.trace.length, items.length);
  assert.equal(new Set(adaptive.trace.map(row => row.item)).size, items.length);
  assert.ok(adaptive.meanEstimatedMastery >= 0 && adaptive.meanEstimatedMastery <= 1);
  assert.notDeepEqual(adaptive.trace.map(row => row.item), fixed.trace.map(row => row.item));
});
