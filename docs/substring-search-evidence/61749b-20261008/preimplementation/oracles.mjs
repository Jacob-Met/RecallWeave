// Independent preimplementation oracles. These are qualification code, not
// explorer runtime. The occurrence oracle compares whole candidate slices;
// the prefix oracle enumerates all proper borders rather than following a
// previously computed prefix table.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function occurrenceOracle(text, pattern) {
  const haystack = Array.from(text), needle = Array.from(pattern);
  assert.ok(needle.length > 0);
  const positions = [];
  for (let start = 0; start + needle.length <= haystack.length; start++) {
    if (haystack.slice(start, start + needle.length).join('') === pattern) positions.push(start);
  }
  return positions;
}

export function borderOracle(pattern) {
  const tokens = Array.from(pattern);
  return tokens.map((_, end) => {
    let longest = 0;
    for (let size = 1; size <= end; size++) {
      if (tokens.slice(0, size).join('') === tokens.slice(end + 1 - size, end + 1).join('')) longest = size;
    }
    return longest;
  });
}

export function naiveCountOracle(text, pattern) {
  const tokens = Array.from(text), needle = Array.from(pattern);
  let count = 0;
  for (let start = 0; start + needle.length <= tokens.length; start++) {
    const firstMismatch = needle.findIndex((token, index) => token !== tokens[start + index]);
    count += firstMismatch < 0 ? needle.length : firstMismatch + 1;
  }
  return count;
}

// KMP and prefix comparison totals below were derived by hand before runtime
// implementation. One comparison is one actual token equality test. A fallback
// transition or emitting a completed match is not another equality test.
export const cases = [
  { name: 'overlapping border', text: 'ABABABABA', pattern: 'ABABA', matches: [0, 2, 4], prefix: [0, 0, 1, 2, 3], naive: 17, preparation: 4, search: 9 },
  { name: 'fallback while text cursor stays', text: 'ABABACABABABAC', pattern: 'ABABAC', matches: [0, 8], prefix: [0, 0, 1, 2, 3, 0], naive: 28, preparation: 7, search: 15 },
  { name: 'repeated-prefix absent match', text: 'AAAAAAAAAC', pattern: 'AAAAAB', matches: [], prefix: [0, 1, 2, 3, 4, 0], naive: 30, preparation: 9, search: 19 },
  { name: 'all overlapping occurrences', text: 'AAAA', pattern: 'AA', matches: [0, 1, 2], prefix: [0, 1], naive: 6, preparation: 1, search: 4 },
  { name: 'empty text', text: '', pattern: 'AB', matches: [], prefix: [0, 0], naive: 0, preparation: 1, search: 0 },
  { name: 'one-token pattern', text: 'ABAAB', pattern: 'A', matches: [0, 2, 3], prefix: [0], naive: 5, preparation: 0, search: 5 },
  { name: 'pattern longer than text', text: 'AB', pattern: 'ABAB', matches: [], prefix: [0, 0, 1, 2], naive: 0, preparation: 3, search: 2 },
  { name: 'no shared first token', text: 'XYZXYZ', pattern: 'AB', matches: [], prefix: [0, 0], naive: 5, preparation: 1, search: 6 },
  { name: 'case is meaningful', text: 'aAaA', pattern: 'Aa', matches: [1], prefix: [0, 0], naive: 4, preparation: 1, search: 4 },
  { name: 'astral code-point indices', text: '😀A😀A😀', pattern: '😀A', matches: [0, 2], prefix: [0, 0], naive: 6, preparation: 1, search: 5 },
  { name: 'combining sequence is not normalized', text: 'e\u0301é', pattern: 'é', matches: [2], prefix: [0], naive: 3, preparation: 0, search: 3 },
  { name: 'line break is an exact token', text: 'A\nA', pattern: '\n', matches: [1], prefix: [0], naive: 3, preparation: 0, search: 3 }
];

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error('choose a new output path');
  for (const row of cases) {
    assert.deepEqual(occurrenceOracle(row.text, row.pattern), row.matches, row.name);
    assert.deepEqual(borderOracle(row.pattern), row.prefix, row.name);
    assert.equal(naiveCountOracle(row.text, row.pattern), row.naive, row.name);
  }
  const result = {
    kind: 'Preimplementation independent occurrence/border/count oracles; KMP totals remain hand-derived expectations',
    runtime: process.version,
    cases,
    checks: { occurrence_oracle: 12, border_oracle: 12, naive_count_definition: 12 },
    not_executed: ['No substring explorer runtime exists at this point', 'KMP comparison totals have not yet been checked against a candidate', 'No browser or learner efficacy qualification']
  };
  writeFileSync(process.argv[2], `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx', encoding: 'utf8' });
  process.stdout.write('12 authored cases agree with independent occurrence, proper-border and naive-count definitions; runtime implementation remains pending.\n');
}
