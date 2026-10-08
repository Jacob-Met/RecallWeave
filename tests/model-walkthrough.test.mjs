import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_BKT, updateMastery } from '../src/knowledge.mjs';
import { MAX_WALKTHROUGH_RESPONSES, walkthroughParameters, explainMasteryUpdate, createWalkthrough, walkthroughText } from '../src/model-walkthrough.mjs';

const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-14, `${message}: ${actual} vs ${expected}`);

test('uses a copied complete set of the actual illustrative defaults', () => {
  const parameters = walkthroughParameters();
  assert.deepEqual(parameters, DEFAULT_BKT);
  assert.notEqual(parameters, DEFAULT_BKT);
  assert.ok(Object.isFrozen(parameters));
  for (const value of [null, [], 'defaults']) assert.throws(() => walkthroughParameters(value));
  for (const value of ['', '0.2', NaN, Infinity, -Infinity, -.01, 1.01, null, undefined]) {
    assert.throws(() => walkthroughParameters({ ...DEFAULT_BKT, guess: value }), /finite number/);
  }
  assert.throws(() => walkthroughParameters({ ...DEFAULT_BKT, hidden: .2 }), /Only initial/);
  assert.throws(() => walkthroughParameters({ initial: .22 }), /guess/);
});

test('the first correct response agrees with an independent rational calculation', () => {
  const step = explainMasteryUpdate(.22, true);
  // Weights are 99/500 and 78/500. Posterior is 33/59; learning adds 4.68/59.
  near(step.knownContribution, 99 / 500, 'known weight');
  near(step.unknownContribution, 78 / 500, 'not-yet-known weight');
  near(step.posterior, 33 / 59, 'posterior');
  near(step.learningContribution, 4.68 / 59, 'transition');
  near(step.next, 37.68 / 59, 'final estimate');
  assert.equal(step.next, updateMastery(.22, true));
  assert.equal(step.clippingChange, 0);
});

test('the first incorrect response agrees with an independent rational calculation', () => {
  const step = explainMasteryUpdate(.22, false);
  // Weights are 11/500 and 312/500. Posterior is 11/323; learning adds 56.16/323.
  near(step.posterior, 11 / 323, 'posterior');
  near(step.learningContribution, 56.16 / 323, 'transition');
  near(step.next, 67.16 / 323, 'final estimate');
  assert.ok(step.posterior < step.prior);
  assert.ok(step.next > step.posterior);
  assert.equal(step.next, updateMastery(.22, false));
});

test('finite priors expose the existing model clipping without coercing other inputs', () => {
  for (const [prior, clipped] of [[-3, 0], [2, 1], [.22, .22]]) {
    const step = explainMasteryUpdate(prior, true);
    assert.equal(step.priorInput, prior);
    assert.equal(step.prior, clipped);
    assert.equal(step.priorClipped, prior !== clipped);
    assert.equal(step.next, updateMastery(prior, true));
    assert.equal(step.beforeFinalClipping + step.clippingChange, step.next);
  }
  for (const prior of ['.2', NaN, Infinity, -Infinity, undefined, null]) {
    assert.throws(() => explainMasteryUpdate(prior, true), /finite number/);
  }
  for (const response of ['true', 1, 0, null, undefined]) {
    assert.throws(() => explainMasteryUpdate(.2, response), /correct or incorrect/);
  }
});

test('traces and parameters are immutable snapshots, with no input mutation', () => {
  const responses = [true, false, true];
  const parameters = { ...DEFAULT_BKT };
  const trace = createWalkthrough(responses, parameters);
  responses[0] = false;
  parameters.guess = 1;
  assert.deepEqual(trace.responses, [true, false, true]);
  assert.equal(trace.parameters.guess, .2);
  assert.ok(Object.isFrozen(trace));
  assert.ok(Object.isFrozen(trace.steps));
  assert.ok(Object.isFrozen(trace.responses));
  assert.ok(trace.steps.every(Object.isFrozen));
  assert.throws(() => { trace.steps[0].next = 1; }, TypeError);
});

test('all tested finite outcomes use the exact unchanged model return across edge parameters', () => {
  let finite = 0;
  let refused = 0;
  const sequences = [[], [true], [false], [true, false], [false, true], [true, true, false], [false, false, true], [true, false, true, false, true, false]];
  for (const initial of [0, .22, 1]) for (const guess of [0, .2, 1])
    for (const slip of [0, .1, 1]) for (const learn of [0, .18, 1]) {
      const parameters = { initial, guess, slip, learn };
      for (const responses of sequences) {
        let current = initial;
        const expected = [];
        let failedAt = -1;
        for (let index = 0; index < responses.length; index++) {
          current = updateMastery(current, responses[index], parameters);
          if (!Number.isFinite(current)) { failedAt = index; break; }
          expected.push(current);
        }
        if (failedAt >= 0) {
          assert.throws(() => createWalkthrough(responses, parameters), new RegExp(`Response ${failedAt + 1}:.*zero probability`));
          refused++;
        } else {
          const trace = createWalkthrough(responses, parameters);
          assert.deepEqual(trace.steps.map(step => step.next), expected);
          assert.equal(trace.finalMastery, current);
          for (const step of trace.steps) {
            assert.ok(step.responseLikelihood > 0);
            assert.ok(step.next >= 0 && step.next <= 1);
            near(step.prior + step.evidenceChange, step.posterior, 'evidence reconciliation');
            assert.equal(step.posterior + step.learningContribution, step.beforeFinalClipping);
          }
          finite++;
        }
      }
    }
  assert.ok(finite > 200 && refused > 100);
});

