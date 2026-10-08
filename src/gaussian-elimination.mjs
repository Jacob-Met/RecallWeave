/** Exact classroom row reduction. No floating-point tolerance or input mutation. */
export const LIMITS = Object.freeze({ bits: 128, text: 4096, token: 40, operations: 80 });
const abs = n => n < 0n ? -n : n;
function gcd(a, b) { a = abs(a); b = abs(b); while (b) [a, b] = [b, a % b]; return a; }
function q(n, d = 1n) {
  if (d === 0n) throw new Error('A denominator must not be zero.');
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d); n /= g; d /= g;
  if (abs(n).toString(2).length > LIMITS.bits || d.toString(2).length > LIMITS.bits)
    throw new Error('Exact arithmetic exceeds the 128-bit classroom limit. Use smaller values.');
  return { n, d };
}
function read(value, tokenLimit = LIMITS.token) {
  if (typeof value !== 'string' || value.length > tokenLimit || !/^[+-]?\d+(?:\/[+-]?\d+)?$/.test(value))
    throw new Error('Use an integer or fraction such as -3 or 2/5, at most 40 characters.');
  const [n, d = '1'] = value.split('/'); return q(BigInt(n), BigInt(d));
}
const add = (a, b) => q(a.n * b.d + b.n * a.d, a.d * b.d);
const mul = (a, b) => q(a.n * b.n, a.d * b.d);
const neg = a => q(-a.n, a.d);
const inv = a => q(a.d, a.n);
const str = a => a.d === 1n ? String(a.n) : a.n + '/' + a.d;
const external = a => a.map(row => row.map(str));
function internal(matrix) {
  const invalid = () => new Error('Use 2 or 3 complete equations with 2 or 3 variables; each row ends with its right-hand side.');
  if (!Array.isArray(matrix) || matrix.length < 2 || matrix.length > 3) throw invalid();
  const width = matrix[0]?.length;
  if (!Number.isInteger(width) || width < 3 || width > 4) throw invalid();
  for (let r = 0; r < matrix.length; r++) {
    if (!Object.hasOwn(matrix, r) || !Array.isArray(matrix[r]) || matrix[r].length !== width) throw invalid();
    for (let col = 0; col < width; col++) if (!Object.hasOwn(matrix[r], col)) throw invalid();
  }
  return matrix.map(row => row.map(value => read(value, 80)));
}
export function parseMatrix(text) {
  if (typeof text !== 'string' || text.length > LIMITS.text)
    throw new Error('Enter a matrix of at most 4096 characters.');
  const rows = text.trim().split(/[;\n]/).map(row => row.trim());
  if (rows.some(row => !row)) throw new Error('Each equation needs a nonempty row.');
  const tokens = rows.map(row => row.split(/[\s,]+/));
  tokens.forEach(row => row.forEach(value => read(value)));
  return external(internal(tokens));
}
function operation(value, count, replay = false) {
  const factorValue = value => {
    const factor = read(value, replay ? 80 : LIMITS.token);
    if (replay && str(factor) !== value) throw new Error('A replay factor must use its normalized exact form.');
    return factor;
  };
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Choose a row operation.');
  const row = r => { if (!Number.isInteger(r) || r < 0 || r >= count) throw new Error('Choose an existing row.'); return r; };
  const target = row(value.target);
  if (value.kind === 'scale') {
    const factor = factorValue(value.factor);
    if (!factor.n) throw new Error('Scaling by zero loses an equation. Choose a nonzero factor.');
    return { kind: 'scale', target, factor };
  }
  if (value.kind === 'swap' || value.kind === 'add') {
    const source = row(value.source);
    if (target === source) throw new Error('Choose two different rows.');
    return { kind: value.kind, target, source, ...(value.kind === 'add' ? { factor: factorValue(value.factor) } : {}) };
  }
  throw new Error('Choose swap, scale, or add.');
}
function act(matrix, op) {
  const next = matrix.map(row => row.slice());
  if (op.kind === 'swap') [next[op.target], next[op.source]] = [next[op.source], next[op.target]];
  else if (op.kind === 'scale') next[op.target] = next[op.target].map(v => mul(v, op.factor));
  else next[op.target] = next[op.target].map((v, c) => add(v, mul(op.factor, next[op.source][c])));
  return next;
}
export function applyOperation(matrix, value) {
  const input = internal(matrix); return external(act(input, operation(value, input.length)));
}
/** Replay a generated exact step. Canonical factors may need up to 80 characters
 * for two 128-bit components; typed learner factors still use applyOperation.
 * Every row index, canonical factor and normalized arithmetic bound is checked.
 */
