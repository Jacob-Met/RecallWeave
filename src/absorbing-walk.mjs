/** Exact finite absorbing walks. All probabilities are hypothetical; no sampling. */
export const WALK_FORMAT = 'recallweave-absorbing-walk/1';
const fields = ['upper', 'start', 'rightNumerator', 'rightDenominator', 'horizon'];
function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a < 0n ? -a : a; }
function fraction(n, d = 1n) {
  if (d === 0n) throw new Error('An internal denominator cannot be zero.');
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d); return {n: n / g, d: d / g};
}
const zero = fraction(0n), one = fraction(1n);
const integer = n => fraction(BigInt(n));
const add = (a, b) => fraction(a.n * b.d + b.n * a.d, a.d * b.d);
const subtract = (a, b) => fraction(a.n * b.d - b.n * a.d, a.d * b.d);
const multiply = (a, b) => fraction(a.n * b.n, a.d * b.d);
const divide = (a, b) => fraction(a.n * b.d, a.d * b.n);
const power = (a, n) => fraction(a.n ** BigInt(n), a.d ** BigInt(n));
const jsonFraction = a => ({numerator: String(a.n), denominator: String(a.d)});

function validated(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Provide one object with the five walk inputs.');
  }
  if (Reflect.ownKeys(input).length !== fields.length ||
      fields.some(key => !Object.hasOwn(input, key))) {
    throw new Error('Provide exactly upper, start, rightNumerator, rightDenominator and horizon.');
  }
  for (const key of fields) {
    if (typeof input[key] !== 'number' || !Number.isInteger(input[key])) {
      throw new Error(key + ' must be a finite integer; text and fractions are not accepted.');
    }
  }
  const {upper, start, rightNumerator, rightDenominator, horizon} = input;
  if (upper < 2 || upper > 8) throw new Error('upper must be from 2 to 8.');
  if (start < 0 || start > upper) throw new Error('start must be from 0 to upper.');
  if (rightDenominator < 1 || rightDenominator > 12) throw new Error('rightDenominator must be from 1 to 12.');
  if (rightNumerator < 0 || rightNumerator > rightDenominator) throw new Error('rightNumerator must be from 0 to rightDenominator.');
  if (horizon < 0 || horizon > 30) throw new Error('horizon must be from 0 to 30.');
  return {upper, start, rightNumerator, rightDenominator, horizon};
}

function eventualFrom(start, upper, p, q) {
  if (start === 0) return {left: one, right: zero, expectedSteps: zero};
  if (start === upper) return {left: zero, right: one, expectedSteps: zero};
  let right, expectedSteps;
  if (p.n === 0n) { right = zero; expectedSteps = integer(start); }
  else if (q.n === 0n) { right = one; expectedSteps = integer(upper - start); }
  else if (p.n === q.n && p.d === q.d) {
    right = fraction(BigInt(start), BigInt(upper));
    expectedSteps = integer(start * (upper - start));
  } else {
    const ratio = divide(q, p);
    right = divide(subtract(one, power(ratio, start)), subtract(one, power(ratio, upper)));
    expectedSteps = divide(subtract(integer(start), multiply(integer(upper), right)), subtract(q, p));
  }
  return {left: subtract(one, right), right, expectedSteps};
}

/** Every frame is exact, including zero edges and mass already at a boundary. */
export function analyzeWalk(source) {
  const input = validated(source);
  const {upper, start, rightNumerator, rightDenominator, horizon} = input;
  const p = fraction(BigInt(rightNumerator), BigInt(rightDenominator));
  const q = subtract(one, p);
  const eventualRaw = Array.from({length: upper + 1}, (_, i) => eventualFrom(i, upper, p, q));
  const eventual = eventualRaw.map((row, i) => ({
    start: i, left: jsonFraction(row.left), right: jsonFraction(row.right),
    expectedSteps: jsonFraction(row.expectedSteps)
  }));
  let distribution = Array.from({length: upper + 1}, (_, i) => i === start ? one : zero);
  let truncated = zero;
  const frames = [];
  for (let step = 0; step <= horizon; step++) {
    const contributions = [];
    let firstLeft = start === 0 && step === 0 ? one : zero;
    let firstRight = start === upper && step === 0 ? one : zero;
    if (step > 0) {
      const previous = distribution;
      const previousSurvival = subtract(one, add(previous[0], previous[upper]));
      truncated = add(truncated, previousSurvival);
      firstLeft = multiply(previous[1], q);
      firstRight = multiply(previous[upper - 1], p);
      distribution = Array.from({length: upper + 1}, () => zero);
      const transfer = (from, to, probability) => {
        const mass = multiply(previous[from], probability);
        distribution[to] = add(distribution[to], mass);
        contributions.push({from, to, probability: jsonFraction(probability), mass: jsonFraction(mass)});
      };
      for (let from = 0; from <= upper; from++) {
        if (from === 0 || from === upper) transfer(from, from, one);
        else { transfer(from, from - 1, q); transfer(from, from + 1, p); }
      }
    }
    frames.push({
      step,
      distribution: distribution.map(jsonFraction),
      firstArrival: {left: jsonFraction(firstLeft), right: jsonFraction(firstRight)},
      absorbed: {left: jsonFraction(distribution[0]), right: jsonFraction(distribution[upper])},
      survival: jsonFraction(subtract(one, add(distribution[0], distribution[upper]))),
      truncatedExpectedSteps: jsonFraction(truncated),
      expectedExcessSteps: jsonFraction(subtract(eventualRaw[start].expectedSteps, truncated)),
      contributions
    });
  }
  return {format: WALK_FORMAT, input, probabilities: {right: jsonFraction(p), left: jsonFraction(q)}, eventual, frames};
}
