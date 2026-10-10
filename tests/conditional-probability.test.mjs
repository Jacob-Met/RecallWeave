import test from 'node:test';
import assert from 'node:assert/strict';
import { CELL_KEYS, PROBABILITIES, parseCount, parseEventLabel, analyzeTable } from '../src/conditional-probability.mjs';

function table(values = ['9', '1', '99', '891'], labels = { a: 'defective file', b: 'flagged' }) {
  return { cells: Object.fromEntries(CELL_KEYS.map((key, index) => [key, values[index]])), labels };
}
function byId(result, id) {
  const value = result.probabilities.find(item => item.id === id);
  assert.ok(value, id);
  return value;
}

test('the course table retains all original counts and sixteen exact reduced ratios', () => {
  const result = analyzeTable(table());
  assert.equal(result.format, 'recallweave-conditional-table/1');
  assert.equal(result.total, '1000');
  assert.deepEqual(result.cells, { ab: '9', aNotB: '1', notAB: '99', neither: '891' });
  const expected = [
    ['joint_ab', '9', '1000', '9', '1000'],
    ['joint_a_not_b', '1', '1000', '1', '1000'],
    ['joint_not_a_b', '99', '1000', '99', '1000'],
    ['joint_neither', '891', '1000', '891', '1000'],
    ['marginal_a', '10', '1000', '1', '100'],
    ['marginal_not_a', '990', '1000', '99', '100'],
    ['marginal_b', '108', '1000', '27', '250'],
    ['marginal_not_b', '892', '1000', '223', '250'],
    ['a_given_b', '9', '108', '1', '12'],
    ['not_a_given_b', '99', '108', '11', '12'],
    ['a_given_not_b', '1', '892', '1', '892'],
    ['not_a_given_not_b', '891', '892', '891', '892'],
    ['b_given_a', '9', '10', '9', '10'],
    ['not_b_given_a', '1', '10', '1', '10'],
    ['b_given_not_a', '99', '990', '1', '10'],
    ['not_b_given_not_a', '891', '990', '9', '10'],
  ];
  assert.deepEqual(result.probabilities.map(p => [
    p.id, p.numerator, p.denominator, p.reducedNumerator, p.reducedDenominator,
  ]), expected);
  assert.ok(result.probabilities.every(p => p.defined));
  assert.deepEqual(result.independence, { defined: true, independent: false, left: '9000', right: '1080' });
});

test('both conditional directions identify their different conditioning cells', () => {
  const result = analyzeTable(table());
  const forward = byId(result, 'a_given_b');
  const reverse = byId(result, 'b_given_a');
  assert.deepEqual(forward.numeratorCells, ['ab']);
  assert.deepEqual(reverse.numeratorCells, ['ab']);
  assert.deepEqual(forward.denominatorCells, ['ab', 'notAB']);
  assert.deepEqual(reverse.denominatorCells, ['ab', 'aNotB']);
  assert.deepEqual(byId(result, 'not_b_given_not_a').numeratorCells, ['neither']);
  assert.deepEqual(byId(result, 'not_b_given_not_a').denominatorCells, ['notAB', 'neither']);
  assert.deepEqual(byId(result, 'marginal_not_b').numeratorCells, ['aNotB', 'neither']);
  assert.deepEqual(byId(result, 'marginal_not_b').denominatorCells, CELL_KEYS);
  assert.equal(PROBABILITIES.filter(p => p.kind === 'joint').length, 4);
  assert.equal(PROBABILITIES.filter(p => p.kind === 'marginal').length, 4);
  assert.equal(PROBABILITIES.filter(p => p.kind === 'conditional').length, 8);
  assert.equal(new Set(PROBABILITIES.map(p => p.id)).size, 16);
});

test('empty total has explicit undefined ratios, never zero probabilities or an independence verdict', () => {
  const result = analyzeTable(table(['0', '0', '0', '0']));
  assert.equal(result.total, '0');
  for (const p of result.probabilities) {
    assert.equal(p.numerator, '0');
    assert.equal(p.denominator, '0');
    assert.equal(p.defined, false);
    assert.equal(p.reducedNumerator, null);
    assert.equal(p.reducedDenominator, null);
    assert.ok(p.numeratorCells.length > 0 && p.denominatorCells.length > 0);
  }
  assert.deepEqual(result.independence, { defined: false, independent: null, left: '0', right: '0' });
});

test('a zero event is independent in a positive table while conditioning on it is undefined', () => {
  const result = analyzeTable(table(['0', '0', '4', '6']));
  assert.deepEqual(result.independence, { defined: true, independent: true, left: '0', right: '0' });
  assert.equal(byId(result, 'b_given_a').defined, false);
  assert.equal(byId(result, 'not_b_given_a').defined, false);
  assert.equal(byId(result, 'a_given_b').defined, true);
  assert.equal(byId(result, 'a_given_b').reducedNumerator, '0');
  assert.equal(byId(result, 'a_given_b').reducedDenominator, '1');
  assert.equal(byId(result, 'not_a_given_b').reducedNumerator, '1');
  assert.equal(byId(result, 'not_a_given_b').reducedDenominator, '1');
});

test('positive independent events and mutually exclusive positive events are distinguished', () => {
  assert.deepEqual(analyzeTable(table(['2', '2', '3', '3'])).independence,
    { defined: true, independent: true, left: '20', right: '20' });
  assert.deepEqual(analyzeTable(table(['0', '3', '2', '5'])).independence,
    { defined: true, independent: false, left: '0', right: '6' });
});

