/** Exact integer 2x2 actions; decimal eigenline geometry is explicitly approximate. */
export const MATRIX_LIMIT = 9;
export const PROBE_LIMIT = 20;

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export const EIGEN_PRESETS = deepFreeze([
  { id: 'stretch', label: 'Different stretches', matrix: [[3, 0], [0, 1]], probe: [1, 1],
    prompt: 'Try (1, 0), then (0, 1). Why does the diagonal probe turn?' },
  { id: 'reflection', label: 'Reflection: a negative eigenvalue', matrix: [[1, 0], [0, -1]], probe: [0, 2],
    prompt: 'The output points the other way. Does it still stay on the same line?' },
  { id: 'projection', label: 'Projection: an output of zero', matrix: [[1, 0], [0, 0]], probe: [0, 2],
    prompt: 'A nonzero input vanishes. Which eigenvalue makes the equation true?' },
  { id: 'shear', label: 'Shear: a repeated root, one eigenline', matrix: [[1, 2], [0, 1]], probe: [1, 1],
    prompt: 'Compare the x-axis with another direction. A repeated root need not give two eigenlines.' },
  { id: 'scalar', label: 'Uniform scaling: every direction', matrix: [[2, 0], [0, 2]], probe: [2, -1],
    prompt: 'Choose any nonzero integer probe. What stays true each time?' },
  { id: 'rotation', label: 'Quarter-turn: no real eigenline', matrix: [[0, -1], [1, 0]], probe: [1, 0],
    prompt: 'Every nonzero real vector turns through a right angle. Inspect the discriminant.' },
  { id: 'oblique', label: 'Two oblique eigenlines', matrix: [[2, 1], [1, 2]], probe: [1, -1],
    prompt: 'Compare (1, -1) with (1, 1): the two eigenlines have different scales.' },
  { id: 'irrational', label: 'Real directions with irrational slopes', matrix: [[1, 1], [1, 0]], probe: [2, 1],
    prompt: 'The probe looks close to a dashed line. Its exact cross-product still decides.' },
  { id: 'zero', label: 'Zero map: every nonzero input vanishes', matrix: [[0, 0], [0, 0]], probe: [1, 2],
    prompt: 'Zero is a valid eigenvalue; a zero input is still excluded from the definition.' }
]);

export function parseBoundedInteger(value, label, limit) {
  if (typeof value === 'string') {
    const text = value.trim();
    if (!/^[+-]?\d{1,3}$/.test(text)) throw new Error(label + ' must be a whole number from ' + (-limit) + ' to ' + limit + '.');
    value = Number(text);
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || Math.abs(value) > limit) {
    throw new Error(label + ' must be a whole number from ' + (-limit) + ' to ' + limit + '.');
  }
  return Object.is(value, -0) ? 0 : value;
}

