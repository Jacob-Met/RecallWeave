// The exact lower-bound convention from the existing binary-search course.
// This model classifies sorted integer values; it never sorts or edits input.
const MAX_VALUES = 32;
const MAX_MAGNITUDE = 9999;
const MAX_INPUT_TEXT = 2048;

function refuse(message, field) {
  const error = new Error(message);
  error.field = field;
  throw error;
}

function integer(value, field) {
  if (typeof value !== 'number' || !Number.isInteger(value)
    || Math.abs(value) > MAX_MAGNITUDE) {
    refuse('Use whole integers from −9999 to 9999.', field);
  }
  return value;
}

function enteredInteger(value, field) {
  if (typeof value !== 'string' || value.length > MAX_INPUT_TEXT
    || !/^[+-]?\d+$/.test(value.trim())) {
    refuse('Enter a whole integer, without a decimal point or exponent.', field);
  }
  return integer(Number(value.trim()), field);
}

function checkedValues(values) {
  if (!Array.isArray(values) || values.length > MAX_VALUES) {
    refuse('Use at most 32 values.', 'values');
  }
  const copy = [];
  for (let index = 0; index < values.length; index++) {
    if (!Object.hasOwn(values, index)) refuse('Every array position must contain an integer.', 'values');
    const value = integer(values[index], 'values');
    if (index > 0 && value < copy[index - 1]) {
      refuse(`Values ${index} and ${index + 1} are out of order. Enter a nondecreasing array; equal neighbors are allowed.`, 'values');
    }
    copy.push(value);
  }
  return copy;
}

export function parseBinarySearchInput(arrayText, targetText) {
  if (typeof arrayText !== 'string' || arrayText.length > MAX_INPUT_TEXT) {
    refuse('Enter at most 32 comma-separated integers.', 'values');
  }
  const parts = arrayText.trim() === '' ? [] : arrayText.split(',');
  if (parts.length > MAX_VALUES) refuse('Use at most 32 values.', 'values');
  const values = checkedValues(parts.map(value => enteredInteger(value, 'values')));
  const target = enteredInteger(targetText, 'target');
  return { values, target };
}

export function traceLowerBound(values, target) {
  const copy = checkedValues(values);
  integer(target, 'target');
  const steps = [];
  let lo = 0;
  let hi = copy.length;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    const value = copy[mid];
    const lessThanTarget = value < target;
    const nextLo = lessThanTarget ? mid + 1 : lo;
    const nextHi = lessThanTarget ? hi : mid;
    steps.push(Object.freeze({ lo, hi, mid, value, lessThanTarget, nextLo, nextHi }));
    lo = nextLo;
    hi = nextHi;
  }
  return Object.freeze({
    format: 'recallweave.binary-search-trace/1',
    values: Object.freeze(copy),
    target,
    steps: Object.freeze(steps),
    boundary: lo,
    present: lo < copy.length && copy[lo] === target,
    comparisons: steps.length
  });
}

export const BINARY_SEARCH_PRESETS = Object.freeze([
  Object.freeze({ id: 'missing', label: 'An absent value in the middle', values: '2, 4, 6, 8, 10, 12, 14, 16', target: '7' }),
  Object.freeze({ id: 'duplicates', label: 'Find the first repeated value', values: '1, 5, 5, 5, 9', target: '5' }),
  Object.freeze({ id: 'before', label: 'Before the first element', values: '-5, 0, 8', target: '-9' }),
  Object.freeze({ id: 'after', label: 'After the last element', values: '-2, 0, 6', target: '8' }),
  Object.freeze({ id: 'empty', label: 'An empty array', values: '', target: '7' }),
  Object.freeze({ id: 'single', label: 'One element, equal to the target', values: '4', target: '4' }),
  Object.freeze({ id: 'longer-path', label: 'Same length, one more comparison', values: '2, 4, 6, 8, 10, 12, 14, 16', target: '2' })
]);
