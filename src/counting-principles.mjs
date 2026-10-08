/** Exact bounded counting and lexicographic outcomes; no browser dependencies. */
export const COUNTING_FORMAT = 'recallweave-counting-page/1';
export const PAGE_SIZE = 24;
export const MODELS = Object.freeze([
  Object.freeze({ id: 'ordered-reuse', ordered: true, reuse: true, label: 'Order matters · reuse allowed' }),
  Object.freeze({ id: 'ordered-distinct', ordered: true, reuse: false, label: 'Order matters · no reuse' }),
  Object.freeze({ id: 'unordered-distinct', ordered: false, reuse: false, label: 'Order ignored · no reuse' }),
  Object.freeze({ id: 'unordered-reuse', ordered: false, reuse: true, label: 'Order ignored · reuse allowed' })
]);
const LABELS = Object.freeze('ABCDEFGH'.split(''));

function modelFor(id) {
  const model = MODELS.find(item => item.id === id);
  if (!model) throw new RangeError('Choose one of the four counting models.');
  return model;
}
function checkedInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Counting input must be an object.');
  if (!Number.isInteger(input.n) || input.n < 0 || input.n > 8) throw new RangeError('Use 0–8 label types.');
  if (!Number.isInteger(input.k) || input.k < 0 || input.k > 6) throw new RangeError('Select 0–6 items.');
  modelFor(input.model);
  return Object.freeze({ n: input.n, k: input.k, model: input.model });
}
function wholeText(value, max, label) {
  if (typeof value !== 'string' || value.length > 16 || !/^\s*[0-9]+\s*$/.test(value)) {
    throw new RangeError(`${label} must be a whole decimal number from 0 to ${max}.`);
  }
  const number = Number(value.trim());
  if (!Number.isInteger(number) || number < 0 || number > max) {
    throw new RangeError(`${label} must be a whole decimal number from 0 to ${max}.`);
  }
  return number;
}
export function parseCountingInput(nText, kText, model) {
  return checkedInput({ n: wholeText(nText, 8, 'Label types'), k: wholeText(kText, 6, 'Items selected'), model });
}
function choose(n, k) {
  if (n < 0 || k < 0 || k > n) return 0n;
  k = Math.min(k, n - k);
  let total = 1n;
  for (let i = 1; i <= k; i++) total = total * BigInt(n - k + i) / BigInt(i);
  return total;
}
function falling(n, k) {
  if (k > n) return 0n;
  let total = 1n;
  for (let i = 0; i < k; i++) total *= BigInt(n - i);
  return total;
}
function factorial(k) { return falling(k, k); }
function rawCount(n, k, model) {
  if (k === 0) return 1n;
  if (n === 0 || (!model.reuse && k > n)) return 0n;
  if (model.ordered) return model.reuse ? BigInt(n) ** BigInt(k) : falling(n, k);
  return model.reuse ? choose(n + k - 1, k) : choose(n, k);
}
export function countOutcomes(input) {
  const checked = checkedInput(input);
  return rawCount(checked.n, checked.k, modelFor(checked.model));
}
function formula(input, model, total) {
  const { n, k } = input;
  if (k === 0) return Object.freeze({ rule: 'One empty outcome', calculation: 'Select 0 items → 1 outcome', reason: 'Nothing needs to be filled or chosen. This includes selecting zero items from zero types.' });
  if (n === 0) return Object.freeze({ rule: 'No available label', calculation: `Select ${k} items from 0 types → 0 outcomes`, reason: 'At least one item is required, but no label is available.' });
  if (!model.reuse && k > n) return Object.freeze({ rule: 'Too few distinct labels', calculation: `${k} items > ${n} available types → 0 outcomes`, reason: 'Without reuse, each type can appear at most once.' });
  if (model.ordered && model.reuse) return Object.freeze({ rule: 'n^k', calculation: Array(k).fill(String(n)).join(' × ') + ' = ' + total, reason: 'Each labeled position has the same choices, including labels used earlier.' });
  if (model.ordered) return Object.freeze({ rule: 'P(n, k) = n! / (n − k)!', calculation: Array.from({ length: k }, (_, i) => String(n - i)).join(' × ') + ' = ' + total, reason: 'Each new position has one fewer available label. Swapping distinct positions changes the outcome.' });
  if (!model.reuse) return Object.freeze({ rule: 'C(n, k) = n! / (k! (n − k)!)', calculation: falling(n, k) + ' ÷ ' + factorial(k) + ' = ' + total, reason: 'Each unordered selection of distinct labels has exactly k! ordered representations.' });
  return Object.freeze({ rule: 'C(n + k − 1, k)', calculation: `C(${n + k - 1}, ${k}) = ${total}`, reason: `${k} item marks and ${n - 1} dividers encode the counts of the ${n} label types. A type may have count zero.` });
}
function outcome(input, model, index) {
  let remainingIndex = index;
  const picked = [];
  let minimum = 0;
  for (let position = 0; position < input.k; position++) {
    const remaining = input.k - position - 1;
    let found = false;
    for (let label = model.ordered ? 0 : minimum; label < input.n; label++) {
      if (!model.reuse && picked.includes(label)) continue;
      let block;
      if (model.ordered) block = model.reuse ? BigInt(input.n) ** BigInt(remaining) : falling(input.n - position - 1, remaining);
      else block = model.reuse ? choose(input.n - label + remaining - 1, remaining) : choose(input.n - label - 1, remaining);
      if (remainingIndex >= block) { remainingIndex -= block; continue; }
      picked.push(label);
      minimum = label + (model.reuse ? 0 : 1);
      found = true;
      break;
    }
    if (!found) throw new Error('Outcome index could not be resolved.');
  }
  if (remainingIndex !== 0n) throw new Error('Outcome index was not fully resolved.');
  const counts = Array(input.n).fill(0);
  for (const label of picked) counts[label]++;
  let representations = 1n;
  if (!model.ordered) {
    representations = factorial(input.k);
    for (const count of counts) representations /= factorial(count);
  }
  return Object.freeze({
    ordinal: (index + 1n).toString(),
    labels: Object.freeze(picked.map(label => LABELS[label])),
    typeCounts: Object.freeze(counts),
    orderedRepresentations: representations.toString()
  });
}
export function outcomeAt(input, index) {
  const checked = checkedInput(input);
  const model = modelFor(checked.model);
  const total = rawCount(checked.n, checked.k, model);
  if (typeof index !== 'bigint' || index < 0n || index >= total) throw new RangeError('Outcome index is outside this model.');
  return outcome(checked, model, index);
}
export function countingPage(input, pageIndex = 0n) {
  const checked = checkedInput(input);
  const model = modelFor(checked.model);
  const total = rawCount(checked.n, checked.k, model);
  const pageCount = total === 0n ? 1n : (total + BigInt(PAGE_SIZE) - 1n) / BigInt(PAGE_SIZE);
  if (typeof pageIndex !== 'bigint' || pageIndex < 0n || pageIndex >= pageCount) throw new RangeError('Page is outside this model.');
  const start = pageIndex * BigInt(PAGE_SIZE);
  const end = start + BigInt(PAGE_SIZE) < total ? start + BigInt(PAGE_SIZE) : total;
  const rows = [];
  for (let index = start; index < end; index++) rows.push(outcome(checked, model, index));
  return Object.freeze({
    format: COUNTING_FORMAT,
    input: checked,
    model: model.label,
    ordered: model.ordered,
    reuse: model.reuse,
    availableLabels: Object.freeze(LABELS.slice(0, checked.n)),
    total: total.toString(),
    formula: formula(checked, model, total.toString()),
    emptySelection: checked.k === 0,
    impossible: total === 0n,
    comparison: Object.freeze(MODELS.map(other => Object.freeze({ id: other.id, label: other.label, total: rawCount(checked.n, checked.k, other).toString() }))),
    page: (pageIndex + 1n).toString(),
    pageCount: pageCount.toString(),
    pageSize: PAGE_SIZE,
    firstOrdinal: rows.length ? rows[0].ordinal : null,
    lastOrdinal: rows.length ? rows[rows.length - 1].ordinal : null,
    rows: Object.freeze(rows),
    exportScope: 'This page only. Other pages are generated from the same input and model.',
    ordering: 'Lexicographic by A–H; unordered selections use sorted labels, keeping every repeated label.',
    probabilityNote: 'Counting outcomes does not make them equally likely. For n > 0, under uniform independent draws with reuse, an unordered multiset has probability equal to its ordered representations divided by n^k.'
  });
}