export function replayOperation(matrix, value) {
  const input = internal(matrix); return external(act(input, operation(value, input.length, true)));
}
export function formatOperation(value) {
  const row = r => 'R' + (r + 1);
  if (value.kind === 'swap') return row(value.target) + ' ↔ ' + row(value.source);
  if (value.kind === 'scale') return row(value.target) + ' ← (' + value.factor + ') × ' + row(value.target);
  return row(value.target) + ' ← ' + row(value.target) + ' + (' + value.factor + ') × ' + row(value.source);
}
export function analyze(matrix) {
  const original = internal(matrix), n = original[0].length - 1;
  let reduced = original.map(row => row.slice());
  let transform = original.map((_, r) => original.map((__, c) => q(r === c ? 1n : 0n)));
  const steps = [], pivots = [];
  function take(value) {
    const op = operation(value, reduced.length, true);
    // Compute both before committing, so the arithmetic bound cannot yield a partial result.
    const next = act(reduced, op), nextTransform = act(transform, op);
    reduced = next; transform = nextTransform;
    steps.push({ operation: { ...value }, label: formatOperation(value), matrix: external(reduced) });
  }
  let r = 0;
  for (let c = 0; c <= n && r < reduced.length; c++) {
    const found = reduced.findIndex((row, i) => i >= r && row[c].n !== 0n);
    if (found < 0) continue;
    if (found !== r) take({ kind: 'swap', target: r, source: found });
    if (str(reduced[r][c]) !== '1') take({ kind: 'scale', target: r, factor: str(inv(reduced[r][c])) });
    for (let i = 0; i < reduced.length; i++) {
      if (i !== r && reduced[i][c].n) take({ kind: 'add', target: i, source: r, factor: str(neg(reduced[i][c])) });
    }
    pivots.push(c); r++;
  }
  const coefficientPivots = pivots.filter(c => c < n);
  const free = Array.from({ length: n }, (_, c) => c).filter(c => !coefficientPivots.includes(c));
  const common = { rref: external(reduced), steps, pivots: coefficientPivots, free,
    rank: coefficientPivots.length, augmentedRank: pivots.length };
  const contradiction = pivots.indexOf(n);
  if (contradiction >= 0) return { ...common, kind: 'none', witness: transform[contradiction].map(str) };
  const particular = Array.from({ length: n }, () => q(0n));
  coefficientPivots.forEach((c, i) => { particular[c] = reduced[i][n]; });
  const basis = free.map(c => {
    const vector = Array.from({ length: n }, () => q(0n)); vector[c] = q(1n);
    coefficientPivots.forEach((pivot, i) => { vector[pivot] = neg(reduced[i][c]); });
    return vector.map(str);
  });
  return { ...common, kind: free.length ? 'infinite' : 'unique', particular: particular.map(str), basis };
}
function deepFreeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
}
export const PRESETS = deepFreeze([
  { id: 'unique', label: 'Two equations, one solution', text: '1 1 5\n2 -1 1' },
  { id: 'swap', label: 'A zero first pivot', text: '0 2 4\n3 1 5' },
  { id: 'family', label: 'Three variables, a solution family', text: '1 2 -1 3\n2 4 -2 6' },
  { id: 'inconsistent', label: 'A contradiction', text: '1 -1 2\n2 -2 5' },
  { id: 'fractions', label: 'Exact fractions', text: '1/2 1 2\n1 -1/3 1/3' },
]);
