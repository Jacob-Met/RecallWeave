/** Finite, time-homogeneous three-state teaching systems. All inputs are hypothetical. */
export const MAX_STEPS = 30;
export const STATES = Object.freeze(["A", "B", "C"]);
const freezeRows = rows => Object.freeze(rows.map(row => Object.freeze([...row])));
const presetData = [
  {
    "id": "mixing",
    "label": "Mixing",
    "matrix": [
      [
        60,
        20,
        20
      ],
      [
        40,
        50,
        10
      ],
      [
        40,
        10,
        50
      ]
    ],
    "initial": [
      100,
      0,
      0
    ],
    "note": "All transitions are positive. The known stationary distribution is [50%,25%,25%]. Distributions approach it from any initial distribution."
  },
  {
    "id": "alternating",
    "label": "Alternating",
    "matrix": [
      [
        0,
        50,
        50
      ],
      [
        100,
        0,
        0
      ],
      [
        100,
        0,
        0
      ]
    ],
    "initial": [
      100,
      0,
      0
    ],
    "note": "Starting with all mass in A alternates between A and the group B/C. The stationary distribution [50%,25%,25%] exists; starting entirely in A does not approach it."
  },
  {
    "id": "absorbing",
    "label": "Absorbing A",
    "matrix": [
      [
        100,
        0,
        0
      ],
      [
        25,
        50,
        25
      ],
      [
        0,
        50,
        50
      ]
    ],
    "initial": [
      0,
      0,
      100
    ],
    "note": "A is absorbing and both other states can reach it. Probability accumulates in A. The finite plotted horizon does not imply every path is already absorbed."
  },
  {
    "id": "closed",
    "label": "Two closed states",
    "matrix": [
      [
        100,
        0,
        0
      ],
      [
        0,
        100,
        0
      ],
      [
        40,
        60,
        0
      ]
    ],
    "initial": [
      0,
      0,
      100
    ],
    "note": "A and B are separate absorbing states. Starting at C produces [40%,60%,0%] after one step. The initial distribution can change the long-run outcome."
  }
];
export const PRESETS = Object.freeze(presetData.map(p => Object.freeze({
  ...p, matrix: freezeRows(p.matrix), initial: Object.freeze([...p.initial])
})));

function percentRow(row, label) {
  if (!Array.isArray(row) || row.length !== 3) throw new Error(label + " needs three percentages.");
  const copy = Array.from(row, (value, index) => {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) {
      throw new Error(label + ", state " + STATES[index] + ": enter a whole percentage from 0 to 100.");
    }
    return value;
  });
  const sum = copy.reduce((a, b) => a + b, 0);
  if (sum !== 100) throw new Error(label + " adds to " + sum + "%. It must add to 100%.");
  return Object.freeze(copy);
}
export function parsePercent(text, label = "Percentage") {
  if (typeof text !== "string" || !/^\d+$/.test(text.trim())) {
    throw new Error(label + ": enter a whole percentage from 0 to 100.");
  }
  const value = Number(text.trim());
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error(label + ": enter a whole percentage from 0 to 100.");
  }
  return value;
}
export function validateConfiguration(input) {
  if (!input || typeof input !== "object" || !Array.isArray(input.matrix) || input.matrix.length !== 3) {
    throw new Error("Provide one transition row for each of A, B and C.");
  }
  return Object.freeze({
    matrix: Object.freeze(Array.from(input.matrix, (row, i) => percentRow(row, "From " + STATES[i]))),
    initial: percentRow(input.initial, "Initial distribution")
  });
}
function validateProbabilities(row) {
  if (!Array.isArray(row) || row.length !== 3 ||
      row.some(x => typeof x !== "number" || !Number.isFinite(x) || x < 0 || x > 1 + 1e-12) ||
      Math.abs(row.reduce((a, b) => a + b, 0) - 1) > 1e-12) {
    throw new Error("A computed distribution must have three finite probabilities totaling one.");
  }
}
export function computeTrace(input, steps = MAX_STEPS) {
  const config = validateConfiguration(input);
  if (!Number.isInteger(steps) || steps < 0 || steps > MAX_STEPS) {
    throw new Error("Choose a whole step count from 0 to " + MAX_STEPS + ".");
  }
  let probabilities = Object.freeze(config.initial.map(x => x / 100));
  const trace = [Object.freeze({step: 0, probabilities, contributions: null})];
  for (let step = 1; step <= steps; step++) {
    // A row contributes its current mass times each conditional next-state probability.
    const contributions = freezeRows(config.matrix.map((row, i) =>
      row.map(percent => probabilities[i] * (percent / 100))));
    probabilities = Object.freeze(STATES.map((_, j) =>
      contributions.reduce((sum, row) => sum + row[j], 0)));
    validateProbabilities(probabilities);
    trace.push(Object.freeze({step, probabilities, contributions}));
  }
  return Object.freeze({config, trace: Object.freeze(trace)});
}
export function presetFor(input) {
  const config = validateConfiguration(input);
  return PRESETS.find(p => p.matrix.every((row, i) =>
    row.every((value, j) => value === config.matrix[i][j]))) || null;
}
export function absorbingStates(input) {
  const {matrix} = validateConfiguration(input);
  return STATES.filter((_, i) => matrix[i][i] === 100);
}
export function observationJSON(computed, selectedStep) {
  if (!Number.isInteger(selectedStep) || selectedStep < 0 || selectedStep >= computed.trace.length) {
    throw new Error("Select an available step.");
  }
  // Recompute from applied inputs so the exported record cannot mix a draft with old output.
  const fresh = computeTrace(computed.config, computed.trace.length - 1);
  return JSON.stringify({
    format: "recallweave-markov-observation/1",
    interpretation: "Hypothetical finite time-homogeneous Markov system; distributions, not sampled paths.",
    convention: "Rows are current states; columns are next states; state order A, B, C.",
    inputUnits: "Integer percentages; each row and the initial distribution total 100.",
    transitionPercent: fresh.config.matrix,
    initialPercent: fresh.config.initial,
    selectedStep,
    arithmetic: "JavaScript binary64; displayed percentages are rounded to four decimal places. Numeric JSON retains computed precision.",
    trace: fresh.trace
  }, null, 2) + "\n";
}
