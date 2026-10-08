/**
 * Weighted interval scheduling for the bounded offline teaching page.
 * Times are half-open [start, end); equal endpoints are compatible.
 * This module has no DOM, storage, random, clock or network dependency.
 */
export const LIMITS = Object.freeze({activities: 8, time: 24, value: 99});

export const EXAMPLES = Object.freeze({
  'greedy-trap': Object.freeze([
    Object.freeze({id: 'A', start: 0, end: 3, value: 4}),
    Object.freeze({id: 'B', start: 1, end: 4, value: 5}),
    Object.freeze({id: 'C', start: 3, end: 5, value: 4}),
    Object.freeze({id: 'D', start: 0, end: 6, value: 10}),
    Object.freeze({id: 'E', start: 5, end: 7, value: 4}),
    Object.freeze({id: 'F', start: 6, end: 8, value: 5})
  ]),
  touching: Object.freeze([
    Object.freeze({id: 'A', start: 0, end: 2, value: 3}),
    Object.freeze({id: 'B', start: 2, end: 4, value: 4}),
    Object.freeze({id: 'C', start: 0, end: 4, value: 6})
  ]),
  tie: Object.freeze([
    Object.freeze({id: 'A', start: 0, end: 2, value: 2}),
    Object.freeze({id: 'B', start: 2, end: 4, value: 2}),
    Object.freeze({id: 'C', start: 0, end: 4, value: 4})
  ]),
  empty: Object.freeze([])
});

function integer(value, maximum, label) {
  if (!Number.isInteger(value) || value < 0 || value > maximum) {
    throw new RangeError(label + ' must be a whole number from 0 to ' + maximum + '.');
  }
  return value;
}

/** Copy admitted fields so sorting and returning a result cannot change the input. */
function admit(activities) {
  if (!Array.isArray(activities) || activities.length > LIMITS.activities) {
    throw new RangeError('Use an array of zero to eight activities.');
  }
  const ids = new Set();
  return activities.map((activity, index) => {
    if (!activity || typeof activity !== 'object' || Array.isArray(activity)) {
      throw new TypeError('Activity ' + (index + 1) + ' must be an object.');
    }
    const {id, start, end, value} = activity;
    if (typeof id !== 'string' || !/^[A-Z][A-Z0-9_-]{0,7}$/.test(id)) {
      throw new RangeError('Activity IDs need 1–8 characters: an uppercase letter, then uppercase letters, digits, _ or -.');
    }
    if (ids.has(id)) throw new RangeError('Activity IDs must be unique.');
    ids.add(id);
    integer(start, LIMITS.time, id + ' start');
    integer(end, LIMITS.time, id + ' end');
    integer(value, LIMITS.value, id + ' value');
    if (start >= end) throw new RangeError(id + ' must end after it starts.');
    return {id, start, end, value};
  });
}

function compare(a, b) {
  return a.end - b.end || a.start - b.start || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * Last compatible earlier row, numbered 1..j-1; 0 is the empty prefix.
 * Search only earlier finish-sorted activities. Upper bound includes equal ends.
 */
function predecessor(ordered, index) {
  let low = 0;
  let high = index;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (ordered[middle].end <= ordered[index].start) low = middle + 1;
    else high = middle;
  }
  return low;
}

function reconstruct(rows) {
  const selectedIds = [];
  const backtrack = [];
  for (let j = rows.length - 1; j > 0;) {
    const row = rows[j];
    const next = row.choice === 'take' ? row.p : j - 1;
    backtrack.push({j, id: row.id, choice: row.choice, next});
    if (row.choice === 'take') selectedIds.push(row.id);
    j = next;
  }
  selectedIds.reverse();
  return {selectedIds, backtrack};
}

/**
 * Solve one finite, single-resource teaching instance.
 *
 * Equal take/skip values skip the current row. With the declared sort order,
 * this selects one deterministic optimum; it does not assert uniqueness.
 * The earliest-finish comparison is a separate heuristic for total value.
 */
export function solveSchedule(activities) {
  const ordered = admit(activities).sort(compare);
  const rows = [{j: 0, id: null, p: 0, take: 0, skip: 0, best: 0, choice: 'base'}];
  for (let index = 0; index < ordered.length; index++) {
    const activity = ordered[index];
    const j = index + 1;
    const p = predecessor(ordered, index);
    const take = activity.value + rows[p].best;
    const skip = rows[j - 1].best;
    rows.push({j, id: activity.id, p, take, skip, best: Math.max(take, skip),
      choice: take > skip ? 'take' : 'skip'});
  }
  const {selectedIds, backtrack} = reconstruct(rows);
  const greedy = {selectedIds: [], value: 0};
  let lastEnd = 0;
  for (const activity of ordered) {
    if (activity.start >= lastEnd) {
      greedy.selectedIds.push(activity.id);
      greedy.value += activity.value;
      lastEnd = activity.end;
    }
  }
  return {ordered, rows, bestValue: rows.at(-1).best, selectedIds, backtrack, greedy};
}
