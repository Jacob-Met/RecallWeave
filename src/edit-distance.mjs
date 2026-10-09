/** Unit-cost Levenshtein distance over Unicode code points; no normalization. */
export const MAX_SEQUENCE_LENGTH = 24;

function tokens(value, name) {
  if (typeof value !== 'string') throw new TypeError(name + ' must be text.');
  const result = Array.from(value);
  if (result.some(token => token.length === 1 && token.charCodeAt(0) >= 0xd800 && token.charCodeAt(0) <= 0xdfff)) {
    throw new RangeError(name + ' contains an unpaired Unicode surrogate.');
  }
  if (result.length > MAX_SEQUENCE_LENGTH) {
    throw new RangeError(name + ' has ' + result.length + ' code points; use at most ' + MAX_SEQUENCE_LENGTH + '.');
  }
  return result;
}

/** Each event fills one interior cell. Step zero consists of the boundary cells. */
export function computeDistanceTrace(source, target) {
  const a = tokens(source, 'Source'), b = tokens(target, 'Target');
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  const steps = [];
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const same = a[i - 1] === b[j - 1];
      const candidates = [
        { operation: same ? 'match' : 'substitute', from: [i - 1, j - 1], previous: matrix[i - 1][j - 1], cost: same ? 0 : 1 },
        { operation: 'delete', from: [i - 1, j], previous: matrix[i - 1][j], cost: 1 },
        { operation: 'insert', from: [i, j - 1], previous: matrix[i][j - 1], cost: 1 }
      ].map(candidate => ({ ...candidate, total: candidate.previous + candidate.cost }));
      const value = Math.min(...candidates.map(candidate => candidate.total));
      matrix[i][j] = value;
      steps.push({ i, j, value, candidates, chosen: candidates.find(candidate => candidate.total === value).operation });
    }
  }
  let i = a.length, j = b.length;
  const alignment = [];
  while (i > 0 || j > 0) {
    let operation, cost, sourceToken = null, targetToken = null;
    const end = [i, j];
    // One deterministic optimum: diagonal, then deletion, then insertion.
    if (i > 0 && j > 0 && matrix[i][j] === matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      sourceToken = a[--i]; targetToken = b[--j];
      cost = sourceToken === targetToken ? 0 : 1;
      operation = cost ? 'substitute' : 'match';
    } else if (i > 0 && matrix[i][j] === matrix[i - 1][j] + 1) {
      sourceToken = a[--i]; operation = 'delete'; cost = 1;
    } else {
      targetToken = b[--j]; operation = 'insert'; cost = 1;
    }
    alignment.push({ operation, sourceToken, targetToken, cost, from: [i, j], to: end });
  }
  alignment.reverse();
  return {
    format: 'recallweave-edit-distance/1',
    source, target, sourceTokens: a, targetTokens: b,
    conventions: {
      unit: 'Unicode code point', normalization: 'none', caseSensitive: true,
      costs: { match: 0, insert: 1, delete: 1, substitute: 1 },
      transposition: 'not an operation',
      tieBreak: ['diagonal', 'delete', 'insert'],
      inputLimit: MAX_SEQUENCE_LENGTH
    },
    matrix, steps, alignment, distance: matrix[a.length][b.length]
  };
}

export function serializeTrace(trace, inspectedStep = trace.steps.length) {
  if (!Number.isInteger(inspectedStep) || inspectedStep < 0 || inspectedStep > trace.steps.length) {
    throw new RangeError('Inspected step must be an available trace step.');
  }
  return JSON.stringify({ ...trace, inspectedStep, exportScope: 'complete trace, including steps after the inspected step' }, null, 2) + '\n';
}
