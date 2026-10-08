/** One ideal resistor and capacitor after a fixed voltage-source step at t=0.
 * R: ohms, C input: microfarads, V: volts. All returned physical quantities are SI.
 * Positive current flows from the source through R into C's marked positive plate.
 */
export const RC_LIMITS = Object.freeze({
  resistanceOhms: Object.freeze({min: 1, max: 1e6, label: 'Resistance R (ohms)'}),
  capacitanceMicrofarads: Object.freeze({min: 0.001, max: 1e6, label: 'Capacitance C (microfarads)'}),
  sourceVolts: Object.freeze({min: -24, max: 24, label: 'Source voltage Vs (volts)'}),
  initialVolts: Object.freeze({min: -24, max: 24, label: 'Initial capacitor voltage V0 (volts)'}),
});
export const RC_HORIZON_TAU = 8;
export const RC_SAMPLE_COUNT = 161;

function bounded(value, label, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(label + ' must be a finite number.');
  if (value < min || value > max) throw new RangeError(label + ' must be from ' + min + ' to ' + max + '.');
  return value === 0 ? 0 : value;
}

export function validateRcInputs(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Provide the four circuit values.');
  const inputs = {};
  for (const [key, limit] of Object.entries(RC_LIMITS)) inputs[key] = bounded(value[key], limit.label, limit.min, limit.max);
  return Object.freeze(inputs);
}

export function parseRcNumber(text, key) {
  const limit = RC_LIMITS[key];
  if (!limit) throw new TypeError('Unknown circuit input.');
  if (typeof text !== 'string' || !text.trim()) throw new TypeError('Enter ' + limit.label + '.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim())) throw new TypeError(limit.label + ' must be a decimal number.');
  return bounded(Number(text), limit.label, limit.min, limit.max);
}

/** Analytic step response. Finite u never asserts exact asymptotic completion. */
export function calculateRc(value, normalizedTime = 1) {
  const inputs = validateRcInputs(value);
  const u = bounded(normalizedTime, 'Time t / tau', 0, RC_HORIZON_TAU);
  const R = inputs.resistanceOhms;
  const C = inputs.capacitanceMicrofarads * 1e-6;
  const gap = inputs.sourceVolts - inputs.initialVolts;
  const remainingFraction = Math.exp(-u);
  const movedFraction = -Math.expm1(-u);
  const voltageChange = gap * movedFraction;
  const capacitorVolts = inputs.initialVolts + voltageChange;
  const resistorVolts = gap * remainingFraction;
  const currentAmps = resistorVolts / R;
  const timeConstantSeconds = R * C;
  return Object.freeze({
    inputs, timeConstantSeconds, normalizedTime: u, seconds: u * timeConstantSeconds,
    capacitorVolts, resistorVolts, currentAmps,
    chargeCoulombs: C * capacitorVolts,
    storedEnergyJoules: 0.5 * C * capacitorVolts * capacitorVolts,
    changeStoredEnergyJoules: 0.5 * C * voltageChange * (capacitorVolts + inputs.initialVolts),
    resistorHeatJoules: 0.5 * C * gap * gap * -Math.expm1(-2 * u),
    sourceWorkJoules: inputs.sourceVolts * C * voltageChange,
    sourcePowerWatts: inputs.sourceVolts * currentAmps,
    resistorPowerWatts: currentAmps * currentAmps * R,
    remainingFraction,
  });
}

export function buildRcTrace(value) {
  const inputs = validateRcInputs(value);
  return Object.freeze({
    inputs, timeConstantSeconds: calculateRc(inputs, 0).timeConstantSeconds,
    horizonTau: RC_HORIZON_TAU,
    samples: Object.freeze(Array.from({length: RC_SAMPLE_COUNT}, (_, index) => calculateRc(inputs, index / 20))),
  });
}

/** Recompute from admitted inputs, never trust caller-supplied result cells. */
export function rcObservation(value, normalizedTime) {
  const trace = buildRcTrace(value);
  return Object.freeze({
    schema: 'recallweave.rc-observation.v1',
    assumptions: 'One fixed ideal voltage source, one positive fixed resistor, one ideal capacitor; initial voltage V0; the source step occurs at t=0. No leakage, ESR, inductance or component-rating model.',
    currentDirection: 'From source through resistor into the marked positive capacitor terminal.',
    sourceWorkSign: 'Positive means energy delivered by the source; negative means energy absorbed.',
    units: Object.freeze({resistance: 'ohm', capacitanceInput: 'microfarad', voltage: 'V', time: 's', current: 'A', charge: 'C', energy: 'J', power: 'W'}),
    inputs: trace.inputs, timeConstantSeconds: trace.timeConstantSeconds,
    horizonTau: trace.horizonTau, sampleCount: trace.samples.length,
    inspected: calculateRc(trace.inputs, normalizedTime),
    samples: trace.samples,
  });
}

export const RC_EXAMPLES = Object.freeze([
  {id: 'charge', title: 'Charge from zero', description: 'A 5 V source charges an initially uncharged capacitor. The time constant is 1 second.', inputs: {resistanceOhms: 1000, capacitanceMicrofarads: 1000, sourceVolts: 5, initialVolts: 0}},
  {id: 'discharge', title: 'Discharge to zero', description: 'Set the source to 0 V. An initially 5 V capacitor releases energy through the resistor.', inputs: {resistanceOhms: 1000, capacitanceMicrofarads: 1000, sourceVolts: 0, initialVolts: 5}},
  {id: 'reverse', title: 'Cross through zero', description: 'Start at -5 V and connect a +5 V source. Voltage crosses zero at ln(2) time constants.', inputs: {resistanceOhms: 1000, capacitanceMicrofarads: 1000, sourceVolts: 5, initialVolts: -5}},
  {id: 'precharged', title: 'Return energy to the source', description: 'Start with the capacitor at 10 V and the fixed source at 5 V. Current is negative and the source absorbs energy.', inputs: {resistanceOhms: 1000, capacitanceMicrofarads: 1000, sourceVolts: 5, initialVolts: 10}},
  {id: 'double-r', title: 'Double the resistance', description: 'The time constant doubles to 2 seconds and the initial current halves. The voltage-versus-t/tau shape stays the same.', inputs: {resistanceOhms: 2000, capacitanceMicrofarads: 1000, sourceVolts: 5, initialVolts: 0}},
  {id: 'equilibrium', title: 'Already at equilibrium', description: 'Initial and source voltage both equal 5 V. There is no voltage gap, current or subsequent energy transfer.', inputs: {resistanceOhms: 1000, capacitanceMicrofarads: 1000, sourceVolts: 5, initialVolts: 5}},
].map(example => Object.freeze({...example, inputs: validateRcInputs(example.inputs)})));
