/** Fixed synthetic examples for the original Bloom-filter lesson, not a production filter. */
export const BLOOM_KEYS = Object.freeze([
  ['A', [1, 4]], ['B', [4, 6]], ['C', [4, 4]], ['D', [4, 1]],
  ['X', [1, 6]], ['Y', [3, 6]], ['Z', [2, 2]],
].map(([key, positions]) => Object.freeze({key, positions: Object.freeze(positions)})));

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function keyRecord(key) {
  const found = BLOOM_KEYS.find(record => record.key === key);
  if (!found) throw new RangeError('Choose one of the declared toy keys.');
  return found;
}

function bitMask(value) {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new RangeError('The eight-bit mask must be an integer from 0 to 255.');
  }
  return value === 0 ? 0 : value;
}

function members(value) {
  if (!Array.isArray(value) || value.length > 128) throw new TypeError('Use a bounded list of toy keys.');
  for (const key of value) keyRecord(key);
  const present = new Set(value);
  return BLOOM_KEYS.filter(record => present.has(record.key)).map(record => record.key);
}

function positionsMask(positions) {
  return positions.reduce((mask, position) => mask | (1 << position), 0);
}

export function makeBloomState(keys) {
  const exact = members(keys);
  const mask = exact.reduce((value, key) => value | positionsMask(keyRecord(key).positions), 0);
  return freeze({members: exact, mask});
}

export function bloomBits(mask) {
  const checked = bitMask(mask);
  return Object.freeze(Array.from({length: 8}, (_, position) => (checked >>> position) & 1));
}

/** The separate exact set is retained only so the teaching example can label errors. */
export function queryBloom(mask, exactMembers, key) {
  const checked = bitMask(mask), exact = members(exactMembers), record = keyRecord(key);
  const probes = record.positions.map(position => ({position, bit: (checked >>> position) & 1}));
  const maybe = probes.every(probe => probe.bit === 1), present = exact.includes(key);
  return freeze({key, probes, maybe, present,
    classification: maybe ? (present ? 'true-positive' : 'false-positive') :
      (present ? 'false-negative' : 'true-negative')});
}

/** Exhaustive ordered pairs with replacement, conditional on this fixed state. */
export function fixedBloomExperiment(mask) {
  const checked = bitMask(mask), bits = bloomBits(checked), pairs = [];
  for (let first = 0; first < 8; first++) {
    for (let second = 0; second < 8; second++) {
      pairs.push({first, second, accepted: bits[first] === 1 && bits[second] === 1});
    }
  }
  return freeze({mask: checked, setBits: bits.reduce((a, b) => a + b, 0),
    accepted: pairs.filter(pair => pair.accepted).length, total: pairs.length, pairs});
}

/** A preview on a copy: contrast an unsafe clear with rebuilding from remaining members. */
export function previewBloomDeletion(keys, removedKey) {
  const before = makeBloomState(keys), removed = keyRecord(removedKey);
  if (!before.members.includes(removedKey)) throw new RangeError('Preview removal of an inserted key.');
  const remaining = before.members.filter(key => key !== removedKey);
  const unsafeMask = before.mask & ~positionsMask(removed.positions);
  const rebuilt = makeBloomState(remaining);
  const missed = remaining.filter(key => !queryBloom(unsafeMask, remaining, key).maybe);
  return freeze({before, removed: removedKey, remaining, unsafeMask, rebuilt, missed});
}

/** A separate m=2, k=2, n=1 experiment: four independent uniform binary draws. */
export function randomTwoBitExperiment() {
  const rows = [];
  for (let first = 0; first < 2; first++) {
    for (let second = 0; second < 2; second++) {
      const mask = (1 << first) | (1 << second), queryPairs = [];
      for (let a = 0; a < 2; a++) {
        for (let b = 0; b < 2; b++) {
          queryPairs.push({first: a, second: b, accepted: Boolean(mask & (1 << a)) && Boolean(mask & (1 << b))});
        }
      }
      rows.push({insertion: [first, second], setBits: Number(Boolean(mask & 1)) + Number(Boolean(mask & 2)),
        accepted: queryPairs.filter(pair => pair.accepted).length, total: 4, queryPairs});
    }
  }
  return freeze({rows, accepted: rows.reduce((sum, row) => sum + row.accepted, 0), total: 16,
    meanSetFraction: rows.reduce((sum, row) => sum + row.setBits / 2, 0) / 4});
}
