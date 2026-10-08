import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeInterference, sampleInterference, validateInterference,
  interferenceJson, interferenceCsv, DEFAULT_INTERFERENCE,
} from '../src/phasor-interference.mjs';
import { formatInterferenceValue } from '../src/phasor-interference-ui.mjs';

const settings = overrides => ({ ...DEFAULT_INTERFERENCE, ...overrides });
function near(actual, expected, tolerance = 1e-11) {
  assert.ok(Number.isFinite(actual), 'The result must be finite.');
  assert.ok(Math.abs(actual - expected) <= tolerance, actual + ' differs from ' + expected);
}

test('the 3 + 4i example has amplitude five and the independently derived cosine projections', () => {
  const s = analyzeInterference(DEFAULT_INTERFERENCE);
  assert.equal(s.amplitude, 5);
  near(s.phaseDegrees, 53.13010235415598);
  assert.equal(s.meanSquare, 12.5);
  near(s.rms, Math.sqrt(12.5));
  assert.deepEqual(s.phasors, { a: { re: 3, im: 0 }, b: { re: 0, im: 4 }, sum: { re: 3, im: 4 } });
  for (const [cycle, value] of [[0, 3], [.25, -4], [.5, -3], [.75, 4], [1, 3], [2, 3]]) {
    assert.equal(sampleInterference(DEFAULT_INTERFERENCE, cycle).sum, value);
  }
});

test('admission refuses omitted, blank, nonfinite, coerced and out-of-range settings', () => {
  for (const input of [undefined, null, [], '3']) assert.throws(() => validateInterference(input), TypeError);
  const limits = { amplitudeA: [0,5], amplitudeB: [0,5], phaseDifferenceDegrees: [-180,180],
    commonPhaseDegrees: [-180,180], frequencyHz: [.1,10], cursorCycle: [0,2] };
  for (const [key, [min, max]] of Object.entries(limits)) {
    for (const value of [undefined, null, '', '1', NaN, Infinity, -Infinity, min-1, max+1]) {
      assert.throws(() => analyzeInterference(settings({ [key]: value })), RangeError, key);
    }
    assert.doesNotThrow(() => analyzeInterference(settings({ [key]: min })));
    assert.doesNotThrow(() => analyzeInterference(settings({ [key]: max })));
  }
  for (const cycle of [undefined, null, '', '1', NaN, Infinity, -.1, 2.1]) {
    assert.throws(() => sampleInterference(DEFAULT_INTERFERENCE, cycle), RangeError);
  }
});

test('equal opposite waves cancel exactly at arbitrary common rotations and both half-turn signs', () => {
  // Independently selected receiver cases exercise cancellation before common rotation.
  for (const commonPhaseDegrees of [-173, -37.5, 0, 37.5, 179.25]) {
    for (const phaseDifferenceDegrees of [-180, 180]) {
      const s = analyzeInterference(settings({ amplitudeA: 2, amplitudeB: 2, phaseDifferenceDegrees, commonPhaseDegrees }));
      assert.equal(s.amplitude, 0);
      assert.equal(s.phaseDegrees, null);
      assert.equal(s.meanSquare, 0);
      assert.ok(s.samples.every(row => row.sum === 0));
      assert.deepEqual(s.phasors.sum, { re: 0, im: 0 });
    }
  }
});

test('zero input and one absent component have distinct well-defined amplitude behavior', () => {
  const zero = analyzeInterference(settings({ amplitudeA: 0, amplitudeB: 0, commonPhaseDegrees: 37 }));
  assert.equal(zero.amplitude, 0);
  assert.equal(zero.phaseDegrees, null);
  const b = analyzeInterference(settings({ amplitudeA: 0, amplitudeB: 2, phaseDifferenceDegrees: -90, commonPhaseDegrees: 40 }));
  near(b.amplitude, 2);
  near(b.phaseDegrees, -50);
  const a = analyzeInterference(settings({ amplitudeA: 2, amplitudeB: 0, phaseDifferenceDegrees: 17, commonPhaseDegrees: -173 }));
  near(a.amplitude, 2);
  near(a.phaseDegrees, -173);
});

