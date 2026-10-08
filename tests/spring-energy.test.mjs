import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OSCILLATOR_LIMITS, OSCILLATOR_DEFAULT, inspectOscillator, parseOscillatorInput,
  sampleOscillatorCycle, serializeOscillatorExperiment,
} from '../src/spring-energy.mjs';

function near(actual, expected, label) {
  assert.ok(Number.isFinite(actual), label + ' must be finite');
  assert.ok(Math.abs(actual - expected) <= 3e-12 * Math.max(1, Math.abs(expected)),
    label + ': expected ' + expected + ', got ' + actual);
}
const at = phaseDegrees => inspectOscillator({ ...OSCILLATOR_DEFAULT, phaseDegrees });

test('released default and all four cardinal phases have exact signed physical states', () => {
  const keys = ['position', 'velocity', 'acceleration', 'force', 'kineticEnergy', 'potentialEnergy', 'totalEnergy'];
  const expected = [
    [0, [0.2, 0, -5, -10, 0, 1, 1]],
    [90, [0, -1, 0, 0, 1, 0, 1]],
    [180, [-0.2, 0, 5, 10, 0, 1, 1]],
    [270, [0, 1, 0, 0, 1, 0, 1]],
    [360, [0.2, 0, -5, -10, 0, 1, 1]],
  ];
  for (const [phase, values] of expected) {
    const row = at(phase);
    assert.deepEqual(keys.map(key => row[key]), values);
    assert.equal(row.omega, 5);
    near(row.period, 2 * Math.PI / 5, 'natural period');
    near(row.frequency, 5 / (2 * Math.PI), 'ordinary frequency');
    near(row.time, phase / 360 * 2 * Math.PI / 5, 'elapsed time');
    assert.equal(row.energyResidual, 0);
  }
});

test('same displacement on opposite halves of a cycle has opposite velocity and equal force/energies', () => {
  const before = at(45), after = at(315);
  near(before.position, Math.SQRT2 / 10, 'position');
  near(before.velocity, -1 / Math.SQRT2, 'first velocity');
  near(after.velocity, 1 / Math.SQRT2, 'return velocity');
  for (const key of ['position', 'force', 'acceleration', 'kineticEnergy', 'potentialEnergy']) {
    near(before[key], after[key], key);
  }
  near(before.kineticEnergy, 0.5, 'half kinetic energy');
  near(before.potentialEnergy, 0.5, 'half potential energy');
});

test('Newton, phase ellipse and independently calculated energy balance hold over admitted systems', () => {
  for (const massKg of [0.1, 1.3, 10]) for (const stiffnessNPerM of [1, 37, 200]) {
    for (const amplitudeM of [0, 0.013, 0.5]) for (const phaseDegrees of [0, 7, 30, 89, 90, 143, 180, 230, 270, 315, 359, 360]) {
      const r = inspectOscillator({ massKg, stiffnessNPerM, amplitudeM, phaseDegrees });
      near(r.force, -stiffnessNPerM * r.position, 'Hooke force');
      near(r.force, massKg * r.acceleration, 'Newton force');
      near(r.position ** 2 + (r.velocity / r.omega) ** 2, amplitudeM ** 2, 'phase ellipse');
      near(r.kineticEnergy, 0.5 * massKg * r.velocity ** 2, 'kinetic energy');
      near(r.potentialEnergy, 0.5 * stiffnessNPerM * r.position ** 2, 'spring energy');
      near(r.totalEnergy, 0.5 * stiffnessNPerM * amplitudeM ** 2, 'release energy');
      near(r.energyResidual, 0, 'energy residual');
    }
  }
});

test('separate mass, stiffness and amplitude preparations retain their distinct scaling laws', () => {
  for (const phaseDegrees of [0, 37, 90, 164, 270]) {
    const base = inspectOscillator({ ...OSCILLATOR_DEFAULT, phaseDegrees });
    const heavy = inspectOscillator({ ...base.input, massKg: 8 });
    const stiff = inspectOscillator({ ...base.input, stiffnessNPerM: 200 });
    const larger = inspectOscillator({ ...base.input, amplitudeM: 0.4 });
    near(heavy.period, 2 * base.period, 'mass period');
    near(heavy.velocity, base.velocity / 2, 'mass velocity');
    near(heavy.acceleration, base.acceleration / 4, 'mass acceleration');
    for (const key of ['position', 'force', 'kineticEnergy', 'potentialEnergy']) near(heavy[key], base[key], key);
    near(stiff.period, base.period / 2, 'stiffness period');
    near(stiff.velocity, base.velocity * 2, 'stiffness velocity');
    for (const key of ['force', 'acceleration', 'kineticEnergy', 'potentialEnergy']) near(stiff[key], base[key] * 4, key);
    near(larger.period, base.period, 'amplitude period');
    for (const key of ['position', 'velocity', 'force', 'acceleration']) near(larger[key], base[key] * 2, key);
    for (const key of ['kineticEnergy', 'potentialEnergy', 'releaseEnergy']) near(larger[key], base[key] * 4, key);
  }
});

