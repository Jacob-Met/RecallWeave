/** Exact, bounded interpolation of authored rational samples; no approximate fit. */
export const INTERPOLATION_LIMITS = Object.freeze({
  maxPoints: 8, maxQueries: 16, maxTokenCharacters: 32,
  maxNumerator: 1000000000, maxDenominator: 1000000, maxDecimalPlaces: 6
});

const abs = n => n < 0n ? -n : n;
function gcd(a, b) {
  a = abs(a); b = abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
function rational(n, d = 1n) {
  if (d === 0n) throw new Error('A rational denominator cannot be zero.');
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
const add = (a, b) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
const subtract = (a, b) => rational(a.n * b.d - b.n * a.d, a.d * b.d);
const multiply = (a, b) => rational(a.n * b.n, a.d * b.d);
const divide = (a, b) => rational(a.n * b.d, a.d * b.n);
const compare = (a, b) => a.n * b.d < b.n * a.d ? -1 : a.n * b.d > b.n * a.d ? 1 : 0;
const text = a => a.d === 1n ? String(a.n) : `${a.n}/${a.d}`;
const zero = () => rational(0n);

function coordinate(value, name) {
  if (typeof value !== 'string' || value.length > INTERPOLATION_LIMITS.maxTokenCharacters) {
    throw new Error(`${name} must be a rational string of at most 32 characters.`);
  }
  const token = value.trim();
  let n, d;
  const fraction = /^([+-]?\d+)\/(\d+)$/.exec(token);
  const decimal = /^([+-]?)(\d+)\.(\d{1,6})$/.exec(token);
  if (fraction) {
    n = BigInt(fraction[1]); d = BigInt(fraction[2]);
  } else if (decimal) {
    n = BigInt(decimal[2] + decimal[3]) * (decimal[1] === '-' ? -1n : 1n);
    d = 10n ** BigInt(decimal[3].length);
  } else if (/^[+-]?\d+$/.test(token)) {
    n = BigInt(token); d = 1n;
  } else {
    throw new Error(`${name} must be an integer, a decimal with at most six places, or a fraction with a positive denominator.`);
  }
  if (abs(n) > 1000000000n || d < 1n || d > 1000000n) {
    throw new Error(`${name} exceeds the numerator or positive denominator limit.`);
  }
  return rational(n, d);
}

function record(value, keys, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new Error(`${name} must be a plain object.`);
  }
  const fields = Reflect.ownKeys(value);
  if (fields.length !== keys.length || fields.some(key => !keys.includes(key))) {
    throw new Error(`${name} needs exactly ${keys.join(' and ')}.`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value')) {
      throw new Error(`${name}.${key} must be a data property.`);
    }
  }
}

function list(value, minimum, maximum, name) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype
      || value.length < minimum || value.length > maximum
      || Reflect.ownKeys(value).length !== value.length + 1) {
    throw new Error(`${name} must be a dense array of ${minimum} to ${maximum} entries.`);
  }
  for (let index = 0; index < value.length; index++) {
    const property = Object.getOwnPropertyDescriptor(value, String(index));
    if (!property || !Object.hasOwn(property, 'value')) throw new Error(`${name}[${index}] must be a data property.`);
  }
}

function evaluate(coefficients, x) {
  let result = zero();
  for (let i = coefficients.length - 1; i >= 0; i--) result = add(multiply(result, x), coefficients[i]);
  return result;
}

/**
 * Return a detached JSON-compatible mathematical observation. Authored order is
 * kept in the Newton basis; sorting is unnecessary and would hide that choice.
 */
export function interpolatePolynomial(input) {
  record(input, ['points', 'at'], 'Input');
  list(input.points, 1, 8, 'points');
  list(input.at, 0, 16, 'at');
  const nodes = [];
  const seen = new Set();
  for (let index = 0; index < input.points.length; index++) {
    const point = input.points[index];
    record(point, ['x', 'y'], `points[${index}]`);
    const x = coordinate(point.x, `points[${index}].x`);
    const y = coordinate(point.y, `points[${index}].y`);
    if (seen.has(text(x))) throw new Error(`points[${index}].x duplicates an earlier rational coordinate.`);
    seen.add(text(x));
    nodes.push({ x, y });
  }
  const queries = [];
  for (let index = 0; index < input.at.length; index++) queries.push(coordinate(input.at[index], `at[${index}]`));

  // Column k contains the differences on all contiguous k+1-node windows.
  const differences = [nodes.map(node => node.y)];
  for (let order = 1; order < nodes.length; order++) {
    const previous = differences[order - 1];
    const column = [];
    for (let start = 0; start < nodes.length - order; start++) {
      column.push(divide(subtract(previous[start + 1], previous[start]),
        subtract(nodes[start + order].x, nodes[start].x)));
    }
    differences.push(column);
  }
  const newton = differences.map(column => column[0]);
  let basis = [rational(1n)];
  let coefficients = [zero()];
  for (let order = 0; order < nodes.length; order++) {
    while (coefficients.length < basis.length) coefficients.push(zero());
    for (let power = 0; power < basis.length; power++) {
      coefficients[power] = add(coefficients[power], multiply(newton[order], basis[power]));
    }
    if (order + 1 < nodes.length) {
      const next = Array.from({ length: basis.length + 1 }, zero);
      for (let power = 0; power < basis.length; power++) {
        next[power] = subtract(next[power], multiply(nodes[order].x, basis[power]));
        next[power + 1] = add(next[power + 1], basis[power]);
      }
      basis = next;
    }
  }
  while (coefficients.length > 1 && coefficients.at(-1).n === 0n) coefficients.pop();
  const degree = coefficients.length === 1 && coefficients[0].n === 0n ? null : coefficients.length - 1;
  let min = nodes[0].x, max = nodes[0].x;
  for (const node of nodes) {
    if (compare(node.x, min) < 0) min = node.x;
    if (compare(node.x, max) > 0) max = node.x;
  }
  const nodeChecks = nodes.map((node, index) => {
    const actual = evaluate(coefficients, node.x);
    if (compare(actual, node.y) !== 0) throw new Error('Internal interpolation reproduction check failed.');
    return { index, x: text(node.x), expected: text(node.y), actual: text(actual), ok: true };
  });
  return {
    format: 'recallweave-polynomial-interpolation/1',
    input: { points: input.points.map(point => ({ x: point.x, y: point.y })), at: [...input.at] },
    nodes: nodes.map((node, index) => ({ index, x: text(node.x), y: text(node.y) })),
    dividedDifferences: differences.map(column => column.map(text)),
    newtonCoefficients: newton.map(text), monomialCoefficients: coefficients.map(text), degree,
    sampleRange: { min: text(min), max: text(max) }, nodeChecks,
    evaluations: queries.map((x, index) => ({
      index, input: input.at[index], x: text(x), value: text(evaluate(coefficients, x)),
      relation: seen.has(text(x)) ? 'node' : compare(x, min) > 0 && compare(x, max) < 0 ? 'inside' : 'outside'
    })),
    limits: { ...INTERPOLATION_LIMITS },
    interpretation: 'Exact interpolation reproduces the supplied nodes. It is not an error bound or a guarantee about a function between or outside those nodes.'
  };
}
