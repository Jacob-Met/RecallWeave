/** Bounded classical propositional logic. Input is parsed as data, never executed. */
export const LOGIC_LIMITS = Object.freeze({characters: 512, tokens: 128, parentheses: 32, operators: 32});

export class LogicInputError extends RangeError {
  constructor(message, position = null, field = null) {
    super(message);
    this.name = 'LogicInputError';
    this.position = position;
    this.field = field;
  }
}

const PRECEDENCE = Object.freeze({'<->': 1, '->': 2, or: 3, xor: 4, and: 5});
const WORDS = new Set(['not', 'and', 'xor', 'or', 'true', 'false']);

function tokenize(source) {
  if (typeof source !== 'string' || source.length > LOGIC_LIMITS.characters) {
    throw new LogicInputError(`Use at most ${LOGIC_LIMITS.characters} characters in each expression.`);
  }
  const tokens = [];
  let position = 0;
  while (position < source.length) {
    const rest = source.slice(position);
    const space = /^\s+/u.exec(rest);
    if (space) { position += space[0].length; continue; }
    const match = /^(<->|->|[()]|[A-Za-z]+)/u.exec(rest);
    if (!match) throw new LogicInputError(`Unexpected character at position ${position + 1}. Use the listed logic operators.`, position);
    const text = match[0];
    const lower = text.toLowerCase();
    let kind = lower;
    let value;
    if (/^[a-e]$/u.test(lower)) { kind = 'variable'; value = lower.toUpperCase(); }
    else if (/^[a-z]+$/u.test(lower) && !WORDS.has(lower)) {
      throw new LogicInputError(`Unknown word at position ${position + 1}. Variables are A to E.`, position);
    }
    tokens.push(Object.freeze({kind, value, position}));
    if (tokens.length > LOGIC_LIMITS.tokens) {
      throw new LogicInputError(`Use at most ${LOGIC_LIMITS.tokens} tokens in each expression.`, position);
    }
    position += text.length;
  }
  tokens.push(Object.freeze({kind: 'end', position: source.length}));
  return tokens;
}

function makeNode(kind, values, children = []) {
  const depth = children.length ? 1 + Math.max(...children.map(child => child.depth)) : 0;
  if (depth > LOGIC_LIMITS.operators) {
    throw new LogicInputError(`Use at most ${LOGIC_LIMITS.operators} nested operators.`);
  }
  return Object.freeze({kind, ...values, depth});
}

function format(node) {
  if (node.kind === 'variable') return node.name;
  if (node.kind === 'literal') return node.value ? 'true' : 'false';
  if (node.kind === 'not') return `(not ${format(node.child)})`;
  return `(${format(node.left)} ${node.kind} ${format(node.right)})`;
}

/** Parse a complete expression, including explicit grouping and bounded immutable syntax. */
export function parseLogicExpression(source) {
  const tokens = tokenize(source);
  let cursor = 0;
  const names = new Set();
  const current = () => tokens[cursor];
  function unary(parentheses) {
    const token = tokens[cursor++];
    if (token.kind === 'not') {
      const child = unary(parentheses);
      return makeNode('not', {child}, [child]);
    }
    if (token.kind === '(') {
      if (parentheses >= LOGIC_LIMITS.parentheses) {
        throw new LogicInputError(`Use at most ${LOGIC_LIMITS.parentheses} nested parentheses.`, token.position);
      }
      const node = binary(1, parentheses + 1);
      if (current().kind !== ')') {
        throw new LogicInputError(`Expected a closing parenthesis at position ${current().position + 1}.`, current().position);
      }
      cursor++;
      return node;
    }
    if (token.kind === 'variable') {
      names.add(token.value);
      return makeNode('variable', {name: token.value});
    }
    if (token.kind === 'true' || token.kind === 'false') return makeNode('literal', {value: token.kind === 'true'});
    throw new LogicInputError(`Expected a variable, true, false, not or an opening parenthesis at position ${token.position + 1}.`, token.position);
  }
  function binary(minimum, parentheses) {
    let left = unary(parentheses);
    while ((PRECEDENCE[current().kind] ?? 0) >= minimum) {
      const operator = tokens[cursor++].kind;
      const right = binary(PRECEDENCE[operator] + (operator === '->' ? 0 : 1), parentheses);
      left = makeNode(operator, {left, right}, [left, right]);
    }
    return left;
  }
  const root = binary(1, 0);
  if (current().kind !== 'end') {
    throw new LogicInputError(`Unexpected token at position ${current().position + 1}. Check the operators and parentheses.`, current().position);
  }
  return Object.freeze({source: source.trim(), canonical: format(root), variables: Object.freeze([...names].sort()), root});
}

