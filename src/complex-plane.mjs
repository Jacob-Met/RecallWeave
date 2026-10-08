/** Finite complex multiplication for the original RecallWeave lesson.
 * Coordinates are bounded decimal text; arithmetic is JavaScript binary64.
 * This is a sequence of discrete products, not a signal or continuous path.
 */
export const COMPLEX_FORMAT = 'recallweave-complex-multiplication/1';
export const COMPLEX_LIMITS = Object.freeze({ component: 10, fractionalDigits: 3, textLength: 16, maxSteps: 8 });
const zero = value => Object.is(value, -0) ? 0 : value;

function record(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(name + ' must be an object.');
  return value;
}

function coordinate(value, label) {
  if (typeof value !== 'string') throw new TypeError(label + ' must be decimal text.');
  const text = value.trim();
  if (!text || text.length > COMPLEX_LIMITS.textLength || !/^[+-]?(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/.test(text)) {
    throw new RangeError(label + ': use a plain decimal with at most three digits after the decimal point.');
  }
  const number = Number(text);
  if (!Number.isFinite(number) || Math.abs(number) > COMPLEX_LIMITS.component) {
    throw new RangeError(label + ' must be between -10 and 10.');
  }
  return { text, number: zero(number) };
}

/** A representative angle in degrees, in [-180, 180). */
export function principalDegrees(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('The angle must be finite.');
  let result = value % 360;
  if (result >= 180) result -= 360;
  if (result < -180) result += 360;
  return zero(result);
}

function point(re, im) {
  if (!Number.isFinite(re) || !Number.isFinite(im)) throw new RangeError('The product exceeds the finite calculation range.');
  re = zero(re);
  im = zero(im);
  return {
    re, im,
    modulus: Math.hypot(re, im),
    argumentDegrees: re === 0 && im === 0 ? null : principalDegrees(Math.atan2(im, re) * 180 / Math.PI),
  };
}

function productOf(a, b) {
  return point(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
}

function immutable(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) immutable(child);
    Object.freeze(value);
  }
  return value;
}

/** P0 = z; P(k+1) = Pk*w. A zero-step sequence contains its initial point. */
export function analyzeMultiplication(input) {
  record(input, 'The experiment');
  const iz = record(input.z, 'z');
  const iw = record(input.w, 'w');
  const zr = coordinate(iz.re, 'Real part of z');
  const zi = coordinate(iz.im, 'Imaginary coefficient of z');
  const wr = coordinate(iw.re, 'Real part of w');
  const wi = coordinate(iw.im, 'Imaginary coefficient of w');
  if (!Number.isInteger(input.steps) || input.steps < 0 || input.steps > COMPLEX_LIMITS.maxSteps) {
    throw new RangeError('Choose a whole number of multiplications from 0 to 8.');
  }
  const z = point(zr.number, zi.number);
  const w = point(wr.number, wi.number);
  const product = productOf(z, w);
  const points = [{ step: 0, ...z }];
  for (let step = 1; step <= input.steps; step++) {
    points.push({ step, ...productOf(points[step - 1], w) });
  }
  const measuredRotationDegrees = z.argumentDegrees === null || product.argumentDegrees === null
    ? null : principalDegrees(product.argumentDegrees - z.argumentDegrees);
  return immutable({
    format: COMPLEX_FORMAT,
    inputs: { z: { re: zr.text, im: zi.text }, w: { re: wr.text, im: wi.text }, steps: input.steps },
    definition: 'P0 = z; P(k+1) = Pk*w. N multiplications retain N+1 indexed points.',
    angleConvention: 'Degrees in [-180, 180); directions are equivalent modulo 360 degrees. Zero has no argument.',
    arithmetic: 'JavaScript binary64. Stored numbers are not rounded for display; decimal inputs and polar values need not be represented exactly.',
    pathMeaning: 'Discrete products only. Connecting segments do not specify continuous rotation, elapsed time or winding.',
    z, w, product,
    scaleFactor: w.modulus,
    multiplierArgumentDegrees: w.argumentDegrees,
    measuredRotationDegrees,
    transformation: w.modulus === 0 ? 'collapse' : z.modulus === 0 ? 'origin' : 'rotation-and-scaling',
    points,
  });
}

/** Recalculate from an accepted input snapshot; never serialize rounded table text. */
export function serializeExperiment(input) {
  return JSON.stringify(analyzeMultiplication(input), null, 2) + '\n';
}

/** Equal mathematical units on both 600px viewBox axes, including the reference multiplier. */
export function plotGeometry(report) {
  record(report, 'The calculated experiment');
  if (report.format !== COMPLEX_FORMAT || !Array.isArray(report.points) || !report.points.length) {
    throw new TypeError('Calculate an experiment before plotting.');
  }
  const values = [...report.points, report.w, report.product];
  if (values.some(p => !p || !Number.isFinite(p.re) || !Number.isFinite(p.im))) {
    throw new TypeError('Plot coordinates must be finite.');
  }
  const maximum = Math.max(...values.flatMap(p => [Math.abs(p.re), Math.abs(p.im)]));
  const halfRange = maximum === 0 ? 1 : maximum * 1.2;
  const unitsToPixels = 240 / halfRange;
  const convert = p => ({ x: 300 + p.re * unitsToPixels, y: 300 - p.im * unitsToPixels });
  return immutable({
    width: 600, height: 600, center: { x: 300, y: 300 },
    halfRange, scaleX: unitsToPixels, scaleY: unitsToPixels,
    points: report.points.map(p => ({ step: p.step, ...convert(p) })),
    multiplier: convert(report.w),
    product: convert(report.product),
  });
}

/** At most eight significant digits; preserve meaningful tiny nonzero values. */
export function displayNumber(value) {
  if (value === null) return 'undefined';
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Only finite display values are supported.');
  if (value === 0 || Object.is(value, -0)) return '0';
  return Number(value.toPrecision(8)).toString();
}
