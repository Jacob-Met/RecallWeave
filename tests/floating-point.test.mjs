import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exactNumber, inspectFloat32, associationExperiment, triangleExperiment,
  serializeTriangleReport,
} from '../src/floating-point.mjs';

function equalsRatio(actual, numerator, denominator = 1n) {
  assert.ok(BigInt(actual.denominator) > 0n);
  assert.equal(BigInt(actual.numerator) * denominator, numerator * BigInt(actual.denominator));
}

test('reference decoding retains exact binary values rather than printed decimals', () => {
  equalsRatio(exactNumber(0.125), 1n, 8n);
  equalsRatio(exactNumber(-0.125), -1n, 8n);
  equalsRatio(exactNumber(0.1), 3602879701896397n, 36028797018963968n);
  equalsRatio(exactNumber(Number.MIN_VALUE), 1n, 1n << 1074n);
  equalsRatio(exactNumber(-0), 0n);
});

test('binary32 representation and input-to-storage error use independent known bit patterns', () => {
  const eighth = inspectFloat32(0.125);
  assert.equal(eighth.hex, '3e000000');
  assert.equal(eighth.classification, 'normal');
  equalsRatio(eighth.storedExact, 1n, 8n);
  equalsRatio(eighth.signedError, 0n);
  const tenth = inspectFloat32(0.1);
  assert.equal(tenth.hex, '3dcccccd');
  equalsRatio(tenth.storedExact, 13421773n, 134217728n);
  equalsRatio(tenth.signedError, 53687091n, 36028797018963968n);
});

test('halfway rounding selects both the lower and upper even neighbor', () => {
  assert.equal(inspectFloat32(16777217).stored, 16777216);
  assert.equal(inspectFloat32(16777219).stored, 16777220);
  assert.equal(inspectFloat32(16777217 - 2 ** -28).stored, 16777216);
  assert.equal(inspectFloat32(16777217 + 2 ** -28).stored, 16777218);
  assert.equal(inspectFloat32(-16777217).stored, -16777216);
  assert.equal(inspectFloat32(-16777219).stored, -16777220);
});

test('neighbor spacing changes at a power of two and respects numerical order', () => {
  const positive = inspectFloat32(16777216);
  assert.equal(positive.previous, 16777215);
  assert.equal(positive.next, 16777218);
  const negative = inspectFloat32(-16777216);
  assert.equal(negative.previous, -16777218);
  assert.equal(negative.next, -16777215);
  for (const zero of [0, -0]) {
    const detail = inspectFloat32(zero);
    assert.equal(detail.previous, -(2 ** -149));
    assert.equal(detail.next, 2 ** -149);
    assert.equal(detail.negativeZero, Object.is(zero, -0));
  }
});

test('subnormals, halfway underflow, signed zero, and the next representable input stay distinct', () => {
  const least = inspectFloat32(2 ** -149);
  assert.equal(least.hex, '00000001');
  assert.equal(least.classification, 'subnormal');
  equalsRatio(least.storedExact, 1n, 1n << 149n);
  assert.equal(inspectFloat32(2 ** -150).stored, 0);
  assert.equal(inspectFloat32(2 ** -150 + 2 ** -202).stored, 2 ** -149);
  assert.equal(inspectFloat32(-(2 ** -150)).hex, '80000000');
  assert.ok(Object.is(inspectFloat32(-(2 ** -149)).next, -0));
});

test('overflow is explicit and is not reported as a finite exact reference', () => {
  const limit = 2 ** 128 - 2 ** 103;
  assert.equal(inspectFloat32(limit - 2 ** 75).hex, '7f7fffff');
  const overflow = inspectFloat32(limit);
  assert.equal(overflow.hex, '7f800000');
  assert.equal(overflow.classification, 'infinity');
  assert.equal(overflow.storedExact, null);
  assert.equal(overflow.signedError, null);
  assert.equal(overflow.next, null);
  assert.equal(overflow.previous, 2 ** 128 - 2 ** 104);
  assert.equal(inspectFloat32(-(2 ** 128)).next, -(2 ** 128 - 2 ** 104));
});

test('association changes the result at actual rounding boundaries and keeps the exact control', () => {
  const cancellation = associationExperiment('cancellation');
  assert.deepEqual(cancellation.storedInputs, [100000000, -100000000, 1]);
  assert.equal(cancellation.leftIntermediate, 0);
  assert.equal(cancellation.rightIntermediate, -100000000);
  assert.equal(cancellation.left, 1);
  assert.equal(cancellation.right, 0);
  equalsRatio(cancellation.exactStoredSum, 1n);
  const gap = associationExperiment('integer-gap');
  assert.equal(gap.left, 0);
  assert.equal(gap.right, 1);
  equalsRatio(gap.exactStoredSum, 1n);
  const control = associationExperiment('exact-control');
  assert.equal(control.left, 1);
  assert.equal(control.right, 1);
});

