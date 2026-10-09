/** Exact, bounded polynomial differentiation. Approximation belongs only to display. */
export const STEP_DENOMINATORS = Object.freeze([1, 2, 4, 8, 16, 32]);
export const DIFFERENCE_METHODS = Object.freeze(['forward', 'backward', 'central']);
const admittedReports = new WeakSet();

function gcd(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
}
function rational(n, d = 1n) {
  if (d === 0n) throw new RangeError('A rational denominator cannot be zero.');
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d);
  return {n: n / g, d: d / g};
}
const add = (a, b) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
const subtract = (a, b) => rational(a.n * b.d - b.n * a.d, a.d * b.d);
const multiply = (a, b) => rational(a.n * b.n, a.d * b.d);
const divide = (a, b) => rational(a.n * b.d, a.d * b.n);
function evaluate(coefficients, x) {
  let y = rational(0n);
  for (let i = coefficients.length - 1; i >= 0; i--) y = add(multiply(y, x), rational(BigInt(coefficients[i])));
  return y;
}
function record(a) {
  return Object.freeze({
    numerator: String(a.n), denominator: String(a.d),
    fraction: a.d === 1n ? String(a.n) : `${a.n}/${a.d}`,
    approximate: Number(a.n) / Number(a.d)
  });
}
function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function integer(value, minimum, maximum, field) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${field} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value === 0 ? 0 : value;
}
function admit(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Use an input object.');
  const keys = Reflect.ownKeys(input);
  if (keys.length !== 3 || !['coefficients', 'point', 'stepDenominator'].every(key => keys.includes(key))) {
    throw new TypeError('Input needs only coefficients, point and stepDenominator.');
  }
  const coefficients = input.coefficients;
  if (!Array.isArray(coefficients) || coefficients.length !== 6 || Reflect.ownKeys(coefficients).length !== 7 ||
      !Array.from({length: 6}, (_, i) => Object.hasOwn(coefficients, i)).every(Boolean)) {
    throw new TypeError('Coefficients must contain exactly six dense integer entries, c0 through c5.');
  }
  const copied = Array.from(coefficients, (c, i) => integer(c, -9, 9, `Coefficient c${i}`));
  const point = integer(input.point, -5, 5, 'Evaluation point');
  if (!STEP_DENOMINATORS.includes(input.stepDenominator)) throw new TypeError('Choose a step denominator: 1, 2, 4, 8, 16 or 32.');
  return {coefficients: copied, point, stepDenominator: input.stepDenominator};
}

/** Analyze all six steps; the admitted step only selects the initial inspection. */
export function analyzeDifferentiation(input) {
  const admitted = admit(input);
  const {coefficients, point, stepDenominator} = admitted;
  const degree = coefficients.findLastIndex(c => c !== 0);
  const x = rational(BigInt(point));
  const derivativeCoefficients = coefficients.slice(1).map((c, i) => c * (i + 1));
  const derivative = evaluate(derivativeCoefficients, x);
  const levels = STEP_DENOMINATORS.map(denominator => {
    const h = rational(1n, BigInt(denominator));
    const nodes = [subtract(x, h), x, add(x, h)];
    const values = nodes.map(node => evaluate(coefficients, node));
    const methods = {};
    for (const method of DIFFERENCE_METHODS) {
      const [left, right] = method === 'forward' ? [1, 2] : method === 'backward' ? [0, 1] : [0, 2];
      const difference = subtract(values[right], values[left]);
      const divisor = subtract(nodes[right], nodes[left]);
      const estimate = divide(difference, divisor);
      const error = subtract(estimate, derivative);
      methods[method] = {
        degreeGuarantee: method === 'central' ? 2 : 1,
        guaranteedByDegree: degree <= (method === 'central' ? 2 : 1),
        sampleIndices: [left, right],
        difference: record(difference), divisor: record(divisor),
        estimate: record(estimate), signedError: record(error),
        absoluteError: record(rational(error.n < 0n ? -error.n : error.n, error.d)),
        exact: error.n === 0n
      };
    }
    return {stepDenominator: denominator, step: record(h),
      samples: nodes.map((node, i) => ({offset: i - 1, node: record(node), value: record(values[i])})), methods};
  });
  const report = freeze({
    format: 'recallweave-differentiation-report/1', input: admitted,
    polynomialDegree: degree < 0 ? null : degree, exactDerivative: record(derivative),
    selectedLevel: STEP_DENOMINATORS.indexOf(stepDenominator), levels
  });
  admittedReports.add(report);
  return report;
}

/** A view name cannot substitute for or mutate an admitted calculation. */
export function serializeDifferentiation(report, inspectedMethod) {
  if (!admittedReports.has(report)) throw new TypeError('Export needs an actual admitted differentiation report.');
  if (!DIFFERENCE_METHODS.includes(inspectedMethod)) throw new TypeError('Choose forward, backward or central for the inspected method.');
  return JSON.stringify({format: 'recallweave-differentiation-worked-record/1', inspectedMethod, report}, null, 2) + '\n';
}
