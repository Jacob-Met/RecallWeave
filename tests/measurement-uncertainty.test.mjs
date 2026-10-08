import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReadings, parseMeasurementNumber, summarizeMeasurements, projectUncertainty } from '../src/measurement-uncertainty.mjs';

const close = (actual, expected, label = '') => assert.ok(
  Math.abs(actual - expected) <= Math.max(Number.MIN_VALUE, Math.abs(expected) * 3e-15),
  `${label}: ${actual} differs from ${expected}`);

test('worked four-reading budget distinguishes raw mean, correction, sample scatter and mean uncertainty', () => {
  const result = summarizeMeasurements({ readings: [8, 10, 10, 12], correction: -0.4, calibrationHalfWidth: 0.3 });
  assert.equal(result.n, 4);
  assert.equal(result.rawMean, 10);
  assert.equal(result.correctedMean, 9.6);
  close(result.sampleSD, Math.sqrt(8 / 3));
  close(result.meanUncertainty, Math.sqrt(2 / 3));
  close(result.calibrationUncertainty, Math.sqrt(0.03));
  close(result.combinedUncertainty, Math.sqrt(2 / 3 + 0.03));
});

test('a shared additive correction shifts the estimate without changing either uncertainty component', () => {
  const readings = [9, 11, 9.5, 10.5];
  const original = summarizeMeasurements({ readings, correction: 0, calibrationHalfWidth: 0.1 });
  const shifted = summarizeMeasurements({ readings, correction: 7, calibrationHalfWidth: 0.1 });
  assert.equal(shifted.correctedMean, original.correctedMean + 7);
  for (const key of ['rawMean', 'sampleSD', 'meanUncertainty', 'calibrationUncertainty', 'combinedUncertainty']) assert.equal(shifted[key], original[key]);
});

test('identical readings retain a nonzero shared component and are not rejected for numerical repetition', () => {
  const result = summarizeMeasurements({ readings: [10, 10, 10, 10, 10], calibrationHalfWidth: 0.3 });
  assert.equal(result.sampleSD, 0);
  assert.equal(result.meanUncertainty, 0);
  close(result.combinedUncertainty, 0.3 / Math.sqrt(3));
});

test('future independent sample sizes hold shared calibration fixed while repeatability shrinks by square root', () => {
  const points = projectUncertainty({ sampleSD: 0.6, calibrationHalfWidth: 0.4 * Math.sqrt(3), sampleSizes: [4, 16, 400] });
  close(points[0].meanUncertainty, 0.3);
  close(points[1].meanUncertainty, 0.15);
  close(points[0].combinedUncertainty, 0.5);
  close(points[1].combinedUncertainty, Math.sqrt(0.1825));
  for (const point of points) {
    close(point.calibrationUncertainty, 0.4);
    assert.ok(point.combinedUncertainty >= point.calibrationUncertainty);
  }
});

test('shared covariance gives the same calibration contribution for a mean of any sample size', () => {
  const u = 0.2;
  for (const n of [2, 5, 20, 100]) {
    const varianceFromCovariances = (n * u * u + n * (n - 1) * u * u) / (n * n);
    const [point] = projectUncertainty({ sampleSD: 0, calibrationHalfWidth: u * Math.sqrt(3), sampleSizes: [n] });
    close(point.combinedUncertainty, Math.sqrt(varianceFromCovariances));
  }
});

test('compensated raw means preserve small residuals after large opposing readings cancel', () => {
  for (const readings of [[1e9, -1e9, 1], [1e9, -1e9, 1e-12], [1e-12, 1e9, -1e9]]) {
    const expected = readings.includes(1) ? 1 / 3 : 1e-12 / 3;
    const result = summarizeMeasurements({ readings });
    assert.equal(result.rawMean, expected);
    assert.equal(result.correctedMean, expected);
  }
});

test('centered scatter remains meaningful for a large shared offset and at supported extremes', () => {
  const highOffset = summarizeMeasurements({ readings: [999999998, 999999999, 1e9] });
  assert.equal(highOffset.rawMean, 999999999);
  close(highOffset.sampleSD, 1);
  const extremes = summarizeMeasurements({ readings: [-1e9, 1e9] });
  close(extremes.sampleSD, Math.SQRT2 * 1e9);
  close(extremes.meanUncertainty, 1e9);
  const tiny = summarizeMeasurements({ readings: [-1e-12, 1e-12] });
  close(tiny.sampleSD, Math.SQRT2 * 1e-12);
});

test('reordering observations preserves the summary but does not assert statistical independence', () => {
  const forward = summarizeMeasurements({ readings: [9.8, 9.9, 10, 10.1, 10.2] });
  const permuted = summarizeMeasurements({ readings: [10.2, 9.8, 10, 10.1, 9.9] });
  for (const key of ['rawMean', 'sampleSD', 'meanUncertainty', 'combinedUncertainty']) close(forward[key], permuted[key]);
  assert.notDeepEqual(forward.readings, permuted.readings);
  assert.equal('independent' in forward, false);
});

test('input parsing keeps every observation and refuses malformed or missing comma fields', () => {
  assert.deepEqual(parseReadings(' 1e1,\n +10.2 9.8\n.5 '), [10, 10.2, 9.8, 0.5]);
  for (const text of ['', '1', '1,,2', ',1,2', '1,2,', '1, nope, 2', '1,2mm', '0x10,20', '1,Infinity', '1,NaN']) assert.throws(() => parseReadings(text), Error, text);
  assert.throws(() => parseReadings(Array(101).fill('1').join(',')), /2–100/);
  assert.equal(parseReadings(Array(100).fill('1').join(',')).length, 100);
});

test('supported magnitude and nonnegative half-width boundaries are explicit', () => {
  for (const text of ['0', '-0', '0e-9999']) assert.equal(parseMeasurementNumber(text), 0);
  assert.equal(parseMeasurementNumber('1e-12'), 1e-12);
  assert.equal(parseMeasurementNumber('-1e9'), -1e9);
  for (const text of ['1e-400', '1e-13', '1e10', '1e999', '−1', '1,000']) assert.throws(() => parseMeasurementNumber(text));
  assert.throws(() => parseMeasurementNumber('-0.1', 'Half-width', true), /zero or positive/);
  assert.throws(() => summarizeMeasurements({ readings: [1, 2], calibrationHalfWidth: -1 }));
});

test('public calculations reject missing observations and invalid forecast counts', () => {
  for (const readings of [[1], new Array(2), [1, NaN], [1, Infinity], ['1', 2]]) assert.throws(() => summarizeMeasurements({ readings }));
  for (const sampleSizes of [[1], [2.5], [10001], new Array(2), []]) assert.throws(() => projectUncertainty({ sampleSD: 1, calibrationHalfWidth: 0, sampleSizes }));
  for (const sampleSD of [-1, NaN, Infinity]) assert.throws(() => projectUncertainty({ sampleSD, calibrationHalfWidth: 0, sampleSizes: [2] }));
});

test('calculation snapshots do not mutate caller arrays or change after later edits', () => {
  const readings = [1, 2, 3];
  const before = [...readings];
  const result = summarizeMeasurements({ readings });
  assert.deepEqual(readings, before);
  readings[0] = 999;
  assert.deepEqual(result.readings, before);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.readings));
  const projection = projectUncertainty({ sampleSD: 1, calibrationHalfWidth: 0.1, sampleSizes: [2, 8] });
  assert.ok(Object.isFrozen(projection));
  assert.ok(projection.every(Object.isFrozen));
});
