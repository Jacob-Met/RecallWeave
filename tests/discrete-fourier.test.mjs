import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeFourier, parseFourierSamples, serializeFourierRecord, FOURIER_FORMAT } from '../src/discrete-fourier.mjs';

const close = (actual, expected, tolerance = 1e-10) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, actual + ' differs from ' + expected);

test('decimal/scientific parser accepts mixed separators without evaluating expressions', () => {
  assert.deepEqual(parseFourierSamples('  +1, -.5 \n 2.5e-1, 0.  '), [1, -0.5, 0.25, 0]);
  for (const text of ['', '1,,2,3,4', ',1,2,3,4', '1,2,3,4,', '1 2 3',
    '1/2 0 0 0', '0x10 0 0 0', 'Infinity 0 0 0', 'NaN 0 0 0', '1e309 0 0 0',
    '1001 0 0 0', '0 0 0 0 ' + ' '.repeat(4096)]) {
    assert.throws(() => parseFourierSamples(text), undefined, text);
  }
});

test('admission refuses sparse, nonnumeric and unsupported arrays', () => {
  for (const samples of [null, '1 2 3 4', [], [1, 2, 3], [1, 2, 3, 4, 5],
    [1, 2, 3, '4'], [1, 2, 3, NaN], [1, 2, 3, Infinity], [1, 2, 3, -1001],
    new Array(4), new Float64Array(4)]) assert.throws(() => analyzeFourier(samples));
  for (const N of [4, 8, 16]) {
    const record = analyzeFourier(Array.from({ length: N }, (_, n) => n % 2 ? -1000 : 1000));
    assert.equal(record.N, N);
    assert.ok(Number.isFinite(record.coefficientEnergy));
    assert.ok(record.maxResidual < 1e-10);
  }
});

test('real-input transform is linear and inverse round-trips an asymmetric grid', () => {
  for (const N of [4, 8, 16]) {
    const a = Array.from({ length: N }, (_, n) => ((n * 7) % 11 - 5) / 3);
    const b = Array.from({ length: N }, (_, n) => ((n * n + 3) % 7 - 2) / 5);
    const A = analyzeFourier(a), B = analyzeFourier(b);
    const sum = analyzeFourier(a.map((value, n) => 2 * value - 3 * b[n]));
    sum.bins.forEach((bin, k) => {
      close(bin.real, 2 * A.bins[k].real - 3 * B.bins[k].real);
      close(bin.imaginary, 2 * A.bins[k].imaginary - 3 * B.bins[k].imaginary);
    });
    sum.reconstruction.forEach((point, n) => close(point.real, sum.samples[n]));
    close(sum.coefficientEnergy, sum.inputEnergy);
    assert.ok(sum.maxImaginaryResidual < 1e-10);
  }
});

test('interior selection preserves the conjugate pair and acts as a projection', () => {
  const samples = [2, -1, 0.5, 4, 0, 2, -3, 1];
  const selected = analyzeFourier(samples, { selectedPairs: [3, 1] });
  assert.deepEqual(selected.selectedPairs, [1, 3]);
  const projected = analyzeFourier(selected.reconstruction.map(point => point.real), { selectedPairs: [1, 3] });
  projected.reconstruction.forEach((point, n) => close(point.real, selected.reconstruction[n].real));
  assert.ok(selected.reconstructionEnergy <= selected.inputEnergy + 1e-10);
  assert.ok(selected.maxImaginaryResidual < 1e-10);
  for (const k of [1, 3]) {
    close(selected.bins[k].real, selected.bins[8 - k].real);
    close(selected.bins[k].imaginary, -selected.bins[8 - k].imaginary);
  }
});

test('empty selection is explicit zero synthesis, not select-all', () => {
  const record = analyzeFourier([1, -1, 1, -1], { selectedPairs: [] });
  assert.deepEqual(record.selectedPairs, []);
  assert.ok(record.reconstruction.every(point => point.real === 0 && point.imaginary === 0));
  close(record.rmsResidual, 1);
  close(record.reconstructionEnergy, 0);
  for (const selectedPairs of [[1, 1], [-1], [3], [0.5], ['1'], [NaN], 'all', new Array(1)]) {
    assert.throws(() => analyzeFourier([1, 0, -1, 0], { selectedPairs }));
  }
});

test('phase resolution is declared without clamping complex coefficients', () => {
  const zero = analyzeFourier([0, 0, 0, 0]);
  assert.ok(zero.phaseResolution > 0);
  assert.ok(zero.bins.every(bin => !bin.phaseResolved && bin.phaseRadians === null));
  const tiny = analyzeFourier([1e-100, 0, 0, 0]);
  assert.ok(tiny.bins.every(bin => bin.phaseResolved && bin.magnitude > tiny.phaseResolution));
  const cosine = analyzeFourier([1, 0, -1, 0]);
  assert.ok(cosine.bins.some(bin => !bin.phaseResolved && bin.magnitude > 0),
    'roundoff-size raw coefficients should remain inspectable');
});

test('records copy caller inputs and serialize only regenerated portable calculations', () => {
  const samples = [1, 0, -1, 0], pairs = [1];
  const record = analyzeFourier(samples, { selectedPairs: pairs });
  samples[0] = 99; pairs.push(0);
  assert.deepEqual(record.samples, [1, 0, -1, 0]);
  assert.deepEqual(record.selectedPairs, [1]);
  assert.ok(Object.isFrozen(record) && Object.isFrozen(record.bins) && Object.isFrozen(record.bins[0]));
  const portable = JSON.parse(serializeFourierRecord(record));
  assert.equal(portable.format, FOURIER_FORMAT);
  assert.deepEqual(portable, JSON.parse(JSON.stringify(record)));
  const stale = { ...record, maxResidual: 999, identity: 'not part of this format' };
  assert.deepEqual(JSON.parse(serializeFourierRecord(stale)), portable);
  assert.throws(() => serializeFourierRecord({ ...record, format: 'unknown' }));
  assert.throws(() => serializeFourierRecord({ ...record, samples: [Infinity, 0, 0, 0] }));
});
