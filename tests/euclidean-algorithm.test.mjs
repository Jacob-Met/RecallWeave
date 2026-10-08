import test from 'node:test';
import assert from 'node:assert/strict';
import { EUCLID_TRACE_FORMAT, EUCLID_MAX_INPUT, parseEuclidInteger, computeEuclid } from '../src/euclidean-algorithm.mjs';

// Deliberately different from repeated division: enumerate every possible positive
// common divisor for the complete small domain, and use binary gcd for large cases.
function divisorOracle(a, b) {
  if (a === 0 && b === 0) return 0;
  for (let d = Math.max(a, b); d >= 1; d--) if (a % d === 0 && b % d === 0) return d;
  throw new Error('Unreachable positive-input oracle state.');
}
function binaryGcd(a, b) {
  if (a === 0n) return b;
  if (b === 0n) return a;
  let shift = 0n;
  while (((a | b) & 1n) === 0n) { a >>= 1n; b >>= 1n; shift++; }
  while ((a & 1n) === 0n) a >>= 1n;
  do {
    while ((b & 1n) === 0n) b >>= 1n;
    if (a > b) [a, b] = [b, a];
    b -= a;
  } while (b !== 0n);
  return a << shift;
}
function inspectTrace(trace, a, b, expectedGcd) {
  assert.equal(trace.format, EUCLID_TRACE_FORMAT);
  assert.deepEqual(trace.inputs, { a: a.toString(), b: b.toString() });
  assert.equal(trace.gcd, expectedGcd.toString());
  assert.equal(trace.convention, 'gcd(0, 0) = 0');
  const combination = pair => BigInt(pair.x) * a + BigInt(pair.y) * b;
  let nextDividend = a, nextDivisor = b;
  for (const [i, row] of trace.steps.entries()) {
    assert.equal(row.index, i + 1);
    const dividend = BigInt(row.dividend), divisor = BigInt(row.divisor);
    const quotient = BigInt(row.quotient), remainder = BigInt(row.remainder);
    assert.equal(dividend, nextDividend);
    assert.equal(divisor, nextDivisor);
    assert.ok(divisor > 0n);
    assert.ok(quotient >= 0n);
    assert.equal(dividend, quotient * divisor + remainder);
    assert.ok(remainder >= 0n && remainder < divisor);
    assert.equal(combination(row.dividendCoefficients), dividend);
    assert.equal(combination(row.divisorCoefficients), divisor);
    assert.equal(combination(row.remainderCoefficients), remainder);
    nextDividend = divisor; nextDivisor = remainder;
  }
  assert.equal(nextDivisor, 0n);
  assert.equal(nextDividend, expectedGcd);
  assert.equal(combination(trace.coefficients), expectedGcd);
  if (expectedGcd !== 0n) {
    assert.equal(a % expectedGcd, 0n);
    assert.equal(b % expectedGcd, 0n);
  }
}
function assertFrozen(value) {
  if (value === null || typeof value !== 'object') return;
  assert.ok(Object.isFrozen(value));
  for (const nested of Object.values(value)) assertFrozen(nested);
}

test('decimal-text inputs normalize whitespace and leading zeros without number coercion', () => {
  assert.equal(EUCLID_MAX_INPUT, 999999n);
  for (const [text, expected] of [['0', 0n], ['000000', 0n], [' 000123 ', 123n], ['999999', 999999n], ['\t45\n', 45n]]) {
    assert.equal(parseEuclidInteger(text), expected);
  }
  assert.equal(parseEuclidInteger(' '.repeat(13) + '123456' + ' '.repeat(13)), 123456n);
  assert.deepEqual(computeEuclid(' 000252 ', '000198').inputs, { a: '252', b: '198' });
});

test('ambiguous, out-of-range and nontext inputs are refused before computation', () => {
  for (const value of ['', ' ', '-1', '+1', '1.0', '1e3', '1_000', '1,000', '0x10', '12 3', '１２', '١٢', '1000000', '0000000', ' '.repeat(27) + '123456', 12, 0, 12n, NaN, Infinity, null, undefined, [], {}, { toString: () => '12' }]) {
    assert.throws(() => parseEuclidInteger(value), RangeError);
    assert.throws(() => computeEuclid(value, '12'), RangeError);
    assert.throws(() => computeEuclid('12', value), RangeError);
  }
});

