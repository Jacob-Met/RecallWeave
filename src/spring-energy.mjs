/** Ideal horizontal Hooke-law oscillator, inspected analytically over one cycle. */
export const OSCILLATOR_LIMITS = Object.freeze({
  massKg: Object.freeze({ label: 'Mass', min: 0.1, max: 10, unit: 'kg' }),
  stiffnessNPerM: Object.freeze({ label: 'Spring stiffness', min: 1, max: 200, unit: 'N/m' }),
  amplitudeM: Object.freeze({ label: 'Release amplitude', min: 0, max: 0.5, unit: 'm' }),
  phaseDegrees: Object.freeze({ label: 'Phase', min: 0, max: 360, unit: 'degrees' }),
});
export const OSCILLATOR_DEFAULT = Object.freeze({
  massKg: 2, stiffnessNPerM: 50, amplitudeM: 0.2, phaseDegrees: 0,
});
export const OSCILLATOR_ASSUMPTIONS = Object.freeze([
  'One positive point mass, one massless horizontal Hooke-law spring and a fixed equilibrium.',
  'No friction, drive or other horizontal force. Rightward displacement is positive.',
  'Each applied parameter set is a separate release from positive maximum displacement at rest.',
  'Phase increases with elapsed time. This is an analytical inspection, not a numerical time step.',
  'The natural period is a system property; zero amplitude describes rest without an observed cycle.',
]);
const positiveZero = value => value === 0 ? 0 : value;

function inputRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Oscillator inputs must be an object.');
  }
  return value;
}

function admittedInput(value) {
  const record = inputRecord(value);
  const input = {};
  for (const [key, limit] of Object.entries(OSCILLATOR_LIMITS)) {
    const number = record[key];
    if (typeof number !== 'number' || !Number.isFinite(number)) {
      throw new TypeError(limit.label + ' must be a finite number.');
    }
    if (number < limit.min || number > limit.max) {
      throw new RangeError(limit.label + ' must be between ' + limit.min + ' and ' + limit.max + ' ' + limit.unit + '.');
    }
    input[key] = positiveZero(number);
  }
  return Object.freeze(input);
}

/** Parse all four explicit decimal fields before returning an admitted parameter set. */
export function parseOscillatorInput(textFields) {
  const fields = inputRecord(textFields);
  const input = {};
  for (const [key, limit] of Object.entries(OSCILLATOR_LIMITS)) {
    const text = fields[key];
    if (typeof text !== 'string' || text.length > 64 ||
        !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text.trim())) {
      throw new TypeError(limit.label + ' needs a decimal number of at most 64 characters.');
    }
    input[key] = Number(text.trim());
  }
  return admittedInput(input);
}

function phaseTrig(degrees) {
  // Exact cardinal states avoid drawing a force at equilibrium due to cos(pi / 2).
  if (degrees === 0 || degrees === 360) return [1, 0];
  if (degrees === 90) return [0, 1];
  if (degrees === 180) return [-1, 0];
  if (degrees === 270) return [0, -1];
  const radians = degrees * Math.PI / 180;
  return [Math.cos(radians), Math.sin(radians)];
}

/** A new immutable observation; input objects and prior observations are never changed. */
export function inspectOscillator(value) {
  const input = admittedInput(value);
  const { massKg: mass, stiffnessNPerM: stiffness, amplitudeM: amplitude, phaseDegrees: phase } = input;
  const omega = Math.sqrt(stiffness / mass);
  const period = 2 * Math.PI / omega;
  const [cosine, sine] = phaseTrig(phase);
  const position = positiveZero(amplitude * cosine);
  const velocity = positiveZero(-amplitude * omega * sine);
  const force = positiveZero(-stiffness * position);
  const acceleration = positiveZero(force / mass);
  const kineticEnergy = 0.5 * mass * velocity * velocity;
  const potentialEnergy = 0.5 * stiffness * position * position;
  const totalEnergy = kineticEnergy + potentialEnergy;
  const releaseEnergy = 0.5 * stiffness * amplitude * amplitude;
  return Object.freeze({
    input, omega, period, frequency: 1 / period, time: phase / 360 * period,
    position, velocity, acceleration, force, kineticEnergy, potentialEnergy,
    totalEnergy, releaseEnergy, energyResidual: positiveZero(totalEnergy - releaseEnergy),
  });
}

/** Both endpoints are retained: the same physical state, separated by one natural period. */
export function sampleOscillatorCycle(value) {
  const input = admittedInput(value);
  return Object.freeze(Array.from({ length: 73 }, (_, index) =>
    inspectOscillator({ ...input, phaseDegrees: index * 5 })));
}

/** Recompute from admitted inputs, so callers cannot substitute stale or altered result values. */
export function serializeOscillatorExperiment(value) {
  const observation = inspectOscillator(value);
  return JSON.stringify({
    format: 'recallweave-spring-energy-observation/1',
    assumptions: OSCILLATOR_ASSUMPTIONS,
    units: {
      massKg: 'kg', stiffnessNPerM: 'N/m', amplitudeM: 'm', phaseDegrees: 'degrees',
      omega: 'rad/s', period: 's', frequency: 'Hz', time: 's', position: 'm',
      velocity: 'm/s', acceleration: 'm/s^2', force: 'N',
      kineticEnergy: 'J', potentialEnergy: 'J', totalEnergy: 'J',
      releaseEnergy: 'J', energyResidual: 'J',
    },
    input: observation.input,
    observation,
    cycle: sampleOscillatorCycle(observation.input),
  }, null, 2) + '\n';
}
