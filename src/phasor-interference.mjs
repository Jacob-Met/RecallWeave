/** Same-frequency cosine superposition in a common scalar signal unit. */
export const INTERFERENCE_FORMAT = 'recallweave-phasor-interference/1';
export const TRACE_CYCLES = 2;
export const TRACE_INTERVALS = 128;
export const DEFAULT_INTERFERENCE = Object.freeze({
  amplitudeA: 3, amplitudeB: 4, phaseDifferenceDegrees: 90,
  commonPhaseDegrees: 0, frequencyHz: 1, cursorCycle: 0,
});

const fields = Object.freeze({
  amplitudeA: [0, 5, 'Wave A amplitude must be a finite number from 0 to 5.'],
  amplitudeB: [0, 5, 'Wave B amplitude must be a finite number from 0 to 5.'],
  phaseDifferenceDegrees: [-180, 180, 'Relative phase must be from −180 to 180 degrees.'],
  commonPhaseDegrees: [-180, 180, 'Common phase must be from −180 to 180 degrees.'],
  frequencyHz: [0.1, 10, 'Shared frequency must be from 0.1 to 10 Hz.'],
  cursorCycle: [0, TRACE_CYCLES, 'The time cursor must be from 0 to 2 cycles.'],
});

export function validateInterference(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Supply all six phasor experiment settings.');
  }
  const result = {};
  for (const [key, [min, max, message]] of Object.entries(fields)) {
    const value = input[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      throw new RangeError(message);
    }
    result[key] = Object.is(value, -0) ? 0 : value;
  }
  return Object.freeze(result);
}

function principalDegrees(value) {
  let angle = value % 360;
  if (angle >= 180) angle -= 360;
  if (angle < -180) angle += 360;
  return Object.is(angle, -0) ? 0 : angle;
}

/** Exact cardinal directions keep exact cancellation from acquiring a roundoff phase. */
function direction(degrees) {
  const angle = principalDegrees(degrees);
  if (angle === 0) return [1, 0];
  if (angle === 90) return [0, 1];
  if (angle === -90) return [0, -1];
  if (angle === -180) return [-1, 0];
  const radians = angle * Math.PI / 180;
  return [Math.cos(radians), Math.sin(radians)];
}

function vector(re, im) {
  return Object.freeze({ re: Object.is(re, -0) ? 0 : re, im: Object.is(im, -0) ? 0 : im });
}

function rotate(z, degrees) {
  const [c, s] = direction(degrees);
  return vector(z.re * c - z.im * s, z.re * s + z.im * c);
}

function coefficients(p) {
  const [c, s] = direction(p.phaseDifferenceDegrees);
  const a = vector(p.amplitudeA, 0);
  const b = vector(p.amplitudeB * c, p.amplitudeB * s);
  // Sum before the common rotation: equal opposite inputs remain exactly zero.
  const sum = vector(a.re + b.re, b.im);
  return Object.freeze({
    a: rotate(a, p.commonPhaseDegrees),
    b: rotate(b, p.commonPhaseDegrees),
    sum: rotate(sum, p.commonPhaseDegrees),
  });
}

function sample(p, phasors, cycle) {
  const a = rotate(phasors.a, cycle * 360);
  const b = rotate(phasors.b, cycle * 360);
  const sum = rotate(phasors.sum, cycle * 360);
  return Object.freeze({
    cycle, timeSeconds: cycle / p.frequencyHz,
    waveA: a.re, waveB: b.re, sum: sum.re,
    phasors: Object.freeze({ a, b, sum }),
  });
}

/** A checked numerical evaluation at an explicitly supplied point in the two-cycle trace. */
export function sampleInterference(input, cycle) {
  const p = validateInterference(input);
  if (typeof cycle !== 'number' || !Number.isFinite(cycle) || cycle < 0 || cycle > TRACE_CYCLES) {
    throw new RangeError('Choose a finite trace position from 0 to 2 cycles.');
  }
  return sample(p, coefficients(p), cycle);
}

/** One immutable experiment supplies every displayed and downloaded value. */
export function analyzeInterference(input) {
  const parameters = validateInterference(input);
  const phasors = coefficients(parameters);
  const amplitude = Math.hypot(phasors.sum.re, phasors.sum.im);
  const phaseDegrees = amplitude === 0 ? null
    : principalDegrees(Math.atan2(phasors.sum.im, phasors.sum.re) * 180 / Math.PI);
  const samples = Array.from({ length: TRACE_INTERVALS + 1 }, (_, index) => {
    const point = sample(parameters, phasors, TRACE_CYCLES * index / TRACE_INTERVALS);
    return Object.freeze({
      index, cycle: point.cycle, timeSeconds: point.timeSeconds,
      waveA: point.waveA, waveB: point.waveB, sum: point.sum,
    });
  });
  const [relativeCosine] = direction(parameters.phaseDifferenceDegrees);
  return Object.freeze({
    format: INTERFERENCE_FORMAT,
    parameters, phasors, amplitude, phaseDegrees,
    periodSeconds: 1 / parameters.frequencyHz,
    rms: amplitude / Math.sqrt(2),
    meanSquare: amplitude * amplitude / 2,
    separateMeanSquares: (parameters.amplitudeA ** 2 + parameters.amplitudeB ** 2) / 2,
    interferenceMeanSquare: parameters.amplitudeA * parameters.amplitudeB * relativeCosine,
    amplitudeRange: Object.freeze({
      min: Math.abs(parameters.amplitudeA - parameters.amplitudeB),
      max: parameters.amplitudeA + parameters.amplitudeB,
    }),
    cursor: sample(parameters, phasors, parameters.cursorCycle),
    traceCycles: TRACE_CYCLES, traceIntervals: TRACE_INTERVALS,
    samples: Object.freeze(samples),
  });
}

export function interferenceJson(input) {
  const snapshot = analyzeInterference(input);
  return JSON.stringify({
    ...snapshot,
    assumptions: [
      'Two real scalar cosine signals with the same positive frequency and common units.',
      'Relative phase and amplitudes are constant; the common phase uses a cosine convention.',
      'Mean square is a cycle average of the mathematical signal, not a calibrated intensity.',
      'The finite numeric trace is an evaluation of the specified model, not measured data.',
      'A zero resultant has no defined phase; nonzero near-cancellation is retained.',
    ],
  }, null, 2) + '\n';
}

export function interferenceCsv(input) {
  const s = analyzeInterference(input);
  const p = s.parameters;
  const header = 'index,cycle,time_seconds,wave_a,wave_b,sum,amplitude_a,amplitude_b,relative_phase_degrees,common_phase_degrees,frequency_hz,cursor_cycle';
  return header + '\n' + s.samples.map(row => [
    row.index, row.cycle, row.timeSeconds, row.waveA, row.waveB, row.sum,
    p.amplitudeA, p.amplitudeB, p.phaseDifferenceDegrees, p.commonPhaseDegrees, p.frequencyHz, p.cursorCycle,
  ].join(',')).join('\n') + '\n';
}
