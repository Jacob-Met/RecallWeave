/** Exact, bounded Mendelian crosses for the companion plant-inheritance lesson. */
export const INHERITANCE_ASSUMPTIONS = Object.freeze([
  'Hypothetical diploid plants; one or two autosomal loci with two alleles per locus.',
  'Normal equal segregation, no mutation, and random fertilization.',
  'Two-locus gametes use independent assortment: allele choices at A and B are independent.',
  'Complete dominance: AA and Aa share the A-dominant phenotype; BB and Bb share the B-dominant phenotype.',
  'The two trait mappings do not interact; environmental effects and differential survival are not modeled.',
  'Fractions are probabilities of zygote outcomes, not guaranteed counts in a finite group of offspring.'
]);

export const INHERITANCE_PRESETS = Object.freeze([
  Object.freeze({id: 'one-heterozygous', label: 'Aa × Aa · two routes to Aa', parent1: 'Aa', parent2: 'Aa'}),
  Object.freeze({id: 'one-test', label: 'Aa × aa · a test cross', parent1: 'Aa', parent2: 'aa'}),
  Object.freeze({id: 'two-asymmetric', label: 'AABb × Aabb · derive the ratio', parent1: 'AABb', parent2: 'Aabb'}),
  Object.freeze({id: 'two-heterozygous', label: 'AaBb × AaBb · sixteen routes', parent1: 'AaBb', parent2: 'AaBb'}),
  Object.freeze({id: 'two-complementary', label: 'AAbb × aaBB · one outcome', parent1: 'AAbb', parent2: 'aaBB'})
]);

export function parentGenotypes(loci) {
  if (loci !== 1 && loci !== 2) throw new RangeError('Choose one or two loci.');
  const first = ['AA', 'Aa', 'aa'];
  return Object.freeze(loci === 1 ? first : first.flatMap(a => ['BB', 'Bb', 'bb'].map(b => a + b)));
}

function pairs(genotype) {
  if (typeof genotype !== 'string') throw new TypeError('A parental genotype must be text.');
  if (!/^(AA|Aa|aa)(BB|Bb|bb)?$/.test(genotype)) {
    throw new RangeError('Choose AA, Aa or aa, optionally followed by BB, Bb or bb.');
  }
  return [genotype.slice(0, 2), ...(genotype.length === 4 ? [genotype.slice(2)] : [])];
}

function fraction(numerator, denominator) {
  let a = numerator, b = denominator;
  while (b) [a, b] = [b, a % b];
  return {numerator: numerator / a, denominator: denominator / a};
}

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** Unique gametes are equiprobable under the explicit equal/independent assumptions. */
export function parentGametes(genotype) {
  let routes = [''];
  for (const pair of pairs(genotype)) {
    const alleles = [...new Set(pair)];
    routes = routes.flatMap(prefix => alleles.map(allele => prefix + allele));
  }
  return freeze(routes.map(alleles => ({alleles, numerator: 1, denominator: routes.length})));
}

function offspring(first, second) {
  return [...first].map((allele, locus) => {
    const other = second[locus];
    return allele === other ? allele + other : allele.toUpperCase() + allele.toLowerCase();
  }).join('');
}

function phenotype(genotype) {
  return pairs(genotype).map((pair, locus) => {
    const dominant = locus === 0 ? 'A' : 'B';
    return pair.includes(dominant) ? dominant + '_' : dominant.toLowerCase().repeat(2);
  }).join('');
}

function summarize(cells, field) {
  const counts = new Map();
  for (const cell of cells) counts.set(cell[field], (counts.get(cell[field]) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([label, routes]) => ({label, routes, ...fraction(routes, cells.length)}));
}

/** Cartesian fertilization routes; each cell retains its distinct parental contributions. */
export function crossGenotypes(parent1, parent2) {
  const loci = pairs(parent1).length;
  if (pairs(parent2).length !== loci) throw new RangeError('Both parents must use the same one or two loci.');
  const first = parentGametes(parent1), second = parentGametes(parent2);
  const totalRoutes = first.length * second.length;
  const cells = first.flatMap((left, row) => second.map((right, column) => {
    const genotype = offspring(left.alleles, right.alleles);
    return {
      row, column, parent1Gamete: left.alleles, parent2Gamete: right.alleles,
      genotype, phenotype: phenotype(genotype), numerator: 1, denominator: totalRoutes
    };
  }));
  return freeze({
    format: 'recallweave-mendelian-cross/1', loci, parent1, parent2,
    assumptions: INHERITANCE_ASSUMPTIONS, gametes: {parent1: first, parent2: second},
    totalRoutes, cells, genotypes: summarize(cells, 'genotype'), phenotypes: summarize(cells, 'phenotype')
  });
}
