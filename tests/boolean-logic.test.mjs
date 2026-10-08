import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeLogic, createLogicCsv, parseLogicExpression, LogicInputError, LOGIC_LIMITS} from '../src/boolean-logic.mjs';

const values = text => analyzeLogic(text).rows.map(row => row.left);

test('all binary connectives match independently enumerated TT, TF, FT, FF columns', () => {
  const expected = new Map([
    ['and', [true, false, false, false]], ['or', [true, true, true, false]],
    ['xor', [false, true, true, false]], ['->', [true, false, true, true]],
    ['<->', [true, false, false, true]]
  ]);
  for (const [operator, column] of expected) {
    const table = analyzeLogic(`A ${operator} B`);
    assert.deepEqual(table.rows.map(row => row.assignment), [{A: true, B: true}, {A: true, B: false}, {A: false, B: true}, {A: false, B: false}]);
    assert.deepEqual(table.rows.map(row => row.left), column, operator);
  }
  assert.deepEqual(values('not A'), [false, true]);
});

test('the union is alphabetical, complete and unique even with disjoint variables', () => {
  const table = analyzeLogic('E or C', 'B and A or D');
  assert.deepEqual(table.variables, ['A', 'B', 'C', 'D', 'E']);
  assert.equal(table.rows.length, 32);
  assert.equal(new Set(table.rows.map(row => JSON.stringify(row.assignment))).size, 32);
  for (const row of table.rows) {
    const a = row.assignment;
    assert.equal(row.left, [a.C, a.E].filter(Boolean).length >= 1);
    assert.equal(row.right, (a.A === true && a.B === true) || a.D === true);
    assert.equal(row.equal, row.left === row.right);
  }
  assert.equal(table.leftSummary.trueRows, 24);
  assert.equal(table.rightSummary.trueRows, 20);
});

test('precedence and grouping are explicit, and implication is right associative', () => {
  assert.equal(parseLogicExpression('not A and B xor C or D -> E <-> false').canonical, '((((((not A) and B) xor C) or D) -> E) <-> false)');
  assert.equal(parseLogicExpression('A -> B -> C').canonical, '(A -> (B -> C))');
  assert.equal(parseLogicExpression('A or B or C').canonical, '((A or B) or C)');
  const table = analyzeLogic('A -> B -> C', '(A -> B) -> C');
  const witness = table.rows.find(row => row.assignment.A === false && row.assignment.B === false && row.assignment.C === false);
  assert.equal(witness.left, true);
  assert.equal(witness.right, false);
  assert.equal(table.equivalent, false);
  assert.deepEqual(values('not (A and B)'), [false, true, true, true]);
  assert.deepEqual(values('(not A) and B'), [false, false, true, false]);
});

test('case, whitespace and parentheses preserve the same formal expression', () => {
  const parsed = parseLogicExpression('  ((a)) AnD\nNOT b  ');
  assert.equal(parsed.canonical, '(A and (not B))');
  assert.deepEqual(parsed.variables, ['A', 'B']);
  assert.deepEqual(values('True AnD NOT FALSE'), [true]);
});

test('equivalence is exhaustive; converse and incorrect De Morgan variants retain counterexamples', () => {
  for (const [left, right] of [
    ['A -> B', 'not A or B'], ['A -> B', 'not B -> not A'],
    ['not (A or B)', '(not A) and (not B)'], ['not (A and B)', '(not A) or (not B)'],
    ['A xor B', 'not (A <-> B)']
  ]) {
    const table = analyzeLogic(left, right);
    assert.equal(table.equivalent, true, `${left} and ${right}`);
    assert.deepEqual(table.differences, []);
  }
  const converse = analyzeLogic('A -> B', 'B -> A');
  assert.deepEqual(converse.differences, [1, 2]);
  assert.deepEqual(converse.differences.map(index => converse.rows[index].assignment), [{A: true, B: false}, {A: false, B: true}]);
  assert.equal(analyzeLogic('not (A or B)', 'not A or not B').equivalent, false);
});

test('valid inference and affirming the consequent differ at a concrete full assignment', () => {
  const valid = analyzeLogic('((A -> B) and A) -> B');
  assert.equal(valid.leftSummary.classification, 'tautology');
  const invalid = analyzeLogic('((A -> B) and B) -> A');
  assert.deepEqual(invalid.rows.filter(row => !row.left).map(row => row.assignment), [{A: false, B: true}]);
  assert.equal(invalid.leftSummary.classification, 'contingent');
});

test('constants have one empty assignment, and single-expression mode is distinct', () => {
  const table = analyzeLogic('false', 'true');
  assert.deepEqual(table.variables, []);
  assert.equal(table.rows.length, 1);
  assert.deepEqual(table.rows[0].assignment, {});
  assert.equal(table.equivalent, false);
  assert.equal(table.leftSummary.classification, 'contradiction');
  assert.equal(table.rightSummary.classification, 'tautology');
  const single = analyzeLogic('A or not A', ' \n\t');
  assert.equal(single.right, null);
  assert.equal(single.equivalent, null);
  assert.equal(single.rightSummary, null);
  assert.ok(single.rows.every(row => row.right === null && row.equal === null));
  assert.equal(single.leftSummary.classification, 'tautology');
});

