/**
 * Original RecallWeave lab: m*x'' + b*x' + k*x = 0, b=2*zeta*sqrt(m*k).
 * One ideal horizontal point mass; linear spring and viscous damper; no drive.
 * Closed analytical response evaluated with JavaScript binary64 arithmetic.
 */
export const PARAMETER_LIMITS = Object.freeze({
  mass: Object.freeze([0.1, 10, 'Mass (kg)']),
  stiffness: Object.freeze([0.1, 100, 'Stiffness (N/m)']),
  dampingRatio: Object.freeze([0, 3, 'Damping ratio']),
  x0: Object.freeze([-1, 1, 'Initial displacement (m)']),
  v0: Object.freeze([-2, 2, 'Initial velocity (m/s)']),
  duration: Object.freeze([0.1, 20, 'Time window (s)']),
});
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const TAU = 2 * Math.PI;
function readNumber(value, label, lower, upper) {
  let number = value;
  if (typeof value === 'string') {
    const text = value.trim();
    if (!DECIMAL.test(text)) throw new RangeError(label + ' needs one complete decimal number.');
    number = Number(text);
    if (number === 0 && /[1-9]/.test(text.split(/e/i)[0]))
      throw new RangeError(label + ' is too small to represent.');
  }
  if (typeof number !== 'number' || !Number.isFinite(number) || number < lower || number > upper)
    throw new RangeError(label + ' must be between ' + lower + ' and ' + upper + '.');
  return number === 0 ? 0 : number;
}
export function makeExperiment(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw))
    throw new TypeError('Supply a complete parameter record.');
  const values = {};
  for (const [key, [lower, upper, label]] of Object.entries(PARAMETER_LIMITS))
    values[key] = readNumber(raw[key], label, lower, upper);
  const parameters = Object.freeze(values);
  const {mass, stiffness, dampingRatio: zeta, x0, v0} = parameters;
  const omega0 = Math.sqrt(stiffness / mass);
  const alpha = zeta * omega0;
  const damping = 2 * zeta * Math.sqrt(mass * stiffness);
  const regime = zeta === 0 ? 'undamped' : zeta < 1 ? 'underdamped' :
    zeta === 1 ? 'critical' : 'overdamped';
  const omegaD = zeta < 1 ? omega0 * Math.sqrt((1 - zeta) * (1 + zeta)) : 0;
  const root = zeta > 1 ? Math.sqrt((zeta - 1) * (zeta + 1)) : 0;
  // Avoid subtraction of nearly equal positive numbers.
  const slowRate = zeta > 1 ? omega0 / (zeta + root) : alpha;
  const fastRate = zeta > 1 ? omega0 * (zeta + root) : alpha;
  const initialEnergy = .5 * mass * v0 * v0 + .5 * stiffness * x0 * x0;
  return Object.freeze({
    parameters, regime, omega0, alpha, damping, omegaD, slowRate, fastRate,
    initialEnergy, amplitudeBound: Math.sqrt(2 * initialEnergy / stiffness),
  });
}
function sinc(value) {
  if (Math.abs(value) < 1e-4) {
    const square = value * value;
    return 1 - square / 6 + square * square / 120;
  }
  return Math.sin(value) / value;
}
export function stateAt(experiment, time) {
  const {mass, stiffness, dampingRatio: zeta, x0, v0, duration} = experiment.parameters;
  const t = readNumber(time, 'Inspection time (s)', 0, duration);
  const {omega0, alpha, damping, omegaD, slowRate, fastRate} = experiment;
  let x = x0, v = v0;
  if (t !== 0 && (x0 !== 0 || v0 !== 0)) {
    let c, s;
    if (zeta < 1) {
      const decay = Math.exp(-alpha * t);
      c = decay * Math.cos(omegaD * t);
      s = decay * t * sinc(omegaD * t);
    } else if (zeta === 1) {
      c = Math.exp(-alpha * t);
      s = t * c;
    } else {
      const halfDifference = omega0 * Math.sqrt((zeta - 1) * (zeta + 1));
      const slow = Math.exp(-slowRate * t), fast = Math.exp(-fastRate * t);
      c = .5 * (slow + fast);
      // Equivalent to exp(-alpha*t)*sinh(h*t)/h, without overflow
      // or near-critical subtraction of two exponentials.
      s = slow * (-Math.expm1(-2 * halfDifference * t)) / (2 * halfDifference);
    }
    x = x0 * c + (v0 + alpha * x0) * s;
    v = v0 * c - (alpha * v0 + omega0 * omega0 * x0) * s;
  }
  const springForce = -stiffness * x, dampingForce = -damping * v;
  const kineticEnergy = .5 * mass * v * v, springEnergy = .5 * stiffness * x * x;
  const mechanicalEnergy = kineticEnergy + springEnergy;
  const result = {
    t, x, v, a: (springForce + dampingForce) / mass, springForce, dampingForce,
    kineticEnergy, springEnergy, mechanicalEnergy, energyRate: -damping * v * v,
    energyTransferred: experiment.initialEnergy - mechanicalEnergy,
  };
  return Object.freeze(Object.fromEntries(Object.entries(result).map(([key, value]) =>
    [key, value === 0 ? 0 : value])));
}
export function sampleTrajectory(experiment) {
  const duration = experiment.parameters.duration;
  const intervals = Math.max(240, Math.ceil(duration * experiment.omegaD / TAU * 48));
  const times = new Set([0, duration]);
  for (let i = 1; i < intervals; i++) times.add(duration * i / intervals);
  // Add 16 intervals per decay time constant through twelve constants.
  // A fast initial transient does not force a tiny step over the whole window.
  for (const rate of new Set([experiment.slowRate, experiment.fastRate])) {
    if (rate > 0) {
      const end = Math.min(duration, 12 / rate);
      for (let i = 1; i <= 192; i++) times.add(i === 192 ? end : end * i / 192);
    }
  }
  return Object.freeze([...times].sort((a, b) => a - b).map(t => stateAt(experiment, t)));
}
export function makeObservation(experiment, time) {
  const state = stateAt(experiment, time);
  const trajectory = sampleTrajectory(experiment);
  return {
    format: 'recallweave-damped-motion-observation/1',
    model: "m*x''+b*x'+k*x=0; b=2*zeta*sqrt(m*k). Ideal horizontal point mass, linear spring and viscous damper; no drive.",
    method: 'Closed analytical response evaluated with JavaScript binary64 arithmetic; not a measured apparatus or time-stepping solver.',
    energyAccounting: 'Energy transferred is E(0)-E(t), including floating-point roundoff; no clipping or measured heat attribution.',
    units: {mass: 'kg', stiffness: 'N/m', damping: 'N*s/m', displacement: 'm', velocity: 'm/s', acceleration: 'm/s^2', force: 'N', energy: 'J', energyRate: 'W', time: 's', angularFrequency: 'rad/s'},
    parameters: {...experiment.parameters},
    derived: {regime: experiment.regime, damping: experiment.damping, omega0: experiment.omega0, alpha: experiment.alpha, omegaD: experiment.omegaD, slowRate: experiment.slowRate, fastRate: experiment.fastRate},
    initialEnergy: experiment.initialEnergy,
    inspectionTime: state.t,
    state,
    sampling: {points: trajectory.length, start: 0, end: experiment.parameters.duration, minimumUniformIntervals: 240, minimumIntervalsPerSinusoidalCycle: 48, extraIntervalsPerExponentialTimeConstant: 16, extraTimeConstants: 12, grid: 'Sorted union of uniform window samples and per-rate initial-decay refinement; not a uniform step or integration grid.'},
    trajectory,
  };
}
