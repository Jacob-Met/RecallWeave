// Exact probabilities for uniform selection from a finite two-event table.
// Browser display and percentages belong to the UI; this module never rounds counts.

export const CELL_KEYS = Object.freeze(['ab', 'aNotB', 'notAB', 'neither']);

const all = CELL_KEYS;
const a = ['ab', 'aNotB'];
const notA = ['notAB', 'neither'];
const b = ['ab', 'notAB'];
const notB = ['aNotB', 'neither'];

function definition(id, symbol, kind, numeratorCells, denominatorCells) {
  return Object.freeze({
    id, symbol, kind,
    numeratorCells: Object.freeze([...numeratorCells]),
    denominatorCells: Object.freeze([...denominatorCells]),
  });
}

export const PROBABILITIES = Object.freeze([
  definition('joint_ab', 'P(A ∩ B)', 'joint', ['ab'], all),
  definition('joint_a_not_b', 'P(A ∩ not B)', 'joint', ['aNotB'], all),
  definition('joint_not_a_b', 'P(not A ∩ B)', 'joint', ['notAB'], all),
  definition('joint_neither', 'P(not A ∩ not B)', 'joint', ['neither'], all),
  definition('marginal_a', 'P(A)', 'marginal', a, all),
  definition('marginal_not_a', 'P(not A)', 'marginal', notA, all),
  definition('marginal_b', 'P(B)', 'marginal', b, all),
  definition('marginal_not_b', 'P(not B)', 'marginal', notB, all),
  definition('a_given_b', 'P(A | B)', 'conditional', ['ab'], b),
  definition('not_a_given_b', 'P(not A | B)', 'conditional', ['notAB'], b),
  definition('a_given_not_b', 'P(A | not B)', 'conditional', ['aNotB'], notB),
  definition('not_a_given_not_b', 'P(not A | not B)', 'conditional', ['neither'], notB),
  definition('b_given_a', 'P(B | A)', 'conditional', ['ab'], a),
  definition('not_b_given_a', 'P(not B | A)', 'conditional', ['aNotB'], a),
  definition('b_given_not_a', 'P(B | not A)', 'conditional', ['notAB'], notA),
  definition('not_b_given_not_a', 'P(not B | not A)', 'conditional', ['neither'], notA),
]);

/** Admit bounded decimal input before allocating a BigInt. Leading zeros count. */
export function parseCount(raw) {
  if (typeof raw !== 'string') throw new TypeError('A count must be a string.');
  if (raw.length > 128) throw new RangeError('A count input may contain at most 128 UTF-16 units.');
  const value = raw.trim();
  if (!/^[0-9]{1,18}$/.test(value)) {
    throw new RangeError('A count must contain 1–18 ASCII digits after trimming.');
  }
  return BigInt(value);
}

/** Keep labels literal, rejecting controls before trimming surrounding whitespace. */
export function parseEventLabel(raw) {
  if (typeof raw !== 'string') throw new TypeError('An event label must be a string.');
  if (raw.length > 320) throw new RangeError('An event label may contain at most 320 UTF-16 units.');
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(raw)) {
    throw new RangeError('An event label must not contain C0 or C1 control characters.');
  }
  const value = raw.trim();
  const length = [...value].length;
  if (length < 1 || length > 80) {
    throw new RangeError('An event label must contain 1–80 Unicode code points after trimming.');
  }
  return value;
}

function record(value, name) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(name + ' must be an object.');
  }
  return value;
}

function field(value, key, name) {
  if (!Object.hasOwn(value, key)) throw new TypeError(name + ' is required.');
  return value[key];
}

function gcd(left, right) {
  while (right !== 0n) [left, right] = [right, left % right];
  return left;
}

function sum(cells, keys) {
  return keys.reduce((total, key) => total + cells[key], 0n);
}

/**
 * Return an immutable JSON-safe snapshot. The original summed counts are retained
 * beside each reduced ratio. A zero denominator has no ratio, including 0/0.
 * Independence is defined for every positive-total table, even degenerate events.
 */
export function analyzeTable(input) {
  record(input, 'The table');
  const rawCells = record(field(input, 'cells', 'Table cells'), 'Table cells');
  const rawLabels = record(field(input, 'labels', 'Event labels'), 'Event labels');
  const counts = Object.fromEntries(CELL_KEYS.map(key => [
    key, parseCount(field(rawCells, key, 'Cell ' + key)),
  ]));
  const labels = Object.freeze({
    a: parseEventLabel(field(rawLabels, 'a', 'Event A label')),
    b: parseEventLabel(field(rawLabels, 'b', 'Event B label')),
  });
  const total = sum(counts, all);
  const probabilities = Object.freeze(PROBABILITIES.map(item => {
    const numerator = sum(counts, item.numeratorCells);
    const denominator = sum(counts, item.denominatorCells);
    const defined = denominator !== 0n;
    const divisor = defined ? gcd(numerator, denominator) : null;
    return Object.freeze({
      ...item,
      numerator: numerator.toString(),
      denominator: denominator.toString(),
      defined,
      reducedNumerator: defined ? (numerator / divisor).toString() : null,
      reducedDenominator: defined ? (denominator / divisor).toString() : null,
    });
  }));
  const left = counts.ab * total;
  const right = sum(counts, a) * sum(counts, b);
  return Object.freeze({
    format: 'recallweave-conditional-table/1',
    labels,
    cells: Object.freeze(Object.fromEntries(CELL_KEYS.map(key => [key, counts[key].toString()]))),
    total: total.toString(),
    probabilities,
    independence: Object.freeze({
      defined: total !== 0n,
      independent: total === 0n ? null : left === right,
      left: left.toString(),
      right: right.toString(),
    }),
  });
}