test('a small real residual is retained instead of being relabeled exact cancellation', () => {
  for (const commonPhaseDegrees of [0, 37.5, -173]) {
    const s = analyzeInterference(settings({ amplitudeA: 2, amplitudeB: 2-1e-8, phaseDifferenceDegrees: 180, commonPhaseDegrees }));
    near(s.amplitude, 2-(2-1e-8), 1e-22);
    assert.ok(s.amplitude > 0);
    near(s.phaseDegrees, commonPhaseDegrees, 1e-10);
    assert.notEqual(formatInterferenceValue(s.amplitude), '0');
    assert.match(formatInterferenceValue(s.amplitude), /e-/);
    assert.ok(s.meanSquare > 0);
  }
  const almostOpposite = analyzeInterference(settings({ amplitudeA: 2, amplitudeB: 2, phaseDifferenceDegrees: 179.999 }));
  near(almostOpposite.amplitude, 3.4906585039e-5, 1e-14);
  near(almostOpposite.phaseDegrees, 89.9995, 1e-8);
});

test('common rotation preserves magnitude and cycle average while moving the real projection', () => {
  const base = analyzeInterference(DEFAULT_INTERFERENCE);
  const turned = analyzeInterference(settings({ commonPhaseDegrees: 40 }));
  near(turned.amplitude, 5);
  near(turned.meanSquare, 12.5);
  near(turned.phaseDegrees, 93.13010235415598);
  near(turned.cursor.sum, 3*Math.cos(40*Math.PI/180)-4*Math.sin(40*Math.PI/180));
  assert.notEqual(turned.cursor.sum, base.cursor.sum);
});

test('principal phase respects the branch cut and zero never acquires a fabricated angle', () => {
  const negative = analyzeInterference(settings({ amplitudeA: 0, amplitudeB: 2, phaseDifferenceDegrees: 180 }));
  assert.equal(negative.phaseDegrees, -180);
  const below = analyzeInterference(settings({ amplitudeA: 0, amplitudeB: 2, phaseDifferenceDegrees: -179.999 }));
  const above = analyzeInterference(settings({ amplitudeA: 0, amplitudeB: 2, phaseDifferenceDegrees: 179.999 }));
  near(below.phaseDegrees, -179.999);
  near(above.phaseDegrees, 179.999);
  const rotated = analyzeInterference(settings({ commonPhaseDegrees: 170 }));
  near(rotated.phaseDegrees, -136.86989764584402);
});

test('independent real-signal equations, amplitude law and full-cycle numerical averages agree', () => {
  let seed = 1729;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2**32);
  for (let trial = 0; trial < 120; trial++) {
    const p = { amplitudeA: 5*random(), amplitudeB: 5*random(),
      phaseDifferenceDegrees: 360*random()-180, commonPhaseDegrees: 360*random()-180,
      frequencyHz: .1+9.9*random(), cursorCycle: 2*random() };
    const s = analyzeInterference(p);
    const delta = p.phaseDifferenceDegrees*Math.PI/180;
    const phase = p.commonPhaseDegrees*Math.PI/180;
    const squaredAmplitude = p.amplitudeA**2+p.amplitudeB**2+2*p.amplitudeA*p.amplitudeB*Math.cos(delta);
    near(s.amplitude*s.amplitude, squaredAmplitude);
    assert.ok(s.amplitude >= Math.abs(p.amplitudeA-p.amplitudeB)-1e-12);
    assert.ok(s.amplitude <= p.amplitudeA+p.amplitudeB+1e-12);
    for (const row of [...s.samples, s.cursor]) {
      const a = p.amplitudeA*Math.cos(2*Math.PI*row.cycle+phase);
      const b = p.amplitudeB*Math.cos(2*Math.PI*row.cycle+phase+delta);
      near(row.waveA, a);
      near(row.waveB, b);
      near(row.sum, a+b);
      near(row.sum, row.waveA+row.waveB);
      near(row.timeSeconds, row.cycle/p.frequencyHz);
    }
    const distinctPeriodSamples = s.samples.slice(0, -1);
    const numericAverage = distinctPeriodSamples.reduce((total, row) => total+row.sum**2,0)/distinctPeriodSamples.length;
    near(numericAverage, s.meanSquare);
    near(s.meanSquare, s.separateMeanSquares+s.interferenceMeanSquare);
    near(s.rms*s.rms, s.meanSquare);
  }
});

