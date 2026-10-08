import test from 'node:test';
import assert from 'node:assert/strict';
import { parentGametes, parentGenotypes, crossGenotypes } from '../src/mendelian-inheritance.mjs';

const proportions = values => Object.fromEntries(values.map(value => [value.label, [value.numerator, value.denominator]]));
const count = (result, field, label) => result[field].find(value => value.label === label);

test('gametes carry one allele per locus and preserve equal segregation', () => {
  assert.deepEqual(parentGametes('Aa'), [{alleles: 'A', numerator: 1, denominator: 2}, {alleles: 'a', numerator: 1, denominator: 2}]);
  assert.deepEqual(parentGametes('AA'), [{alleles: 'A', numerator: 1, denominator: 1}]);
  assert.deepEqual(parentGametes('AABb').map(g => [g.alleles, g.numerator, g.denominator]), [['AB', 1, 2], ['Ab', 1, 2]]);
  assert.deepEqual(parentGametes('AaBb').map(g => g.alleles), ['AB', 'Ab', 'aB', 'ab']);
  assert.deepEqual(parentGametes('aabb'), [{alleles: 'ab', numerator: 1, denominator: 1}]);
});

test('Aa × Aa keeps both heterozygote routes and distinguishes genotype from phenotype', () => {
  const result = crossGenotypes('Aa', 'Aa');
  assert.equal(result.totalRoutes, 4);
  assert.deepEqual(proportions(result.genotypes), {AA: [1, 4], Aa: [1, 2], aa: [1, 4]});
  assert.deepEqual(proportions(result.phenotypes), {A_: [3, 4], aa: [1, 4]});
  assert.deepEqual(result.cells.filter(c => c.genotype === 'Aa').map(c => [c.parent1Gamete, c.parent2Gamete]), [['A', 'a'], ['a', 'A']]);
  assert.equal(result.cells.every(c => c.numerator === 1 && c.denominator === 4), true);
});

test('test crosses and complementary homozygotes have their own outcomes', () => {
  assert.deepEqual(proportions(crossGenotypes('Aa', 'aa').genotypes), {Aa: [1, 2], aa: [1, 2]});
  const complementary = crossGenotypes('AAbb', 'aaBB');
  assert.equal(complementary.totalRoutes, 1);
  assert.deepEqual(proportions(complementary.genotypes), {AaBb: [1, 1]});
  assert.deepEqual(proportions(complementary.phenotypes), {A_B_: [1, 1]});
  assert.deepEqual(proportions(crossGenotypes('AaBb', 'aabb').genotypes), {AaBb: [1, 4], Aabb: [1, 4], aaBb: [1, 4], aabb: [1, 4]});
});

test('the sixteen-route cross gives nine genotypes and 9:3:3:1 only under its stated assumptions', () => {
  const result = crossGenotypes('AaBb', 'AaBb');
  assert.equal(result.totalRoutes, 16);
  assert.equal(result.genotypes.length, 9);
  assert.deepEqual(proportions(result.phenotypes), {A_B_: [9, 16], A_bb: [3, 16], aaB_: [3, 16], aabb: [1, 16]});
  assert.deepEqual(proportions(result.genotypes), {
    AABB: [1, 16], AABb: [1, 8], AAbb: [1, 16],
    AaBB: [1, 8], AaBb: [1, 4], Aabb: [1, 8],
    aaBB: [1, 16], aaBb: [1, 8], aabb: [1, 16]
  });
});

test('asymmetric AABb × Aabb derives the course answer without a memorized ratio', () => {
  const result = crossGenotypes('AABb', 'Aabb');
  assert.deepEqual(proportions(result.genotypes), {AABb: [1, 4], AAbb: [1, 4], AaBb: [1, 4], Aabb: [1, 4]});
  assert.deepEqual(proportions(result.phenotypes), {A_B_: [1, 2], A_bb: [1, 2]});
  assert.equal(count(result, 'genotypes', 'AAbb').routes + count(result, 'genotypes', 'Aabb').routes, 2);
});

// Independent finite oracle: enumerate parental allele-copy choices, retaining duplicate
// gametes from homozygous loci. Production instead combines unique gamete names.
function copyOracle(left, right) {
  const loci = left.length / 2;
  const totals = new Map();
  function visit(locus, genotype) {
    if (locus === loci) { totals.set(genotype, (totals.get(genotype) ?? 0) + 1); return; }
    for (let maternalCopy = 0; maternalCopy < 2; maternalCopy++) {
      for (let paternalCopy = 0; paternalCopy < 2; paternalCopy++) {
        const pair = [left[locus * 2 + maternalCopy], right[locus * 2 + paternalCopy]].sort().join('');
        visit(locus + 1, genotype + pair);
      }
    }
  }
  visit(0, '');
  return {totals, denominator: 4 ** loci};
}

test('all 90 bounded parent pairs agree with the allele-copy oracle, conserve probability and commute', () => {
  let checked = 0;
  for (const loci of [1, 2]) {
    for (const left of parentGenotypes(loci)) for (const right of parentGenotypes(loci)) {
      const result = crossGenotypes(left, right), oracle = copyOracle(left, right);
      assert.equal(result.genotypes.length, oracle.totals.size);
      for (const outcome of result.genotypes) {
        assert.equal(outcome.numerator * oracle.denominator, oracle.totals.get(outcome.label) * outcome.denominator, left + ' × ' + right + ': ' + outcome.label);
      }
      for (const field of ['genotypes', 'phenotypes']) {
        assert.equal(result[field].reduce((sum, outcome) => sum + outcome.routes, 0), result.totalRoutes);
        assert.deepEqual(proportions(result[field]), proportions(crossGenotypes(right, left)[field]));
      }
      assert.equal(result.cells.length, result.gametes.parent1.length * result.gametes.parent2.length);
      checked++;
    }
  }
  assert.equal(checked, 90);
});

test('unsupported inputs cannot become a silently different cross', () => {
  for (const value of ['', 'aA', 'BB', 'AaB', 'AaBbCc', ' Aa', 'AAaa', '<img>', 'Aa\n']) assert.throws(() => parentGametes(value), RangeError);
  for (const value of [null, undefined, 1, {}, ['Aa']]) assert.throws(() => crossGenotypes(value, 'Aa'), TypeError);
  assert.throws(() => crossGenotypes('Aa', 'AaBb'), RangeError);
  assert.throws(() => parentGenotypes('2'), RangeError);
  assert.throws(() => parentGenotypes(3), RangeError);
});

test('a saved cross is a complete immutable record with explicit model boundaries', () => {
  const result = crossGenotypes('AaBb', 'AaBb'), saved = JSON.stringify(result);
  assert.equal(result.format, 'recallweave-mendelian-cross/1');
  assert.ok(result.assumptions.some(text => /independent assortment/.test(text)));
  assert.ok(result.assumptions.some(text => /not guaranteed counts/.test(text)));
  assert.throws(() => { result.cells[0].genotype = 'aa'; }, TypeError);
  assert.throws(() => { result.gametes.parent1.push({alleles: 'Aa'}); }, TypeError);
  assert.deepEqual(JSON.parse(saved), result);
});
