/** Exact descriptive comparisons for the optional grouped-data teaching explorer. */
export const GROUPED_COUNT_LIMIT = 1_000_000;
export const GROUPED_KEYS = Object.freeze(['newcomers', 'experienced']);
export const GROUPED_OPTIONS = Object.freeze(['a', 'b']);

function freezeTree(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeTree);
    Object.freeze(value);
  }
  return value;
}

export const GROUPED_PRESETS = freezeTree({
  reversal: {
    name: 'Different group mixes',
    note: 'Fictional puzzle attempts. Each option has a different mix of newcomers and experienced players.',
    counts: {
      a: { newcomers: { successes: 42, total: 70 }, experienced: { successes: 18, total: 20 } },
      b: { newcomers: { successes: 5, total: 10 }, experienced: { successes: 72, total: 90 } }
    }, experiencedPercent: 50
  },
  balanced: {
    name: 'Matching group mixes',
    note: 'A second fictional sample: both options contain equally many newcomers and experienced players.',
    counts: {
      a: { newcomers: { successes: 30, total: 50 }, experienced: { successes: 45, total: 50 } },
      b: { newcomers: { successes: 25, total: 50 }, experienced: { successes: 40, total: 50 } }
    }, experiencedPercent: 50
  },
  mixed: {
    name: 'Groups disagree',
    note: 'Fictional counts in which the within-group comparisons point in different directions.',
    counts: {
      a: { newcomers: { successes: 8, total: 10 }, experienced: { successes: 4, total: 10 } },
      b: { newcomers: { successes: 6, total: 10 }, experienced: { successes: 9, total: 10 } }
    }, experiencedPercent: 50
  },
  empty: {
    name: 'One group is unobserved',
    note: 'No newcomers are recorded for option A. An absent rate is not a zero success rate.',
    counts: {
      a: { newcomers: { successes: 0, total: 0 }, experienced: { successes: 9, total: 10 } },
      b: { newcomers: { successes: 5, total: 10 }, experienced: { successes: 8, total: 10 } }
    }, experiencedPercent: 50
  }
});

/** Text fields accept whole decimal counts, including zero; blank is invalid. */
export function parseGroupedCount(text, label = 'Count') {
  if (typeof text !== 'string' || text.length > 32 || !/^[0-9]+$/.test(text.trim())) {
    throw new Error(`${label}: enter a whole number from 0 to ${GROUPED_COUNT_LIMIT.toLocaleString('en-US')}.`);
  }
  const value = Number(text.trim());
  if (!Number.isSafeInteger(value) || value < 0 || value > GROUPED_COUNT_LIMIT) {
    throw new Error(`${label}: enter a whole number from 0 to ${GROUPED_COUNT_LIMIT.toLocaleString('en-US')}.`);
  }
  return value;
}

function integer(value, label, maximum) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new Error(`${label} must be an integer from 0 to ${maximum}.`);
  }
  return value;
}

function admitCounts(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Supply counts for options A and B.');
  }
  const copy = {};
  for (const option of GROUPED_OPTIONS) {
    copy[option] = {};
    for (const group of GROUPED_KEYS) {
      const cell = input[option]?.[group];
      if (!cell || typeof cell !== 'object' || Array.isArray(cell)) {
        throw new Error(`Missing ${option.toUpperCase()} / ${group} counts.`);
      }
      const label = `${option.toUpperCase()} / ${group}`;
      const successes = integer(cell.successes, `${label} successes`, GROUPED_COUNT_LIMIT);
      const total = integer(cell.total, `${label} total`, GROUPED_COUNT_LIMIT);
      if (successes > total) throw new Error(`${label}: successes cannot exceed the total.`);
      copy[option][group] = { successes, total };
    }
  }
  return copy;
}

