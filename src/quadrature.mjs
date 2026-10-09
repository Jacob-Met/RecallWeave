// Exact arithmetic for the bounded polynomial teaching model; no floating-point
// estimate or rendered coordinate participates in an error/exactness decision.
const abs = n => n < 0n ? -n : n;
function rational(n, d = 1n) {
  if (d === 0n) throw new Error('A rational denominator cannot be zero.');
  if (d < 0n) { n = -n; d = -d; }
  let a = abs(n), b = d;
  while (b) [a, b] = [b, a % b];
  return { n: n / a, d: d / a };
}
const add = (a, b) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => rational(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => rational(a.n * b.n, a.d * b.d);
const div = (a, b) => rational(a.n * b.d, a.d * b.n);
const magnitude = a => rational(abs(a.n), a.d);
const zero = rational(0n);
function value(a) {
  return { numerator: String(a.n), denominator: String(a.d),
    fraction: a.d === 1n ? String(a.n) : a.n + '/' + a.d,
    approximate: Number(a.n) / Number(a.d) };
}
function freeze(v) {
  if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); }
  return v;
}
function integer(v, low, high, label) {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < low || v > high) {
    throw new Error(label + ' must be an integer from ' + low + ' through ' + high + '.');
  }
  return v;
}
export const SUBINTERVAL_COUNTS = Object.freeze([2, 4, 8, 16, 32]);
export const QUADRATURE_PRESETS = freeze([
  { id: 'quadratic', title: 'A quadratic: bracket the integral',
    coefficients: [0, 0, 1, 0, 0, 0], lower: 0, upper: 2, subintervals: 2 },
  { id: 'cubic', title: 'A cubic: Simpson is exact',
    coefficients: [1, 0, 0, 1, 0, 0], lower: 0, upper: 2, subintervals: 2 },
  { id: 'quartic', title: 'A quartic: inspect refinement',
    coefficients: [0, 0, 0, 0, 1, 0], lower: -1, upper: 1, subintervals: 2 },
  { id: 'missed', title: 'Two rules agree and still miss',
    coefficients: [0, 0, 1, -3, 2, 0], lower: 0, upper: 1, subintervals: 2 },
  { id: 'coincidence', title: 'A lucky coarse answer does not persist',
    coefficients: [0, 0, -9, 0, 5, 0], lower: -1, upper: 1, subintervals: 2 },
  { id: 'odd', title: 'Odd symmetry: cancellation to zero',
    coefficients: [0, 0, 0, 0, 0, 1], lower: -2, upper: 2, subintervals: 4 },
  { id: 'negative', title: 'A negative signed integral',
    coefficients: [-2, 0, 0, 0, 0, 0], lower: -1, upper: 2, subintervals: 2 },
  { id: 'zero', title: 'The zero polynomial',
    coefficients: [0, 0, 0, 0, 0, 0], lower: -1, upper: 1, subintervals: 2 },
]);
function parse(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Supply polynomial settings.');
  if (!Array.isArray(input.coefficients) || input.coefficients.length !== 6) {
    throw new Error('Supply exactly six coefficients, from the constant through x^5.');
  }
  const coefficients = Array.from({length: 6}, (_, i) =>
    integer(input.coefficients[i], -9, 9, 'Coefficient c' + i));
  const lower = integer(input.lower, -5, 5, 'Lower bound');
  const upper = integer(input.upper, -5, 5, 'Upper bound');
  if (lower >= upper) throw new Error('The lower bound must be smaller than the upper bound.');
  if (!SUBINTERVAL_COUNTS.includes(input.subintervals)) {
    throw new Error('Choose 2, 4, 8, 16 or 32 elementary subintervals.');
  }
  return { coefficients, lower, upper, subintervals: input.subintervals };
}
function polynomial(coefficients, x) {
  let out = zero;
  for (let i = coefficients.length - 1; i >= 0; i--) out = add(mul(out, x), coefficients[i]);
  return out;
}
function integral(coefficients, a, b) {
  let aPower = a, bPower = b, out = zero;
  for (let k = 0; k < coefficients.length; k++) {
    out = add(out, div(mul(coefficients[k], sub(bPower, aPower)), rational(BigInt(k + 1))));
    aPower = mul(aPower, a); bPower = mul(bPower, b);
  }
  return out;
}
function quadrature(coefficients, a, b, n, exact, degree, includeNodes) {
  const h = div(sub(b, a), rational(BigInt(n))), result = {};
  for (const method of ['midpoint', 'trapezoid', 'simpson']) {
    const nodes = []; let estimate = zero;
    const last = method === 'midpoint' ? n - 1 : n;
    for (let i = 0; i <= last; i++) {
      const index = method === 'midpoint' ? rational(BigInt(2 * i + 1), 2n) : rational(BigInt(i));
      const x = add(a, mul(h, index)), y = polynomial(coefficients, x);
      const factor = method === 'midpoint' ? rational(1n)
        : method === 'trapezoid' ? rational(i === 0 || i === n ? 1n : 2n, 2n)
        : rational(i === 0 || i === n ? 1n : i % 2 ? 4n : 2n, 3n);
      const weight = mul(h, factor), contribution = mul(weight, y);
      estimate = add(estimate, contribution);
      if (includeNodes) nodes.push({ index: i, x: value(x), y: value(y), weight: value(weight), contribution: value(contribution) });
    }
    const error = sub(estimate, exact);
    result[method] = { estimate: value(estimate), signedError: value(error),
      absoluteError: value(magnitude(error)), exact: error.n === 0n,
      guaranteedForDegree: degree === null || degree <= (method === 'simpson' ? 3 : 1),
      degreeGuarantee: method === 'simpson' ? 3 : 1, distinctNodes: last + 1,
      ...(includeNodes ? { nodes } : {}) };
  }
  return result;
}
const reports = new WeakSet();
export function analyzeQuadrature(input) {
  const settings = parse(input), coefficients = settings.coefficients.map(c => rational(BigInt(c)));
  const a = rational(BigInt(settings.lower)), b = rational(BigInt(settings.upper));
  let degree = settings.coefficients.length - 1;
  while (degree >= 0 && settings.coefficients[degree] === 0) degree--;
  const polynomialDegree = degree < 0 ? null : degree;
  const exact = integral(coefficients, a, b);
  const rules = quadrature(coefficients, a, b, settings.subintervals, exact, polynomialDegree, true);
  let previous = null;
  const refinement = SUBINTERVAL_COUNTS.map(n => {
    const results = quadrature(coefficients, a, b, n, exact, polynomialDegree, false);
    for (const method of ['midpoint', 'trapezoid', 'simpson']) {
      const current = results[method].absoluteError;
      let ratio = { kind: 'first-level', value: null };
      if (previous) {
        const prior = previous[method].absoluteError;
        if (current.numerator === '0') ratio = { kind: prior.numerator === '0' ? 'both-exact' : 'reached-exact', value: null };
        else ratio = { kind: 'finite', value: value(div(
          rational(BigInt(prior.numerator), BigInt(prior.denominator)),
          rational(BigInt(current.numerator), BigInt(current.denominator)))) };
      }
      results[method].previousErrorRatio = ratio;
    }
    previous = results;
    return { subintervals: n, rules: results };
  });
  const report = freeze({ format: 'recallweave-quadrature/1', input: settings,
    polynomialDegree, exactIntegral: value(exact),
    subintervalWidth: value(div(sub(b, a), rational(BigInt(settings.subintervals)))),
    rules, refinement,
    conventions: {
      signedError: 'quadrature estimate minus exact integral',
      subdivision: 'n equal elementary subintervals; Simpson groups adjacent pairs',
      arithmetic: 'Exact rational values from bounded integer polynomial inputs; decimals and geometry are approximate',
      refinement: 'Observed errors for this polynomial, not a universal error or convergence guarantee',
      integral: 'Signed integral, not total geometric area',
    } });
  reports.add(report);
  return report;
}
export function serializeQuadrature(report, inspectedMethod = 'midpoint') {
  if (!reports.has(report)) throw new Error('Download a calculation produced by this model.');
  if (!['midpoint', 'trapezoid', 'simpson'].includes(inspectedMethod)) throw new Error('Choose a supported inspection method.');
  return JSON.stringify({ ...report, inspectedMethod }, null, 2) + '\n';
}
