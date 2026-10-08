import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { countOutcomes, countingPage, outcomeAt, parseCountingInput } from '../src/counting-principles.mjs';
import { parseDeck } from '../src/deck.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const models = [
  ['ordered-reuse', true, true],
  ['ordered-distinct', true, false],
  ['unordered-distinct', false, false],
  ['unordered-reuse', false, true]
];
// A deliberately different small-set oracle: produce all position assignments,
// then filter. It does not use formulas, block sizes, or the candidate's model flags.
function* brute(n, k, ordered, reuse, prefix = []) {
  if (prefix.length === k) {
    if (!reuse && new Set(prefix).size !== prefix.length) return;
    if (!ordered && prefix.some((value, i) => i > 0 && prefix[i - 1] > value)) return;
    yield prefix.map(value => 'ABCDEFGH'[value]);
    return;
  }
  for (let value = 0; value < n; value++) yield* brute(n, k, ordered, reuse, [...prefix, value]);
}
test('every small-set outcome and count agrees with filtered position assignments', () => {
  for (let n = 0; n <= 5; n++) for (let k = 0; k <= 4; k++) for (const [model, ordered, reuse] of models) {
    const input = { n, k, model };
    const expected = [...brute(n, k, ordered, reuse)];
    assert.equal(countOutcomes(input), BigInt(expected.length), JSON.stringify(input));
    const actual = [];
    let page = countingPage(input);
    for (let index = 0n; index < BigInt(page.pageCount); index++) {
      page = countingPage(input, index);
      actual.push(...page.rows.map(row => row.labels));
      for (const row of page.rows) assert.deepEqual(outcomeAt(input, BigInt(row.ordinal) - 1n), row);
    }
    assert.deepEqual(actual, expected, JSON.stringify(input));
  }
});
test('largest allowed inputs preserve complete counts and distant outcome addresses', () => {
  const totals = { 'ordered-reuse': 262144, 'ordered-distinct': 20160, 'unordered-distinct': 28, 'unordered-reuse': 1716 };
  for (const [model, ordered, reuse] of models) {
    const expectedTotal = totals[model];
    const indices = new Set([0, 23, 24, Math.floor(expectedTotal / 2), expectedTotal - 1]);
    const samples = new Map();
    let count = 0;
    for (const row of brute(8, 6, ordered, reuse)) {
      if (indices.has(count)) samples.set(count, row);
      count++;
    }
    assert.equal(count, expectedTotal);
    const input = { n: 8, k: 6, model };
    assert.equal(countOutcomes(input), BigInt(count));
    for (const [index, expected] of samples) {
      assert.deepEqual(outcomeAt(input, BigInt(index)).labels, expected);
      const page = countingPage(input, BigInt(Math.floor(index / 24)));
      assert.deepEqual(page.rows[index % 24].labels, expected);
    }
    const last = countingPage(input, (BigInt(count) - 1n) / 24n);
    assert.equal(last.lastOrdinal, String(count));
    assert.equal(last.rows.length, count % 24 || 24);
  }
});
test('empty and impossible selections are different, with explicit zero boundaries', () => {
  for (const [model] of models) {
    for (let n = 0; n <= 8; n++) {
      const page = countingPage({ n, k: 0, model });
      assert.equal(page.total, '1');
      assert.equal(page.pageCount, '1');
      assert.deepEqual(page.rows[0].labels, []);
      assert.equal(page.rows[0].orderedRepresentations, '1');
      assert.equal(page.emptySelection, true);
      assert.equal(page.impossible, false);
    }
    for (let k = 1; k <= 6; k++) {
      const page = countingPage({ n: 0, k, model });
      assert.equal(page.total, '0');
      assert.equal(page.emptySelection, false);
      assert.equal(page.impossible, true);
      assert.deepEqual(page.rows, []);
      assert.equal(page.firstOrdinal, null);
      assert.equal(page.lastOrdinal, null);
    }
  }
  for (const model of ['ordered-distinct', 'unordered-distinct']) {
    const page = countingPage({ n: 2, k: 3, model });
    assert.equal(page.total, '0');
    assert.deepEqual(page.rows, []);
  }
});
test('multiset representations retain repeated labels and explain unequal group sizes', () => {
  const repeated = countingPage({ n: 2, k: 3, model: 'unordered-reuse' });
  assert.deepEqual(repeated.rows.map(row => [row.labels.join(''), row.typeCounts, row.orderedRepresentations]), [
    ['AAA', [3, 0], '1'], ['AAB', [2, 1], '3'], ['ABB', [1, 2], '3'], ['BBB', [0, 3], '1']
  ]);
  assert.equal(repeated.rows.reduce((sum, row) => sum + BigInt(row.orderedRepresentations), 0n), 8n);
  const distinct = countingPage({ n: 4, k: 3, model: 'unordered-distinct' });
  assert.deepEqual(distinct.rows.map(row => row.orderedRepresentations), ['6', '6', '6', '6']);
  assert.equal(distinct.rows.reduce((sum, row) => sum + BigInt(row.orderedRepresentations), 0n), 24n);
  const ordered = countingPage({ n: 2, k: 3, model: 'ordered-reuse' });
  assert.ok(ordered.rows.every(row => row.orderedRepresentations === '1'));
});
test('decimal drafts and programmatic inputs reject unsupported numeric forms and models', () => {
  assert.deepEqual(parseCountingInput(' 03 ', '2', 'ordered-distinct'), { n: 3, k: 2, model: 'ordered-distinct' });
  for (const value of ['', ' ', '-1', '+1', '1.0', '1e0', '0x2', 'NaN', 'Infinity', '９', '9', '1'.repeat(17), 3, null]) {
    assert.throws(() => parseCountingInput(value, '2', 'ordered-reuse'));
  }
  for (const value of ['', '7', '-1', '2.0', 2]) assert.throws(() => parseCountingInput('3', value, 'ordered-reuse'));
  assert.throws(() => parseCountingInput('3', '2', 'unordered'));
  for (const input of [null, [], { n: 2.5, k: 2, model: 'ordered-reuse' }, { n: 3, k: -1, model: 'ordered-reuse' }, { n: 3, k: 2, model: true }]) assert.throws(() => countOutcomes(input));
});
test('page and outcome addresses are bounded and wrong types cannot silently round', () => {
  const input = { n: 3, k: 4, model: 'ordered-reuse' };
  const last = countingPage(input, 3n);
  assert.equal(last.total, '81');
  assert.equal(last.pageCount, '4');
  assert.equal(last.firstOrdinal, '73');
  assert.equal(last.lastOrdinal, '81');
  for (const index of [0, 1.5, '1', -1n, 4n, 99999999999999999999n]) assert.throws(() => countingPage(input, index));
  for (const index of [0, '1', -1n, 81n]) assert.throws(() => outcomeAt(input, index));
  assert.throws(() => outcomeAt({ n: 0, k: 1, model: 'ordered-reuse' }, 0n));
  assert.throws(() => countingPage({ n: 0, k: 1, model: 'ordered-reuse' }, 1n));
});
test('result copies stay stable and fully JSON serializable', () => {
  const input = { n: 3, k: 2, model: 'unordered-reuse' };
  const page = countingPage(input);
  const before = JSON.stringify(page);
  input.n = 8;
  assert.equal(page.input.n, 3);
  for (const value of [page, page.input, page.rows, page.rows[0], page.rows[0].labels, page.rows[0].typeCounts, page.formula, page.comparison, page.comparison[0]]) assert.ok(Object.isFrozen(value));
  assert.throws(() => { page.rows[0].labels[0] = 'Z'; }, TypeError);
  assert.equal(JSON.stringify(page), before);
  assert.deepEqual(JSON.parse(before), { ...page });
});
test('the twelve original questions validate through the published deck contract', () => {
  const deck = parseDeck(readFileSync(root + 'courses/counting-principles.json', 'utf8'));
  assert.equal(deck.title, 'Counting principles: order and reuse');
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.deepEqual(deck.items.map(item => item.answer), [1, 3, 0, 2, 1, 0, 3, 2, 0, 1, 3, 2]);
  assert.ok(deck.items.every(item => item.explanation && item.transfer));
});
test('the generated offline page is current, contains the exact course, and has a parseable script', () => {
  const built = spawnSync(process.execPath, [root + 'tools/build-counting-principles.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(built.status, 0, built.stderr || built.stdout);
  assert.match(built.stdout, /^COUNTING_BUILD_OK current=1 questions=12$/m);
  const html = readFileSync(root + 'courses/counting-principles-explorer.html', 'utf8');
  const courseText = html.match(/<script id="counting-course-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert.deepEqual(JSON.parse(courseText), JSON.parse(readFileSync(root + 'courses/counting-principles.json', 'utf8')));
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  new vm.Script(script);
  assert.ok(!/<script[^>]+src=|<link[^>]+href=/.test(html));
});