test('zero release amplitude is rest with no negative zeros and a defined natural period', () => {
  for (const phaseDegrees of [0, 45, 90, 180, 270, 360]) {
    const r = inspectOscillator({ ...OSCILLATOR_DEFAULT, amplitudeM: -0, phaseDegrees });
    assert.equal(Object.is(r.input.amplitudeM, -0), false);
    for (const key of ['position', 'velocity', 'force', 'acceleration', 'kineticEnergy', 'potentialEnergy', 'totalEnergy', 'releaseEnergy', 'energyResidual']) {
      assert.equal(r[key], 0, key);
      assert.equal(Object.is(r[key], -0), false, key);
    }
    assert.ok(r.omega > 0 && r.period > 0 && r.frequency > 0);
  }
});

test('numeric API refuses missing, coerced, nonfinite and out-of-bounds values without mutation', () => {
  for (const value of [undefined, null, false, 2, '2', []]) assert.throws(() => inspectOscillator(value), TypeError);
  for (const [key, { min, max }] of Object.entries(OSCILLATOR_LIMITS)) {
    for (const value of [undefined, null, true, false, '2', '', [], {}, NaN, Infinity, -Infinity]) {
      const input = { ...OSCILLATOR_DEFAULT, [key]: value };
      assert.throws(() => inspectOscillator(input), TypeError, key);
      assert.equal(input[key], value);
    }
    for (const value of [min - 0.01, max + 0.01]) {
      assert.throws(() => inspectOscillator({ ...OSCILLATOR_DEFAULT, [key]: value }), RangeError);
    }
    inspectOscillator({ ...OSCILLATOR_DEFAULT, [key]: min });
    inspectOscillator({ ...OSCILLATOR_DEFAULT, [key]: max });
  }
});

test('text parser accepts explicit decimals and exponents but refuses ambiguous or overlong fields', () => {
  const text = { massKg: '2', stiffnessNPerM: '50', amplitudeM: '.2', phaseDegrees: '0' };
  assert.deepEqual(parseOscillatorInput(text), OSCILLATOR_DEFAULT);
  assert.deepEqual(parseOscillatorInput({ massKg: ' +2e0 ', stiffnessNPerM: '5.e1', amplitudeM: '2E-1', phaseDegrees: '-0' }), OSCILLATOR_DEFAULT);
  for (const key of Object.keys(text)) {
    for (const value of ['', ' ', '\n\t', '0x10', '1,0', '1_0', '2 kg', '1/2', '.', '+', '1e', 'Infinity', 'NaN', '1e309', '0'.repeat(65), null, 2, false]) {
      assert.throws(() => parseOscillatorInput({ ...text, [key]: value }), TypeError);
    }
  }
  assert.throws(() => parseOscillatorInput({ ...text, massKg: '0' }), RangeError);
  assert.throws(() => parseOscillatorInput({ ...text, phaseDegrees: '360.01' }), RangeError);
  assert.deepEqual(text, { massKg: '2', stiffnessNPerM: '50', amplitudeM: '.2', phaseDegrees: '0' });
});

test('snapshots and cycle rows are immutable, complete and independent of caller mutation', () => {
  const input = { massKg: 1.3, stiffnessNPerM: 37, amplitudeM: 0.13, phaseDegrees: 27 };
  const before = { ...input }, result = inspectOscillator(input), cycle = sampleOscillatorCycle(input);
  assert.deepEqual(input, before);
  assert.equal(cycle.length, 73);
  assert.deepEqual(cycle.map(row => row.input.phaseDegrees), Array.from({ length: 73 }, (_, i) => i * 5));
  for (const key of ['position', 'velocity', 'acceleration', 'force', 'totalEnergy']) assert.equal(cycle[0][key], cycle.at(-1)[key]);
  assert.equal(cycle[0].time, 0);
  assert.equal(cycle.at(-1).time, result.period);
  input.massKg = 7;
  assert.equal(result.input.massKg, 1.3);
  assert.throws(() => { result.input.phaseDegrees = 3; }, TypeError);
  assert.throws(() => { result.position = 3; }, TypeError);
  assert.throws(() => { cycle[0].position = 3; }, TypeError);
  assert.throws(() => cycle.reverse(), TypeError);
});

test('experiment export retains exact applied inputs, full cycle numbers, units and assumptions', () => {
  const input = { massKg: 1.3, stiffnessNPerM: 37, amplitudeM: 0.13, phaseDegrees: 27 };
  const text = serializeOscillatorExperiment(input), parsed = JSON.parse(text);
  assert.equal(parsed.format, 'recallweave-spring-energy-observation/1');
  assert.deepEqual(parsed.input, input);
  assert.deepEqual(parsed.observation, inspectOscillator(input));
  assert.deepEqual(parsed.cycle, sampleOscillatorCycle(input));
  assert.equal(parsed.units.velocity, 'm/s');
  assert.equal(parsed.units.omega, 'rad/s');
  assert.equal(parsed.units.energyResidual, 'J');
  assert.ok(parsed.assumptions.some(value => value.includes('separate release')));
  assert.equal(text, serializeOscillatorExperiment(input));
  assert.match(text, /\n$/);
  assert.throws(() => serializeOscillatorExperiment({ ...input, phaseDegrees: '27' }), TypeError);
});