function pair(value, label) {
  if (!Array.isArray(value) || value.length !== 2 || !Object.hasOwn(value, 0) || !Object.hasOwn(value, 1)) throw new Error(label + ' must have exactly two entries.');
  return value;
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function rational(num, den = 1) {
  if (den < 0) { num = -num; den = -den; }
  const divisor = gcd(num, den);
  num /= divisor;
  den /= divisor;
  if (num === 0) num = 0;
  return { numerator: num, denominator: den, text: den === 1 ? String(num) : num + '/' + den };
}

function realRoot(trace, discriminant, sign) {
  const radical = Math.sqrt(discriminant);
  if (Number.isInteger(radical)) {
    const fraction = rational(trace + sign * radical, 2);
    return { exact: fraction.text, approximate: fraction.numerator / fraction.denominator, rational: fraction };
  }
  return {
    exact: '(' + trace + (sign > 0 ? ' + ' : ' − ') + '√' + discriminant + ')/2',
    approximate: (trace + sign * radical) / 2,
    rational: null
  };
}

function unitEigenDirection(matrix, lambda) {
  const [[a, b], [c, d]] = matrix;
  const candidates = [[b, lambda - a], [lambda - d, c]];
  const size = vector => Math.hypot(...vector);
  let chosen = size(candidates[0]) >= size(candidates[1]) ? candidates[0] : candidates[1];
  const norm = size(chosen);
  if (!(norm > 0) || !Number.isFinite(norm)) throw new Error('A finite nonzero eigenline representative could not be constructed.');
  chosen = chosen.map(value => value / norm);
  const first = chosen.find(value => Math.abs(value) > 1e-14);
  if (first < 0) chosen = chosen.map(value => -value);
  return chosen.map(value => Math.abs(value) < 1e-14 ? 0 : value);
}

/** Inputs are copied and bounded before any result is returned. */
export function analyzeEigen(matrixInput, probeInput) {
  pair(matrixInput, 'Matrix');
  const matrix = matrixInput.map((row, i) => pair(row, 'Matrix row ' + (i + 1))
    .map((value, j) => parseBoundedInteger(value, 'A' + (i + 1) + (j + 1), MATRIX_LIMIT)));
  const probe = pair(probeInput, 'Probe').map((value, i) =>
    parseBoundedInteger(value, i === 0 ? 'Probe x' : 'Probe y', PROBE_LIMIT));
  if (probe.every(value => value === 0)) throw new Error('Choose a nonzero probe: the zero vector is never an eigenvector.');
  const [[a, b], [c, d]] = matrix;
  const [x, y] = probe;
  const image = [a * x + b * y, c * x + d * y];
  const crossProduct = x * image[1] - y * image[0];
  const isEigenvector = crossProduct === 0;
  const trace = a + d;
  const determinant = a * d - b * c;
  const discriminant = trace * trace - 4 * determinant;
  const scalar = a === d && b === 0 && c === 0;
  let classification;
  let eigenspaces = [];
  let complexPair = null;
  if (discriminant < 0) {
    classification = 'no-real-eigenline';
    complexPair = {
      realPart: rational(trace, 2).text,
      imaginaryMagnitude: '√' + (-discriminant) + '/2',
      expression: '(' + trace + ' ± i√' + (-discriminant) + ')/2'
    };
  } else if (scalar) {
    classification = 'every-direction';
    eigenspaces = [{ eigenvalue: realRoot(trace, 0, 1), algebraicMultiplicity: 2,
      dimension: 2, basisApproximate: [[1, 0], [0, 1]] }];
  } else if (discriminant === 0) {
    classification = 'one-real-eigenline';
    const eigenvalue = realRoot(trace, 0, 1);
    eigenspaces = [{ eigenvalue, algebraicMultiplicity: 2, dimension: 1,
      basisApproximate: [unitEigenDirection(matrix, eigenvalue.approximate)] }];
  } else {
    classification = 'two-real-eigenlines';
    eigenspaces = [1, -1].map(sign => {
      const eigenvalue = realRoot(trace, discriminant, sign);
      return { eigenvalue, algebraicMultiplicity: 1, dimension: 1,
        basisApproximate: [unitEigenDirection(matrix, eigenvalue.approximate)] };
    });
  }
  const scale = isEigenvector ? rational(x * image[0] + y * image[1], x * x + y * y) : null;
  const action = !isEigenvector ? 'changes-line' : scale.numerator === 0 ? 'vanishes'
    : scale.numerator < 0 ? 'reverses-direction' : 'keeps-direction';
  return deepFreeze({
    format: 'recallweave-eigen-directions/1',
    matrix, probe, image, crossProduct, isEigenvector, scale, action,
    trace, determinant, discriminant, classification, eigenspaces, complexPair,
    arithmetic: 'Entered integers, matrix action and probe certification are exact within the stated bounds. Eigenline unit vectors and radical decimals are approximate.',
    probeBounds: PROBE_LIMIT,
    matrixBounds: MATRIX_LIMIT
  });
}

/** Recompute from accepted inputs, so a supplied result cannot forge its arithmetic. */
export function serializeEigen(result) {
  return JSON.stringify(analyzeEigen(result.matrix, result.probe), null, 2) + '\n';
}
