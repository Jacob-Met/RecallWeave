import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeGroupedData, parseGroupedCount, serializeGroupedComparison, GROUPED_PRESETS } from '../src/grouped-data.mjs';

const copy = value => JSON.parse(JSON.stringify(value));

test('fictional reversal retains denominators and uses common weights only for reference', () => {
  const input = copy(GROUPED_PRESETS.reversal.counts);
  const before = JSON.stringify(input);
  const result = analyzeGroupedData(input, 50);
  assert.equal(result.classification, 'strict_reversal');
  assert.deepEqual(result.groups.map(group => group.comparison), ['a_higher', 'a_higher']);
  assert.equal(result.observed.comparison, 'b_higher');
  assert.deepEqual([result.observed.a.successes, result.observed.a.total], [60, 90]);
  assert.deepEqual([result.observed.b.successes, result.observed.b.total], [77, 100]);
  assert.equal(result.observed.a.rate.numerator, '2');
  assert.equal(result.observed.a.rate.denominator, '3');
  assert.equal(result.reference.a.value, 0.75);
  assert.equal(result.reference.b.value, 0.65);
  assert.equal(result.reference.difference.numerator, '1');
  assert.equal(result.reference.difference.denominator, '10');
  assert.equal(JSON.stringify(input), before);
  assert.ok(Object.isFrozen(result.counts.a.newcomers));
  const edge = analyzeGroupedData(input, 100);
  assert.deepEqual(edge.observed, result.observed);
  assert.deepEqual(edge.groups, result.groups);
  assert.equal(edge.reference.a.value, 0.9);
});

test('ties and conflicting subgroup directions are not a strict reversal', () => {
  assert.equal(analyzeGroupedData(GROUPED_PRESETS.balanced.counts).classification, 'same_direction');
  assert.equal(analyzeGroupedData(GROUPED_PRESETS.mixed.counts).classification, 'mixed_groups');
  const tied = copy(GROUPED_PRESETS.balanced.counts);
  tied.b.newcomers = copy(tied.a.newcomers);
  assert.equal(analyzeGroupedData(tied).classification, 'subgroup_tie');
  const pooledTie = {
    a: { newcomers: { successes: 0, total: 3 }, experienced: { successes: 3, total: 3 } },
    b: { newcomers: { successes: 0, total: 0 }, experienced: { successes: 2, total: 4 } }
  };
  assert.equal(analyzeGroupedData(pooledTie).observed.comparison, 'equal');
  assert.equal(analyzeGroupedData(pooledTie).classification, 'unavailable');
});

test('empty cells remain unavailable unless their reference weight is exactly zero', () => {
  const counts = GROUPED_PRESETS.empty.counts;
  const middle = analyzeGroupedData(counts, 50);
  assert.equal(middle.groups[0].a, null);
  assert.equal(middle.classification, 'unavailable');
  assert.equal(middle.reference.a, null);
  assert.deepEqual(middle.reference.missing.a, ['newcomers']);
  assert.equal(middle.observed.a.rate.value, 0.9);
  const endpoint = analyzeGroupedData(counts, 100);
  assert.equal(endpoint.reference.a.value, 0.9);
  assert.equal(endpoint.reference.comparison, 'a_higher');
  assert.equal(analyzeGroupedData(counts, 99).reference.a, null);
  assert.equal(analyzeGroupedData(counts, 0).reference.a, null);
});

test('an entirely empty option has no pooled rate or inferred group mix', () => {
  const counts = copy(GROUPED_PRESETS.balanced.counts);
  counts.a = { newcomers: { successes: 0, total: 0 }, experienced: { successes: 0, total: 0 } };
  const r = analyzeGroupedData(counts);
  assert.equal(r.observed.a.rate, null);
  assert.equal(r.observed.a.experiencedWeight, null);
  assert.equal(r.observed.comparison, 'unavailable');
  assert.equal(r.reference.a, null);
});