test('invalid edits refuse unknown words, partial expressions, code, HTML and unsupported notation', () => {
  for (const input of ['', ' ', 'A and', 'not', '(A', 'A)', '()', 'A B', 'F', 'AA', 'AandB', 'truefalse', 'A && B', 'A => B', 'A + B', 'alert(A)', '<script>x</script>', 'A; B', '__proto__', 'A ∨ B', 'A\0']) {
    assert.throws(() => analyzeLogic(input), LogicInputError, input);
  }
  assert.throws(() => analyzeLogic('A', 'B or'), error => error instanceof LogicInputError && error.field === 'right');
  for (const input of [null, true, 42, {}, ['A']]) assert.throws(() => analyzeLogic(input), LogicInputError);
  assert.throws(() => analyzeLogic('A', null), LogicInputError);
});

test('boundary inputs admit declared limits and reject the next character, token, parenthesis or operator', () => {
  assert.equal(parseLogicExpression('A'.padEnd(LOGIC_LIMITS.characters)).canonical, 'A');
  assert.throws(() => parseLogicExpression('A'.padEnd(LOGIC_LIMITS.characters + 1)), /512 characters/);
  assert.equal(analyzeLogic('A', ' '.repeat(LOGIC_LIMITS.characters)).right, null);
  assert.throws(() => analyzeLogic('A', ' '.repeat(LOGIC_LIMITS.characters + 1)), error => error instanceof LogicInputError && error.field === 'right' && /512 characters/.test(error.message));
  assert.equal(parseLogicExpression('('.repeat(32) + 'A' + ')'.repeat(32)).canonical, 'A');
  assert.throws(() => parseLogicExpression('('.repeat(33) + 'A' + ')'.repeat(33)), /32 nested parentheses/);
  assert.equal(parseLogicExpression('not '.repeat(32) + 'A').root.depth, 32);
  assert.throws(() => parseLogicExpression('not '.repeat(33) + 'A'), /32 nested operators/);
  // A balanced expression stays within both depth limits while reaching the token limit.
  const balanced = count => count === 1 ? 'A' : `(${balanced(count / 2)} or ${balanced(count / 2)})`;
  const expression = balanced(32); // 125 tokens, 281 characters.
  assert.equal(analyzeLogic(expression).rows.length, 2);
  assert.equal(parseLogicExpression(`not (${expression})`).root.depth, 6); // 128 tokens.
  assert.throws(() => parseLogicExpression(`not not (${expression})`), /128 tokens/);
});

test('returned analysis is deeply immutable and subsequent calls do not alter prior results', () => {
  const first = analyzeLogic('A', 'B');
  const snapshot = JSON.stringify(first);
  assert.throws(() => { first.rows[0].assignment.A = false; }, TypeError);
  assert.throws(() => { first.left.root.name = 'E'; }, TypeError);
  assert.throws(() => { first.differences.push(9); }, TypeError);
  analyzeLogic('false', 'false');
  assert.throws(() => analyzeLogic('A and'), LogicInputError);
  assert.equal(JSON.stringify(first), snapshot);
});

test('CSV uses the current inputs, full union and every row regardless of any display filter', () => {
  const file = createLogicCsv('A -> B', 'B -> A');
  assert.equal(file.filename, 'recallweave-boolean-truth-table.csv');
  assert.equal(file.mediaType, 'text/csv;charset=utf-8');
  assert.equal(file.text, '"A","B","Expression 1: (A -> B)","Expression 2: (B -> A)","Same result"\r\n"True","True","True","True","Yes"\r\n"True","False","False","True","No"\r\n"False","True","True","False","No"\r\n"False","False","True","True","Yes"\r\n');
  const changed = createLogicCsv('false');
  assert.equal(changed.text, '"Expression 1: false"\r\n"False"\r\n');
  assert.throws(() => createLogicCsv('A', 'B and'), LogicInputError);
});

test('independent receiving columns challenge right grouping, stronger and, and an unused-in-output variable', () => {
  assert.deepEqual(values('A -> B -> C'), [true, false, true, true, true, true, true, true]);
  assert.deepEqual(values('A or B and C'), [true, true, true, true, true, false, false, false]);
  const grouped = analyzeLogic('A -> B -> C', '(A -> B) -> C');
  assert.deepEqual(grouped.differences.map(index => grouped.rows[index].assignment), [{A: false, B: true, C: false}, {A: false, B: false, C: false}]);
  const retained = analyzeLogic('A', 'A or (B and not B)');
  assert.equal(retained.equivalent, true);
  assert.deepEqual(retained.variables, ['A', 'B']);
  assert.equal(retained.rows.length, 4);
  for (const input of ['trueandfalse', 'А', 'Α', 'A -> B.']) assert.throws(() => analyzeLogic(input), LogicInputError);
});
