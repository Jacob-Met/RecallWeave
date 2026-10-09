import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeLinkage, LINKAGE_ASSUMPTIONS } from '../src/genetic-linkage.mjs';

const value = fraction => fraction.numerator / fraction.denominator;
const deeplyFrozen = node => {
  if (node && typeof node === 'object') {
    assert.ok(Object.isFrozen(node));
    for (const child of Object.values(node)) deeplyFrozen(child);
  }
};
test('coupling testcross has exact asymmetric weights and the fixed offspring mapping', () => {
  const result = analyzeLinkage({ phase: 'coupling', recombinationPercent: 20 });
  assert.deepEqual(result.rows.map(row => [row.gamete, row.kind, row.probability, row.offspringGenotype]), [
    ['AB', 'parental', { numerator: 2, denominator: 5 }, 'AaBb'],
    ['Ab', 'recombinant', { numerator: 1, denominator: 10 }, 'Aabb'],
    ['aB', 'recombinant', { numerator: 1, denominator: 10 }, 'aaBb'],
    ['ab', 'parental', { numerator: 2, denominator: 5 }, 'aabb']
  ]);
  assert.deepEqual(result.parent, { genotype: 'AaBb', homologs: ['AB', 'ab'] });
  assert.deepEqual(result.tester, { genotype: 'aabb', gamete: 'ab' });
});
test('phase switches joint classes without changing allele marginals', () => {
  const a = analyzeLinkage({ phase: 'coupling', recombinationPercent: 30 });
  const b = analyzeLinkage({ phase: 'repulsion', recombinationPercent: 30 });
  assert.deepEqual(b.parent.homologs, ['Ab', 'aB']);
  assert.deepEqual(b.rows.map(row => row.probability), [a.rows[1].probability, a.rows[0].probability, a.rows[0].probability, a.rows[1].probability]);
  assert.deepEqual(a.marginals, b.marginals);
  for (const entry of Object.values(b.marginals)) assert.deepEqual(entry, { numerator: 1, denominator: 2 });
});
test('all 102 allowed crosses conserve probability and exact category totals', () => {
  for (const phase of ['coupling', 'repulsion']) {
    for (let percent = 0; percent <= 50; percent++) {
      const result = analyzeLinkage({ phase, recombinationPercent: percent });
      const weights = result.rows.map(row => row.probability.numerator * (200 / row.probability.denominator));
      assert.equal(weights.reduce((a, b) => a + b), 200);
      assert.equal(result.rows.reduce((sum, row, i) => sum + (row.kind === 'recombinant' ? weights[i] : 0), 0), 2 * percent);
      assert.equal(value(result.totals.recombinant), percent / 100);
      assert.equal(value(result.totals.parental), (100 - percent) / 100);
      assert.deepEqual(result.totals.all, { numerator: 1, denominator: 1 });
      for (const row of result.rows) {
        assert.ok(Number.isSafeInteger(row.probability.numerator));
        assert.ok(Number.isSafeInteger(row.probability.denominator));
      }
      assert.equal(result.independentComparison.matches, percent === 50);
      deeplyFrozen(result);
    }
  }
});
test('zero rows remain and 50 matches independent probabilities in either phase', () => {
  const zero = analyzeLinkage({ phase: 'repulsion', recombinationPercent: -0 });
  assert.ok(Object.is(zero.input.recombinationPercent, 0));
  assert.deepEqual(zero.rows.map(row => row.probability), [
    { numerator: 0, denominator: 1 }, { numerator: 1, denominator: 2 },
    { numerator: 1, denominator: 2 }, { numerator: 0, denominator: 1 }
  ]);
  for (const phase of ['coupling', 'repulsion']) {
    const fifty = analyzeLinkage({ phase, recombinationPercent: 50 });
    assert.equal(fifty.rows.filter(row => row.kind === 'parental').length, 2);
    assert.ok(fifty.rows.every(row => row.probability.numerator === 1 && row.probability.denominator === 4));
  }
});
test('ordinary nonenumerable and null-prototype own data records are admitted unchanged', () => {
  for (const prototype of [Object.prototype, null]) {
    const input = Object.create(prototype, {
      phase: { value: 'repulsion' },
      recombinationPercent: { value: 14 }
    });
    Object.preventExtensions(input);
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const result = analyzeLinkage(input);
    assert.equal(result.input.recombinationPercent, 14);
    assert.deepEqual(Object.getOwnPropertyDescriptors(input), descriptors);
    assert.equal(Object.getPrototypeOf(input), prototype);
    assert.equal(Object.isExtensible(input), false);
  }
});
test('malformed records, percentages and phase refuse without coercion', () => {
  const badRecords = [null, undefined, [], {}, 'coupling', 20, true, Object.create({ phase: 'coupling', recombinationPercent: 20 }),
    { phase: 'coupling', recombinationPercent: 20, extra: false },
    { phase: 'coupling', recombinationPercent: 20, [Symbol('extra')]: 1 }];
  for (const input of badRecords) assert.throws(() => analyzeLinkage(input), /./);
  for (const phase of ['', 'Coupling', 'AB / ab', null, 1]) assert.throws(() => analyzeLinkage({ phase, recombinationPercent: 20 }), RangeError);
  for (const recombinationPercent of [-1, 51, 0.5, NaN, Infinity, -Infinity, '20', '', true, null, undefined]) {
    assert.throws(() => analyzeLinkage({ phase: 'coupling', recombinationPercent }), RangeError);
  }
});
test('accessor fields refuse without invoking getters', () => {
  let called = 0;
  for (const name of ['phase', 'recombinationPercent']) {
    const input = { phase: 'coupling', recombinationPercent: 20 };
    Object.defineProperty(input, name, { get() { called++; throw new Error('Getter ran'); } });
    assert.throws(() => analyzeLinkage(input), TypeError);
  }
  assert.equal(called, 0);
});
test('output is deeply frozen, detached and ordered for deterministic observation bytes', () => {
  const input = { phase: 'coupling', recombinationPercent: 20 };
  const result = analyzeLinkage(input);
  input.phase = 'repulsion';
  input.recombinationPercent = 0;
  assert.deepEqual(result.input, { phase: 'coupling', recombinationPercent: 20 });
  deeplyFrozen(result);
  assert.ok(Object.isFrozen(LINKAGE_ASSUMPTIONS));
  assert.deepEqual(Object.keys(result), ['format', 'input', 'assumptions', 'parent', 'tester', 'rows', 'totals', 'marginals', 'independentComparison']);
  assert.deepEqual(Object.keys(result.rows[0]), ['gamete', 'kind', 'probability', 'offspringGenotype']);
  assert.deepEqual(Object.keys(result.rows[0].probability), ['numerator', 'denominator']);
  assert.equal(JSON.stringify(result), JSON.stringify(analyzeLinkage({ phase: 'coupling', recombinationPercent: 20 })));
});
