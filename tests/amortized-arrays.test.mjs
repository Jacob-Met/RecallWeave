import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { traceArrays, parseArrayInputs, arrayObservation, MAX_APPENDS, MAX_INCREMENT } from '../src/amortized-arrays.mjs';
const contract = JSON.parse(readFileSync(new URL('../docs/receiving/amortized-arrays-0a55dfe9/preimplementation.json', import.meta.url), 'utf8'));

// Closed-form oracle was specified before the state-transition implementation.
// It neither copies slots nor follows the implementation's growth loop.
function expected(n, k, geometric) {
  if (n === 0) return { capacity: 0, cost: 0 };
  if (geometric) {
    const capacity = 2 ** Math.ceil(Math.log2(n));
    return { capacity, cost: n + capacity - 1 };
  }
  const resizesAfterFirst = Math.floor((n - 1) / k);
  return { capacity: (resizesAfterFirst + 1) * k, cost: n + k * resizesAfterFirst * (resizesAfterFirst + 1) / 2 };
}
function verifyRows(policy, n, k, geometric) {
  assert.equal(policy.steps.length, n + 1);
  for (let i = 0; i <= n; i += 1) {
    const row = policy.steps[i];
    const exact = expected(i, k, geometric);
    const before = expected(Math.max(0, i - 1), k, geometric);
    assert.equal(row.step, i);
    assert.equal(row.size, i);
    assert.equal(row.capacity, exact.capacity);
    assert.equal(row.totalCost, exact.cost);
    assert.equal(row.spare, exact.capacity - i);
    assert.equal(row.sizeBefore, Math.max(0, i - 1));
    assert.equal(row.capacityBefore, before.capacity);
    assert.equal(row.cost, exact.cost - before.cost);
    assert.equal(row.writes, i === 0 ? 0 : 1);
    assert.equal(row.copies, row.cost - row.writes);
    assert.equal(row.resized, i > 0 && exact.capacity !== before.capacity);
    assert.deepEqual(row.elements, Array.from({ length: i }, (_, j) => j + 1));
    assert.deepEqual(row.copiedElements, Array.from({ length: row.copies }, (_, j) => j + 1));
    if (geometric) {
      assert.equal(row.potential, 2 * i - exact.capacity);
      assert.ok(row.potential >= 0);
      assert.equal(row.potentialBefore, 2 * Math.max(0, i - 1) - before.capacity);
      assert.equal(row.amortizedCost, i === 0 ? 0 : i === 1 ? 2 : 3);
      assert.equal(row.totalAmortized, i === 0 ? 0 : 3 * i - 1);
      assert.equal(row.totalCost, row.totalAmortized - row.potential);
    } else {
      assert.equal(row.potentialBefore, null);
      assert.equal(row.potential, null);
      assert.equal(row.amortizedCost, null);
      assert.equal(row.totalAmortized, null);
    }
  }
}

test('all preimplementation hand cases match exact native traces', () => {
  for (const example of contract.hand_cases) {
    const trace = traceArrays(example.n, example.k);
    assert.equal(trace.doubling.totals.capacity, example.doubling_capacity);
    assert.equal(trace.doubling.totals.cost, example.doubling_total);
    assert.equal(trace.fixedIncrement.totals.capacity, example.fixed_capacity);
    assert.equal(trace.fixedIncrement.totals.cost, example.fixed_total);
    if (example.doubling_last_cost !== undefined) assert.equal(trace.doubling.steps.at(-1).cost, example.doubling_last_cost);
    if (example.doubling_potential !== undefined) assert.equal(trace.doubling.totals.potential, example.doubling_potential);
  }
});

test('every admitted prefix and increment agrees with a separate closed form', () => {
  let comparisons = 0;
  // A full trace contains every prefix, giving 129*32*2 received policy states.
  for (let k = 1; k <= MAX_INCREMENT; k += 1) {
    const trace = traceArrays(MAX_APPENDS, k);
    verifyRows(trace.doubling, MAX_APPENDS, k, true);
    verifyRows(trace.fixedIncrement, MAX_APPENDS, k, false);
    comparisons += (MAX_APPENDS + 1) * 2;
  }
  assert.equal(comparisons, 8256);
});

