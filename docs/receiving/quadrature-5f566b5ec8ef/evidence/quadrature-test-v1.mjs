import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeQuadrature, serializeQuadrature, QUADRATURE_PRESETS, SUBINTERVAL_COUNTS } from '../src/quadrature.mjs';

const methods = ['midpoint', 'trapezoid', 'simpson'];
const settings = (coefficients = [0, 0, 1, 0, 0, 0], lower = 0, upper = 2, subintervals = 2) =>
  ({ coefficients, lower, upper, subintervals });
const pair = v => [BigInt(v.numerator), BigInt(v.denominator)];
function equalFraction(actual, numerator, denominator = 1n) {
  const [n, d] = pair(actual); assert.equal(n * denominator, numerator * d, actual.fraction);
  assert.ok(d > 0n);
}
function sum(values) {
  return values.reduce(([n, d], v) => { const [a, b] = pair(v); return [n * b + a * d, d * b]; }, [0n, 1n]);
}

test('worked quadratic distinguishes the three estimates and signed errors', () => {
  const r = analyzeQuadrature(settings());
  equalFraction(r.exactIntegral, 8n, 3n);
  equalFraction(r.rules.midpoint.estimate, 5n, 2n);
  equalFraction(r.rules.trapezoid.estimate, 3n);
  equalFraction(r.rules.simpson.estimate, 8n, 3n);
  equalFraction(r.rules.midpoint.signedError, -1n, 6n);
  equalFraction(r.rules.trapezoid.signedError, 1n, 3n);
  assert.equal(r.rules.midpoint.guaranteedForDegree, false);
  assert.equal(r.rules.simpson.guaranteedForDegree, true);
});

test('each linear polynomial is integrated exactly for every interval and mesh', () => {
  for (const a of [-5, -2, 0, 4]) for (const b of [a + 1, 5].filter(x => x > a)) {
    for (const n of SUBINTERVAL_COUNTS) {
      const r = analyzeQuadrature(settings([-3, 7, 0, 0, 0, 0], a, b, n));
      const numerator = BigInt(-6 * (b - a) + 7 * (b * b - a * a));
      for (const method of methods) {
        equalFraction(r.rules[method].estimate, numerator, 2n);
        assert.equal(r.rules[method].exact, true);
      }
    }
  }
});

test('midpoint and trapezoid quadratic errors follow independent closed forms', () => {
  for (const [a, b] of [[-5, -2], [-1, 4], [0, 1]]) for (const n of SUBINTERVAL_COUNTS) {
    const r = analyzeQuadrature(settings([0, 0, 1, 0, 0, 0], a, b, n));
    const length = BigInt(b - a), count = BigInt(n);
    equalFraction(r.rules.midpoint.signedError, -(length ** 3n), 12n * count ** 2n);
    equalFraction(r.rules.trapezoid.signedError, length ** 3n, 6n * count ** 2n);
  }
});

test('Simpson integrates arbitrary signed cubics exactly on translated intervals', () => {
  for (const [a, b] of [[-5, -2], [-3, 4], [0, 1]]) for (const n of SUBINTERVAL_COUNTS) {
    const r = analyzeQuadrature(settings([-2, 3, -4, 5, 0, 0], a, b, n));
    assert.equal(r.rules.simpson.exact, true);
    equalFraction(r.rules.simpson.signedError, 0n);
    assert.equal(r.rules.simpson.guaranteedForDegree, true);
  }
});

test('quartic and quintic Simpson errors agree with separate monomial identities', () => {
  for (const [a, b] of [[-3, -1], [-1, 1], [0, 2]]) for (const n of SUBINTERVAL_COUNTS) {
    const length = BigInt(b - a), count = BigInt(n);
    const fourth = analyzeQuadrature(settings([0, 0, 0, 0, 1, 0], a, b, n));
    equalFraction(fourth.rules.simpson.signedError, 2n * length ** 5n, 15n * count ** 4n);
    const fifth = analyzeQuadrature(settings([0, 0, 0, 0, 0, 1], a, b, n));
    equalFraction(fifth.rules.simpson.signedError, BigInt(a + b) * length ** 5n, 3n * count ** 4n);
  }
});

test('zero values at all endpoint nodes do not prove a zero integral', () => {
  const r = analyzeQuadrature(QUADRATURE_PRESETS.find(p => p.id === 'missed'));
  equalFraction(r.exactIntegral, -1n, 60n);
  for (const method of ['trapezoid', 'simpson']) {
    assert.ok(r.rules[method].nodes.every(row => row.y.numerator === '0'));
    equalFraction(r.rules[method].estimate, 0n);
    equalFraction(r.rules[method].signedError, 1n, 60n);
    assert.equal(r.rules[method].exact, false);
  }
  equalFraction(r.rules.midpoint.estimate, -3n, 128n);
});

test('odd symmetry is reported as exact without inflating the degree guarantee', () => {
  const r = analyzeQuadrature(QUADRATURE_PRESETS.find(p => p.id === 'odd'));
  assert.equal(r.polynomialDegree, 5); equalFraction(r.exactIntegral, 0n);
  for (const method of methods) {
    assert.equal(r.rules[method].exact, true);
    assert.equal(r.rules[method].guaranteedForDegree, false);
  }
});

