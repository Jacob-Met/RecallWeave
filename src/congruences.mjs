/** Exact two-congruence teaching model. No Number arithmetic enters a result. */
export const CONGRUENCES_FORMAT = 'recallweave-congruences/1';
export const INPUT_DIGITS = 18;
export const PROBE_DIGITS = 72;
export const WINDOW_LENGTH = 24;

function integer(text, name, digits, positive = false) {
  if (typeof text !== 'string' || text.length > digits + 32) {
    throw new Error(name + ' must be decimal text, at most ' + digits + ' digits excluding sign.');
  }
  const value = text.trim();
  if (!new RegExp('^[+-]?\\d{1,' + digits + '}$').test(value)) {
    throw new Error(name + ' must be a whole decimal integer, at most ' + digits + ' digits excluding sign.');
  }
  const parsed = BigInt(value);
  if (positive && parsed <= 0n) throw new Error(name + ' must be positive.');
  return parsed;
}

function mod(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

function bezout(a, b) {
  let [r0, r1, s0, s1, t0, t1] = [a, b, 1n, 0n, 0n, 1n];
  while (r1 !== 0n) {
    const q = r0 / r1;
    [r0, r1] = [r1, r0 - q * r1];
    [s0, s1] = [s1, s0 - q * s1];
    [t0, t1] = [t1, t0 - q * t1];
  }
  return {g: r0, s: s0, t: t0};
}

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** All four inputs are decimal strings; returned integer values are decimal strings. */
export function solveCongruences(aText, mText, bText, nText) {
  const aInput = integer(aText, 'First residue', INPUT_DIGITS);
  const m = integer(mText, 'First modulus', INPUT_DIGITS, true);
  const bInput = integer(bText, 'Second residue', INPUT_DIGITS);
  const n = integer(nText, 'Second modulus', INPUT_DIGITS, true);
  const a = mod(aInput, m), b = mod(bInput, n);
  const {g, s, t} = bezout(m, n);
  const difference = b - a;
  const remainder = mod(difference, g);
  const compatible = remainder === 0n;
  const reducedM = m / g, reducedN = n / g;
  const period = m * reducedN;
  let solution = null;
  if (compatible) {
    const quotient = difference / g;
    const inverse = reducedN === 1n ? null : mod(s, reducedN);
    const multiplier = mod(quotient * s, reducedN);
    const unreduced = a + m * multiplier;
    const first = mod(unreduced, period);
    solution = {
      first: String(first), period: String(period),
      differenceQuotient: String(quotient),
      reducedInverse: inverse === null ? null : String(inverse),
      multiplier: String(multiplier), unreduced: String(unreduced),
      residueChecks: [String(mod(first, m)), String(mod(first, n))],
    };
  }
  return freeze({
    format: CONGRUENCES_FORMAT,
    entered: {a: aText, m: mText, b: bText, n: nText},
    normalized: {a: String(a), m: String(m), b: String(b), n: String(n)},
    compatibility: {
      gcd: String(g), bezout: {s: String(s), t: String(t)},
      difference: String(difference), differenceRemainder: String(remainder),
      reducedM: String(reducedM), reducedN: String(reducedN), compatible,
    },
    solution,
  });
}

/** Inspect one exact integer and the next 23; no period enumeration or floating plot. */
export function inspectCongruences(result, probeText) {
  if (!result || result.format !== CONGRUENCES_FORMAT || !result.normalized) {
    throw new Error('Compute a pair of congruences before inspecting an integer.');
  }
  const start = integer(probeText, 'Inspected integer', PROBE_DIGITS);
  const {a, m, b, n} = Object.fromEntries(
    Object.entries(result.normalized).map(([key, value]) => [key, BigInt(value)]));
  const rows = [];
  for (let offset = 0; offset < WINDOW_LENGTH; offset++) {
    const x = start + BigInt(offset), first = mod(x, m), second = mod(x, n);
    const matchesA = first === a, matchesB = second === b;
    rows.push({
      offset, x: String(x), remainderA: String(first), remainderB: String(second),
      matchesA, matchesB, matchesBoth: matchesA && matchesB,
    });
  }
  return freeze({entered: probeText, start: String(start), count: WINDOW_LENGTH, rows});
}

export function serializeObservation(result, inspection) {
  if (!result || result.format !== CONGRUENCES_FORMAT) throw new Error('No computed pair is available.');
  // Recompute inspection from its admitted text rather than accepting altered row data.
  const checked = inspectCongruences(result, inspection?.entered);
  return JSON.stringify({format: 'recallweave-congruence-observation/1',
    result, inspection: checked,
    convention: 'All solutions are integers. Positive moduli; canonical residues and first solution are nonnegative. The 24-row window is consecutive, not a complete period.',
  }, null, 2) + '\n';
}