test('changing frequency changes seconds but keeps every fixed-cycle signal value', () => {
  const slow = analyzeInterference(settings({ frequencyHz: 2, cursorCycle: .25 }));
  const fast = analyzeInterference(settings({ frequencyHz: 5, cursorCycle: .25 }));
  assert.equal(slow.periodSeconds, .5);
  assert.equal(fast.periodSeconds, .2);
  assert.deepEqual(slow.phasors, fast.phasors);
  assert.equal(slow.amplitude, fast.amplitude);
  assert.equal(slow.phaseDegrees, fast.phaseDegrees);
  assert.equal(slow.meanSquare, fast.meanSquare);
  for (let i = 0; i < slow.samples.length; i++) {
    near(slow.samples[i].timeSeconds, 2.5*fast.samples[i].timeSeconds);
    for (const key of ['cycle','waveA','waveB','sum']) assert.equal(slow.samples[i][key], fast.samples[i][key]);
  }
});

test('cursor changes select a point without rewriting the two-cycle trace', () => {
  const early = analyzeInterference(settings({ cursorCycle: 0 }));
  const later = analyzeInterference(settings({ cursorCycle: 1.25 }));
  assert.deepEqual(later.samples, early.samples);
  assert.equal(later.cursor.sum, -4);
  assert.equal(later.cursor.timeSeconds, 1.25);
  assert.equal(later.samples.length, 129);
  assert.equal(later.samples[128].cycle, 2);
});

test('a snapshot copies inputs and freezes all nested numerical results', () => {
  const p = settings({ commonPhaseDegrees: 23 });
  const saved = structuredClone(p);
  const s = analyzeInterference(p);
  assert.deepEqual(p, saved);
  p.amplitudeA = 0;
  assert.equal(s.parameters.amplitudeA, 3);
  for (const node of [s,s.parameters,s.phasors,s.phasors.a,s.phasors.sum,s.cursor,
    s.cursor.phasors,s.cursor.phasors.b,s.amplitudeRange,s.samples,s.samples[0]]) {
    assert.ok(Object.isFrozen(node));
  }
  assert.throws(() => { s.samples[0].sum = 0; }, TypeError);
  assert.equal(validateInterference(settings({ commonPhaseDegrees: -0 })).commonPhaseDegrees, 0);
});

test('JSON exports the checked snapshot, explicit assumptions and undefined zero phase as null', () => {
  for (const p of [DEFAULT_INTERFERENCE, settings({ amplitudeA:2,amplitudeB:2,phaseDifferenceDegrees:180,commonPhaseDegrees:37.5 })]) {
    const { assumptions, ...saved } = JSON.parse(interferenceJson(p));
    assert.deepEqual(saved, analyzeInterference(p));
    assert.match(assumptions.join(' '), /not a calibrated intensity/);
    assert.match(assumptions.join(' '), /not measured data/);
  }
  assert.throws(() => interferenceJson(settings({ frequencyHz: 0 })), RangeError);
});

test('CSV preserves all 129 full-precision samples and all six experiment settings', () => {
  const p = settings({ amplitudeA:2,amplitudeB:2-1e-8,phaseDifferenceDegrees:180,commonPhaseDegrees:37.5,frequencyHz:2.3,cursorCycle:.75 });
  const s = analyzeInterference(p);
  const lines = interferenceCsv(p).trimEnd().split('\n');
  assert.equal(lines.shift(), 'index,cycle,time_seconds,wave_a,wave_b,sum,amplitude_a,amplitude_b,relative_phase_degrees,common_phase_degrees,frequency_hz,cursor_cycle');
  assert.equal(lines.length, 129);
  for (const [i, line] of lines.entries()) {
    const values = line.split(',').map(Number);
    const row = s.samples[i];
    assert.deepEqual(values, [row.index,row.cycle,row.timeSeconds,row.waveA,row.waveB,row.sum,
      p.amplitudeA,p.amplitudeB,p.phaseDifferenceDegrees,p.commonPhaseDegrees,p.frequencyHz,p.cursorCycle]);
  }
  assert.throws(() => interferenceCsv(settings({ amplitudeB: Infinity })), RangeError);
});

test('display formatting retains zero sign policy and small nonzero values', () => {
  assert.equal(formatInterferenceValue(0), '0');
  assert.equal(formatInterferenceValue(-0), '0');
  assert.equal(formatInterferenceValue(1e-8), '1.000e-8');
  assert.equal(formatInterferenceValue(-1e-8), '-1.000e-8');
  assert.equal(formatInterferenceValue(5), '5');
});
