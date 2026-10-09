/** Exact probabilities for a two-locus testcross; no sampling or physical map inference. */
export const LINKAGE_ASSUMPTIONS = Object.freeze([
  "Hypothetical diploid plants; two autosomal loci A/a and B/b.",
  "One double-heterozygous AaBb parent is crossed with an aabb tester that contributes ab.",
  "Alleles segregate equally; the two parental gamete classes share probability equally, as do the two recombinant classes.",
  "The entered recombination percentage is a stipulated recombinant-gamete fraction, not a count of crossover events.",
  "No mutation, segregation distortion, differential gamete or offspring survival, or nonrandom fertilization is modeled.",
  "Probabilities describe possible offspring; they are not quotas for a finite sample and do not locate genes on a physical chromosome map."
]);

function fraction(numerator, denominator) {
  let a = numerator;
  let b = denominator;
  while (b) [a, b] = [b, a % b];
  return Object.freeze({ numerator: numerator / a, denominator: denominator / a });
}

export function analyzeLinkage(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Supply the phase and recombination percentage as a record.');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError('Use an ordinary data record.');
  const keys = Reflect.ownKeys(value);
  if (keys.length !== 2 || !keys.includes('phase') || !keys.includes('recombinationPercent')) {
    throw new TypeError('Supply exactly phase and recombinationPercent.');
  }
  const phaseField = Object.getOwnPropertyDescriptor(value, 'phase');
  const percentField = Object.getOwnPropertyDescriptor(value, 'recombinationPercent');
  if (!Object.hasOwn(phaseField, 'value') || !Object.hasOwn(percentField, 'value')) {
    throw new TypeError('The two fields must be data properties.');
  }
  const phase = phaseField.value;
  const rawPercent = percentField.value;
  if (phase !== 'coupling' && phase !== 'repulsion') throw new RangeError('Choose coupling or repulsion.');
  if (typeof rawPercent !== 'number' || !Number.isInteger(rawPercent) || rawPercent < 0 || rawPercent > 50) {
    throw new RangeError('Recombination percentage must be an integer from 0 through 50.');
  }
  const recombinationPercent = rawPercent === 0 ? 0 : rawPercent;
  const homologs = Object.freeze(phase === 'coupling' ? ['AB', 'ab'] : ['Ab', 'aB']);
  const gametes = ['AB', 'Ab', 'aB', 'ab'];
  const offspring = ['AaBb', 'Aabb', 'aaBb', 'aabb'];
  const weights = gametes.map(gamete => homologs.includes(gamete) ? 100 - recombinationPercent : recombinationPercent);
  const rows = Object.freeze(gametes.map((gamete, index) => Object.freeze({
    gamete,
    kind: homologs.includes(gamete) ? 'parental' : 'recombinant',
    probability: fraction(weights[index], 200),
    offspringGenotype: offspring[index]
  })));
  const total = predicate => fraction(weights.reduce((sum, weight, index) => sum + (predicate(rows[index]) ? weight : 0), 0), 200);
  return Object.freeze({
    format: 'recallweave-genetic-linkage/1',
    input: Object.freeze({ phase, recombinationPercent }),
    assumptions: LINKAGE_ASSUMPTIONS,
    parent: Object.freeze({ genotype: 'AaBb', homologs }),
    tester: Object.freeze({ genotype: 'aabb', gamete: 'ab' }),
    rows,
    totals: Object.freeze({
      parental: total(row => row.kind === 'parental'),
      recombinant: total(row => row.kind === 'recombinant'),
      all: total(() => true)
    }),
    marginals: Object.freeze({
      A: total(row => row.gamete[0] === 'A'),
      a: total(row => row.gamete[0] === 'a'),
      B: total(row => row.gamete[1] === 'B'),
      b: total(row => row.gamete[1] === 'b')
    }),
    independentComparison: Object.freeze({
      probability: fraction(1, 4),
      matches: rows.every(row => row.probability.numerator === 1 && row.probability.denominator === 4)
    })
  });
}
