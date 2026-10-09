/** Ideal two-qubit circuit model; q0 is the LEFT character of |q0q1>. */
export const BASIS_ORDER = Object.freeze(['00', '01', '10', '11']);
export const MAX_GATES = 24;

function record(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
      Reflect.ownKeys(value).length !== keys.length ||
      keys.some(key => !Object.hasOwn(value, key))) {
    throw new TypeError(label + ' must contain exactly: ' + keys.join(', ') + '.');
  }
}

function qubit(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || (value !== 0 && value !== 1)) {
    throw new RangeError('Qubit indices must be the numbers 0 or 1.');
  }
  return value;
}

function admitGate(value) {
  if (value?.gate === 'CNOT') {
    record(value, ['gate', 'control', 'target'], 'CNOT');
    const control = qubit(value.control), target = qubit(value.target);
    if (control === target) throw new RangeError('CNOT control and target must differ.');
    return {gate: 'CNOT', control, target};
  }
  record(value, ['gate', 'target'], 'Single-qubit gate');
  if (!['X', 'H', 'Z', 'S'].includes(value.gate)) throw new RangeError('Use X, H, Z, S or CNOT.');
  return {gate: value.gate, target: qubit(value.target)};
}

function applyGate(state, operation) {
  const mask = operation.target === 0 ? 2 : 1;
  const next = state.map(pair => pair.slice());
  if (operation.gate === 'CNOT') {
    const control = operation.control === 0 ? 2 : 1;
    for (let index = 0; index < 4; index++) {
      if (index & control) next[index ^ mask] = state[index].slice();
    }
    return next;
  }
  for (let low = 0; low < 4; low++) {
    if (low & mask) continue;
    const high = low | mask, a = state[low], b = state[high];
    if (operation.gate === 'X') {
      next[low] = b.slice(); next[high] = a.slice();
    } else if (operation.gate === 'H') {
      next[low] = [(a[0] + b[0]) / Math.SQRT2, (a[1] + b[1]) / Math.SQRT2];
      next[high] = [(a[0] - b[0]) / Math.SQRT2, (a[1] - b[1]) / Math.SQRT2];
    } else if (operation.gate === 'Z') {
      next[high] = [-b[0], -b[1]];
    } else {
      next[high] = [-b[1], b[0]];
    }
  }
  return next;
}

function snapshot(state, index, gate) {
  const amplitudes = state.map(pair => pair.slice());
  const p = amplitudes.map(([real, imaginary]) => real * real + imaginary * imaginary);
  return {
    index, gate: gate === null ? null : {...gate}, amplitudes, probabilities: p,
    marginals: {q0: [p[0] + p[1], p[2] + p[3]], q1: [p[0] + p[2], p[1] + p[3]]},
    norm_squared: p.reduce((sum, value) => sum + value, 0)
  };
}

/** No input mutation, renormalization, measurement sampling, I/O or hidden state. */
export function simulateCircuit(specification) {
  record(specification, ['initial', 'gates'], 'Circuit');
  if (!BASIS_ORDER.includes(specification.initial)) throw new RangeError('Initial state must be 00, 01, 10 or 11.');
  if (!Array.isArray(specification.gates) || specification.gates.length > MAX_GATES) {
    throw new RangeError('A circuit must contain an array of 0–24 gates.');
  }
  // Array.from also exposes sparse entries to admission instead of skipping them.
  const gates = Array.from(specification.gates, admitGate);
  let state = BASIS_ORDER.map(label => [label === specification.initial ? 1 : 0, 0]);
  const steps = [snapshot(state, 0, null)];
  for (const [offset, gate] of gates.entries()) {
    state = applyGate(state, gate);
    steps.push(snapshot(state, offset + 1, gate));
  }
  return {
    schema: 'recallweave.quantum-circuit/1', qubit_order: 'q0 leftmost, q1 rightmost',
    basis_order: [...BASIS_ORDER], initial: specification.initial, gates, steps
  };
}
