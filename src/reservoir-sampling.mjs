/** Bounded teaching model for Algorithm R. No random generator is used here. */
const integer = (value, min, max, name) => {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new TypeError(name + ' must be an integer from ' + min + ' through ' + max + '.');
  }
  return value;
};
function record(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Supply an input object.');
  }
  return value;
}
function dense(value, length, name) {
  if (!Array.isArray(value) || value.length !== length) {
    throw new TypeError(name + ' must contain exactly ' + length + ' entries.');
  }
  for (let i = 0; i < length; i += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, i)) {
      throw new TypeError(name + ' cannot have missing entries.');
    }
  }
  return value;
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function dimensions(itemCount, capacity) {
  integer(itemCount, 1, 8, 'Item count');
  integer(capacity, 1, Math.min(3, itemCount), 'Capacity');
}
function fraction(numerator, denominator) {
  let a = numerator, b = denominator;
  while (b) [a, b] = [b, a % b];
  return {numerator: numerator / a, denominator: denominator / a};
}

/** A complete deterministic history for explicitly supplied legal integer draws. */
export function traceReservoir(input) {
  const {items: labels, capacity, draws: proposed} = record(input);
  if (!Array.isArray(labels)) throw new TypeError('Items must be an array.');
  dimensions(labels.length, capacity);
  dense(labels, labels.length, 'Items');
  const items = labels.map((label, index) => {
    if (typeof label !== 'string' || !label.trim() || label.length > 48 || /[\r\n]/.test(label)) {
      throw new TypeError('Each label needs 1–48 literal text units, non-whitespace and no line break.');
    }
    return {position: index + 1, label};
  });
  dense(proposed, items.length - capacity, 'Draws');
  const draws = proposed.map((draw, index) => integer(draw, 1, capacity + index + 1, 'Draw ' + (index + 1)));
  // Derivation starts only after the complete proposed input has been admitted.
  let reservoir = Array.from({length: capacity}, (_, index) => index + 1);
  const steps = [{seen: capacity, incoming: null, draw: null, action: 'initial',
    slot: null, removed: null, before: [], after: [...reservoir]}];
  for (let index = capacity; index < items.length; index += 1) {
    const draw = draws[index - capacity], before = [...reservoir];
    const replacement = draw <= capacity;
    const removed = replacement ? reservoir[draw - 1] : null;
    if (replacement) reservoir[draw - 1] = index + 1;
    steps.push({seen: index + 1, incoming: {...items[index]}, draw,
      action: replacement ? 'replace' : 'skip', slot: replacement ? draw : null,
      removed, before, after: [...reservoir]});
  }
  return freeze({schema: 'recallweave-reservoir-trace/1', items, capacity, draws,
    steps, sample: [...reservoir], subset: [...reservoir].sort((a, b) => a - b)});
}

/** Exact finite enumeration under independent uniform draws; no simulated trials. */
export function distributionReservoir(input) {
  const {itemCount, capacity} = record(input);
  dimensions(itemCount, capacity);
  const counts = new Map();
  let histories = 0;
  const visit = (seen, reservoir) => {
    if (seen === itemCount) {
      const key = [...reservoir].sort((a, b) => a - b).join(',');
      counts.set(key, (counts.get(key) ?? 0) + 1);
      histories += 1;
      return;
    }
    const incoming = seen + 1;
    for (let draw = 1; draw <= incoming; draw += 1) {
      const next = [...reservoir];
      if (draw <= capacity) next[draw - 1] = incoming;
      visit(incoming, next);
    }
  };
  visit(capacity, Array.from({length: capacity}, (_, index) => index + 1));
  const subsets = [...counts].map(([key, count]) => ({
    positions: key.split(',').map(Number), count, probability: fraction(count, histories)
  })).sort((a, b) => {
    for (let i = 0; i < capacity; i += 1) {
      if (a.positions[i] !== b.positions[i]) return a.positions[i] - b.positions[i];
    }
    return 0;
  });
  const marginals = Array.from({length: itemCount}, (_, index) => {
    const position = index + 1;
    const count = subsets.reduce((sum, subset) => sum + (subset.positions.includes(position) ? subset.count : 0), 0);
    return {position, count, probability: fraction(count, histories)};
  });
  return freeze({schema: 'recallweave-reservoir-distribution/1', itemCount, capacity,
    assumption: 'independent uniform integer draw1..i at each arrival',
    histories, subsets, marginals, uniformSubsets: subsets.every(s => s.count === subsets[0].count)});
}