test('negative signed integral is retained rather than replaced by geometric area', () => {
  const r = analyzeQuadrature(QUADRATURE_PRESETS.find(p => p.id === 'negative'));
  equalFraction(r.exactIntegral, -6n);
  for (const method of methods) equalFraction(r.rules[method].estimate, -6n);
});

test('zero polynomial has no fabricated degree and no zero-over-zero ratios', () => {
  const r = analyzeQuadrature(QUADRATURE_PRESETS.find(p => p.id === 'zero'));
  assert.equal(r.polynomialDegree, null);
  for (const level of r.refinement) for (const method of methods) {
    const item = level.rules[method];
    assert.equal(item.previousErrorRatio.kind, level.subintervals === 2 ? 'first-level' : 'both-exact');
    assert.equal(item.previousErrorRatio.value, null);
    assert.equal(item.guaranteedForDegree, true);
  }
  assert.doesNotMatch(serializeQuadrature(r), /NaN|Infinity/);
});

test('refinement exposes exact observed factors four and sixteen', () => {
  const quadratic = analyzeQuadrature(settings());
  const quartic = analyzeQuadrature(QUADRATURE_PRESETS.find(p => p.id === 'quartic'));
  for (let i = 1; i < 5; i++) {
    for (const method of ['midpoint', 'trapezoid']) {
      equalFraction(quadratic.refinement[i].rules[method].previousErrorRatio.value, 4n);
    }
    equalFraction(quartic.refinement[i].rules.simpson.previousErrorRatio.value, 16n);
  }
});

test('a coincidentally exact coarse trapezoid can lose exactness on refinement', () => {
  // On [0,2], x^4 - 5x^2 has T_2 error 0; T_4 error -1/16.
  const r = analyzeQuadrature(settings([0, 0, -5, 0, 1, 0]));
  assert.equal(r.refinement[0].rules.trapezoid.exact, true);
  equalFraction(r.refinement[1].rules.trapezoid.signedError, -1n, 16n);
  equalFraction(r.refinement[1].rules.trapezoid.previousErrorRatio.value, 0n);
});

test('positive node weights sum to interval width; exact contributions sum to estimates', () => {
  const r = analyzeQuadrature(settings([9, -9, 9, -9, 9, -9], -5, 5, 32));
  for (const method of methods) {
    const rows = r.rules[method].nodes;
    assert.equal(rows.length, method === 'midpoint' ? 32 : 33);
    assert.ok(rows.every(row => BigInt(row.weight.numerator) > 0n));
    const [wn, wd] = sum(rows.map(row => row.weight)); assert.equal(wn, 10n * wd);
    const [cn, cd] = sum(rows.map(row => row.contribution));
    equalFraction(r.rules[method].estimate, cn, cd);
    assert.ok(rows.every(row => [row.x, row.y, row.weight, row.contribution].every(v => Number.isFinite(v.approximate))));
  }
  const weights = analyzeQuadrature(settings([1, 0, 0, 0, 0, 0], 0, 4, 4)).rules.simpson.nodes.map(row => row.weight.fraction);
  assert.deepEqual(weights, ['1/3', '4/3', '2/3', '4/3', '1/3']);
});

test('scaling the polynomial scales signed estimates and errors exactly', () => {
  const a = analyzeQuadrature(settings([1, -2, 3, 0, -1, 2], -2, 3, 8));
  const b = analyzeQuadrature(settings([-2, 4, -6, 0, 2, -4], -2, 3, 8));
  for (const method of methods) for (const field of ['estimate', 'signedError']) {
    const [n, d] = pair(a.rules[method][field]); equalFraction(b.rules[method][field], -2n * n, d);
  }
});

test('inputs and presets stay unchanged; every exposed nested result is immutable', () => {
  const input = settings(), before = structuredClone(input), presets = JSON.stringify(QUADRATURE_PRESETS);
  const result = analyzeQuadrature(input); assert.deepEqual(input, before);
  input.coefficients[2] = 9; input.upper = 5;
  assert.deepEqual(result.input, before);
  assert.throws(() => { result.rules.midpoint.nodes[0].x.numerator = '999'; }, TypeError);
  assert.throws(() => result.input.coefficients.push(1), TypeError);
  assert.equal(JSON.stringify(QUADRATURE_PRESETS), presets);
});

test('invalid or sparse settings reject as a whole', () => {
  const bad = [null, [], {}, {...settings(), coefficients: [1]}, {...settings(), coefficients: Array(6)},
    ...[true, '2', 2.5, NaN, Infinity, -Infinity, 10, -10].map(c => ({...settings(), coefficients: [c, 0, 0, 0, 0, 0]})),
    ...[0, 1, 3, 6, 64, true, '2', NaN].map(subintervals => ({...settings(), subintervals})),
    ...[-6, 6, 0.5, true, '0', Infinity].map(lower => ({...settings(), lower})),
    {...settings(), upper: 0}, {...settings(), upper: -1}];
  for (const input of bad) assert.throws(() => analyzeQuadrature(input), undefined, JSON.stringify(input));
});

test('download retains complete exact calculation and a separate inspection choice', () => {
  const report = analyzeQuadrature(settings()), result = JSON.parse(serializeQuadrature(report, 'simpson'));
  assert.equal(result.inspectedMethod, 'simpson');
  delete result.inspectedMethod; assert.deepEqual(result, report);
  assert.throws(() => serializeQuadrature(structuredClone(report)));
  assert.throws(() => serializeQuadrature(report, 'unknown'));
});
