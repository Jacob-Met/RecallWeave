import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseConvolutionSequence, finiteConvolution, convolutionStep,
  createConvolutionRecord, formatConvolutionValue
} from '../src/finite-convolution.mjs';

test('full signed convolution retains cancellation and the final product', () => {
  assert.deepEqual(finiteConvolution([2, -1, 3], [1, 2]), [2, 3, 1, 6]);
  assert.deepEqual(finiteConvolution([1, 2], [3, -1, 2]), [3, 5, 0, 4]);
});

test('each selected index exposes reversed kernel indices and outside-list zeros', () => {
  const x = [2, -1, 3], h = [1, 2];
  const rows = n => convolutionStep(x, h, n).terms.map(t => [t.k, t.input, t.kernelIndex, t.kernel, t.product, t.inKernel]);
  assert.deepEqual(rows(0), [[0, 2, 0, 1, 2, true], [1, -1, -1, 0, 0, false], [2, 3, -2, 0, 0, false]]);
  assert.deepEqual(rows(1), [[0, 2, 1, 2, 4, true], [1, -1, 0, 1, -1, true], [2, 3, -1, 0, 0, false]]);
  assert.deepEqual(rows(2), [[0, 2, 2, 0, 0, false], [1, -1, 1, 2, -2, true], [2, 3, 0, 1, 3, true]]);
  assert.deepEqual(rows(3), [[0, 2, 3, 0, 0, false], [1, -1, 2, 0, 0, false], [2, 3, 1, 2, 6, true]]);
  assert.deepEqual([0, 1, 2, 3].map(n => convolutionStep(x, h, n).value), [2, 3, 1, 6]);
});

test('convolution is distinguished from the declared zero-lag correlation', () => {
  const x = [1, 2], h = [3, 4];
  assert.deepEqual(finiteConvolution(x, h), [3, 10, 8]);
  assert.equal(x[0] * h[0] + x[1] * h[1], 11);
  assert.notEqual(convolutionStep(x, h, 0).value, 11);
});

test('impulses preserve origin, delays, and the declared full zero padding', () => {
  assert.deepEqual(finiteConvolution([2, -1, 3], [1]), [2, -1, 3]);
  assert.deepEqual(finiteConvolution([2, -1, 3], [0, 1]), [0, 2, -1, 3]);
  assert.deepEqual(finiteConvolution([2, -1, 3], [0, 0, 1]), [0, 0, 2, -1, 3]);
  assert.deepEqual(finiteConvolution([1, 0, 0], [2, -1]), [2, -1, 0, 0]);
  assert.deepEqual(finiteConvolution([0, 1, 0], [2, -1]), [0, 2, -1, 0]);
  assert.deepEqual(finiteConvolution([0, 0], [0, 0, 0]), [0, 0, 0, 0]);
});

test('averaging and differencing include both finite boundaries', () => {
  assert.deepEqual(finiteConvolution([0, 4, 0], [0.5, 0.5]), [0, 2, 2, 0]);
  assert.deepEqual(finiteConvolution([2, 2, 2], [1, -1]), [2, 0, 0, -2]);
  assert.deepEqual(finiteConvolution([2, 2, 2, 2], [1, -1]), [2, 0, 0, 0, -2]);
});

test('fixed-kernel superposition and operand exchange hold on distinct signed cases', () => {
  const cases = [
    [[1, 2], [3, -1], [1, 1]],
    [[-2, 0, 3], [1, 4, -3], [-1, 2]],
    [[0.25, -0.5], [0.5, 1], [0.5, -0.25, 1]]
  ];
  for (const [x, z, h] of cases) {
    const a = finiteConvolution(x, h), b = finiteConvolution(z, h);
    assert.deepEqual(finiteConvolution(x, h), finiteConvolution(h, x));
    assert.deepEqual(finiteConvolution(x.map((v, i) => v + z[i]), h), a.map((v, i) => v + b[i]));
  }
});

test('four-place inputs preserve eight-place signed products and exact cancellation', () => {
  const output = finiteConvolution([0.0001, -0.0001], [0.0001, 0.0001]);
  assert.deepEqual(output, [0.00000001, 0, -0.00000001]);
  assert.deepEqual(output.map(formatConvolutionValue), ['0.00000001', '0', '-0.00000001']);
  assert.equal(formatConvolutionValue(-0), '0');
  assert.equal(formatConvolutionValue(240000), '240000');
  assert.equal(formatConvolutionValue(1.25), '1.25');
  assert.equal(formatConvolutionValue(1e30), '1e+30');
  assert.equal(formatConvolutionValue(-1e30), '-1e+30');
});

test('the maximum admitted lists retain 47 finite outputs and the exact peak', () => {
  const input = Array(24).fill(100);
  const output = finiteConvolution(input, input);
  assert.equal(output.length, 47);
  assert.deepEqual(output, Array.from({ length: 47 }, (_, n) => (n < 24 ? n + 1 : 47 - n) * 10000));
  const middle = convolutionStep(input, input, 23);
  assert.equal(middle.value, 240000);
  assert.equal(middle.terms.length, 24);
  assert.ok(middle.terms.every(term => term.product === 10000 && term.inKernel));
});

test('text admission keeps literal values and refuses ambiguous or out-of-domain input', () => {
  assert.deepEqual(parseConvolutionSequence(' -0, +.5\n1.2300 '), [0, 0.5, 1.23]);
  assert.deepEqual(parseConvolutionSequence('001 -100 100.0000'), [1, -100, 100]);
  assert.deepEqual(parseConvolutionSequence('1,2 3'), [1, 2, 3]);
  for (const input of ['', ' ', '1,,2', '1,', ',1', '[1,2]', '1e1', '0x10', 'Infinity', 'NaN', '1.00001', '100.0001', '-100.0001', 'true', '--2', '.', '1;2', '1 2'.repeat(1500), Array(25).fill('1').join(',')]) {
    assert.throws(() => parseConvolutionSequence(input), RangeError, input.slice(0, 80));
  }
});

test('direct numerical callers cannot admit holes, non-numbers, extra precision, or invalid indices', () => {
  for (const x of [null, [], ['1'], [NaN], [Infinity], [100.0001], [1.23456], new Array(2), Array(25).fill(1)]) {
    assert.throws(() => finiteConvolution(x, [1]), RangeError);
    assert.throws(() => createConvolutionRecord([1], x), RangeError);
  }
  for (const n of [-1, 1.5, 3, NaN, '0']) assert.throws(() => convolutionStep([1, 2], [1, 1], n), RangeError);
  assert.throws(() => formatConvolutionValue(Infinity), RangeError);
});

test('a recorded calculation owns immutable inputs, outputs, and per-index terms', () => {
  const x = [2, -1, 3], h = [1, 2];
  const record = createConvolutionRecord(x, h);
  x[0] = 99; h.push(4);
  assert.deepEqual(record.x, [2, -1, 3]);
  assert.deepEqual(record.h, [1, 2]);
  assert.deepEqual(record.y, [2, 3, 1, 6]);
  assert.deepEqual(record.steps.map(step => step.value), record.y);
  assert.equal(record.format, 'recallweave-finite-convolution/1');
  assert.throws(() => { record.steps[1].terms[0].product = 100; }, TypeError);
  const roundTrip = JSON.parse(JSON.stringify(record));
  assert.deepEqual(roundTrip, record);
});