test('invalid numeric inputs are refused without truncation or coercion', () => {
  for (const value of [-1, 1.5, 1_000_001, Infinity, NaN, true, '4', null]) {
    const counts = copy(GROUPED_PRESETS.reversal.counts);
    counts.a.newcomers.total = value;
    assert.throws(() => analyzeGroupedData(counts));
  }
  for (const value of [-1, 1.2, 101, Infinity, true, '50']) {
    assert.throws(() => analyzeGroupedData(GROUPED_PRESETS.reversal.counts, value));
  }
  const counts = copy(GROUPED_PRESETS.reversal.counts);
  counts.a.newcomers.successes = 71;
  assert.throws(() => analyzeGroupedData(counts), /exceed/);
  assert.throws(() => analyzeGroupedData({}), /Missing/);
});

test('native count entry distinguishes blank and invalid text from zero', () => {
  for (const text of ['', ' ', '-1', '1.5', '1e3', 'Infinity', 'NaN', '1,000', '1000001', '0'.repeat(33)]) {
    assert.throws(() => parseGroupedCount(text));
  }
  assert.equal(parseGroupedCount('0'), 0);
  assert.equal(parseGroupedCount(' 00042 '), 42);
  assert.equal(parseGroupedCount('1000000'), 1_000_000);
});

test('a strict difference too small for percentage display is not declared equal', () => {
  const counts = {
    a: { newcomers: { successes: 999_998, total: 999_999 }, experienced: { successes: 999_998, total: 999_999 } },
    b: { newcomers: { successes: 999_999, total: 1_000_000 }, experienced: { successes: 999_999, total: 1_000_000 } }
  };
  const r = analyzeGroupedData(counts, 37);
  assert.equal((100 * r.reference.a.value).toFixed(2), (100 * r.reference.b.value).toFixed(2));
  assert.equal(r.reference.comparison, 'b_higher');
  assert.equal(r.observed.comparison, 'b_higher');
  assert.equal(r.reference.difference.numerator, '-1');
  assert.equal(r.reference.difference.denominator, '999999000000');
});

test('label and group transformations preserve the intended descriptive quantities', () => {
  const counts = copy(GROUPED_PRESETS.reversal.counts);
  const first = analyzeGroupedData(counts, 27);
  const swapped = analyzeGroupedData({ a: counts.b, b: counts.a }, 27);
  assert.equal(swapped.classification, first.classification);
  assert.deepEqual(swapped.observed.a, first.observed.b);
  assert.equal(swapped.observed.comparison, 'a_higher');
  const groups = Object.fromEntries(['a', 'b'].map(key => [key, {
    newcomers: counts[key].experienced, experienced: counts[key].newcomers
  }]));
  const complemented = analyzeGroupedData(groups, 73);
  assert.deepEqual(complemented.reference.a, first.reference.a);
  assert.deepEqual(complemented.reference.b, first.reference.b);
  for (const key of ['newcomers', 'experienced']) {
    counts.a[key].successes *= 7; counts.a[key].total *= 7;
  }
  const scaled = analyzeGroupedData(counts, 27);
  assert.deepEqual(scaled.observed.a.rate, first.observed.a.rate);
  assert.deepEqual(scaled.observed.a.experiencedWeight, first.observed.a.experiencedWeight);
});

test('shared weights preserve both strict subgroup advantages at every permitted mix', () => {
  for (let weight = 0; weight <= 100; weight++) {
    assert.equal(analyzeGroupedData(GROUPED_PRESETS.reversal.counts, weight).reference.comparison, 'a_higher');
  }
});

test('download contains exact inputs, unavailable values and deterministic recomputable fractions', () => {
  const counts = copy(GROUPED_PRESETS.empty.counts);
  const text = serializeGroupedComparison(counts, 50);
  const saved = JSON.parse(text);
  assert.deepEqual(saved.counts, counts);
  assert.equal(saved.reference.experiencedPercent, 50);
  assert.equal(saved.reference.a, null);
  assert.equal(saved.observed.a.rate.numerator, '9');
  assert.equal(saved.observed.a.rate.denominator, '10');
  assert.equal(saved.format, 'recallweave-grouped-data/1');
  assert.equal(serializeGroupedComparison(counts, 50), text);
  assert.ok(!text.includes('NaN'));
});
