/** Exact, bounded integer teaching model. No I/O or learner state. */
export const EUCLID_TRACE_FORMAT = 'recallweave-euclid-trace/1';
export const EUCLID_MAX_INPUT = 999999n;

/** Accept decimal text only. Surrounding whitespace and leading zeros are allowed. */
export function parseEuclidInteger(value, label = 'Input') {
  if (typeof value !== 'string' || value.length > 32 || !/^[0-9]{1,6}$/.test(value.trim())) {
    throw new RangeError(label + ' must be a whole decimal number from 0 through 999999.');
  }
  return BigInt(value.trim());
}

function coefficients(x, y) {
  return Object.freeze({ x: x.toString(), y: y.toString() });
}

/**
 * Keep the supplied order. A < B has a genuine initial quotient of zero.
 * Every integer in the returned record is decimal text; only step indices are numbers.
 * gcd(0, 0) = 0. A zero initial divisor requires no division.
 */
export function computeEuclid(aText, bText) {
  const a = parseEuclidInteger(aText, 'First integer');
  const b = parseEuclidInteger(bText, 'Second integer');
  let oldR = a, r = b;
  let oldX = 1n, x = 0n;
  let oldY = 0n, y = 1n;
  const steps = [];
  while (r !== 0n) {
    const q = oldR / r;
    const nextR = oldR % r;
    const nextX = oldX - q * x;
    const nextY = oldY - q * y;
    steps.push(Object.freeze({
      index: steps.length + 1,
      dividend: oldR.toString(),
      divisor: r.toString(),
      quotient: q.toString(),
      remainder: nextR.toString(),
      dividendCoefficients: coefficients(oldX, oldY),
      divisorCoefficients: coefficients(x, y),
      remainderCoefficients: coefficients(nextX, nextY)
    }));
    [oldR, r] = [r, nextR];
    [oldX, x] = [x, nextX];
    [oldY, y] = [y, nextY];
  }
  return Object.freeze({
    format: EUCLID_TRACE_FORMAT,
    inputs: Object.freeze({ a: a.toString(), b: b.toString() }),
    convention: 'gcd(0, 0) = 0',
    steps: Object.freeze(steps),
    gcd: oldR.toString(),
    coefficients: coefficients(oldX, oldY)
  });
}
