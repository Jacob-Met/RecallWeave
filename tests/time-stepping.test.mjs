import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {simulate, observation} from '../src/time-stepping.mjs';

const reference = JSON.parse(await readFile(new URL(
  '../docs/receiving/time-stepping-713adaab/root/time-expectations.json',
  import.meta.url), 'utf8'));
const numeric = ['exact', 'forward', 'backward', 'forwardError', 'backwardError',
  'forwardAbsError', 'backwardAbsError'];
function near(actual, expected, label) {
  assert.ok(Number.isFinite(actual), label + ' is finite');
  const tolerance = Math.max(1e-12, 2e-12 * Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= tolerance,
    label + ': got ' + actual + ', expected ' + expected);
}
function receive(item) {
  const input = structuredClone(item.settings);
  const before = JSON.stringify(input);
  const result = simulate(input);
  assert.equal(JSON.stringify(input), before, 'input unchanged');
  assert.deepEqual(result.settings, input);
  assert.equal(result.z, item.z);
  assert.equal(result.forwardMultiplier, item.forwardMultiplier);
  near(result.backwardMultiplier, item.backwardMultiplier, 'backward multiplier');
  assert.equal(result.forwardBehavior, item.forwardBehavior);
  assert.equal(result.rows.length, input.steps + 1);
  for (let n = 0; n <= input.steps; n++) {
    const actual = result.rows[n], expected = item.expected_rows[n];
    assert.equal(actual.index, n);
    assert.equal(actual.time, expected.time);
    assert.equal(actual.time, n * input.step);
    for (const field of numeric) near(actual[field], expected[field], item.id + ':' + n + ':' + field);
    for (const field of ['exact', 'forward', 'backward']) {
      if (expected[field] !== 0) {
        assert.notEqual(actual[field], 0, 'a small nonzero value is not clipped');
        assert.equal(Math.sign(actual[field]), Math.sign(expected[field]));
      }
    }
    assert.equal(actual.forwardAbsError, Math.abs(actual.forwardError));
    assert.equal(actual.backwardAbsError, Math.abs(actual.backwardError));
  }
  assert.equal(result.rows[0].forwardError, 0);
  assert.equal(result.rows[0].backwardError, 0);
  assert.equal(result.rows.at(-1).time, input.steps * input.step);
  return result;
}

// These data were generated before candidate code by root's independent
// Python Fraction powers, not by this module's repeated multiplication/division.
for (const item of reference.cases) {
  test('independent closed-form trace: ' + item.id, () => receive(item));
}
test('four refinements retain the same endpoint and reduce both errors', () => {
  const results = reference.refinements.map(receive);
  const endpoint = results.map(result => result.rows.at(-1));
  for (const row of endpoint) {
    assert.equal(row.time, 1);
    near(row.exact, Math.exp(-1), 'same exact endpoint');
  }
  for (const field of ['forwardAbsError', 'backwardAbsError']) {
    for (let n = 1; n < endpoint.length; n++) {
      assert.ok(endpoint[n][field] < endpoint[n-1][field]);
    }
    const firstRatio = endpoint[0][field] / endpoint[1][field];
    assert.ok(Math.abs(firstRatio - 2) > 0.01,
      'a finite first-order refinement ratio is not asserted to be exactly two');
  }
});
test('small-step positive values bracket exact decay at every later row', () => {
  const result = simulate({lambda:1, step:0.5, steps:4, initial:1});
  for (const row of result.rows.slice(1)) {
    assert.ok(row.forward < row.exact);
    assert.ok(row.exact < row.backward);
  }
});
test('negative and zero initial values preserve the multiplier classification', () => {
  const input = {lambda:1.25, step:2, steps:8, initial:1};
  const positive = simulate(input), negative = simulate({...input, initial:-1});
  const zero = simulate({...input, initial:-0});
  assert.equal(zero.forwardBehavior, 'alternating_growth');
  assert.equal(negative.forwardBehavior, positive.forwardBehavior);
  assert.equal(Object.is(zero.settings.initial, -0), false);
  for (let n=0; n<positive.rows.length; n++) {
    for (const field of ['exact','forward','backward','forwardError','backwardError']) {
      assert.equal(negative.rows[n][field], -positive.rows[n][field] || 0);
      assert.equal(zero.rows[n][field], 0);
      assert.equal(Object.is(zero.rows[n][field], -0), false);
    }
  }
});
test('strict numeric settings refuse wrong shape, extra fields and inadmissible grids', () => {
  const valid = {lambda:1, step:0.5, steps:4, initial:1};
  const invalid = [
    null, [], 'settings', {...valid, extra:0},
    {step:0.5, steps:4, initial:1},
    {...valid, lambda:'1'}, {...valid, initial:true},
    {...valid, lambda:NaN}, {...valid, step:Infinity},
    {...valid, lambda:0}, {...valid, lambda:4.25}, {...valid, lambda:0.3},
    {...valid, step:0}, {...valid, step:2.03125}, {...valid, step:0.1},
    {...valid, steps:0}, {...valid, steps:65}, {...valid, steps:1.5},
    {...valid, initial:-2.25}, {...valid, initial:2.25}, {...valid, initial:0.1}
  ];
  for (const input of invalid) {
    assert.throws(() => simulate(input), error =>
      error instanceof TypeError || error instanceof RangeError);
  }
  const symbolic = {...valid, [Symbol('extra')]:0};
  assert.throws(() => simulate(symbolic), TypeError);
});
test('observation roundtrip retains every full-precision row and the selected state', () => {
  const input = {lambda:1, step:0.5, steps:4, initial:1};
  const original = JSON.stringify(input);
  for (const index of [0,2,4]) {
    const observed = observation(input, index);
    assert.equal(observed.schema, 'recallweave.time-stepping-observation.v1');
    assert.equal(observed.units.lambda, 's^-1');
    assert.equal(observed.units.y, 'dimensionless');
    assert.equal(observed.selectedIndex, index);
    assert.deepEqual(observed.selected, observed.rows[index]);
    assert.deepEqual(observed.rows, simulate(input).rows);
    assert.deepEqual(JSON.parse(JSON.stringify(observed)), observed);
    assert.equal(observed.rows.at(-1).backward, 16/81);
  }
  assert.equal(JSON.stringify(input), original);
  for (const index of [-1,5,0.5,'1',true,NaN]) {
    assert.throws(() => observation(input,index), RangeError);
  }
});
