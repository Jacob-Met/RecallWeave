import test from 'node:test';
import assert from 'node:assert/strict';
import { INFORMATION_EXAMPLES, parseInformationCounts, analyzeInformationTable } from '../src/information-theory.mjs';

function close(actual, expected, tolerance = 5e-13) {
  assert.ok(Number.isFinite(actual), 'Information value must be finite: ' + actual);
  assert.ok(Math.abs(actual - expected) <= tolerance, actual + ' differs from ' + expected);
}
function exactFraction(actual, numerator, denominator) {
  assert.equal(actual.numerator, numerator);
  assert.equal(actual.denominator, denominator);
}
function finiteTree(value) {
  if (typeof value === 'number') assert.ok(Number.isFinite(value));
  if (value && typeof value === 'object') Object.values(value).forEach(finiteTree);
}

test('noisy correspondence keeps exact probabilities and signed cell information', () => {
  const a = analyzeInformationTable([[3, 1], [1, 3]]);
  assert.equal(a.total, 8);
  exactFraction(a.cells[1].probability, 1, 8);
  exactFraction(a.cells[1].independentProbability, 1, 4);
  close(a.cells[1].pointwiseInformationBits, -1);
  close(a.cells[1].signedContributionBits, -0.125);
  close(a.metrics.entropyXBits, 1);
  close(a.metrics.entropyYBits, 1);
  close(a.metrics.jointEntropyBits, 1.8112781244591328);
  close(a.metrics.conditionalYGivenXBits, 0.8112781244591328);
  close(a.metrics.mutualInformationBits, 0.18872187554086717);
  assert.equal(a.independence.exact, false);
});

test('a rare observation raises its own entropy while the weighted average falls', () => {
  const a = analyzeInformationTable([[8, 0], [1, 1]]);
  exactFraction(a.rows[1].probability, 1, 5);
  exactFraction(a.rows[1].conditionalY.probabilities[0], 1, 2);
  close(a.rows[1].conditionalY.entropyBits, 1);
  close(a.rows[1].conditionalY.weightedEntropyBits, 0.2);
  close(a.metrics.entropyYBits, 0.4689955935892812);
  close(a.metrics.conditionalYGivenXBits, 0.2);
  assert.ok(a.rows[1].conditionalY.entropyBits > a.metrics.entropyYBits);
  assert.ok(a.metrics.conditionalYGivenXBits < a.metrics.entropyYBits);
});

test('deterministic grouping distinguishes the two conditional directions', () => {
  const a = analyzeInformationTable([[1, 0], [1, 0], [0, 1], [0, 1]]);
  close(a.metrics.entropyXBits, 2);
  close(a.metrics.entropyYBits, 1);
  close(a.metrics.conditionalYGivenXBits, 0);
  close(a.metrics.conditionalXGivenYBits, 1);
  close(a.metrics.jointEntropyBits, 2);
  close(a.metrics.mutualInformationBits, 1);
  const swapped = analyzeInformationTable([[1, 1, 0, 0], [0, 0, 1, 1]]);
  close(swapped.metrics.mutualInformationBits, a.metrics.mutualInformationBits);
  close(swapped.metrics.conditionalYGivenXBits, a.metrics.conditionalXGivenYBits);
});

test('zero cells and impossible observations retain distinct meanings in JSON', () => {
  const a = analyzeInformationTable([[1, 0, 0], [1, 0, 0], [0, 0, 0]]);
  assert.equal(a.rows[2].conditionalY.defined, false);
  assert.equal(a.rows[2].conditionalY.probabilities, null);
  assert.equal(a.rows[2].conditionalY.entropyBits, null);
  assert.equal(a.rows[2].conditionalY.weightedEntropyBits, 0);
  assert.equal(a.columns[1].conditionalX.defined, false);
  assert.equal(a.cells[1].zeroProbability, true);
  assert.equal(a.cells[1].surprisalBits, null);
  assert.equal(a.cells[1].pointwiseInformationBits, null);
  assert.equal(a.cells[1].entropyContributionBits, 0);
  assert.equal(a.cells[1].signedContributionBits, 0);
  close(a.metrics.entropyYBits, 0);
  close(a.metrics.mutualInformationBits, 0);
  assert.equal(a.independence.exact, true);
  finiteTree(a);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
});

