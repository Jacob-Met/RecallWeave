/** Exact finite secretary-threshold teaching model. Larger ranks are better. */
export const MODEL = 'secretary-threshold-distinct-uniform/1';
export const FORMAT = 'recallweave-optimal-stopping-observation/1';
function integer(value, name, low, high) {
  if (typeof value !== 'number' || !Number.isInteger(value) || Object.is(value, -0) || value < low || value > high) {
    throw new Error(name + ' must be an integer from ' + low + ' to ' + high + '.');
  }
}
function factorial(n) { let value = 1; for (let k = 2; k <= n; k++) value *= k; return value; }
function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a; }
export function thresholdTable(n) {
  integer(n, 'n', 1, 8);
  const total = factorial(n), previous = factorial(n - 1), thresholds = [];
  for (let skip = 0; skip < n; skip++) {
    let wins = skip === 0 ? previous : 0;
    for (let k = skip; skip > 0 && k < n; k++) wins += skip * (previous / k);
    const divisor = gcd(wins, total);
    thresholds.push({skip, wins, total, fraction: {numerator: wins / divisor, denominator: total / divisor}, probability: wins / total});
  }
  const maximum = Math.max(...thresholds.map(row => row.wins));
  return {totalPermutations: total, thresholds, bestSkips: thresholds.filter(row => row.wins === maximum).map(row => row.skip)};
}
export function analyzeOrder(n, skip, order) {
  integer(n, 'n', 1, 8); integer(skip, 'skip', 0, n - 1);
  if (!Array.isArray(order) || Object.getPrototypeOf(order) !== Array.prototype || order.length !== n) throw new Error('order must be an ordinary array containing each rank 1..n once.');
  const ranks = [];
  for (let i = 0; i < n; i++) {
    if (!Object.hasOwn(order, i)) throw new Error('order cannot contain missing entries.');
    integer(order[i], 'rank', 1, n); ranks.push(order[i]);
  }
  if (new Set(ranks).size !== n) throw new Error('order must contain each rank 1..n exactly once.');
  let best = null, selected = null;
  const trace = ranks.map((rank, offset) => {
    const index = offset + 1;
    if (selected) return {index, rank, observed: false, bestSeenBefore: null, isRecord: null, action: 'not-observed'};
    const bestSeenBefore = best, isRecord = best === null || rank > best;
    let action;
    if (offset < skip) action = 'observe';
    else if (isRecord) action = 'select-record';
    else if (index === n) action = 'select-last';
    else action = 'reject';
    best = best === null ? rank : Math.max(best, rank);
    if (action.startsWith('select-')) selected = {index, rank, action};
    return {index, rank, observed: true, bestSeenBefore, isRecord, action};
  });
  return {format: FORMAT, model: MODEL, inputs: {n, skip, order: ranks}, trace, selected, success: selected.rank === n, uniform: thresholdTable(n),
    assumptions: [
      'n is known and the n ranks are distinct; larger rank is better.',
      'The theoretical table assigns equal weight to all n! arrival orders.',
      'The rule compares only observed relative ranks; rejected arrivals cannot be recalled.',
      'The last arrival is selected if no earlier post-skip record was selected.',
      'The authored order is one example, not a random sample or empirical observation.',
      'Best skip counts compare only these rules under this model, not real-world decisions.'
    ]};
}
