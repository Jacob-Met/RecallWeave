/**
 * Original RecallWeave analytical lab: two equal masses, fixed-wall springs k,
 * and one coupling spring c. No damping, forcing, or geometric contact model.
 * Coordinates are displacements from equilibrium; q± use the half-sum convention.
 */
export const PARAMETER_LIMITS = Object.freeze({
  mass: Object.freeze([0.1, 10, 'Mass (kg)']),
  wallStiffness: Object.freeze([1, 200, 'Wall stiffness (N/m)']),
  coupling: Object.freeze([0, 200, 'Coupling stiffness (N/m)']),
  x1: Object.freeze([-1, 1, 'Initial displacement 1 (m)']),
  x2: Object.freeze([-1, 1, 'Initial displacement 2 (m)']),
  v1: Object.freeze([-2, 2, 'Initial velocity 1 (m/s)']),
  v2: Object.freeze([-2, 2, 'Initial velocity 2 (m/s)']),
  duration: Object.freeze([0.1, 20, 'Time window (s)']),
});
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const TAU = 2 * Math.PI;

function readNumber(value, name, lower, upper) {
  let number = value;
  if (typeof value === 'string') {
    const text = value.trim();
    if (!DECIMAL.test(text)) throw new RangeError(name + ' needs one complete decimal number.');
    number = Number(text);
    if (number === 0 && /[1-9]/.test(text.split(/e/i)[0]))
      throw new RangeError(name + ' is too small to represent.');
  }
  if (typeof number !== 'number' || !Number.isFinite(number) ||
      number < lower || number > upper)
    throw new RangeError(name + ' must be between ' + lower + ' and ' + upper + '.');
  return number === 0 ? 0 : number;
}

export function makeExperiment(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw))
    throw new TypeError('Supply a complete parameter record.');
  const values = {};
  for (const [key, [lower, upper, label]] of Object.entries(PARAMETER_LIMITS))
    values[key] = readNumber(raw[key], label, lower, upper);
  const parameters = Object.freeze(values);
  const {mass: m, wallStiffness: k, coupling: c, x1, x2, v1, v2} = parameters;
  const plus = Math.sqrt(k / m), minus = Math.sqrt((k + 2 * c) / m);
  const initial = Object.freeze({
    qPlus: (x1 + x2) / 2, qMinus: (x1 - x2) / 2,
    uPlus: (v1 + v2) / 2, uMinus: (v1 - v2) / 2,
  });
  const plusEnergy = m * initial.uPlus ** 2 + k * initial.qPlus ** 2;
  const minusEnergy = m * initial.uMinus ** 2 + (k + 2 * c) * initial.qMinus ** 2;
  const amplitudeBound = Math.hypot(initial.qPlus, initial.uPlus / plus) +
    Math.hypot(initial.qMinus, initial.uMinus / minus);
  return Object.freeze({
    parameters,
    omega: Object.freeze({plus, minus}),
    initial,
    energy: Object.freeze({plus: plusEnergy, minus: minusEnergy, total: plusEnergy + minusEnergy}),
    amplitudeBound,
    degenerate: c === 0,
  });
}

export function stateAt(experiment, time) {
  const t = readNumber(time, 'Inspection time (s)', -20, 20);
  const {mass: m, wallStiffness: k, coupling: c} = experiment.parameters;
  const {qPlus: qp0, qMinus: qm0, uPlus: up0, uMinus: um0} = experiment.initial;
  const {plus: wp, minus: wm} = experiment.omega;
  const cp = Math.cos(wp * t), sp = Math.sin(wp * t);
  const cm = Math.cos(wm * t), sm = Math.sin(wm * t);
  const qPlus = qp0 * cp + up0 / wp * sp;
  const qMinus = qm0 * cm + um0 / wm * sm;
  const uPlus = -qp0 * wp * sp + up0 * cp;
  const uMinus = -qm0 * wm * sm + um0 * cm;
  const x1 = qPlus + qMinus, x2 = qPlus - qMinus;
  const v1 = uPlus + uMinus, v2 = uPlus - uMinus;
  const force1 = -k * x1 + c * (x2 - x1);
  const force2 = -k * x2 + c * (x1 - x2);
  const kinetic = 0.5 * m * (v1 * v1 + v2 * v2);
  const wallPotential = 0.5 * k * (x1 * x1 + x2 * x2);
  const couplingPotential = 0.5 * c * (x2 - x1) ** 2;
  const total = kinetic + wallPotential + couplingPotential;
  return Object.freeze({
    t, x1, x2, v1, v2, a1: force1 / m, a2: force2 / m, force1, force2,
    qPlus, qMinus, uPlus, uMinus,
    energies: Object.freeze({
      kinetic, wallPotential, couplingPotential, total,
      plus: m * uPlus ** 2 + k * qPlus ** 2,
      minus: m * uMinus ** 2 + (k + 2 * c) * qMinus ** 2,
      drift: total - experiment.energy.total,
    }),
  });
}

export function sampleTrajectory(experiment) {
  const duration = experiment.parameters.duration;
  // At least 48 intervals per fastest modal cycle, so a long/high-frequency
  // window cannot turn the plotted signal into a low-rate alias.
  const intervals = Math.max(240, Math.ceil(duration * experiment.omega.minus / TAU * 48));
  return Object.freeze(Array.from({length: intervals + 1}, (_, index) =>
    stateAt(experiment, index === intervals ? duration : duration * index / intervals)));
}

export function makeObservation(experiment, time) {
  const t = readNumber(time, 'Inspection time (s)', 0, experiment.parameters.duration);
  const trajectory = sampleTrajectory(experiment);
  return {
    format: 'recallweave-normal-modes-observation/1',
    model: 'Two equal point masses; two wall springs k; one coupling spring c; no damping or drive.',
    method: 'Closed analytical modal solution evaluated with JavaScript binary64 arithmetic.',
    convention: 'qPlus=(x1+x2)/2; qMinus=(x1-x2)/2; effective modal mass=2*mass.',
    units: {mass: 'kg', stiffness: 'N/m', displacement: 'm', velocity: 'm/s', acceleration: 'm/s^2', force: 'N', energy: 'J', time: 's', angularFrequency: 'rad/s'},
    parameters: {...experiment.parameters},
    omega: {...experiment.omega},
    initialModes: {...experiment.initial},
    initialEnergies: {...experiment.energy},
    degenerate: experiment.degenerate,
    inspectionTime: t,
    state: stateAt(experiment, t),
    sampling: {intervals: trajectory.length - 1, points: trajectory.length, start: 0, end: experiment.parameters.duration, minimumIntervalsPerFastestCycle: 48},
    trajectory,
  };
}