test('every independently requested length has correct totals and retained averages', () => {
  for (let n = 0; n <= MAX_APPENDS; n += 1) {
    for (let k = 1; k <= MAX_INCREMENT; k += 1) {
      const trace = traceArrays(n, k);
      for (const [policy, geometric] of [[trace.doubling, true], [trace.fixedIncrement, false]]) {
        const exact = expected(n, k, geometric);
        assert.equal(policy.totals.cost, exact.cost);
        assert.equal(policy.totals.capacity, exact.capacity);
        assert.equal(policy.totals.copies, exact.cost - n);
        assert.equal(policy.totals.writes, n);
        assert.equal(policy.totals.averageCost, n === 0 ? null : exact.cost / n);
        assert.equal(policy.totals.worstCost, Math.max(...policy.steps.map(row => row.cost)));
        assert.equal(policy.totals.resizes, policy.steps.filter(row => row.resized).length);
      }
    }
  }
});

test('actual resize spikes stay distinct from cumulative and amortized costs', () => {
  const trace = traceArrays(9, 3);
  const row = trace.doubling.steps[9];
  assert.equal(row.copies, 8);
  assert.equal(row.cost, 9);
  assert.equal(row.totalCost, 24);
  assert.equal(row.amortizedCost, 3);
  assert.equal(trace.fixedIncrement.steps[9].cost, 1);
  assert.ok(row.cost > row.amortizedCost);
});

test('every prefix preserves original element order and earlier snapshots', () => {
  const short = traceArrays(9, 7);
  const longer = traceArrays(128, 7);
  for (const name of ['doubling', 'fixedIncrement']) {
    assert.deepEqual(short[name].steps, longer[name].steps.slice(0, 10));
  }
  assert.ok(Object.isFrozen(short));
  assert.ok(Object.isFrozen(short.input));
  assert.ok(Object.isFrozen(short.doubling.steps[5].elements));
  assert.throws(() => { short.doubling.steps[5].elements[0] = 999; }, TypeError);
  assert.throws(() => { short.input.appends = 17; }, TypeError);
});

test('numeric API refuses the complete bad input rather than coercing or truncating', () => {
  for (const n of [-1, 129, 1.5, NaN, Infinity, -Infinity, '9', true, null, undefined, {}, []]) {
    assert.throws(() => traceArrays(n, 3), RangeError);
  }
  for (const k of [0, -1, 33, .5, NaN, Infinity, '3', false, null, undefined, {}, []]) {
    assert.throws(() => traceArrays(9, k), RangeError);
  }
});

test('form admission accepts only bounded decimal digits and keeps both fields explicit', () => {
  assert.deepEqual(parseArrayInputs(' 009 ', '03'), { appends: 9, increment: 3 });
  assert.deepEqual(parseArrayInputs('0', '32'), { appends: 0, increment: 32 });
  for (const value of ['', ' ', '1e2', '0x10', '1.0', '-0', '+1', '１２', '1\n2', '1234', '9'.repeat(100), {}, 12, null]) {
    assert.throws(() => parseArrayInputs(value, '3'), RangeError);
    assert.throws(() => parseArrayInputs('9', value), RangeError);
  }
  assert.throws(() => parseArrayInputs('129', '3'), RangeError);
  assert.throws(() => parseArrayInputs('12', '0'), RangeError);
});

test('observation preserves the applied trace and exact selected step, including zero', () => {
  const trace = traceArrays(12, 3);
  const before = JSON.stringify(trace);
  const observation = arrayObservation(trace, 9);
  assert.equal(observation.inspectionStep, 9);
  assert.equal(observation.trace, trace);
  assert.deepEqual(JSON.parse(JSON.stringify(observation)).trace, trace);
  assert.equal(JSON.stringify(trace), before);
  for (const step of [-1, 13, .5, '9', NaN, Infinity]) assert.throws(() => arrayObservation(trace, step), RangeError);
  assert.throws(() => arrayObservation(null, 0), TypeError);
  assert.equal(arrayObservation(traceArrays(0, 3), 0).trace.doubling.totals.averageCost, null);
});

test('changed-input and deliberately corrupted results are consequential controls', () => {
  const first = traceArrays(9, 3);
  const second = traceArrays(10, 3);
  const third = traceArrays(9, 1);
  assert.equal(second.doubling.totals.cost - first.doubling.totals.cost, 1);
  assert.notEqual(first.fixedIncrement.totals.cost, third.fixedIncrement.totals.cost);
  const corrupted = structuredClone(first.doubling);
  corrupted.steps[9].cost = 3; // Incorrectly substitutes charge for actual cost.
  assert.throws(() => verifyRows(corrupted, 9, 3, true), assert.AssertionError);
});
