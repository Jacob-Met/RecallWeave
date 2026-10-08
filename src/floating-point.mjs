/** Original RecallWeave experiments. Integer ratios keep the reference separate from rounding. */
const buffer = new ArrayBuffer(8);
const view = new DataView(buffer);

function gcd(a, b) {
  a = a < 0n ? -a : a;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function ratio(n, d = 1n) {
  if (d === 0n) throw new RangeError('A reference denominator cannot be zero.');
  if (d < 0n) [n, d] = [-n, -d];
  const divisor = gcd(n, d);
  return { n: n / divisor, d: d / divisor };
}

const add = (a, b) => ratio(a.n * b.d + b.n * a.d, a.d * b.d);
const subtract = (a, b) => ratio(a.n * b.d - b.n * a.d, a.d * b.d);
const multiply = (a, b) => ratio(a.n * b.n, a.d * b.d);
const sign = value => value.n === 0n ? 0 : value.n < 0n ? -1 : 1;

function publicRatio(value) {
  return Object.freeze({
    numerator: String(value.n), denominator: String(value.d),
    text: value.d === 1n ? String(value.n) : `${value.n}/${value.d}`,
  });
}

/** Exact value of a finite JavaScript Number, decoded from its binary64 bits. */
function numberRatio(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError('Use a finite Number for the exact reference.');
  }
  view.setFloat64(0, value, false);
  const bits = view.getBigUint64(0, false);
  const negative = (bits >> 63n) !== 0n;
  const exponent = Number((bits >> 52n) & 0x7ffn);
  const fraction = bits & 0xfffffffffffffn;
  let numerator = exponent === 0 ? fraction : (1n << 52n) + fraction;
  if (negative) numerator = -numerator;
  const shift = exponent === 0 ? -1074 : exponent - 1023 - 52;
  return shift < 0 ? ratio(numerator, 1n << BigInt(-shift)) : ratio(numerator << BigInt(shift));
}

export function exactNumber(value) {
  return publicRatio(numberRatio(value));
}

function bits32(value) {
  view.setFloat32(0, value, false);
  return view.getUint32(0, false);
}

function fromBits32(bits) {
  view.setUint32(0, bits, false);
  return view.getFloat32(0, false);
}

/** Adjacent binary32 value in numerical order; null means no further value. */
function neighbor32(value, direction) {
  if (value === Infinity) return direction > 0 ? null : fromBits32(0x7f7fffff);
  if (value === -Infinity) return direction < 0 ? null : fromBits32(0xff7fffff);
  if (value === 0) return direction > 0 ? 2 ** -149 : -(2 ** -149);
  const bits = bits32(value);
  return fromBits32(bits + (value > 0 ? direction : -direction));
}

/** This deliberately models Number -> Math.fround, not arbitrary-precision decimal input. */
export function inspectFloat32(value) {
  const input = numberRatio(value);
  const stored = Math.fround(value);
  const bits = bits32(stored);
  const exponentBits = (bits >>> 23) & 0xff;
  const fractionBits = bits & 0x7fffff;
  const classification = exponentBits === 255 ? 'infinity'
    : exponentBits === 0 ? (fractionBits === 0 ? 'zero' : 'subnormal') : 'normal';
  const exactStored = Number.isFinite(stored) ? numberRatio(stored) : null;
  const signedError = exactStored ? subtract(exactStored, input) : null;
  return Object.freeze({
    input: value, stored, negativeZero: Object.is(stored, -0), classification,
    bits: bits.toString(2).padStart(32, '0'), hex: bits.toString(16).padStart(8, '0'),
    signBit: bits >>> 31, exponentBits, fractionBits,
    inputExact: publicRatio(input), storedExact: exactStored && publicRatio(exactStored),
    signedError: signedError && publicRatio(signedError),
    previous: neighbor32(stored, -1), next: neighbor32(stored, 1),
  });
}

export const NUMBER_PRESETS = Object.freeze([
  Object.freeze({ id: 'eighth', label: 'An exact binary fraction: 0.125', value: 0.125 }),
  Object.freeze({ id: 'tenth', label: 'A decimal fraction: 0.1', value: 0.1 }),
  Object.freeze({ id: 'tie-lower', label: 'Halfway: 16,777,217', value: 16777217 }),
  Object.freeze({ id: 'tie-upper', label: 'Next halfway: 16,777,219', value: 16777219 }),
  Object.freeze({ id: 'smallest', label: 'Smallest positive binary32: 2^-149', value: 2 ** -149 }),
  Object.freeze({ id: 'half-smallest', label: 'Half of that: 2^-150', value: 2 ** -150 }),
  Object.freeze({ id: 'overflow', label: 'Outside the finite binary32 range: 2^128', value: 2 ** 128 }),
]);

export const ASSOCIATION_CASES = Object.freeze([
  Object.freeze({ id: 'cancellation', label: '100,000,000 + (-100,000,000) + 1', values: Object.freeze([100000000, -100000000, 1]) }),
  Object.freeze({ id: 'integer-gap', label: '16,777,216 + 1 + (-16,777,216)', values: Object.freeze([16777216, 1, -16777216]) }),
  Object.freeze({ id: 'exact-control', label: '8 + (-8) + 1', values: Object.freeze([8, -8, 1]) }),
]);

