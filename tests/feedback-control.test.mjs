import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, PRESETS, validateSettings, analyzeSettings, simulateFeedback, feedbackCsv } from '../src/feedback-control.mjs';

const settings = changes => ({ ...DEFAULT_SETTINGS, ...changes });
const close = (actual, expected, tolerance = 1e-13) => {
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    actual + ' differs from ' + expected);
};

test('the default rule follows a hand-calculated update and approaches 2/3, not r=1', () => {
  const run = simulateFeedback(DEFAULT_SETTINGS);
  assert.equal(run.q, 0.25);
  assert.equal(run.c, 0.5);
  assert.equal(run.fixedPoint.kind, 'unique');
  assert.equal(run.fixedPoint.value, 2 / 3);
  assert.deepEqual(run.rows.slice(0, 4).map(row => row.x), [0, 0.5, 0.625, 0.65625]);
  assert.equal(run.rows[0].control, 0.5);
  assert.equal(run.rows[1].control, 0.25);
  close(run.rows.at(-1).error, 1 / 3);
  assert.equal(run.kind, 'decay');
});

test('two starts obey the signed geometric separation and cancel common forcing', () => {
  const run = simulateFeedback(settings({ gain: 1.25, reference: -0.5, disturbance: 0.25, initial: 0.25, offset: 1, steps: 8 }));
  assert.equal(run.q, -0.5);
  assert.equal(run.rows[3].difference, -0.125);
  for (const row of run.rows) {
    assert.equal(row.predictedDifference, (-0.5) ** row.n);
    close(row.difference, row.predictedDifference);
    if (row.applied) close(row.next, run.settings.a * row.x + row.control + run.settings.disturbance);
  }
});

test('q=0 reaches the same unique fixed point after one update', () => {
  const run = simulateFeedback(settings({ gain: 0.75, reference: 1, disturbance: 0.25, initial: -2, offset: 1, steps: 4 }));
  assert.equal(run.q, 0);
  assert.equal(run.fixedPoint.value, 1);
  for (const row of run.rows.slice(1)) assert.deepEqual([row.x, row.compared], [1, 1]);
});

test('boundary cases distinguish persistent separation, drift and repeating deviations', () => {
  const fixed = simulateFeedback(settings({ a: 1, gain: 0, initial: 0.5, reference: 0, offset: 0.25, steps: 4 }));
  assert.equal(fixed.kind, 'boundary');
  assert.equal(fixed.fixedPoint.kind, 'every-state');
  assert.deepEqual(fixed.rows.map(row => row.x), [0.5, 0.5, 0.5, 0.5, 0.5]);
  const drift = simulateFeedback(settings({ a: 1, gain: 0, disturbance: 0.25, steps: 4 }));
  assert.equal(drift.fixedPoint.kind, 'none');
  assert.deepEqual(drift.rows.map(row => row.x), [0, 0.25, 0.5, 0.75, 1]);
  assert.deepEqual(drift.rows.map(row => row.difference), [0.25, 0.25, 0.25, 0.25, 0.25]);
  const repeat = simulateFeedback(settings({ gain: 1.75, reference: 0, initial: 0.25, steps: 4 }));
  assert.equal(repeat.q, -1);
  assert.equal(repeat.kind, 'boundary');
  assert.deepEqual(repeat.rows.map(row => row.x), [0.25, -0.25, 0.25, -0.25, 0.25]);
});

test('an exact equilibrium can stay flat while a nearby start grows', () => {
  const preset = PRESETS.find(item => item.id === 'flat-unstable');
  const run = simulateFeedback({ ...preset.settings, steps: 3 });
  assert.equal(run.q, -1.25);
  assert.equal(run.kind, 'growth');
  assert.equal(run.fixedPoint.value, 0);
  assert.deepEqual(run.rows.map(row => row.x), [0, 0, 0, 0]);
  assert.deepEqual(run.rows.map(row => row.compared), [0.25, -0.3125, 0.390625, -0.48828125]);
});