const storedSource = [
  [0, 0],
  [11744051 / 8388608, 13421773 / 8388608],
  [5452595 / 2097152, 7130317 / 2097152],
];
const sourceNumerator = 11744051n * 7130317n - 13421773n * 5452595n;
const sourceDenominator = 8388608n * 2097152n;

test('zero-origin control distinguishes intended decimal geometry from its binary32 input', () => {
  const control = triangleExperiment({ translation: 0 });
  assert.deepEqual(control.source, storedSource);
  assert.deepEqual(control.stored, storedSource);
  equalsRatio(control.intendedDoubleArea, 3n, 5n);
  equalsRatio(control.sourceDoubleArea, sourceNumerator, sourceDenominator);
  equalsRatio(control.storedDoubleArea, sourceNumerator, sourceDenominator);
  assert.equal(control.orientation, 'preserved');
  for (const point of control.exactCoordinateErrors) for (const error of point) equalsRatio(error, 0n);
});

test('the original production counterexample retains its actual nonzero reversed winding', () => {
  const result = triangleExperiment();
  assert.deepEqual(result.source, storedSource);
  assert.deepEqual(result.stored, [[10000000, 10000000], [10000001, 10000002], [10000003, 10000003]]);
  assert.deepEqual(result.relativeStored, [[0, 0], [1, 2], [3, 3]]);
  assert.equal(result.orientation, 'reversed');
  equalsRatio(result.storedDoubleArea, -3n);
  equalsRatio(result.sourceDoubleArea, sourceNumerator, sourceDenominator);
  equalsRatio(result.localStorageDoubleArea, sourceNumerator, sourceDenominator);
  assert.equal(result.nextOriginGap, 1);
  assert.ok(sourceNumerator > 0n);
});

test('larger origins are not a monotonic conditioning score or a fidelity guarantee', () => {
  const sameWinding = triangleExperiment({ translation: 16777216 });
  assert.equal(sameWinding.orientation, 'preserved');
  assert.deepEqual(sameWinding.relativeStored, [[0, 0], [2, 2], [2, 4]]);
  equalsRatio(sameWinding.storedDoubleArea, 4n);
  assert.notDeepEqual(sameWinding.plotSource, sameWinding.plotStored);
  const collapsed = triangleExperiment({ translation: 67108864 });
  assert.equal(collapsed.orientation, 'collapsed');
  assert.deepEqual(collapsed.relativeStored, [[0, 0], [0, 0], [0, 0]]);
  equalsRatio(collapsed.storedDoubleArea, 0n);
});

test('a bounded power-of-two change of all units preserves the reversal and relative shape', () => {
  const base = triangleExperiment();
  for (let exponent = -8; exponent <= 8; exponent += 1) {
    const result = triangleExperiment({ unitExponent: exponent });
    assert.equal(result.orientation, 'reversed');
    assert.deepEqual(result.plotStored, [[0, 0], [1, 2], [3, 3]]);
    assert.deepEqual(result.plotSource, storedSource);
    if (exponent < 0) equalsRatio(result.storedDoubleArea, -3n, 1n << BigInt(-2 * exponent));
    else equalsRatio(result.storedDoubleArea, -3n * (1n << BigInt(2 * exponent)));
    assert.ok(Math.abs(result.shapeSine - base.shapeSine) < 1e-15);
  }
});

test('invalid controls cannot admit a different numeric model', () => {
  for (const value of ['1', null, NaN, Infinity, -Infinity]) {
    assert.throws(() => inspectFloat32(value), TypeError);
  }
  for (const translation of [-1, 0.5, 67108865, '10000000', Infinity]) {
    assert.throws(() => triangleExperiment({ translation }), RangeError);
  }
  for (const unitExponent of [-9, 9, 0.1, null, '1']) {
    assert.throws(() => triangleExperiment({ unitExponent }), RangeError);
  }
  assert.throws(() => associationExperiment('unowned-case'), RangeError);
});

test('downloaded experiment keeps exact fractions and the stated storage boundary', () => {
  const parameters = { translation: 10000000, unitExponent: -2 };
  const text = serializeTriangleReport(parameters);
  const parsed = JSON.parse(text);
  assert.equal(parsed.format, 'recallweave-floating-point-experiment/1');
  equalsRatio(parsed.experiment.storedDoubleArea, -3n, 16n);
  assert.equal(parsed.experiment.orientation, 'reversed');
  assert.match(parsed.interpretation.area, /twice the signed triangle area/);
  assert.match(parsed.interpretation.localAlternative, /origin stays separate/);
  assert.equal(text, serializeTriangleReport(parameters));
  assert.deepEqual(parameters, { translation: 10000000, unitExponent: -2 });
  assert.ok(Buffer.byteLength(text) < 16000);
});
