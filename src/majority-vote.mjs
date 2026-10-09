/** Boyer–Moore cancellation followed by an explicit strict-majority count.
 * Labels use literal JavaScript string equality. This teaching trace retains O(n) snapshots.
 */
function admit(values) {
  if (!Array.isArray(values)) throw new TypeError('Values must be an array.');
  if (values.length > 40) throw new RangeError('Use at most 40 values.');
  const copy = [];
  for (let i = 0; i < values.length; i++) {
    if (!Object.hasOwn(values, i)) throw new TypeError('The sequence must not contain missing entries.');
    const value = values[i];
    if (typeof value !== 'string') throw new TypeError('Every value must be a literal string.');
    if (!value.length || value.length > 48 || !value.trim() || /[\r\n]/u.test(value)) {
      throw new RangeError('Each value must contain 1–48 UTF-16 units, some non-whitespace text, and no line break.');
    }
    copy.push(value);
  }
  return copy;
}

function freeze(value) {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
}

export function parseMajorityLines(text) {
  if (typeof text !== 'string') throw new TypeError('The input must be text.');
  if (text.length > 4096) throw new RangeError('Use at most 4096 UTF-16 units of input.');
  return Object.freeze(admit(text === '' ? [] : text.split(/\r\n|\r|\n/u)));
}

export function traceMajority(values) {
  const labels = admit(values);
  let candidate = null;
  let balance = 0;
  const cancellation = [{ position: 0, candidate, balance, action: 'initial', lastValue: null }];
  for (let i = 0; i < labels.length; i++) {
    const value = labels[i];
    let action;
    if (balance === 0) {
      candidate = value;
      balance = 1;
      action = 'choose';
    } else if (value === candidate) {
      balance++;
      action = 'increment';
    } else {
      balance--;
      action = 'decrement';
    }
    cancellation.push({ position: i + 1, candidate, balance, action, lastValue: value });
  }
  let matches = 0;
  const verification = [{ position: 0, matches, lastValue: null, matched: null }];
  for (let i = 0; i < labels.length; i++) {
    const matched = labels[i] === candidate;
    if (matched) matches++;
    verification.push({ position: i + 1, matches, lastValue: labels[i], matched });
  }
  const hasMajority = labels.length > 0 && matches > labels.length / 2;
  return freeze({
    schema: 'recallweave-majority-vote/1',
    values: labels, cancellation, candidate, balance, verification,
    candidateCount: matches,
    threshold: Math.floor(labels.length / 2) + 1,
    hasMajority,
    majority: hasMajority ? candidate : null
  });
}