test('constant input and reference move the fixed point without changing q', () => {
  const original = analyzeSettings(DEFAULT_SETTINGS);
  const disturbed = analyzeSettings(settings({ disturbance: -0.25 }));
  assert.equal(disturbed.q, original.q);
  assert.equal(disturbed.fixedPoint.value, 1 / 3);
  const changedReference = analyzeSettings(settings({ reference: 2 }));
  assert.equal(changedReference.q, original.q);
  assert.equal(changedReference.fixedPoint.value, 4 / 3);
  const noCorrection = analyzeSettings(settings({ gain: 0, disturbance: 0.25 }));
  assert.equal(analyzeSettings(settings({ gain: 0, disturbance: 0.25, reference: -2 })).fixedPoint.value, noCorrection.fixedPoint.value);
});

test('the admitted longest extreme trajectories remain finite and follow a closed form', () => {
  for (const input of [
    settings({ a: 0, gain: 3, reference: 2, disturbance: 0.5, initial: -2, offset: -1, steps: 60 }),
    settings({ a: 1.25, gain: 0, disturbance: -0.5, initial: 2, offset: 1, steps: 60 })
  ]) {
    const run = simulateFeedback(input);
    const fixed = run.fixedPoint.value;
    const final = run.rows.at(-1);
    close(final.x, fixed + run.q ** 60 * (input.initial - fixed), 2e-13);
    close(final.compared, fixed + run.q ** 60 * (input.initial + input.offset - fixed), 2e-13);
    for (const row of run.rows) for (const value of Object.values(row)) if (typeof value === 'number') assert.ok(Number.isFinite(value));
  }
});

test('validation rejects unbounded, fractional, empty and nonnumeric settings without changing the input', () => {
  for (const changes of [{ gain: 3.25 }, { a: -0.25 }, { a: 0.1 }, { gain: NaN }, { offset: Infinity },
    { reference: '1' }, { disturbance: null }, { initial: undefined }, { steps: 0 }, { steps: 61 }, { steps: 1.5 }, { extra: true }]) {
    const input = settings(changes);
    const before = { ...input };
    assert.throws(() => simulateFeedback(input));
    assert.deepEqual(input, before);
  }
  for (const input of [null, [], true, 1]) assert.throws(() => validateSettings(input));
  assert.ok(Object.isFrozen(validateSettings(DEFAULT_SETTINGS)));
});

test('terminal CSV fields mean N updates and N+1 states; settings survive every row', () => {
  const run = simulateFeedback(settings({ steps: 3 }));
  const csv = feedbackCsv(run);
  assert.ok(csv.endsWith('\r\n'));
  const rows = csv.trimEnd().split('\r\n').map(line => line.slice(1, -1).split('","'));
  const headings = rows.shift();
  assert.equal(rows.length, 4);
  const values = rows.map(row => Object.fromEntries(headings.map((name, index) => [name, row[index]])));
  for (const row of values) {
    assert.equal(row.format, 'recallweave-feedback/1');
    assert.equal(row.a, '0.75');
    assert.equal(row.gain, '0.5');
    assert.equal(row.steps, '3');
  }
  assert.equal(values[0].applied_control, '0.5');
  assert.equal(values[0].next_state, '0.5');
  assert.equal(values[3].row_kind, 'final-state');
  for (const key of ['applied_control', 'compared_applied_control', 'next_state', 'compared_next_state']) assert.equal(values[3][key], '');
  assert.equal(values[3].reference_error, String(1 - 0.65625));
  assert.ok(Object.isFrozen(run) && Object.isFrozen(run.rows) && Object.isFrozen(run.rows[0]));
});

test('finite-precision subtraction remains distinct from the analytical separation', () => {
  const row = simulateFeedback(DEFAULT_SETTINGS).rows[26];
  assert.equal(row.difference, 0);
  assert.equal(row.predictedDifference, 2 ** -54);
});