test('integer products differing by one remain distinct beyond floating point precision', () => {
  // For n,n-1,n+1,n the determinant n²-(n-1)(n+1) is exactly one.
  const result = analyzeTable(table([
    '999999999999999998', '999999999999999997',
    '999999999999999999', '999999999999999998',
  ]));
  assert.equal(result.total, '3999999999999999992');
  assert.equal(BigInt(result.independence.left) - BigInt(result.independence.right), 1n);
  assert.equal(result.independence.independent, false);
  assert.equal(Number(result.independence.left), Number(result.independence.right));
});

test('maximum admitted counts sum exactly and reduce before JSON serialization', () => {
  const result = analyzeTable(table(Array(4).fill('999999999999999999')));
  assert.equal(result.total, '3999999999999999996');
  assert.equal(byId(result, 'joint_ab').reducedNumerator, '1');
  assert.equal(byId(result, 'joint_ab').reducedDenominator, '4');
  assert.equal(byId(result, 'a_given_b').reducedDenominator, '2');
  assert.equal(result.independence.independent, true);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
});

test('scaling every cell changes counts but not probabilities or independence', () => {
  const original = analyzeTable(table(['6', '4', '3', '7']));
  const scaled = analyzeTable(table(['42', '28', '21', '49']));
  assert.equal(original.total, '20');
  assert.equal(scaled.total, '140');
  assert.deepEqual(
    scaled.probabilities.map(p => [p.reducedNumerator, p.reducedDenominator]),
    original.probabilities.map(p => [p.reducedNumerator, p.reducedDenominator]),
  );
  assert.equal(scaled.independence.independent, original.independence.independent);
});

test('count admission is string-only, ASCII-only and bounded before BigInt conversion', () => {
  for (const [raw, expected] of [
    ['0', 0n], ['000000000000000001', 1n], [' \t42\n', 42n],
    [' '.repeat(127) + '0', 0n], ['999999999999999999', 999999999999999999n],
  ]) assert.equal(parseCount(raw), expected);
  for (const raw of ['', ' ', '-1', '+1', '1.0', '1e2', '0x10', '1_000', '1 2', '１２', '١', '0'.repeat(19), ' '.repeat(128) + '0']) {
    assert.throws(() => parseCount(raw), RangeError, JSON.stringify(raw));
  }
  for (const raw of [0, 1n, null, undefined, true, [], {}, new String('1')]) {
    assert.throws(() => parseCount(raw), TypeError);
  }
});

test('label admission counts code points and preserves literal Unicode without normalizing it', () => {
  assert.equal(parseEventLabel('  e\u0301 <A> & B  '), 'e\u0301 <A> & B');
  assert.equal(parseEventLabel('😀'.repeat(80)), '😀'.repeat(80));
  assert.equal(parseEventLabel(' '.repeat(160) + '😀'.repeat(80)), '😀'.repeat(80));
  assert.throws(() => parseEventLabel(' '.repeat(161) + '😀'.repeat(80)), RangeError);
  assert.throws(() => parseEventLabel('😀'.repeat(81)), RangeError);
  assert.throws(() => parseEventLabel('x'.repeat(81)), RangeError);
  assert.throws(() => parseEventLabel('   '), RangeError);
  for (const raw of [5, null, undefined, false, [], {}, new String('A')]) {
    assert.throws(() => parseEventLabel(raw), TypeError);
  }
});

test('every C0/C1 control is refused even when trimming would remove it', () => {
  for (const code of [...Array.from({ length: 32 }, (_, i) => i), ...Array.from({ length: 33 }, (_, i) => i + 127)]) {
    const control = String.fromCharCode(code);
    assert.throws(() => parseEventLabel(control + 'A'), RangeError);
    assert.throws(() => parseEventLabel('A' + control), RangeError);
    assert.throws(() => parseEventLabel('A' + control + 'B'), RangeError);
  }
});

test('analyzeTable enforces admission for each field and rejects incomplete record shapes', () => {
  for (const key of CELL_KEYS) {
    const value = table();
    value.cells[key] = '1.0';
    assert.throws(() => analyzeTable(value), RangeError);
    value.cells[key] = 1;
    assert.throws(() => analyzeTable(value), TypeError);
    delete value.cells[key];
    assert.throws(() => analyzeTable(value), TypeError);
  }
  for (const key of ['a', 'b']) {
    const value = table();
    value.labels[key] = '\nA';
    assert.throws(() => analyzeTable(value), RangeError);
    value.labels[key] = 1;
    assert.throws(() => analyzeTable(value), TypeError);
    delete value.labels[key];
    assert.throws(() => analyzeTable(value), TypeError);
  }
  for (const value of [null, undefined, [], {}, { cells: {}, labels: {} }, { cells: [], labels: {} }, { cells: table().cells, labels: null }]) {
    assert.throws(() => analyzeTable(value), TypeError);
  }
});

test('canonical result is immutable and detached from later input edits', () => {
  const input = table([' 009 ', '01', '099', '0891'], { a: '  A  ', b: '<B>' });
  const result = analyzeTable(input);
  input.cells.ab = '0';
  input.labels.b = 'changed';
  assert.equal(result.cells.ab, '9');
  assert.deepEqual(result.labels, { a: 'A', b: '<B>' });
  assert.throws(() => { result.cells.ab = '0'; }, TypeError);
  assert.throws(() => { result.labels.a = 'changed'; }, TypeError);
  assert.throws(() => { result.probabilities[0].numerator = '0'; }, TypeError);
  assert.throws(() => result.probabilities[0].denominatorCells.pop(), TypeError);
  assert.throws(() => { result.independence.independent = true; }, TypeError);
  assert.throws(() => PROBABILITIES[0].numeratorCells.push('neither'), TypeError);
  assert.throws(() => CELL_KEYS.push('extra'), TypeError);
  assert.equal(analyzeTable(table()).probabilities[0].numerator, '9');
});
