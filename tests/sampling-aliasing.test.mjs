import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSampling, principalAlias, samplingCsv } from '../src/sampling-aliasing.mjs';

const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 2e-11, `${label}: ${actual} vs ${expected}`);

test('each supported sample clock uses inclusive endpoints and an actually different matching cosine', () => {
  for (const sampleRateHz of [3, 7, 16, 31]) {
    for (let frequencyHz = 0; frequencyHz <= 40; frequencyHz += 0.5) {
      const result = analyzeSampling({ frequencyHz, sampleRateHz });
      assert.equal(result.samples.length, sampleRateHz + 1);
      assert.equal(result.samples[0].timeSeconds, 0);
      assert.equal(result.samples.at(-1).timeSeconds, 1);
      assert.notEqual(result.comparisonHz, frequencyHz);
      assert.ok(result.aliasHz >= 0 && result.aliasHz <= sampleRateHz / 2);
      for (const sample of result.samples) {
        assert.equal(sample.timeSeconds, sample.index / sampleRateHz);
        close(sample.reference, Math.cos(2 * Math.PI * frequencyHz * sample.index / sampleRateHz), 'original sample');
        close(sample.reference, sample.comparison, 'matching alias');
      }
      // Independently enumerate allowed baseband cosines instead of reusing the
      // production modulo/reflection formula to decide the lowest one.
      const matches = [];
      for (let candidate = 0; candidate <= sampleRateHz / 2; candidate += 0.5) {
        if (result.samples.every(sample => Math.abs(Math.cos(2 * Math.PI * candidate * sample.index / sampleRateHz) - sample.reference) < 2e-11)) matches.push(candidate);
      }
      assert.equal(matches.length, 1);
      assert.equal(result.aliasHz, matches[0]);
    }
  }
});

test('DC, reflected aliases, the half-rate and input limits preserve their distinct meaning', () => {
  assert.equal(principalAlias(9, 8), 1);
  assert.equal(principalAlias(13, 10), 3);
  assert.equal(principalAlias(7, 8), 1);
  const dc = analyzeSampling({ frequencyHz: 8, sampleRateHz: 8 });
  assert.equal(dc.aliasHz, 0);
  assert.equal(dc.comparisonHz, 0);
  dc.samples.forEach(sample => close(sample.reference, 1, 'constant sampled values'));
  const zero = analyzeSampling({ frequencyHz: 0, sampleRateHz: 2 });
  assert.equal(zero.comparisonHz, 2);
  assert.equal(zero.relation, 'below');
  const boundary = analyzeSampling({ frequencyHz: 4, sampleRateHz: 8 });
  assert.equal(boundary.aliasHz, 4);
  assert.equal(boundary.relation, 'at');
  boundary.samples.forEach(sample => close(sample.reference, (-1) ** sample.index, 'boundary cosine phase'));
  assert.equal(analyzeSampling({ frequencyHz: 9, sampleRateHz: 24 }).relation, 'below');
  assert.equal(analyzeSampling({ frequencyHz: 40, sampleRateHz: 32 }).relation, 'above');
  assert.equal(analyzeSampling({ frequencyHz: 0.5, sampleRateHz: 2 }).aliasHz, 0.5);
});

test('invalid numerical input is refused and snapshots cannot be changed after observation', () => {
  for (const frequencyHz of [-0.5, 40.5, 1.25, NaN, Infinity, '9', null]) {
    assert.throws(() => analyzeSampling({ frequencyHz, sampleRateHz: 8 }));
  }
  for (const sampleRateHz of [1, 33, 8.5, NaN, Infinity, '8', null]) {
    assert.throws(() => analyzeSampling({ frequencyHz: 9, sampleRateHz }));
  }
  assert.throws(() => analyzeSampling());
  const snapshot = analyzeSampling({ frequencyHz: 11, sampleRateHz: 7 });
  assert.ok(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.samples) && Object.isFrozen(snapshot.samples[1]));
  assert.throws(() => { snapshot.samples[1].reference = 99; }, TypeError);
  assert.throws(() => { snapshot.frequencyHz = 0; }, TypeError);
});

test('CSV carries full precision and current parameter identity, ignoring supplied forged sample rows', () => {
  const snapshot = analyzeSampling({ frequencyHz: 11, sampleRateHz: 7 });
  const csv = samplingCsv({ ...snapshot, samples: [{ index: 99, reference: 123 }] });
  assert.ok(csv.endsWith('\n'));
  const [heading, ...lines] = csv.trimEnd().split('\n');
  assert.equal(heading, 'sample_index,time_seconds,reference_hz,sample_rate_hz,comparison_hz,lowest_alias_hz,reference_value,comparison_value');
  assert.equal(lines.length, 8);
  const parsed = lines.map(line => line.split(',').map(Number));
  for (const [index, row] of parsed.entries()) {
    assert.equal(row.length, 8);
    assert.ok(row.every(Number.isFinite));
    assert.deepEqual(row.slice(0, 6), [index, index / 7, 11, 7, 3, 3]);
    close(row[6], Math.cos(2 * Math.PI * 11 * index / 7), 'CSV reference');
    close(row[6], row[7], 'CSV alternative');
  }
  assert.equal(parsed[1][1], 1 / 7);
  assert.notEqual(parsed[1][1], Number((1 / 7).toFixed(6)));
  assert.throws(() => samplingCsv({ ...snapshot, sampleRateHz: 0 }));
});