export function associationExperiment(id) {
  const chosen = ASSOCIATION_CASES.find(item => item.id === id);
  if (!chosen) throw new RangeError('Choose one of the named addition experiments.');
  const [a, b, c] = chosen.values.map(Math.fround);
  const leftIntermediate = Math.fround(a + b);
  const rightIntermediate = Math.fround(b + c);
  return Object.freeze({
    id, inputs: chosen.values, storedInputs: Object.freeze([a, b, c]),
    leftIntermediate, rightIntermediate,
    left: Math.fround(leftIntermediate + c), right: Math.fround(a + rightIntermediate),
    exactStoredSum: publicRatio(add(add(numberRatio(a), numberRatio(b)), numberRatio(c))),
  });
}

export const TRIANGLE = Object.freeze([
  Object.freeze([0, 0]), Object.freeze([1.4, 1.6]), Object.freeze([2.6, 3.4]),
]);
export const TRANSLATION_PRESETS = Object.freeze([0, 10000, 1000000, 10000000, 16777216, 67108864]);

function doubleArea(points) {
  const [a, b, c] = points.map(point => point.map(numberRatio));
  return subtract(
    multiply(subtract(b[0], a[0]), subtract(c[1], a[1])),
    multiply(subtract(b[1], a[1]), subtract(c[0], a[0])),
  );
}

const frozenPoints = points => Object.freeze(points.map(point => Object.freeze(point)));

/**
 * Same stored-geometry boundary as the real mesh regression: binary32 local
 * vertices, a wider translation, then binary32 output coordinates. The integer
 * origin and bounded power-of-two unit change make each wider sum exact here.
 */
export function triangleExperiment({ translation = 10000000, unitExponent = 0 } = {}) {
  if (!Number.isInteger(translation) || translation < 0 || translation > 67108864) {
    throw new RangeError('Choose a whole-number origin from 0 through 67,108,864.');
  }
  if (!Number.isInteger(unitExponent) || unitExponent < -8 || unitExponent > 8) {
    throw new RangeError('Choose a power-of-two unit exponent from -8 through 8.');
  }
  const unitFactor = 2 ** unitExponent;
  const origin = translation * unitFactor;
  const source = TRIANGLE.map(point => point.map(value => Math.fround(value * unitFactor)));
  const translated = source.map(point => point.map(value => value + origin));
  const stored = translated.map(point => point.map(Math.fround));
  const sourceArea = doubleArea(source);
  const storedArea = doubleArea(stored);
  const unitSquared = multiply(numberRatio(unitFactor), numberRatio(unitFactor));
  const intendedArea = multiply(ratio(3n, 5n), unitSquared);
  const relativeStored = stored.map(point => point.map((value, axis) => value - stored[0][axis]));
  const sourceEdges = source.slice(1).map(point => point.map((value, axis) => value - source[0][axis]));
  const sourceAreaNumber = Number(sourceArea.n) / Number(sourceArea.d);
  const shapeSine = Math.abs(sourceAreaNumber) / (Math.hypot(...sourceEdges[0]) * Math.hypot(...sourceEdges[1]));
  const orientation = sign(storedArea) === 0 ? 'collapsed'
    : sign(sourceArea) === sign(storedArea) ? 'preserved' : 'reversed';
  const roundedOrigin = Math.fround(origin);
  return Object.freeze({
    translation, unitExponent, unitFactor, origin,
    source: frozenPoints(source), translated: frozenPoints(translated), stored: frozenPoints(stored),
    relativeStored: frozenPoints(relativeStored),
    plotSource: frozenPoints(source.map(point => point.map(value => value / unitFactor))),
    plotStored: frozenPoints(relativeStored.map(point => point.map(value => value / unitFactor))),
    intendedDoubleArea: publicRatio(intendedArea), sourceDoubleArea: publicRatio(sourceArea),
    storedDoubleArea: publicRatio(storedArea), localStorageDoubleArea: publicRatio(sourceArea),
    orientation, shapeSine,
    nextOriginGap: neighbor32(roundedOrigin, 1) - roundedOrigin,
    exactCoordinateErrors: Object.freeze(stored.map((point, i) => Object.freeze(point.map((value, axis) =>
      publicRatio(subtract(numberRatio(value), numberRatio(translated[i][axis]))))))),
  });
}

/** Report only validated, bounded experiment state; BigInts are already exact strings. */
export function serializeTriangleReport(parameters) {
  const experiment = triangleExperiment(parameters);
  return JSON.stringify({
    format: 'recallweave-floating-point-experiment/1',
    experiment,
    interpretation: {
      input: 'The intended decimal triangle has signed double area 3/5 before a unit change.',
      storage: 'Binary32 local vertices; wider exact translation in this bounded fixture; binary32 output coordinates.',
      area: 'Signed double area is the 2D determinant, twice the signed triangle area.',
      localAlternative: 'Local storage retains these source edges only while the origin stays separate. Baking large global binary32 coordinates can lose them again.',
      scope: 'A numerical teaching experiment, not a complete condition estimate or an observed learning outcome.',
    },
  }, null, 2) + '\n';
}
