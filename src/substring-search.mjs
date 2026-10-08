// Literal code-point substring search with complete teaching traces.
// Counts are token equality tests in these declared variants, not timings.
export const INPUT_LIMITS = Object.freeze({ text: 64, pattern: 16 });
export const TRACE_FORMAT = 'recallweave.substring-search/1';

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function tokens(value, name, limit) {
  if (typeof value !== 'string') throw new TypeError(name + ' must be text.');
  const result = Array.from(value);
  if (result.some(token => token.codePointAt(0) >= 0xD800 && token.codePointAt(0) <= 0xDFFF)) {
    throw new RangeError(name + ' contains an unpaired Unicode surrogate.');
  }
  if (result.length > limit) throw new RangeError(name + ' may contain at most ' + limit + ' Unicode code points.');
  return result;
}

function comparison(leftSequence, leftIndex, left, rightIndex, right) {
  // This is the one algorithm equality evaluation counted by a compare event.
  return {
    left: { sequence: leftSequence, index: leftIndex, token: left },
    right: { sequence: 'pattern', index: rightIndex, token: right },
    equal: left === right
  };
}

function naiveTrace(text, pattern) {
  const steps = [], matches = [];
  let start = 0, offset = 0, comparisons = 0;
  const emit = (kind, extra = {}) => steps.push({
    kind, start, offset, comparisons, matches: [...matches], comparison: null, ...extra
  });
  emit('initial');
  for (start = 0; start + pattern.length <= text.length; start++) {
    offset = 0;
    if (start > 0) emit('shift');
    while (offset < pattern.length) {
      const pair = comparison('text', start + offset, text[start + offset], offset, pattern[offset]);
      comparisons++;
      emit('compare', { comparison: pair });
      if (!pair.equal) { emit('reject'); break; }
      offset++;
      emit('advance');
    }
    if (offset === pattern.length) {
      matches.push(start);
      emit('match', { match: start });
    }
  }
  // No prefix is matched at the first infeasible alignment after the loop.
  offset = 0;
  emit('complete');
  return { comparisons, matches, steps };
}

function prefixTrace(pattern) {
  const steps = [], table = Array(pattern.length).fill(null);
  table[0] = 0;
  let i = 1, q = 0, comparisons = 0;
  const emit = (kind, extra = {}) => steps.push({
    kind, i, q, comparisons, table: [...table], comparison: null, ...extra
  });
  emit('initial');
  while (i < pattern.length) {
    const pair = comparison('pattern', i, pattern[i], q, pattern[q]);
    comparisons++;
    emit('compare', { comparison: pair });
    if (pair.equal) {
      q++;
      table[i] = q;
      const recorded = i++;
      emit('record', { recorded });
    } else if (q > 0) {
      const from = q;
      q = table[q - 1];
      emit('fallback', { fallback: { from, to: q } });
    } else {
      table[i] = 0;
      const recorded = i++;
      emit('record', { recorded });
    }
  }
  emit('complete');
  return { comparisons, table, steps };
}

function kmpTrace(text, pattern, table) {
  const steps = [], matches = [];
  let i = 0, q = 0, comparisons = 0;
  const emit = (kind, extra = {}) => steps.push({
    kind, i, q, comparisons, matches: [...matches], comparison: null, ...extra
  });
  emit('initial');
  while (i < text.length) {
    const pair = comparison('text', i, text[i], q, pattern[q]);
    comparisons++;
    emit('compare', { comparison: pair });
    if (pair.equal) {
      i++; q++;
      emit('advance');
      if (q === pattern.length) {
        const match = i - pattern.length;
        matches.push(match);
        emit('match', { match });
        const from = q;
        q = table[q - 1];
        emit('match-fallback', { fallback: { from, to: q } });
      }
    } else if (q > 0) {
      const from = q;
      q = table[q - 1];
      emit('fallback', { fallback: { from, to: q } });
    } else {
      i++;
      emit('skip');
    }
  }
  emit('complete');
  return { comparisons, matches, steps };
}

/** Build once; navigation reads the deeply frozen snapshots it receives. */
export function buildSearchComparison(text, pattern) {
  const haystack = tokens(text, 'Text', INPUT_LIMITS.text);
  const needle = tokens(pattern, 'Pattern', INPUT_LIMITS.pattern);
  if (needle.length === 0) throw new RangeError('Pattern must contain at least one Unicode code point.');
  const prefix = prefixTrace(needle);
  const naive = naiveTrace(haystack, needle);
  const kmp = kmpTrace(haystack, needle, prefix.table);
  return freeze({
    format: TRACE_FORMAT,
    conventions: {
      indices: 'zero-based Unicode code points',
      equality: 'literal and case-sensitive; no normalization',
      counts: 'one token equality test per compare event',
      variant: 'prefix-function KMP; preparation is separate; all overlapping occurrences',
      storage: 'complete retained teaching traces; not the algorithm working-space bound'
    },
    text, pattern, textTokens: haystack, patternTokens: needle,
    prefix, naive, kmp,
    counts: { naive: naive.comparisons, prefix: prefix.comparisons, kmpSearch: kmp.comparisons,
      kmpTotal: prefix.comparisons + kmp.comparisons }
  });
}

export const EXAMPLES = freeze([
  { name: 'Overlapping matches', text: 'ABABABABA', pattern: 'ABABA' },
  { name: 'Fallback before a later match', text: 'ABABACABABABAC', pattern: 'ABABAC' },
  { name: 'Repeated prefix, no match', text: 'AAAAAAAAAC', pattern: 'AAAAAB' },
  { name: 'Small input: preparation matters', text: 'XYZXYZ', pattern: 'AB' },
  { name: 'Unicode code-point positions', text: '😀A😀A😀', pattern: '😀A' },
  { name: 'Combining text is not normalized', text: 'e\u0301é', pattern: 'é' }
]);
