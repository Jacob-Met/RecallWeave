/** Original bounded edit-distance teaching model. Inputs are Unicode scalars, not graphemes.
 * Positive uniform operation costs; no transposition, normalization or case folding.
 * This is an exact alignment model for the supplied symbols, not a semantic-similarity model.
 */
export const MAX_EDIT_SYMBOLS = 16;
const editRuns = new WeakSet();
function freezeEdit(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeEdit);
    Object.freeze(value);
  }
  return value;
}
function editSymbols(value, name) {
  if (typeof value !== 'string') throw new TypeError(name + ' must be text.');
  const symbols = Array.from(value);
  if (symbols.length > MAX_EDIT_SYMBOLS) throw new RangeError(name + ' needs at most 16 Unicode scalar values.');
  if (symbols.some(symbol => { const point = symbol.codePointAt(0); return point >= 0xd800 && point <= 0xdfff; })) {
    throw new TypeError(name + ' contains an unpaired UTF-16 surrogate.');
  }
  if (/[\u0000-\u001f\u007f]/u.test(value)) throw new TypeError(name + ' cannot contain C0 or DEL control characters.');
  return symbols;
}
export function validateEditExperiment(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Use an experiment object.');
  editSymbols(value.source, 'Source');
  editSymbols(value.target, 'Target');
  if (!value.costs || typeof value.costs !== 'object' || Array.isArray(value.costs)) throw new TypeError('Supply all three costs.');
  const costs = {};
  for (const kind of ['insert', 'delete', 'substitute']) {
    const cost = value.costs[kind];
    if (!Number.isInteger(cost) || cost < 1 || cost > 9) throw new RangeError(kind + ' cost must be an integer from 1 to 9.');
    costs[kind] = cost;
  }
  return freezeEdit({source: value.source, target: value.target, costs});
}
function requireEditRun(run) {
  if (!run || !editRuns.has(run)) throw new TypeError('Compute an experiment before inspecting or exporting it.');
}

/** Build every prefix state; candidate order is the declared deterministic tie rule. */
export function calculateEditDistance(value) {
  const input = validateEditExperiment(value);
  const source = Array.from(input.source), target = Array.from(input.target);
  const cells = [];
  for (let i = 0; i <= source.length; i++) {
    const row = [];
    cells.push(row);
    for (let j = 0; j <= target.length; j++) {
      const candidates = [];
      const add = (kind, fromI, fromJ, operationCost) => {
        const previous = cells[fromI][fromJ].cost;
        candidates.push({kind, from: [fromI, fromJ], previous, operationCost, cost: previous + operationCost});
      };
      if (i && j) add(source[i - 1] === target[j - 1] ? 'match' : 'substitute', i - 1, j - 1,
        source[i - 1] === target[j - 1] ? 0 : input.costs.substitute);
      if (i) add('delete', i - 1, j, input.costs.delete);
      if (j) add('insert', i, j - 1, input.costs.insert);
      const cost = candidates.length ? Math.min(...candidates.map(candidate => candidate.cost)) : 0;
      candidates.forEach(candidate => { candidate.optimal = candidate.cost === cost; });
      row.push({i, j, cost, candidates, chosen: candidates.find(candidate => candidate.optimal)?.kind ?? null});
    }
  }
  let i = source.length, j = target.length;
  const alignment = [];
  while (i || j) {
    const cell = cells[i][j], chosen = cell.candidates.find(candidate => candidate.optimal);
    const consumes = chosen.kind !== 'insert', emits = chosen.kind !== 'delete';
    alignment.push({
      kind: chosen.kind, from: chosen.from, to: [i, j],
      sourceIndex: consumes ? i - 1 : null, targetIndex: emits ? j - 1 : null,
      source: consumes ? source[i - 1] : null, target: emits ? target[j - 1] : null,
      cost: chosen.operationCost
    });
    [i, j] = chosen.from;
  }
  alignment.reverse();
  let used = 0, output = '', cost = 0;
  const replay = [{step: 0, sourceUsed: 0, targetPrefix: '', remainingSource: input.source, text: input.source, cost: 0}];
  for (const operation of alignment) {
    if (operation.source !== null) used++;
    if (operation.target !== null) output += operation.target;
    cost += operation.cost;
    const remainingSource = source.slice(used).join('');
    replay.push({step: replay.length, sourceUsed: used, targetPrefix: output, remainingSource, text: output + remainingSource, cost});
  }
  const run = freezeEdit({
    input, sourceSymbols: source, targetSymbols: target, cells,
    distance: cells[source.length][target.length].cost, alignment, replay,
    tieRule: 'Backtrack with diagonal (match or substitution), then deletion, then insertion; this selects one optimal alignment.'
  });
  editRuns.add(run);
  return run;
}
export function editCell(run, i, j) {
  requireEditRun(run);
  if (!Number.isInteger(i) || !Number.isInteger(j) || i < 0 || j < 0 ||
      i > run.sourceSymbols.length || j > run.targetSymbols.length) throw new RangeError('Choose a valid prefix row and column.');
  return run.cells[i][j];
}
export function serializeEditExperiment(run) {
  requireEditRun(run);
  return JSON.stringify({
    format: 'recallweave-edit-distance-experiment/1',
    policy: 'Exact Unicode scalar identity; no normalization, case folding, trimming or transposition. Positive uniform integer operation costs.',
    ...run,
    note: 'An explicit record of this teaching experiment. It neither saves nor restores a RecallWeave learner session.'
  }, null, 2) + '\n';
}
export const EDIT_PRESETS = freezeEdit([
  {name: 'A leading insertion', source: 'tack', target: 'stack', costs: {insert: 1, delete: 1, substitute: 1}},
  {name: 'Two best alignments', source: 'aa', target: 'a', costs: {insert: 1, delete: 1, substitute: 1}},
  {name: 'Cheaper to delete and insert', source: 'a', target: 'b', costs: {insert: 1, delete: 1, substitute: 4}},
  {name: 'Empty is a real prefix', source: '', target: 'cat', costs: {insert: 2, delete: 3, substitute: 1}},
  {name: 'A swap is not one edit', source: 'ab', target: 'ba', costs: {insert: 1, delete: 1, substitute: 1}},
  {name: 'Scalars are not graphemes', source: 'é', target: 'e\u0301', costs: {insert: 1, delete: 1, substitute: 1}}
]);
