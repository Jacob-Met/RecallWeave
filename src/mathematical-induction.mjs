/** Exact induction certificate for arithmetic-series / quadratic conjectures. */
const FIELDS = Object.freeze(['a', 'b', 'A', 'B', 'C', 'D', 'n0']);
export const EXAMPLES = Object.freeze([
  {title: 'Odd numbers: a complete proof', a: 2, b: -1, A: 1, B: 0, C: 0, D: 1, n0: 0},
  {title: 'Triangular numbers: a complete proof', a: 1, b: 0, A: 1, B: 1, C: 0, D: 2, n0: 0},
  {title: 'Correct step, false base', a: 2, b: -1, A: 1, B: 0, C: 5, D: 1, n0: 0},
  {title: 'True base, failed step', a: 1, b: 0, A: 1, B: 0, C: 0, D: 1, n0: 1},
  {title: 'Two matches, then a counterexample', a: 1, b: 0, A: 3, B: -5, C: 4, D: 2, n0: 1},
  {title: 'A sequence with negative terms', a: -2, b: 3, A: -1, B: 2, C: 0, D: 1, n0: 0}
].map(Object.freeze));

function boundedInteger(value, field, low, high) {
  if (typeof value === 'string' && /^-?(0|[1-9][0-9]*)$/.test(value) && value.length <= 4) value = Number(value);
  if (typeof value !== 'number' || !Number.isInteger(value) || value < low || value > high) {
    throw new Error(field + ' must be an integer from ' + low + ' through ' + high + '.');
  }
  return Object.is(value, -0) ? 0 : value;
}

export function parseInductionInputs(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Provide the seven labeled integer inputs.');
  if (Object.keys(value).some(key => !FIELDS.includes(key))) throw new Error('Unexpected input field.');
  const result = {};
  for (const field of FIELDS) {
    const low = field === 'D' ? 1 : field === 'n0' ? 0 : -20;
    const high = field === 'n0' ? 1 : 20;
    result[field] = boundedInteger(value[field], field, low, high);
  }
  return Object.freeze(result);
}

function gcd(a, b) {
  a = a < 0n ? -a : a;
  while (b) [a, b] = [b, a % b];
  return a;
}
function fraction(numerator, denominator = 1n) {
  const divisor = gcd(numerator, denominator);
  return Object.freeze({numerator: String(numerator / divisor), denominator: String(denominator / divisor)});
}
export function fractionText(value) {
  return value.denominator === '1' ? value.numerator : value.numerator + '/' + value.denominator;
}
function deepFreeze(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') deepFreeze(child);
  return Object.freeze(value);
}

export function analyzeInduction(raw) {
  const inputs = parseInductionInputs(raw);
  const {a, b, A, B, C, D} = Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, BigInt(value)]));
  const candidateNumerator = n => A * n * n + B * n + C;
  const sum = n => {
    let total = 0n;
    for (let k = 1n; k <= n; k++) total += a * k + b;
    return total;
  };
  const start = BigInt(inputs.n0);
  const baseActual = sum(start);
  const baseNumerator = candidateNumerator(start);
  const linear = 2n * A - D * a;
  const constant = A + B - D * (a + b);
  const basePass = baseNumerator === D * baseActual;
  const stepPass = linear === 0n && constant === 0n;
  const rows = Array.from({length: 10}, (_, index) => {
    const n = start + BigInt(index);
    const actual = sum(n);
    const proposed = candidateNumerator(n);
    const nextTerm = a * (n + 1n) + b;
    return {
      n: Number(n), actual: String(actual), proposed: fraction(proposed, D),
      equal: proposed === D * actual, nextTerm: String(nextTerm),
      proposedNext: fraction(candidateNumerator(n + 1n), D),
      hypothesisPlusNext: fraction(proposed + D * nextTerm, D),
      residual: fraction(linear * n + constant, D)
    };
  });
  return deepFreeze({
    format: 'recallweave-induction-record/1', inputs,
    family: 'S(n)=sum(k=1..n)(a*k+b), S(0)=0; Q(n)=(A*n^2+B*n+C)/D; integer n>=n0',
    base: {n: inputs.n0, actual: String(baseActual), proposed: fraction(baseNumerator, D), pass: basePass},
    successor: {linearNumerator: String(linear), constantNumerator: String(constant), denominator: String(D), pass: stepPass},
    proved: basePass && stepPass, rows,
    finiteRowsAreProof: false,
    firstDisplayedCounterexample: rows.find(row => !row.equal)?.n ?? null
  });
}
