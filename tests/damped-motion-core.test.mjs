import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {makeExperiment, stateAt, sampleTrajectory, makeObservation} from '../courses/damped-motion-core.mjs';

const referenceBytes = await readFile(new URL('./damped-motion-reference.json', import.meta.url));
assert.equal(createHash('sha256').update(referenceBytes).digest('hex'),
  '4f91ed547ee2dd813eadb27f0c46c89ca4d0d4d6f67673e7da855f502c6cf7e7');
const reference = JSON.parse(referenceBytes);
const labelBytes = await readFile(new URL('./damped-motion-reference-labels.json', import.meta.url));
assert.equal(createHash('sha256').update(labelBytes).digest('hex'),
  'f1526341c41175486ad1d001d2eda7e75cddef1fda19c01e6dff4f098a206f07');
// The independent author's additive clarification fixes only zeta=0's label.
// Preserve the original reference file and every numeric value byte-for-byte.
const toParameters = p => ({
  mass: p.m, stiffness: p.k, dampingRatio: p.zeta, x0: p.x0, v0: p.v0, duration: p.duration,
});
const near = (actual, expected, label, absolute = 2e-11, relative = 2e-11) => {
  assert.ok(Number.isFinite(actual), label + ' is finite');
  const expectedNumber = Number(expected);
  assert.ok(Math.abs(actual - expectedNumber) <= absolute + relative * Math.abs(expectedNumber),
    label + ': actual ' + actual + ', independent expected ' + expected);
};
for (const fixture of reference.cases) {
  test('independent matrix-series reference: ' + fixture.id, () => {
    const experiment = makeExperiment(toParameters(fixture.parameters));
    assert.equal(experiment.regime, fixture.id === 'undamped' ? 'undamped' : fixture.expected_regime);
    for (const expected of fixture.samples) {
      const actual = stateAt(experiment, expected.t);
      for (const [key, oracle] of [['x','x'],['v','v'],['a','a'],
        ['mechanicalEnergy','energy'],['energyRate','denergy_dt']])
        near(actual[key], expected[oracle], fixture.id + '/' + expected.t + '/' + key);
      near(experiment.omega0, expected.omega_n, fixture.id + '/omega0');
      near(experiment.damping, expected.b, fixture.id + '/damping');
      if (Number(expected.t) === 0) {
        near(actual.x, fixture.parameters.x0, 'initial x', 2e-14, 0);
        near(actual.v, fixture.parameters.v0, 'initial v', 2e-14, 0);
      }
    }
  });
}
const defaults = {mass: 1, stiffness: 4, dampingRatio: .25, x0: .5, v0: 0, duration: 10};
test('admission refuses incomplete/nonfinite/range-invalid drafts without coercion', () => {
  for (const invalid of [null, [], 'parameters']) assert.throws(() => makeExperiment(invalid));
  for (const [key, invalid] of [
    ['mass', ''], ['stiffness', '4 trailing'], ['dampingRatio', '1e309'], ['x0', 'NaN'],
    ['v0', Infinity], ['duration', null], ['mass', true], ['stiffness', '0x10'],
    ['dampingRatio', []], ['x0', '1e-9999'], ['mass', .099], ['stiffness', 100.01],
    ['dampingRatio', -.01], ['dampingRatio', 3.01], ['x0', -1.01], ['v0', 2.01], ['duration', 20.01],
  ]) assert.throws(() => makeExperiment({...defaults, [key]: invalid}), undefined, key + '/' + invalid);
  const missing = {...defaults}; delete missing.v0;
  assert.throws(() => makeExperiment(missing), /Initial velocity/);
  assert.equal(makeExperiment({...defaults, x0: ' -0 ', v0: '+.25e0'}).parameters.x0, 0);
});
test('near-critical values stay continuous while entered regime labels remain distinct', () => {
  const inputs = {mass: 1, stiffness: 1, x0: .25, v0: -.75, duration: 5};
  const middle = makeExperiment({...inputs, dampingRatio: 1});
  for (const zeta of [.999999999999, 1.000000000001]) {
    const other = makeExperiment({...inputs, dampingRatio: zeta});
    assert.notEqual(other.regime, 'critical');
    for (const t of [0, .25, 1, 5]) {
      near(stateAt(other, t).x, stateAt(middle, t).x, 'continuous x', 2e-10, 0);
      near(stateAt(other, t).v, stateAt(middle, t).v, 'continuous v', 2e-10, 0);
    }
  }
});
test('critical and overdamped adverse initial velocities can cross equilibrium', () => {
  const critical = makeExperiment({mass: 1, stiffness: 1, dampingRatio: 1, x0: 1, v0: -2, duration: 4});
  near(stateAt(critical, 1).x, 0, 'critical zero');
  near(stateAt(critical, 1).v, -Math.exp(-1), 'critical crossing velocity');
  const over = makeExperiment({mass: 1, stiffness: 1, dampingRatio: 1.25, x0: .5, v0: -2, duration: 4});
  assert.ok(stateAt(over, .25).x > 0); assert.ok(stateAt(over, .5).x < 0);
  near(stateAt(over, 2 / 3 * Math.log(7 / 4)).x, 0, 'overdamped zero');
});
test('energy accounting agrees with a derivative of analytical energy at interior times', () => {
  for (const dampingRatio of [0, .25, 1, 2]) {
    const exp = makeExperiment({...defaults, dampingRatio});
    const t = 1.1, h = 1e-5, state = stateAt(exp, t);
    const derivative = (stateAt(exp, t + h).mechanicalEnergy - stateAt(exp, t - h).mechanicalEnergy) / (2 * h);
    near(derivative, state.energyRate, 'energy derivative', 2e-7 * Math.max(1, state.mechanicalEnergy), 0);
    near(state.energyTransferred + state.mechanicalEnergy, exp.initialEnergy, 'energy balance');
    assert.ok(state.energyRate <= 0);
  }
});
test('sampling resolves bounded oscillation/decay without exceeding short windows', () => {
  for (const parameters of [
    {...defaults, duration: .1},
    {mass: .1, stiffness: 100, dampingRatio: 0, x0: 1, v0: 2, duration: 20},
    {mass: .1, stiffness: 100, dampingRatio: 3, x0: 1, v0: -2, duration: 20},
    {mass: 10, stiffness: .1, dampingRatio: 1, x0: 0, v0: 0, duration: .1},
  ]) {
    const experiment = makeExperiment(parameters), samples = sampleTrajectory(experiment);
    assert.equal(samples[0].t, 0); assert.equal(samples.at(-1).t, parameters.duration);
    assert.ok(samples.length >= 241 && samples.length < 6000);
    for (let i = 0; i < samples.length; i++) {
      for (const value of Object.values(samples[i])) assert.ok(Number.isFinite(value));
      assert.ok(samples[i].mechanicalEnergy >= 0);
      if (i) {
        const gap = samples[i].t - samples[i-1].t;
        assert.ok(gap > 0 && gap <= parameters.duration / 240 * (1 + 1e-12));
        if (experiment.omegaD > 0) assert.ok(gap <= 2 * Math.PI / experiment.omegaD / 48 * (1 + 1e-12));
      }
    }
    if (experiment.fastRate > 0) {
      const end = Math.min(parameters.duration, 12 / experiment.fastRate);
      const early = samples.filter(s => s.t <= end);
      assert.ok(early.length >= 193);
      for (let i = 1; i < early.length; i++)
        assert.ok(early[i].t - early[i-1].t <= end / 192 * (1 + 1e-12));
    }
  }
});
test('rest stays invariant and observations retain applied parameters and every sample', () => {
  for (const dampingRatio of [0, .5, 1, 3]) {
    const experiment = makeExperiment({...defaults, dampingRatio, x0: 0, v0: 0});
    for (const [key, value] of Object.entries(stateAt(experiment, 7)))
      if (key !== 't') assert.equal(value, 0);
  }
  const experiment = makeExperiment(defaults);
  const parsed = JSON.parse(JSON.stringify(makeObservation(experiment, '2.5')));
  assert.deepEqual(parsed.parameters, defaults);
  assert.deepEqual(parsed.state, stateAt(experiment, 2.5));
  assert.deepEqual(parsed.trajectory, sampleTrajectory(experiment));
  assert.equal(parsed.sampling.points, parsed.trajectory.length);
  assert.equal(parsed.format, 'recallweave-damped-motion-observation/1');
  for (const invalid of [-.01, 10.01, '', '1 s', NaN, Infinity])
    assert.throws(() => makeObservation(experiment, invalid), /Inspection time/);
});