test('both impossible observations refuse without damaging the last complete trace', () => {
  const prior = createWalkthrough([true, false]);
  const snapshot = walkthroughText(prior);
  assert.throws(() => createWalkthrough([true], { ...DEFAULT_BKT, slip: 1, guess: 0 }), /Response 1:.*zero probability/);
  assert.throws(() => createWalkthrough([false], { ...DEFAULT_BKT, slip: 0, guess: 1 }), /Response 1:.*zero probability/);
  assert.equal(walkthroughText(prior), snapshot);
});

test('a later impossible observation identifies its index and has no partial result', () => {
  const parameters = { initial: 0, guess: .2, slip: 0, learn: 1 };
  const before = createWalkthrough([true], parameters);
  assert.equal(before.finalMastery, 1);
  assert.throws(() => createWalkthrough([true, false], parameters), /Response 2:.*zero probability/);
  assert.deepEqual(before.responses, [true]);
  assert.equal(before.finalMastery, 1);
});

test('zero likelihood caused by floating-point underflow is explicit', () => {
  const parameters = { ...DEFAULT_BKT, guess: 0, slip: .5 };
  assert.ok(Number.isNaN(updateMastery(Number.MIN_VALUE, true, parameters)));
  assert.throws(() => explainMasteryUpdate(Number.MIN_VALUE, true, parameters), /zero probability.*JavaScript precision/);
});

test('uninformative and reversed evidence are not mislabeled as achievement', () => {
  for (const correct of [true, false]) {
    const step = explainMasteryUpdate(.22, correct, { ...DEFAULT_BKT, guess: .25, slip: .75, learn: 0 });
    near(step.posterior, .22, 'uninformative response');
  }
  const reversed = { ...DEFAULT_BKT, guess: .9, slip: .9, learn: 0 };
  assert.ok(explainMasteryUpdate(.22, true, reversed).next < .22);
  assert.ok(explainMasteryUpdate(.22, false, reversed).next > .22);
});

test('learning can outweigh negative evidence and a full transition reaches the endpoint', () => {
  const step = explainMasteryUpdate(.22, false, { ...DEFAULT_BKT, learn: .95 });
  assert.ok(step.posterior < .22);
  assert.ok(step.next > .22);
  for (const correct of [true, false]) {
    assert.equal(explainMasteryUpdate(.22, correct, { ...DEFAULT_BKT, learn: 1 }).next, 1);
  }
});

test('editing an earlier response recomputes later priors; undo and clear are reproducible', () => {
  const original = createWalkthrough([true, false, true]);
  const edited = createWalkthrough([false, false, true], original.parameters);
  assert.notEqual(edited.steps[1].prior, original.steps[1].prior);
  assert.equal(edited.steps[1].prior, edited.steps[0].next);
  assert.deepEqual(createWalkthrough(edited.responses.slice(0, -1), edited.parameters).steps, edited.steps.slice(0, -1));
  assert.equal(createWalkthrough([], edited.parameters).finalMastery, DEFAULT_BKT.initial);
  assert.deepEqual(original.responses, [true, false, true]);
});

test('history is bounded and refuses sparse or non-boolean input rather than skipping it', () => {
  assert.equal(createWalkthrough(Array(MAX_WALKTHROUGH_RESPONSES).fill(true)).steps.length, MAX_WALKTHROUGH_RESPONSES);
  assert.throws(() => createWalkthrough(Array(MAX_WALKTHROUGH_RESPONSES + 1).fill(true)), /at most 24/);
  for (const input of [{}, 'true', null]) assert.throws(() => createWalkthrough(input), /array/);
  assert.throws(() => createWalkthrough([true, , false]), /Response 2/);
  assert.throws(() => createWalkthrough([false, 'true']), /Response 2/);
});

test('export keeps full precision, applied assumptions, response identity and limitations', () => {
  const trace = createWalkthrough([true, false, true]);
  const text = walkthroughText(trace);
  assert.ok(text.includes(`updateMastery return: ${trace.steps[0].next}`));
  assert.ok(text.includes(`Final model estimate: ${trace.finalMastery}`));
  assert.match(text, /Response 2: incorrect/);
  assert.match(text, /guess: 0.2/);
  assert.match(text, /Hypothetical responses for one concept/);
  assert.match(text, /not a grade or a calibrated guarantee/);
  assert.match(walkthroughText(createWalkthrough()), /No responses/);
  assert.equal(text, walkthroughText({ ...trace, finalMastery: 999, steps: [] }));
});
