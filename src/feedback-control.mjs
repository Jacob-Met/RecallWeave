/** Exact model definition for the optional RecallWeave feedback teaching lab.
 * This is a dimensionless, discrete, one-state model, not a physical controller.
 * Quarter-unit controls make the entered coefficients and q boundaries exact in
 * binary arithmetic. State iteration still uses ordinary finite-precision numbers.
 */
export const FEEDBACK_FORMAT = 'recallweave-feedback/1';
export const DEFAULT_SETTINGS = Object.freeze({
  a: 0.75, gain: 0.5, reference: 1, disturbance: 0,
  initial: 0, offset: 0.25, steps: 30
});
export const PRESETS = Object.freeze([
  Object.freeze({ id: 'gentle', title: 'Gentle correction', settings: DEFAULT_SETTINGS }),
  Object.freeze({ id: 'alternating', title: 'Alternating recovery',
    settings: Object.freeze({ ...DEFAULT_SETTINGS, gain: 1.25 }) }),
  Object.freeze({ id: 'boundary', title: 'A repeating boundary',
    settings: Object.freeze({ ...DEFAULT_SETTINGS, gain: 1.75 }) }),
  Object.freeze({ id: 'growing', title: 'Too much correction',
    settings: Object.freeze({ ...DEFAULT_SETTINGS, gain: 2 }) }),
  Object.freeze({ id: 'flat-unstable', title: 'A flat run can hide instability',
    settings: Object.freeze({ ...DEFAULT_SETTINGS, gain: 2, reference: 0 }) }),
  Object.freeze({ id: 'drift', title: 'No fixed point',
    settings: Object.freeze({ ...DEFAULT_SETTINGS, a: 1, gain: 0, disturbance: 0.25 }) })
]);
const BOUNDS = Object.freeze({
  a: [0, 1.25], gain: [0, 3], reference: [-2, 2],
  disturbance: [-0.5, 0.5], initial: [-2, 2], offset: [-1, 1]
});

export function validateSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Experiment settings must be an object.');
  }
  const keys = [...Object.keys(BOUNDS), 'steps'];
  if (Object.keys(value).some(key => !keys.includes(key))) {
    throw new TypeError('Experiment settings contain an unknown field.');
  }
  const result = {};
  for (const [name, bounds] of Object.entries(BOUNDS)) {
    const number = value[name];
    if (typeof number !== 'number' || !Number.isFinite(number) ||
        number < bounds[0] || number > bounds[1] || !Number.isInteger(number * 4)) {
      throw new RangeError(name + ' must be from ' + bounds[0] + ' to ' +
        bounds[1] + ' in steps of 0.25.');
    }
    result[name] = number === 0 ? 0 : number;
  }
  if (!Number.isInteger(value.steps) || value.steps < 1 || value.steps > 60) {
    throw new RangeError('steps must be an integer from 1 to 60.');
  }
  result.steps = value.steps;
  return Object.freeze(result);
}

export function analyzeSettings(value) {
  const settings = validateSettings(value);
  const { a, gain, reference, disturbance } = settings;
  const q = a - gain;
  const c = gain * reference + disturbance;
  let kind, label, detail;
  if (Math.abs(q) < 1) {
    kind = 'decay';
    label = 'Perturbations decay';
    detail = q === 0 ? 'All starting states reach the same fixed point after one update.'
      : q < 0 ? 'Deviations from the fixed point alternate in sign and shrink.'
        : 'Deviations from the fixed point keep their sign and shrink.';
  } else if (Math.abs(q) === 1) {
    kind = 'boundary';
    label = 'Perturbations do not decay';
    detail = q === -1 ? 'A nonzero deviation repeats with alternating sign.'
      : 'The separation of two starting states persists; a nonzero constant input causes drift.';
  } else {
    kind = 'growth';
    label = 'Perturbations grow';
    detail = q < 0 ? 'A nonzero deviation alternates in sign and grows in magnitude.'
      : 'A nonzero deviation keeps its sign and grows in magnitude.';
  }
  const fixedPoint = q === 1
    ? Object.freeze({ kind: c === 0 ? 'every-state' : 'none', value: null })
    : Object.freeze({ kind: 'unique', value: c / (1 - q) });
  return Object.freeze({ settings, q, c, kind, label, detail, fixedPoint });
}

/** Record states n=0..N. The final row has no applied control or next state. */
export function simulateFeedback(value) {
  const analysis = analyzeSettings(value);
  const { settings, q, c } = analysis;
  let x = settings.initial;
  let compared = settings.initial + settings.offset;
  const rows = [];
  for (let n = 0; n <= settings.steps; n += 1) {
    const applied = n < settings.steps;
    const error = settings.reference - x;
    const comparedError = settings.reference - compared;
    const control = applied ? settings.gain * error : null;
    const comparedControl = applied ? settings.gain * comparedError : null;
    const next = applied ? q * x + c : null;
    const comparedNext = applied ? q * compared + c : null;
    const row = {
      n, x, compared, error, comparedError, control, comparedControl,
      next, comparedNext, difference: compared - x,
      predictedDifference: settings.offset * q ** n, applied
    };
    for (const number of Object.values(row)) {
      if (typeof number === 'number' && !Number.isFinite(number)) {
        throw new RangeError('The model produced a nonfinite value.');
      }
    }
    rows.push(Object.freeze(row));
    if (applied) { x = next; compared = comparedNext; }
  }
  return Object.freeze({ ...analysis, rows: Object.freeze(rows) });
}

function csvCell(value) {
  return '"' + (value === null ? '' : String(value)).replaceAll('"', '""') + '"';
}

/** Export the computed run, including its settings and analytical separation. */
export function feedbackCsv(run) {
  // Recompute from validated settings so callers cannot export a forged row table.
  const current = simulateFeedback(run.settings);
  const fields = [
    'format', 'a', 'gain', 'reference', 'disturbance', 'initial', 'offset',
    'steps', 'q', 'constant_input', 'n', 'state', 'compared_state',
    'reference_error', 'compared_reference_error', 'applied_control',
    'compared_applied_control', 'next_state', 'compared_next_state',
    'computed_separation', 'analytical_separation', 'row_kind'
  ];
  const { settings: s } = current;
  const lines = [fields.map(csvCell).join(',')];
  for (const row of current.rows) {
    lines.push([
      FEEDBACK_FORMAT, s.a, s.gain, s.reference, s.disturbance, s.initial,
      s.offset, s.steps, current.q, current.c, row.n, row.x, row.compared,
      row.error, row.comparedError, row.control, row.comparedControl,
      row.next, row.comparedNext, row.difference, row.predictedDifference,
      row.applied ? 'update' : 'final-state'
    ].map(csvCell).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