function evaluate(node, assignment) {
  if (node.kind === 'variable') return assignment[node.name];
  if (node.kind === 'literal') return node.value;
  if (node.kind === 'not') return !evaluate(node.child, assignment);
  const left = evaluate(node.left, assignment);
  const right = evaluate(node.right, assignment);
  switch (node.kind) {
    case 'and': return left && right;
    case 'or': return left || right;
    case 'xor': return left !== right;
    case '->': return !left || right;
    case '<->': return left === right;
    default: throw new TypeError('Unknown parsed operator.');
  }
}

function parseField(text, field) {
  try { return parseLogicExpression(text); }
  catch (error) {
    if (!(error instanceof LogicInputError)) throw error;
    throw new LogicInputError(`Expression ${field === 'left' ? 1 : 2}: ${error.message}`, error.position, field);
  }
}

const classification = (trueRows, total) => trueRows === total ? 'tautology' : trueRows === 0 ? 'contradiction' : 'contingent';

/** Exhaust every assignment of the union of variables. A blank right side is optional. */
export function analyzeLogic(leftText, rightText = '') {
  const left = parseField(leftText, 'left');
  if (typeof rightText !== 'string') throw new LogicInputError('Expression 2 must be text.', null, 'right');
  if (rightText.length > LOGIC_LIMITS.characters) {
    throw new LogicInputError(`Expression 2: Use at most ${LOGIC_LIMITS.characters} characters in each expression.`, null, 'right');
  }
  const right = rightText.trim() ? parseField(rightText, 'right') : null;
  const variables = Object.freeze([...new Set([...left.variables, ...(right?.variables ?? [])])].sort());
  const rows = [];
  const differences = [];
  let leftTrue = 0;
  let rightTrue = 0;
  const total = 2 ** variables.length;
  for (let index = 0; index < total; index++) {
    const assignment = Object.freeze(Object.fromEntries(variables.map((name, offset) =>
      [name, (index & (1 << (variables.length - offset - 1))) === 0])));
    const leftValue = evaluate(left.root, assignment);
    const rightValue = right ? evaluate(right.root, assignment) : null;
    const equal = right ? leftValue === rightValue : null;
    if (leftValue) leftTrue++;
    if (rightValue) rightTrue++;
    if (equal === false) differences.push(index);
    rows.push(Object.freeze({index, assignment, left: leftValue, right: rightValue, equal}));
  }
  return Object.freeze({
    left, right, variables, rows: Object.freeze(rows), differences: Object.freeze(differences),
    equivalent: right ? differences.length === 0 : null,
    leftSummary: Object.freeze({trueRows: leftTrue, total, classification: classification(leftTrue, total)}),
    rightSummary: right ? Object.freeze({trueRows: rightTrue, total, classification: classification(rightTrue, total)}) : null
  });
}

/** The explicit download is rebuilt from the same current inputs and contains every row. */
export function createLogicCsv(leftText, rightText = '') {
  const table = analyzeLogic(leftText, rightText);
  const columns = [...table.variables, `Expression 1: ${table.left.canonical}`];
  if (table.right) columns.push(`Expression 2: ${table.right.canonical}`, 'Same result');
  const truth = value => value ? 'True' : 'False';
  const cells = [columns, ...table.rows.map(row => {
    const values = [...table.variables.map(name => truth(row.assignment[name])), truth(row.left)];
    if (table.right) values.push(truth(row.right), row.equal ? 'Yes' : 'No');
    return values;
  })];
  const text = cells.map(row => row.map(cell => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\r\n') + '\r\n';
  return Object.freeze({filename: 'recallweave-boolean-truth-table.csv', mediaType: 'text/csv;charset=utf-8', text});
}
