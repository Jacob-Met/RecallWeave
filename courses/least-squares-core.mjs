/** Exact arithmetic for this bounded teaching lab; no statistical-inference model. */
export const LIMITS = Object.freeze({minPoints: 2, maxPoints: 12, coordinate: 20, coefficient: 1000, query: 40});

const abs = value => value < 0n ? -value : value;
function gcd(a, b) {
  a = abs(a); b = abs(b);
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}
function fraction(n, d = 1n) {
  if (d === 0n) throw new Error('A fraction cannot have a zero denominator.');
  if (d < 0n) { n = -n; d = -d; }
  const divisor = gcd(n, d);
  return Object.freeze({n: n / divisor, d: d / divisor});
}
const add = (a, b) => fraction(a.n * b.d + b.n * a.d, a.d * b.d);
const subtract = (a, b) => fraction(a.n * b.d - b.n * a.d, a.d * b.d);
const multiply = (a, b) => fraction(a.n * b.n, a.d * b.d);
const divide = (a, b) => fraction(a.n * b.d, a.d * b.n);
const square = a => multiply(a, a);
const integer = a => fraction(BigInt(a));
const ZERO = fraction(0n);
const sum = values => values.reduce(add, ZERO);

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** Exact text is the source for copied coefficients; decimals are display only. */
export function rationalText(value) {
  return value.d === 1n ? String(value.n) : `${value.n}/${value.d}`;
}
export function rationalNumber(value) { return Number(value.n) / Number(value.d); }

export function parseCoordinate(text, label = 'Coordinate') {
  if (typeof text !== 'string' || text.length > 16 || !/^[+-]?\d{1,3}$/.test(text.trim())) {
    throw new Error(`${label}: enter a whole number from -20 to 20.`);
  }
  const result = Number(text.trim());
  if (!Number.isInteger(result) || Math.abs(result) > LIMITS.coordinate) {
    throw new Error(`${label}: enter a whole number from -20 to 20.`);
  }
  return result === 0 ? 0 : result;
}

/** Bounded, written decimal or fraction intent; exponent notation is not admitted. */
export function parseScalar(text, {limit = LIMITS.coefficient, label = 'Value'} = {}) {
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > LIMITS.coefficient) {
    throw new Error('Unsupported scalar bound.');
  }
  if (typeof text !== 'string' || text.length > 32) throw new Error(`${label}: enter a bounded number or fraction.`);
  const input = text.trim();
  let value;
  const ratio = /^([+-]?\d{1,9})\/([+-]?\d{1,9})$/.exec(input);
  if (ratio) {
    if (BigInt(ratio[2]) === 0n) throw new Error(`${label}: the denominator must be nonzero.`);
    value = fraction(BigInt(ratio[1]), BigInt(ratio[2]));
  } else {
    const decimal = /^([+-]?)(\d{1,9})(?:\.(\d{1,3}))?$/.exec(input);
    if (!decimal) throw new Error(`${label}: use an integer, up to three decimal places, or a fraction such as 2/3.`);
    const places = decimal[3] ?? '';
    const sign = decimal[1] === '-' ? -1n : 1n;
    value = fraction(sign * BigInt(decimal[2] + places), 10n ** BigInt(places.length));
  }
  if (abs(value.n) > BigInt(limit) * value.d) throw new Error(`${label}: keep the value between -${limit} and ${limit}.`);
  return value;
}

function admitPoints(points) {
  if (!Array.isArray(points) || points.length < LIMITS.minPoints || points.length > LIMITS.maxPoints) {
    throw new Error('Use between 2 and 12 point rows.');
  }
  return points.map((point, index) => {
    if (!point || typeof point !== 'object' || Array.isArray(point)) throw new Error(`Point ${index + 1} must have x and y coordinates.`);
    for (const axis of ['x', 'y']) {
      if (!Number.isSafeInteger(point[axis]) || Math.abs(point[axis]) > LIMITS.coordinate) {
        throw new Error(`Point ${index + 1}, ${axis}: use a whole number from -20 to 20.`);
      }
    }
    return {index: index + 1, x: point.x === 0 ? 0 : point.x, y: point.y === 0 ? 0 : point.y};
  });
}

function rowsForPredictions(points, predicted) {
  const rows = points.map((point, index) => {
    const residual = subtract(integer(point.y), predicted[index]);
    return {...point, predicted: predicted[index], residual, squared: square(residual)};
  });
  return {
    rows,
    sse: sum(rows.map(row => row.squared)),
    residualSum: sum(rows.map(row => row.residual)),
    xResidualSum: sum(rows.map(row => multiply(integer(row.x), row.residual)))
  };
}

function scoreLine(points, intercept, slope) {
  return rowsForPredictions(points, points.map(point => add(intercept, multiply(slope, integer(point.x)))));
}