test('independence is exact and need not be uniform', () => {
  const a = analyzeInformationTable([[1, 2], [2, 4]]);
  assert.deepEqual(a.cells.map(c => [c.jointCrossProduct, c.marginalCrossProduct]), [[9, 9], [18, 18], [18, 18], [36, 36]]);
  assert.equal(a.independence.exact, true);
  assert.deepEqual(a.independence.factorizationDifferences, []);
  assert.equal(a.metrics.mutualInformationBits, 0);
  // In a larger table, even a matching unique largest cell is insufficient.
  const b = analyzeInformationTable([[4, 2, 2], [2, 2, 0], [2, 0, 2]]);
  assert.equal(b.cells[0].jointCrossProduct, b.cells[0].marginalCrossProduct);
  assert.equal(b.independence.exact, false);
});

test('determinant-one dependence stays positive despite rounded entropy cancellation', () => {
  const a = analyzeInformationTable([[998, 999], [997, 998]]);
  assert.equal(a.total, 3992);
  assert.equal(a.cells[0].jointCrossProduct, 3984016);
  assert.equal(a.cells[0].marginalCrossProduct, 3984015);
  assert.equal(a.independence.exact, false);
  assert.equal(a.independence.factorizationDifferences.length, 4);
  assert.ok(a.metrics.mutualInformationBits > 0);
  // Independent 90-digit Decimal oracle; this case tests the cancellation boundary.
  close(a.metrics.mutualInformationBits, 4.544672721013876e-14, 2e-25);
  assert.equal(a.metrics.mutualInformationBits.toFixed(6), '0.000000');
});

test('analysis is detached and deeply immutable, while uniform scaling changes no distribution', () => {
  const input = [[1, 0], [0, 1]];
  const a = analyzeInformationTable(input);
  input[0][0] = 999;
  assert.equal(a.counts[0][0], 1);
  assert.throws(() => { a.rows[0].conditionalY.probabilities[0].numerator = 9; }, TypeError);
  assert.throws(() => { a.cells.push({}); }, TypeError);
  const b = analyzeInformationTable([[9, 0], [0, 9]]);
  assert.deepEqual(a.metrics, b.metrics);
  exactFraction(a.cells[0].probability, 1, 2);
  assert.equal(Object.isFrozen(a.counts[0]), true);
});

test('text parsing accepts bounded ordinary counts and refuses ambiguous or invalid tables', () => {
  assert.deepEqual(parseInformationCounts(' \r\n1\t2  3\r\n4 5 6\r\n'), [[1, 2, 3], [4, 5, 6]]);
  for (const text of ['', '1 2', '0 0\n0 0', '1 2\n3', '1 2\n\n3 4', '01 2\n3 4',
    '-0 2\n3 4', '1e2 2\n3 4', '1.5 2\n3 4', '1000 2\n3 4', '1 2 3 4 5\n1 2 3 4 5',
    '1 2\n3 4\n5 6\n7 8\n9 1', ' '.repeat(513)]) {
    assert.throws(() => parseInformationCounts(text), RangeError, JSON.stringify(text));
  }
  for (const input of [null, [[true, 1], [1, 1]], [[NaN, 1], [1, 1]], [[Infinity, 1], [1, 1]],
    [[0.5, 1], [1, 1]], [[-1, 1], [1, 1]], [[1, , 1], [1, 1, 1]], [[1, 2], [3]], [[0, 0], [0, 0]]]) {
    assert.throws(() => analyzeInformationTable(input), RangeError);
  }
  assert.equal(Object.is(analyzeInformationTable([[-0, 1], [1, 1]]).counts[0][0], -0), false);
});

test('every authored example and maximum-size table remains finite and serializable', () => {
  assert.equal(INFORMATION_EXAMPLES.length, 10);
  assert.equal(new Set(INFORMATION_EXAMPLES.map(e => e.id)).size, 10);
  for (const example of INFORMATION_EXAMPLES) {
    const a = analyzeInformationTable(parseInformationCounts(example.text));
    finiteTree(a);
    assert.ok(a.total > 0);
    assert.equal(Object.isFrozen(example), true);
  }
  const max = analyzeInformationTable(Array.from({ length: 4 }, () => [999, 999, 999, 999]));
  assert.equal(max.total, 15984);
  close(max.metrics.entropyXBits, 2);
  close(max.metrics.entropyYBits, 2);
  close(max.metrics.jointEntropyBits, 4);
  close(max.metrics.mutualInformationBits, 0);
  assert.equal(max.independence.exact, true);
});
