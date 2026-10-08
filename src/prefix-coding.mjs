/** Binary prefix codes for bounded, authored symbol counts. No file compression. */
const MAX_SYMBOLS = 8;
const MAX_COUNT = 10000;
function fail(message) { throw new Error(message); }
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function scalarText(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  const points = Array.from(value);
  return points.length <= 24 && points.every(ch => {
    const n = ch.codePointAt(0);
    return n < 0xd800 || n > 0xdfff;
  });
}
function scalarOrder(a, b) {
  const x = Array.from(a, c => c.codePointAt(0));
  const y = Array.from(b, c => c.codePointAt(0));
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (x[i] !== y[i]) return x[i] - y[i];
  }
  return x.length - y.length;
}
export function validateRows(rows) {
  if (!Array.isArray(rows) || rows.length < 2 || rows.length > MAX_SYMBOLS) {
    fail('Use 2–8 symbols.');
  }
  for (let i = 0; i < rows.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(rows, i)) fail('Every symbol row must be present.');
  }
  const seen = new Set();
  const result = rows.map((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) fail('Symbol row ' + (index + 1) + ' must be an object.');
    if (!scalarText(row.symbol)) fail('Symbol ' + (index + 1) + ' needs 1–24 Unicode characters and some non-whitespace text.');
    if (seen.has(row.symbol)) fail('Each symbol must be distinct. Labels are compared exactly, including spaces.');
    seen.add(row.symbol);
    if (!Number.isInteger(row.count) || row.count < 1 || row.count > MAX_COUNT) {
      fail('Count ' + (index + 1) + ' must be a whole number from 1 to 10,000.');
    }
    return { symbol: row.symbol, count: row.count };
  });
  result.sort((a, b) => scalarOrder(a.symbol, b.symbol));
  return freeze(result);
}
export function buildCode(input) {
  const rows = validateRows(input);
  const nodes = rows.map((row, id) => ({ id, weight: row.count, symbol: row.symbol, left: null, right: null }));
  const order = (a, b) => nodes[a].weight - nodes[b].weight || a - b;
  let queue = nodes.map(node => node.id).sort(order);
  const steps = [];
  let accumulatedCost = 0;
  while (queue.length > 1) {
    const before = queue.slice();
    const left = queue[0], right = queue[1], parent = nodes.length;
    const weight = nodes[left].weight + nodes[right].weight;
    nodes.push({ id: parent, weight, symbol: null, left, right });
    queue = queue.slice(2).concat(parent).sort(order);
    accumulatedCost += weight;
    steps.push({ index: steps.length + 1, before, left, right, parent,
      after: queue.slice(), addedCost: weight, accumulatedCost });
  }
  const root = queue[0], codes = new Map();
  function visit(id, code) {
    const node = nodes[id];
    if (node.symbol !== null) codes.set(node.symbol, code);
    else { visit(node.left, code + '0'); visit(node.right, code + '1'); }
  }
  visit(root, '');
  const codebook = rows.map(row => {
    const code = codes.get(row.symbol);
    return { symbol: row.symbol, count: row.count, code, length: code.length, cost: row.count * code.length };
  });
  const totalCount = rows.reduce((n, row) => n + row.count, 0);
  const payloadBits = codebook.reduce((n, row) => n + row.cost, 0);
  const fixedWidth = Math.ceil(Math.log2(rows.length));
  const fixedPayloadBits = fixedWidth * totalCount;
  return freeze({ rows, nodes, root, steps, codebook, totals: {
    totalCount, payloadBits, fixedWidth, fixedPayloadBits,
    averageBits: payloadBits / totalCount,
    savedPayloadBits: fixedPayloadBits - payloadBits,
    mergeWeightSum: accumulatedCost
  } });
}
export function encodeSymbols(rows, symbols) {
  const model = buildCode(rows);
  if (!Array.isArray(symbols) || symbols.length > 512) fail('Encode at most 512 known symbols.');
  for (let i = 0; i < symbols.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(symbols, i)) fail('Every message symbol must be present.');
  }
  const codes = new Map(model.codebook.map(row => [row.symbol, row.code]));
  let bits = '';
  const segments = symbols.map(symbol => {
    if (typeof symbol !== 'string' || !codes.has(symbol)) fail('The message contains a symbol outside this codebook.');
    const code = codes.get(symbol), start = bits.length;
    bits += code;
    return { symbol, code, start, end: bits.length };
  });
  return freeze({ bits, symbols: symbols.slice(), segments });
}
export function decodeBits(rows, bits) {
  const model = buildCode(rows);
  if (typeof bits !== 'string' || bits.length > 4096 || !/^[01]*$/.test(bits)) {
    fail('Use at most 4,096 bits: only 0 and 1, with no spaces.');
  }
  const symbols = [], segments = [];
  let id = model.root, start = 0;
  for (let i = 0; i < bits.length; i++) {
    id = bits[i] === '0' ? model.nodes[id].left : model.nodes[id].right;
    const node = model.nodes[id];
    if (node.symbol !== null) {
      symbols.push(node.symbol);
      segments.push({ symbol: node.symbol, code: bits.slice(start, i + 1), start, end: i + 1 });
      id = model.root; start = i + 1;
    }
  }
  if (id !== model.root) fail('The stream ends inside a codeword after bit ' + bits.length + '. Add the remaining bits or remove that incomplete codeword.');
  return freeze({ bits, symbols, segments });
}
export function serializeExample(rows, step, bits) {
  const model = buildCode(rows);
  if (!Number.isInteger(step) || step < 0 || step > model.steps.length) fail('Choose an existing merge step.');
  const decoding = decodeBits(rows, bits);
  return JSON.stringify({ format: 'recallweave.prefix-coding/1', model,
    inspection: { step }, decoding }, null, 2) + '\n';
}