function gcd(a, b) {
  a = a < 0n ? -a : a;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

/** JSON-safe exact fraction, plus an approximate value used only for display. */
function fraction(numerator, denominator) {
  if (denominator === 0n) return null;
  const divisor = gcd(numerator, denominator);
  numerator /= divisor;
  denominator /= divisor;
  return {
    numerator: numerator.toString(),
    denominator: denominator.toString(),
    value: Number(numerator) / Number(denominator)
  };
}

function rate(cell) {
  return fraction(BigInt(cell.successes), BigInt(cell.total));
}

function difference(a, b) {
  if (a === null || b === null) return null;
  return fraction(
    BigInt(a.numerator) * BigInt(b.denominator) - BigInt(b.numerator) * BigInt(a.denominator),
    BigInt(a.denominator) * BigInt(b.denominator)
  );
}

function comparison(a, b) {
  const delta = difference(a, b);
  if (delta === null) return 'unavailable';
  const n = BigInt(delta.numerator);
  return n > 0n ? 'a_higher' : n < 0n ? 'b_higher' : 'equal';
}

function pooled(cells) {
  const successes = GROUPED_KEYS.reduce((sum, key) => sum + cells[key].successes, 0);
  const total = GROUPED_KEYS.reduce((sum, key) => sum + cells[key].total, 0);
  return {
    successes, total, rate: rate({ successes, total }),
    experiencedWeight: fraction(BigInt(cells.experienced.total), BigInt(total))
  };
}

function atCommonMix(cells, experiencedPercent) {
  let n = 0n;
  let d = 1n;
  const missing = [];
  for (const [key, weight] of [['newcomers', 100 - experiencedPercent], ['experienced', experiencedPercent]]) {
    if (weight === 0) continue;
    if (cells[key].total === 0) { missing.push(key); continue; }
    const termN = BigInt(weight) * BigInt(cells[key].successes);
    const termD = 100n * BigInt(cells[key].total);
    n = n * termD + termN * d;
    d *= termD;
    const divisor = gcd(n, d);
    n /= divisor; d /= divisor;
  }
  return { rate: missing.length ? null : fraction(n, d), missing };
}

function classify(groups, overall) {
  const directions = groups.map(group => group.comparison);
  if (overall === 'unavailable' || directions.includes('unavailable')) return 'unavailable';
  if (directions.includes('equal')) return 'subgroup_tie';
  if (directions[0] !== directions[1]) return 'mixed_groups';
  if (overall === 'equal') return 'pooled_tie';
  return directions[0] === overall ? 'same_direction' : 'strict_reversal';
}

export function analyzeGroupedData(input, experiencedPercent = 50) {
  const counts = admitCounts(input);
  integer(experiencedPercent, 'Experienced-group percentage', 100);
  const groups = GROUPED_KEYS.map(key => {
    const a = rate(counts.a[key]); const b = rate(counts.b[key]);
    return { key, a, b, comparison: comparison(a, b), difference: difference(a, b) };
  });
  const a = pooled(counts.a); const b = pooled(counts.b);
  const aRef = atCommonMix(counts.a, experiencedPercent);
  const bRef = atCommonMix(counts.b, experiencedPercent);
  const observedComparison = comparison(a.rate, b.rate);
  return freezeTree({
    counts,
    groups,
    observed: { a, b, comparison: observedComparison, difference: difference(a.rate, b.rate) },
    reference: {
      experiencedPercent, a: aRef.rate, b: bRef.rate,
      missing: { a: aRef.missing, b: bRef.missing },
      comparison: comparison(aRef.rate, bRef.rate), difference: difference(aRef.rate, bRef.rate)
    },
    classification: classify(groups, observedComparison)
  });
}

export function serializeGroupedComparison(input, experiencedPercent = 50) {
  const analysis = analyzeGroupedData(input, experiencedPercent);
  return JSON.stringify({
    format: 'recallweave-grouped-data/1',
    description: 'Locally supplied teaching counts. Example presets are fictional; edited counts have no verified sample provenance.',
    units: { counts: 'successes and recorded attempts', referenceMix: 'percent experienced, shared by both options', rates: 'proportions from 0 to 1' },
    interpretation: 'Pooled rates describe each recorded sample. Reference rates apply chosen common group weights; they do not alter the counts or estimate a causal effect. Unavailable quantities are null. Exact fractions determine comparisons; numeric values are display approximations.',
    ...analysis
  }, null, 2) + '\n';
}
