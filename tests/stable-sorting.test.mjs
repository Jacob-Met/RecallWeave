import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildSortingComparison, parseSortingKey} from '../src/stable-sorting.mjs';
import {parseDeck} from '../src/deck.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const records = keys => keys.map((key, i) => ({key, label: String.fromCharCode(65 + i)}));
const ids = rows => rows.map(row => row.id);
function inversions(keys) {
  let total = 0;
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    if (keys[i] > keys[j]) total++;
  }
  return total;
}

test('the distant selection exchange crosses equal-key identities', () => {
  const result = buildSortingComparison(records([2, 2, 1]));
  assert.deepEqual(ids(result.algorithms.insertion.finalRecords), ['record-3', 'record-1', 'record-2']);
  assert.deepEqual(ids(result.algorithms.selection.finalRecords), ['record-3', 'record-2', 'record-1']);
  assert.deepEqual(result.algorithms.insertion.counts, {comparisons: 3, exchanges: 2});
  assert.deepEqual(result.algorithms.selection.counts, {comparisons: 3, exchanges: 1});
  assert.equal(result.algorithms.insertion.guaranteedStable, true);
  assert.equal(result.algorithms.selection.guaranteedStable, false);
  assert.equal(result.algorithms.selection.observedStable, false);
  assert.deepEqual(result.algorithms.selection.tieGroups, [{
    key: 2, inputIds: ['record-1', 'record-2'], outputIds: ['record-2', 'record-1'], preserved: false
  }]);
});

test('declared counts distinguish sorted, descending and all-equal inputs', () => {
  for (const [keys, insertionCounts, selectionCounts] of [
    [[1, 2, 3, 4, 5], [4, 0], [10, 0]],
    [[4, 3, 2, 1], [6, 6], [6, 2]],
    [[3, 3, 3, 3], [3, 0], [6, 0]]
  ]) {
    const result = buildSortingComparison(records(keys));
    for (const [name, expected] of [['insertion', insertionCounts], ['selection', selectionCounts]]) {
      assert.deepEqual(result.algorithms[name].counts, {comparisons: expected[0], exchanges: expected[1]});
    }
  }
  assert.equal(buildSortingComparison(records([3, 1, 2])).algorithms.selection.observedStable, null);
  const observed = buildSortingComparison(records([2, 1, 2])).algorithms.selection;
  assert.equal(observed.observedStable, true);
  assert.equal(observed.guaranteedStable, false);
});

test('360 small-alphabet inputs preserve every record and each declared trace effect', () => {
  let cases = 0;
  for (let length = 2; length <= 5; length++) {
    for (let encoded = 0; encoded < 3 ** length; encoded++) {
      const keys = Array.from({length}, (_, i) => Math.floor(encoded / 3 ** i) % 3 - 1);
      const result = buildSortingComparison(records(keys));
      const input = result.input;
      const inputById = new Map(input.map(row => [row.id, row]));
      const expectedStable = [...input].sort((a, b) => a.key - b.key || a.originalPosition - b.originalPosition);
      assert.deepEqual(result.algorithms.insertion.finalRecords, expectedStable);
      assert.equal(result.algorithms.insertion.counts.exchanges, inversions(keys));
      assert.equal(result.algorithms.selection.counts.comparisons, length * (length - 1) / 2);
      for (const algorithm of Object.values(result.algorithms)) {
        assert.deepEqual(algorithm.finalRecords.map(row => row.key), [...keys].sort((a, b) => a - b));
        for (let i = 0; i < algorithm.steps.length; i++) {
          const step = algorithm.steps[i], previous = algorithm.steps[i - 1];
          assert.equal(step.index, i);
          assert.deepEqual([...ids(step.records)].sort(), [...inputById.keys()].sort());
          for (const row of step.records) assert.deepEqual(row, inputById.get(row.id));
          const prefix = step.records.slice(0, step.sortedPrefix).map(row => row.key);
          assert.deepEqual(prefix, [...prefix].sort((a, b) => a - b));
          if (!previous) {
            assert.equal(step.kind, 'initial');
            assert.deepEqual(step.counts, {comparisons: 0, exchanges: 0});
            continue;
          }
          assert.equal(step.counts.comparisons - previous.counts.comparisons, step.kind === 'compare' ? 1 : 0);
          assert.equal(step.counts.exchanges - previous.counts.exchanges, step.kind === 'exchange' ? 1 : 0);
          if (step.kind === 'exchange') {
            const [a, b] = step.exchange.indices;
            assert.notEqual(a, b);
            const expected = [...previous.records];
            [expected[a], expected[b]] = [expected[b], expected[a]];
            assert.deepEqual(step.records, expected);
            assert.deepEqual(step.exchange.idsBefore, [previous.records[a].id, previous.records[b].id]);
          } else {
            assert.deepEqual(step.records, previous.records);
          }
          if (step.kind === 'compare') {
            const c = step.comparison, left = step.records[c.leftIndex], right = step.records[c.rightIndex];
            assert.equal(c.leftId, left.id);
            assert.equal(c.rightId, right.id);
            assert.equal(c.result, left.key < right.key ? 'less' : left.key === right.key ? 'equal' : 'greater');
          }
        }
        assert.equal(algorithm.steps.at(-1).kind, 'complete');
        assert.deepEqual(algorithm.steps.at(-1).counts, algorithm.counts);
        assert.deepEqual(algorithm.steps.at(-1).records, algorithm.finalRecords);
      }
      cases++;
    }
  }
  assert.equal(cases, 360);
});