test('the original ordered pair produces the exact worked four-division trace', () => {
  const trace = computeEuclid('252', '198');
  assert.deepEqual(trace.steps.map(({ dividend, divisor, quotient, remainder }) =>
    [dividend, divisor, quotient, remainder]), [
    ['252', '198', '1', '54'], ['198', '54', '3', '36'],
    ['54', '36', '1', '18'], ['36', '18', '2', '0']
  ]);
  assert.deepEqual(trace.coefficients, { x: '4', y: '-5' });
  inspectTrace(trace, 252n, 198n, 18n);
});

test('smaller-first inputs retain their real quotient-zero first division', () => {
  const trace = computeEuclid('14', '39');
  assert.deepEqual(trace.steps.map(row => [row.dividend, row.divisor, row.quotient, row.remainder]), [
    ['14', '39', '0', '14'], ['39', '14', '2', '11'], ['14', '11', '1', '3'],
    ['11', '3', '3', '2'], ['3', '2', '1', '1'], ['2', '1', '2', '0']
  ]);
  inspectTrace(trace, 14n, 39n, 1n);
  assert.equal(trace.steps.length, computeEuclid('39', '14').steps.length + 1);
});

test('zero, equal and exactly divisible pairs have their actual division counts', () => {
  for (const [a, b, gcd, count] of [
    ['0', '0', 0n, 0], ['45', '0', 45n, 0], ['0', '45', 45n, 1],
    ['19', '19', 19n, 1], ['144', '24', 24n, 1], ['1', '999999', 1n, 2]
  ]) {
    const trace = computeEuclid(a, b);
    assert.equal(trace.steps.length, count);
    inspectTrace(trace, BigInt(a), BigInt(b), gcd);
  }
});

test('all 6,561 pairs from zero through eighty agree with common-divisor enumeration', () => {
  for (let a = 0; a <= 80; a++) for (let b = 0; b <= 80; b++) {
    inspectTrace(computeEuclid(String(a), String(b)), BigInt(a), BigInt(b), BigInt(divisorOracle(a, b)));
  }
});

test('boundary and long-chain pairs agree with a separate binary-gcd oracle', () => {
  const pairs = [[999999,999998], [832040,514229], [514229,832040], [999999,999999],
    [999999,0], [0,999999], [999999,500000], [524288,262144], [88,26], [55,34]];
  let state = 20261008;
  for (let i = 0; i < 512; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const a = state % 1000000;
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    pairs.push([a, state % 1000000]);
  }
  for (const [aValue, bValue] of pairs) {
    const a = BigInt(aValue), b = BigInt(bValue);
    inspectTrace(computeEuclid(a.toString(), b.toString()), a, b, binaryGcd(a, b));
  }
});

test('the saved trace is exact JSON with decimal integer strings and independent frozen results', () => {
  const trace = computeEuclid('88', '26'), another = computeEuclid('88', '26');
  assertFrozen(trace);
  assert.notEqual(trace, another);
  assert.notEqual(trace.steps, another.steps);
  const inspectValues = (value, key = '') => {
    if (typeof value === 'number') assert.equal(key, 'index');
    else if (typeof value === 'object' && value !== null) {
      for (const [name, nested] of Object.entries(value)) inspectValues(nested, name);
    } else assert.equal(typeof value, 'string');
  };
  inspectValues(trace);
  assert.deepEqual(JSON.parse(JSON.stringify(trace)), trace);
  assert.throws(() => { trace.gcd = '3'; }, TypeError);
  assert.throws(() => { trace.inputs.a = '90'; }, TypeError);
  assert.throws(() => { trace.steps[0].remainderCoefficients.x = '99'; }, TypeError);
  assert.throws(() => { trace.steps.push({}); }, TypeError);
  assert.deepEqual(trace, another);
  assert.deepEqual(trace.coefficients, { x: '-5', y: '17' });
});
