/** Exact finite-permutation teaching model. No sampling or hash approximation. */
export function validateLabels(value, name = 'Set') {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20)
    throw new Error(name + ' must be a JSON array of 1–20 labels.');
  return Array.from(value, (label, i) => {
    if (typeof label !== 'string' || !label.trim() || [...label].length > 40 ||
        /[\u0000-\u001f\u007f]/u.test(label))
      throw new Error(name + ' label ' + (i + 1) + ' must be nonblank text of at most 40 Unicode characters, without control characters.');
    for (let j = 0; j < label.length; j++) {
      const c = label.charCodeAt(j);
      if (c >= 0xd800 && c <= 0xdbff) {
        const next = label.charCodeAt(++j);
        if (!(next >= 0xdc00 && next <= 0xdfff)) throw new Error(name + ' contains an unpaired Unicode surrogate.');
      } else if (c >= 0xdc00 && c <= 0xdfff) throw new Error(name + ' contains an unpaired Unicode surrogate.');
    }
    return label;
  });
}

export function parseSetText(text, name = 'Set') {
  if (typeof text !== 'string' || text.length > 4096)
    throw new Error(name + ' input must be text of at most 4096 characters.');
  let value;
  try { value = JSON.parse(text); } catch { throw new Error(name + ' must be valid JSON: for example ["a", "b"].'); }
  return validateLabels(value, name);
}

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

function permutationsOf(labels) {
  if (labels.length === 0) return [[]];
  return labels.flatMap((label, i) =>
    permutationsOf(labels.filter((_, j) => j !== i)).map(tail => [label, ...tail]));
}

export function analyzeMinHash(inputA, inputB) {
  const a = validateLabels(inputA, 'Set A'), b = validateLabels(inputB, 'Set B');
  const setA = [...new Set(a)], setB = [...new Set(b)];
  const union = [...new Set([...setA, ...setB])];
  if (union.length > 5) throw new Error('The two sets may contain at most five distinct labels together.');
  const aMembership = new Set(setA), bMembership = new Set(setB);
  const intersection = union.filter(label => aMembership.has(label) && bMembership.has(label));
  const rows = permutationsOf(union).map((order, i) => {
    const rankA = order.findIndex(label => aMembership.has(label)) + 1;
    const rankB = order.findIndex(label => bMembership.has(label)) + 1;
    const minA = order[rankA - 1], minB = order[rankB - 1];
    return { index: i + 1, order, minA, minB, rankA, rankB, first: order[0], collision: minA === minB };
  });
  const byFirst = union.map(label => {
    const group = rows.filter(row => row.first === label);
    return { label, inA: aMembership.has(label), inB: bMembership.has(label),
      permutations: group.length, collisions: group.filter(row => row.collision).length };
  });
  let n = intersection.length, d = union.length;
  while (d) [n, d] = [d, n % d];
  return freezeDeep({ format: 'recallweave.minhash-analysis/1',
    inputA: a, inputB: b, setA, setB, union, intersection, rows,
    permutations: rows.length, collisions: rows.filter(row => row.collision).length,
    fraction: { numerator: intersection.length / n, denominator: union.length / n }, byFirst });
}