test('duplicate labels, negative zero and permitted literal labels retain distinct identity', () => {
  const result = buildSortingComparison([
    {key: -0, label: ' <b>same</b> '}, {key: 0, label: ' <b>same</b> '}, {key: -99, label: '😀'}
  ]);
  assert.equal(Object.is(result.input[0].key, -0), false);
  assert.deepEqual(ids(result.input), ['record-1', 'record-2', 'record-3']);
  assert.equal(result.input[0].label, ' <b>same</b> ');
  assert.equal(result.algorithms.insertion.observedStable, true);
  assert.equal(result.algorithms.selection.observedStable, false);
});

test('the result is deeply immutable, detached and deterministic', () => {
  const input = records([2, 1, 2]);
  const before = JSON.stringify(input);
  const result = buildSortingComparison(input);
  const serialized = JSON.stringify(result);
  assert.equal(JSON.stringify(input), before);
  assert.equal(JSON.stringify(buildSortingComparison(input)), serialized);
  const visit = object => {
    assert.equal(Object.isFrozen(object), true);
    for (const child of Object.values(object)) if (child && typeof child === 'object') visit(child);
  };
  visit(result);
  input[0].key = 99;
  input[0].label = 'changed';
  input.push({key: 0, label: 'new'});
  assert.equal(JSON.stringify(result), serialized);
  assert.throws(() => { result.algorithms.insertion.steps[0].records.push({}); }, TypeError);
});

test('sparse, inherited, accessor and additional fields are explicitly rejected without invoking getters', () => {
  const good = records([1, 2]);
  const sparse = [good[0], , good[1]];
  const whollySparse = new Array(2);
  const inheritedRow = Object.create({key: 1}); inheritedRow.label = 'A';
  let invoked = 0;
  const accessorRow = {get key() { invoked++; return 1; }, label: 'A'};
  const accessorSlot = records([1, 2]);
  Object.defineProperty(accessorSlot, '0', {get() { invoked++; return good[0]; }});
  const extraArray = records([1, 2]); extraArray.extra = true;
  const symbolArray = records([1, 2]); symbolArray[Symbol('extra')] = 1;
  const symbolRow = {key: 1, label: 'A', [Symbol('extra')]: 1};
  for (const input of [
    null, {}, [], [good[0]], Array.from({length: 9}, () => good[0]), sparse, whollySparse,
    [inheritedRow, good[1]], [accessorRow, good[1]], accessorSlot, extraArray, symbolArray,
    [{key: 1, label: 'A', id: 'supplied'}, good[1]], [symbolRow, good[1]]
  ]) assert.throws(() => buildSortingComparison(input));
  assert.equal(invoked, 0);
});

test('null-prototype rows and nonenumerable own data properties remain valid', () => {
  const row = Object.create(null);
  Object.defineProperties(row, {key: {value: 1}, label: {value: 'A'}});
  const input = [];
  Object.defineProperty(input, '0', {value: row});
  Object.defineProperty(input, '1', {value: {key: 0, label: 'B'}});
  assert.deepEqual(buildSortingComparison(input).algorithms.insertion.finalRecords.map(row => row.label), ['B', 'A']);
});

test('numeric and label admission refuses malformed values before producing a comparison', () => {
  for (const key of [NaN, Infinity, -Infinity, -100, 100, 1.5, '1', null, undefined, 1n]) {
    assert.throws(() => buildSortingComparison([{key, label: 'A'}, {key: 0, label: 'B'}]));
  }
  for (const label of ['', '   ', '\nA', 'A\u007f', 'A\u0085', 'x'.repeat(33), '\ud800', '\udc00', '\ud800x', null, 4]) {
    assert.throws(() => buildSortingComparison([{key: 1, label}, {key: 0, label: 'B'}]));
  }
  assert.equal(buildSortingComparison([{key: 1, label: '😀'.repeat(16)}, {key: 0, label: 'B'}]).input[0].label.length, 32);
});

test('raw key parsing accepts only the declared decimal form', () => {
  for (const [raw, expected] of [['0', 0], ['-0', 0], ['  -99  ', -99], ['99', 99], ['-7', -7]]) {
    assert.equal(parseSortingKey(raw), expected);
  }
  for (const raw of ['', ' ', '+1', '01', '-01', '1.0', '1e1', '100', '-100', '١', '1 2', '0x1', 'NaN', null, 1]) {
    assert.throws(() => parseSortingKey(raw));
  }
});

test('the original lesson is a current-format validated twelve-item course', () => {
  const text = readFileSync(new URL('../courses/stable-sorting.json', import.meta.url), 'utf8');
  const raw = JSON.parse(text), course = parseDeck(text);
  assert.equal(raw.format, 'recallweave-deck/1');
  assert.equal(course.items.length, 12);
  assert.equal(course.concepts.length, 4);
  assert.equal(new Set(course.items.map(item => item.id)).size, 12);
  assert.deepEqual([0, 1, 2, 3].map(index => course.items.filter(item => item.answer === index).length), [3, 3, 3, 3]);
  assert.ok(course.items.every(item => item.explanation.length > 60 && item.transfer.length > 30));
});

test('the standalone build is deterministic and embeds the exact course bytes', () => {
  const result = spawnSync(process.execPath, ['tools/make_stable_sorting.mjs', '--check'], {cwd: root, encoding: 'utf8'});
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const html = readFileSync(new URL('../stable-sorting.html', import.meta.url), 'utf8');
  const marker = html.match(/const embeddedLessonText = (".*");/);
  assert.ok(marker, 'a literal exact-course payload must be embedded');
  assert.equal(JSON.parse(marker[1]), readFileSync(new URL('../courses/stable-sorting.json', import.meta.url), 'utf8'));
  assert.ok(!/<(?:script|link)\b[^>]*(?:src|href)=["'][^"']+/i.test(html), 'standalone has no external script or style links');
});
