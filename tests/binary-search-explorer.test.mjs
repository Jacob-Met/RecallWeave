import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseBinarySearchInput, traceLowerBound, BINARY_SEARCH_PRESETS } from '../src/binary-search-explorer.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('duplicate equality classifies a suffix while retaining the first possible boundary', () => {
  const trace = traceLowerBound([1, 5, 5, 5, 9], 5);
  assert.deepEqual(trace.steps, [
    { lo: 0, hi: 5, mid: 2, value: 5, lessThanTarget: false, nextLo: 0, nextHi: 2 },
    { lo: 0, hi: 2, mid: 1, value: 5, lessThanTarget: false, nextLo: 0, nextHi: 1 },
    { lo: 0, hi: 1, mid: 0, value: 1, lessThanTarget: true, nextLo: 1, nextHi: 1 }
  ]);
  assert.equal(trace.boundary, 1);
  assert.equal(trace.present, true);
  assert.equal(trace.comparisons, 3);
});

test('empty, before-first and after-end results remain boundaries rather than invented elements', () => {
  const empty = traceLowerBound([], 7);
  assert.equal(empty.boundary, 0);
  assert.equal(empty.present, false);
  assert.deepEqual(empty.steps, []);
  assert.equal(empty.comparisons, 0);
  assert.equal(traceLowerBound([-5, 0, 8], -9).boundary, 0);
  const after = traceLowerBound([-2, 0, 6], 8);
  assert.equal(after.boundary, 3);
  assert.equal(after.present, false);
  assert.equal(after.comparisons, 2);
});

test('the guide’s two equal-length paths retain their different ordering-comparison counts', () => {
  const values = [2, 4, 6, 8, 10, 12, 14, 16];
  const missing = traceLowerBound(values, 7);
  assert.deepEqual(missing.steps.map(step => step.mid), [4, 2, 3]);
  assert.equal(missing.boundary, 3);
  assert.equal(missing.present, false);
  const present = traceLowerBound(values, 2);
  assert.deepEqual(present.steps.map(step => step.mid), [4, 2, 1, 0]);
  assert.equal(present.comparisons, 4);
});

test('a complete 32-value trace is detached and immutable without changing the caller', () => {
  const values = Object.freeze(Array.from({ length: 32 }, (_, index) => index - 16));
  const before = [...values];
  const trace = traceLowerBound(values, -9999);
  assert.deepEqual(values, before);
  assert.notEqual(trace.values, values);
  assert.equal(trace.comparisons, 6);
  assert.ok(Object.isFrozen(trace) && Object.isFrozen(trace.values) && Object.isFrozen(trace.steps));
  assert.ok(trace.steps.every(Object.isFrozen));
  assert.throws(() => trace.values.push(1));
  assert.throws(() => { trace.steps[0].lo = 9; });
});

test('text admission preserves order, allows repeats and refuses an invalid current draft', () => {
  assert.deepEqual(parseBinarySearchInput(' -2, -2, +0, 0005 ', ' +3 '), { values: [-2, -2, 0, 5], target: 3 });
  assert.deepEqual(parseBinarySearchInput('  ', '0'), { values: [], target: 0 });
  for (const value of ['1,,2', '1,2,', '2,1', '1 2', '[1,2]', '1e2', '0.5', 'Infinity', '10000']) {
    assert.throws(() => parseBinarySearchInput(value, '1'), value);
  }
  for (const target of ['', '0.0', '1e0', '10000', '-10000']) assert.throws(() => parseBinarySearchInput('1,2', target));
  assert.throws(() => traceLowerBound([1, , 3], 2));
  assert.throws(() => traceLowerBound([true], 1));
  assert.throws(() => traceLowerBound([1], NaN));
  assert.throws(() => traceLowerBound(Array(33).fill(0), 0));
});

test('every teaching preset is admitted and its complete record survives JSON transport', () => {
  for (const preset of BINARY_SEARCH_PRESETS) {
    const { values, target } = parseBinarySearchInput(preset.values, preset.target);
    const trace = traceLowerBound(values, target);
    assert.deepEqual(JSON.parse(JSON.stringify(trace)), trace);
  }
});

test('standalone build retains the original course and guide bytes exactly', async () => {
  const html = await readFile(new URL('../courses/binary-search-explorer.html', import.meta.url), 'utf8');
  const deck = await readFile(new URL('../courses/binary-search.json', import.meta.url), 'utf8');
  const guide = await readFile(new URL('../courses/binary-search.md', import.meta.url), 'utf8');
  assert.equal(JSON.parse(html.match(/const SOURCE_DECK\s*=\s*(.+);/)[1]), deck);
  assert.equal(JSON.parse(html.match(/const SOURCE_GUIDE\s*=\s*(.+);/)[1]), guide);
  assert.doesNotMatch(html, /@@[A-Z_]+@@/);
  assert.doesNotMatch(html, /<script[^>]+src\s*=|<link[^>]+rel=["']stylesheet/i);
  const result = spawnSync(process.execPath, ['tools/build-binary-search-explorer.mjs', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
