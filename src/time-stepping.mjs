/** The bounded scalar teaching model. No DOM, I/O or external dependencies. */
const FIELDS = ['lambda', 'step', 'steps', 'initial'];
function admit(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Settings must be an object with lambda, step, steps and initial.');
  }
  const keys = Reflect.ownKeys(input);
  if (keys.length !== FIELDS.length || keys.some(key => !FIELDS.includes(key))) {
    throw new TypeError('Provide exactly lambda, step, steps and initial.');
  }
  const settings = {};
  for (const key of FIELDS) {
    const value = input[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(key + ' must be a finite number.');
    }
    settings[key] = value === 0 ? 0 : value;
  }
  for (const [key, minimum, maximum, units] of [
    ['lambda', 0.25, 4, 4], ['step', 1 / 32, 2, 32],
    ['initial', -2, 2, 4], ['steps', 1, 64, 1]
  ]) {
    if (settings[key] < minimum || settings[key] > maximum ||
        !Number.isInteger(settings[key] * units)) {
      throw new RangeError(key + ' is outside the declared range or grid.');
    }
  }
  return settings;
}

function behavior(z) {
  if (z < 1) return 'monotone_decay';
  if (z === 1) return 'one_step_zero';
  if (z < 2) return 'alternating_decay';
  if (z === 2) return 'alternating_boundary';
  return 'alternating_growth';
}

/** N+1 shared-time rows; errors are numerical minus exact. */
export function simulate(input) {
  const settings = admit(input);
  const {lambda, step, steps, initial} = settings;
  const z = lambda * step;
  const forwardMultiplier = 1 - z;
  const backwardMultiplier = 1 / (1 + z);
  const rows = [];
  let forward = initial, backward = initial;
  for (let index = 0; index <= steps; index++) {
    const time = index * step;
    const exact = initial === 0 ? 0 : initial * Math.exp(-lambda * time);
    const forwardError = forward - exact;
    const backwardError = backward - exact;
    rows.push(Object.freeze({index, time, exact, forward, backward,
      forwardError, backwardError,
      forwardAbsError: Math.abs(forwardError),
      backwardAbsError: Math.abs(backwardError)}));
    if (index < steps) {
      forward *= forwardMultiplier;
      backward /= 1 + z;
      // Mathematical zero has no sign; do not alternate an IEEE negative zero.
      if (forward === 0) forward = 0;
      if (backward === 0) backward = 0;
    }
  }
  return Object.freeze({settings: Object.freeze(settings), z,
    forwardMultiplier, backwardMultiplier, forwardBehavior: behavior(z),
    rows: Object.freeze(rows)});
}

/** A fresh complete observation of the applied settings and selected row. */
export function observation(settings, selectedIndex) {
  const trace = simulate(settings);
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 ||
      selectedIndex > trace.settings.steps) {
    throw new RangeError('Selected index must identify a recorded row.');
  }
  return {
    schema: 'recallweave.time-stepping-observation.v1',
    model: "y' = -lambda*y; lambda > 0; exact and two Euler updates",
    units: {lambda: 's^-1', step: 's', time: 's', y: 'dimensionless',
      error: 'dimensionless', index: 'update count'},
    assumptions: [
      'Ideal scalar teaching equation; no fitted device or measured data.',
      'Fixed coefficients and time step; no adaptive solver or clipping.',
      'Finite floating-point calculations; displayed values may be rounded.',
      'Multiplier classification is independent of the chosen initial value.',
      'Stability and numerical accuracy are different questions.'
    ],
    ...trace, selectedIndex, selected: trace.rows[selectedIndex]
  };
}
