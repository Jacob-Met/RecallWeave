// Exact bounded planar Bézier construction. Fractions stay exact until the UI draws them.
function refuse(message, field) {
  const error = new Error(message);
  error.field = field;
  throw error;
}
function gcd(a, b) { a = a < 0n ? -a : a; while (b) [a, b] = [b, a % b]; return a; }
function rational(n, d = 1n) {
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
function add(a, b) { return rational(a.n * b.d + b.n * a.d, a.d * b.d); }
function multiply(a, b) { return rational(a.n * b.n, a.d * b.d); }
function subtract(a, b) { return add(a, { n: -b.n, d: b.d }); }
function text(a) { return a.d === 1n ? String(a.n) : String(a.n) + '/' + String(a.d); }
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function checkedPoints(points) {
  if (!Array.isArray(points) || points.length < 2 || points.length > 4) {
    refuse('Use two, three or four control points.', 'points');
  }
  const copy = [];
  for (let i = 0; i < points.length; i++) {
    if (!Object.hasOwn(points, i) || !Array.isArray(points[i]) || points[i].length !== 2) {
      refuse('Each control point needs exactly two coordinates.', 'points');
    }
    const pair = [];
    for (let j = 0; j < 2; j++) {
      const x = points[i][j];
      if (!Object.hasOwn(points[i], j) || typeof x !== 'number' || !Number.isInteger(x) || Math.abs(x) > 20) {
        refuse('Use whole coordinate values from −20 through 20.', 'points');
      }
      pair.push(x === 0 ? 0 : x);
    }
    copy.push(pair);
  }
  return copy;
}
function checkedParameter(parameter) {
  if (!parameter || typeof parameter !== 'object' || Array.isArray(parameter)) {
    refuse('Use a numerator and a positive denominator.', 'parameter');
  }
  const { numerator: n, denominator: d } = parameter;
  if (typeof n !== 'number' || typeof d !== 'number' || !Number.isInteger(n) || !Number.isInteger(d)
    || n < 0 || d < 1 || n > d || d > 1000) {
    refuse('Use 0 ≤ numerator ≤ denominator ≤ 1000, with a positive denominator.', 'parameter');
  }
  return rational(BigInt(n), BigInt(d));
}
export function parseBezierInput(pointsText, parameterText) {
  if (typeof pointsText !== 'string' || pointsText.length > 512 || !pointsText.trim()) {
    refuse('Enter two to four x,y pairs, separated by lines or semicolons.', 'points');
  }
  const rows = pointsText.trim().split(/;|\r?\n/);
  const points = rows.map(row => {
    const parts = row.split(',');
    if (parts.length !== 2 || parts.some(part => !/^[+-]?\d{1,3}$/.test(part.trim()))) {
      refuse('Write each point as two whole numbers separated by a comma.', 'points');
    }
    return parts.map(part => Number(part.trim()));
  });
  const copy = checkedPoints(points);
  if (typeof parameterText !== 'string' || parameterText.length > 16
    || !/^\d{1,4}(?:\/\d{1,4})?$/.test(parameterText.trim())) {
    refuse('Enter t as 0, 1, or a fraction such as 1/3.', 'parameter');
  }
  const [numerator, denominator = '1'] = parameterText.trim().split('/');
  const parameter = { numerator: Number(numerator), denominator: Number(denominator) };
  checkedParameter(parameter);
  return { points: copy, parameter };
}
export function traceBezier(points, parameter) {
  const controlPoints = checkedPoints(points);
  const t = checkedParameter(parameter);
  const oneMinusT = subtract(rational(1n), t);
  const degree = controlPoints.length - 1;
  const levels = [controlPoints.map(pair => pair.map(x => rational(BigInt(x))))];
  while (levels.at(-1).length > 1) {
    const previous = levels.at(-1);
    levels.push(previous.slice(0, -1).map((pair, i) => pair.map((x, j) =>
      add(multiply(oneMinusT, x), multiply(t, previous[i + 1][j])))));
  }
  const pairText = pair => pair.map(text);
  const edge = levels.at(-2);
  const derivative = edge[0].map((x, j) => multiply(rational(BigInt(degree)), subtract(edge[1][j], x)));
  const startDerivative = controlPoints[0].map((x, j) => String(degree * (controlPoints[1][j] - x)));
  const endDerivative = controlPoints.at(-1).map((x, j) => String(degree * (x - controlPoints.at(-2)[j])));
  return freeze({
    format: 'recallweave.bezier-trace/1',
    degree, controlPoints, parameter: text(t),
    levels: levels.map(level => level.map(pairText)),
    point: pairText(levels.at(-1)[0]),
    leftControlPoints: levels.map(level => pairText(level[0])),
    rightControlPoints: levels.slice().reverse().map(level => pairText(level.at(-1))),
    derivative: pairText(derivative), startDerivative, endDerivative,
    stationary: derivative.every(x => x.n === 0n)
  });
}
export const BEZIER_PRESETS = freeze([
  { id: 'arch', label: 'A quadratic arch', points: '0,0; 4,8; 8,0', parameter: '1/2' },
  { id: 'cubic', label: 'A cubic bend at one third', points: '-8,-4; -6,8; 6,-8; 8,4', parameter: '1/3' },
  { id: 'line', label: 'One interpolation on a line', points: '-6,-2; 6,4', parameter: '1/4' },
  { id: 'speed', label: 'Equal parameter steps, unequal travel', points: '0,0; 0,0; 8,0', parameter: '1/2' },
  { id: 'stationary', label: 'Zero derivative at the start', points: '0,0; 0,0; 8,0', parameter: '0' },
  { id: 'constant', label: 'Every control point coincides', points: '3,-2; 3,-2; 3,-2; 3,-2', parameter: '2/3' }
]);
