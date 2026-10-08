import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMultiplication, displayNumber, plotGeometry, principalDegrees, serializeExperiment } from '../src/complex-plane.mjs';

const input = (zr, zi, wr, wi, steps) => ({ z: { re: zr, im: zi }, w: { re: wr, im: wi }, steps });
const coordinates = report => report.points.map(p => [p.re, p.im]);
const close = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)));

test('successive integer products retain a distinct starting point and multiplier', () => {
  const r = analyzeMultiplication(input('2', '3', '4', '-1', 3));
  assert.deepEqual(coordinates(r), [[2, 3], [11, 10], [54, 29], [245, 62]]);
  assert.deepEqual(r.points.map(p => p.step), [0, 1, 2, 3]);
  assert.deepEqual([r.product.re, r.product.im], [11, 10]);
  close(r.scaleFactor, Math.sqrt(17));
  close(r.points[3].modulus, Math.sqrt(13) * Math.pow(Math.sqrt(17), 3));
});

test('zero steps mean one explicitly assigned initial row, including zero multiplier', () => {
  const r = analyzeMultiplication(input('-2', '1', '0', '0', 0));
  assert.deepEqual(coordinates(r), [[-2, 1]]);
  assert.deepEqual([r.product.re, r.product.im], [0, 0]);
  assert.equal(r.transformation, 'collapse');
  assert.deepEqual(coordinates(analyzeMultiplication(input('0', '0', '0', '0', 0))), [[0, 0]]);
});

test('a returning quarter-turn sequence retains repeated indexed positions', () => {
  const r = analyzeMultiplication(input('3', '2', '0', '-1', 4));
  assert.deepEqual(coordinates(r), [[3, 2], [2, -3], [-3, -2], [-2, 3], [3, 2]]);
  assert.equal(r.multiplierArgumentDegrees, -90);
  close(r.measuredRotationDegrees, -90);
  assert.equal(r.points.length, 5);
});

test('zero starting points and zero multipliers keep their different defined quantities', () => {
  const origin = analyzeMultiplication(input('0', '-0.000', '3', '4', 2));
  assert.equal(origin.scaleFactor, 5);
  assert.equal(origin.transformation, 'origin');
  assert.equal(origin.measuredRotationDegrees, null);
  assert.notEqual(origin.multiplierArgumentDegrees, null);
  assert.ok(origin.points.every(p => p.argumentDegrees === null && p.modulus === 0));
  const collapse = analyzeMultiplication(input('2', '-3', '0', '0', 3));
  assert.equal(collapse.scaleFactor, 0);
  assert.equal(collapse.multiplierArgumentDegrees, null);
  assert.equal(collapse.measuredRotationDegrees, null);
  assert.notEqual(collapse.points[0].argumentDegrees, null);
  assert.ok(collapse.points.slice(1).every(p => p.argumentDegrees === null && p.re === 0 && p.im === 0));
});

test('bounded fractional coordinates keep full numeric output and remain finite at both limits', () => {
  const r = analyzeMultiplication(input('.125', '-.25', '.5', '.25', 2));
  assert.deepEqual(coordinates(r), [[.125, -.25], [.125, -.09375], [.0859375, -.015625]]);
  const small = analyzeMultiplication(input('.001', '0', '.001', '0', 8));
  assert.ok(small.points[8].re > 0 && Number.isFinite(small.points[8].re));
  assert.ok(Math.abs(small.points[8].re / 1e-27 - 1) < 1e-12);
  const large = analyzeMultiplication(input('10', '-10', '-10', '10', 8));
  assert.ok(large.points.every(p => [p.re, p.im, p.modulus].every(Number.isFinite)));
});

test('invalid and partial coordinate text and unsupported counts refuse the whole experiment', () => {
  for (const value of ['', ' ', '1.', '1e0', '0x1', 'NaN', 'Infinity', '0.0001', '10.001', '-10.001', '1,2', '1 2', '1/2', '00000000000000001', 1, null, true]) {
    assert.throws(() => analyzeMultiplication(input(value, '0', '1', '0', 1)), { name: typeof value === 'string' ? 'RangeError' : 'TypeError' });
  }
  for (const count of [-1, 9, 1.5, '2', null, NaN, Infinity]) {
    assert.throws(() => analyzeMultiplication(input('1', '0', '1', '0', count)), RangeError);
  }
  for (const value of [null, [], {}, { z: [], w: {}, steps: 1 }]) assert.throws(() => analyzeMultiplication(value));
  const valid = analyzeMultiplication(input(' +10.000 ', '-10', '.125', '-.5', 8));
  assert.equal(valid.inputs.z.re, '+10.000');
  assert.equal(valid.z.re, 10);
});

test('plot units are equal, imaginary-positive is upward, and every indexed point fits', () => {
  const r = analyzeMultiplication(input('-3', '2', '2', '1', 6));
  const g = plotGeometry(r);
  assert.equal(g.width, g.height);
  assert.equal(g.scaleX, g.scaleY);
  assert.equal(g.points.length, r.points.length);
  assert.ok(g.points[0].x < g.center.x && g.points[0].y < g.center.y);
  for (const p of g.points) {
    assert.ok(p.x >= 60 && p.x <= 540 && p.y >= 60 && p.y <= 540);
    const raw = r.points[p.step];
    close((p.x - 300) / g.scaleX, raw.re);
    close((300 - p.y) / g.scaleY, raw.im);
  }
  const zero = plotGeometry(analyzeMultiplication(input('0', '0', '0', '0', 8)));
  assert.equal(zero.halfRange, 1);
  assert.equal(zero.points.length, 9);
  assert.ok(zero.points.every(p => p.x === 300 && p.y === 300));
});

test('principal angles, signed zero and approximate formatting have declared behavior', () => {
  assert.deepEqual([-540, -180, 180, 540, 360, -360, 270].map(principalDegrees), [-180, -180, -180, -180, 0, 0, -90]);
  assert.equal(analyzeMultiplication(input('-1', '0', '1', '0', 0)).z.argumentDegrees, -180);
  assert.equal(analyzeMultiplication(input('0', '0', '1', '0', 0)).z.argumentDegrees, null);
  assert.equal(displayNumber(-0), '0');
  assert.equal(displayNumber(null), 'undefined');
  assert.notEqual(displayNumber(1e-27), '0');
  assert.equal(displayNumber(Math.sqrt(2)), '1.4142136');
  assert.throws(() => principalDegrees(Infinity));
});

test('accepted snapshots are immutable and JSON retains all unrounded computed values', () => {
  const settings = input('.123', '.456', '.789', '-.321', 8);
  const r = analyzeMultiplication(settings);
  settings.z.re = '9';
  settings.steps = 1;
  assert.equal(r.inputs.z.re, '.123');
  assert.equal(r.points.length, 9);
  assert.ok(Object.isFrozen(r) && Object.isFrozen(r.inputs.z) && Object.isFrozen(r.points[1]));
  assert.throws(() => { r.points[1].re = 999; }, TypeError);
  const saved = serializeExperiment(r.inputs);
  assert.ok(saved.endsWith('\n'));
  assert.deepEqual(JSON.parse(saved), r);
  assert.notEqual(String(r.points[8].re), displayNumber(r.points[8].re));
});