/** Every returned point is copied; the caller's editing data is never changed. */
export function analyze(points, {intercept = '0', slope = '1', query = '1'} = {}) {
  const admitted = admitPoints(points);
  const a = parseScalar(intercept, {label: 'Trial intercept a'});
  const b = parseScalar(slope, {label: 'Trial slope b'});
  const queryX = parseScalar(query, {limit: LIMITS.query, label: 'Query x'});
  const n = BigInt(admitted.length);
  let sx = 0n, sy = 0n, sxx = 0n, sxy = 0n;
  for (const point of admitted) {
    const x = BigInt(point.x), y = BigInt(point.y);
    sx += x; sy += y; sxx += x * x; sxy += x * y;
  }
  const denominator = n * sxx - sx * sx;
  const meanX = fraction(sx, n), meanY = fraction(sy, n);
  const centeredXX = fraction(denominator, n);
  const centeredXY = fraction(n * sxy - sx * sy, n);
  let fit;
  if (denominator === 0n) {
    // The observed fitted vector is unique even though its line coefficients are not.
    fit = {
      kind: 'underdetermined', intercept: null, slope: null, sharedX: admitted[0].x,
      ...rowsForPredictions(admitted, admitted.map(() => meanY))
    };
  } else {
    const fittedSlope = divide(centeredXY, centeredXX);
    const fittedIntercept = subtract(meanY, multiply(fittedSlope, meanX));
    fit = {kind: 'unique', intercept: fittedIntercept, slope: fittedSlope, sharedX: null,
      ...scoreLine(admitted, fittedIntercept, fittedSlope)};
  }
  const trial = {intercept: a, slope: b, ...scoreLine(admitted, a, b)};
  const excessSSE = subtract(trial.sse, fit.sse);
  const meanError = subtract(add(a, multiply(b, meanX)), meanY);
  const meanTerm = multiply(fraction(n), square(meanError));
  const slopeTerm = fit.kind === 'unique' ? multiply(centeredXX, square(subtract(b, fit.slope))) : ZERO;
  const decompositionTotal = add(meanTerm, slopeTerm);
  if (excessSSE.n < 0n || rationalText(excessSSE) !== rationalText(decompositionTotal)) {
    throw new Error('The exact least-squares identity did not hold.');
  }
  const minX = Math.min(...admitted.map(point => point.x));
  const maxX = Math.max(...admitted.map(point => point.x));
  let prediction;
  if (fit.kind === 'underdetermined') {
    const atSharedX = queryX.n === BigInt(fit.sharedX) * queryX.d;
    prediction = {x: queryX, kind: atSharedX ? 'shared_x_only' : 'underdetermined', value: atSharedX ? meanY : null};
  } else {
    const outside = queryX.n < BigInt(minX) * queryX.d || queryX.n > BigInt(maxX) * queryX.d;
    prediction = {x: queryX, kind: outside ? 'extrapolation' : 'in_range', value: add(fit.intercept, multiply(fit.slope, queryX))};
  }
  return freeze({
    points: admitted, count: admitted.length, meanX, meanY, centeredXX, centeredXY,
    sums: {x: fraction(sx), y: fraction(sy), xx: fraction(sxx), xy: fraction(sxy)},
    fit, trial, excessSSE, decomposition: {meanError, meanTerm, slopeTerm, total: decompositionTotal},
    prediction, range: {minX, maxX}
  });
}

const points = pairs => pairs.map(([x, y]) => ({x, y}));
export const EXAMPLES = freeze([
  {id: 'noisy', name: 'A noisy trend', points: points([[-2, -1], [0, 0], [2, 3]]), intercept: '0', slope: '1', query: '1',
    note: 'Compare your line with the fitted line. Then change the middle y from 0 to 2 and watch the intercept and residuals.'},
  {id: 'perfect', name: 'A perfect line', points: points([[-2, -3], [0, 1], [2, 5]]), intercept: '0', slope: '1', query: '0',
    note: 'These authored points lie on one line. A zero SSE describes these points; it does not establish a cause or predict every future observation.'},
  {id: 'curved', name: 'A curved pattern', points: points([[-2, 4], [-1, 1], [0, 0], [1, 1], [2, 4]]), intercept: '0', slope: '0', query: '1',
    note: 'Even the best straight line leaves a curved residual pattern. Minimum SSE among lines does not make the underlying pattern linear.'},
  {id: 'repeated', name: 'Repeated x values', points: points([[0, 0], [0, 2], [2, 2]]), intercept: '0', slope: '1', query: '1',
    note: 'Two rows share x = 0. They still count separately, and the different x = 2 makes the fitted line unique.'},
  {id: 'equal-x', name: 'All x values equal', points: points([[3, 1], [3, 3], [3, 5]]), intercept: '0', slope: '1', query: '3',
    note: 'Only a + 3b is identified. Compare the trial lines a = 0, b = 1 and a = 3, b = 0, then query x = 4.'},
  {id: 'influential', name: 'One distant point', points: points([[0, 0], [1, 1], [2, 2], [10, -10]]), intercept: '0', slope: '1', query: '4',
    note: 'The first three points lie on y = x. Change the last point to (10, 10), then back to (10, -10), to see how one row changes the fitted line.'}
]);
