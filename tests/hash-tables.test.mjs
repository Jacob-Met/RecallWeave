import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { homeIndex, validateScenario, runScenario } from '../src/hash-tables.mjs';
import { parseDeck } from '../src/deck.mjs';

const make = (capacity, pairs) => ({ capacity, operations: pairs.map(([type, key]) => ({ type, key })) });
const cells = slots => slots.map(slot => slot.kind === 'occupied' ? slot.key : slot.kind);
const indices = operation => operation.probes.map(probe => probe.index);

test('signed homes, exact admission and canonical copies', () => {
  assert.equal(homeIndex(-1, 7), 6);
  assert.equal(homeIndex(-8, 7), 6);
  assert.equal(homeIndex(-9999, 17), 14);
  const input = make(7, [['insert', -0]]);
  const checked = validateScenario(input);
  assert.equal(Object.is(checked.operations[0].key, -0), false);
  assert.equal(Object.is(input.operations[0].key, -0), true);
  assert.ok(Object.isFrozen(checked.operations[0]));
  assert.notEqual(checked, input);
  assert.throws(() => validateScenario({ ...input, extra: true }), TypeError);
  assert.throws(() => runScenario(make(7, [['insert', 1.5]])), TypeError);
  assert.throws(() => runScenario(make(7, [['insert', '10']])), TypeError);
  assert.throws(() => runScenario(make(2, [])), RangeError);
  assert.throws(() => runScenario(make(7, [['find', 10000]])), RangeError);
  const nullObject = Object.assign(Object.create(null), make(3, []));
  assert.deepEqual(validateScenario(nullObject), make(3, []));
});

test('search crosses a tombstone and insertion reuses it only after absence proof', () => {
  const result = runScenario(make(7, [
    ['insert', 10], ['insert', 17], ['insert', 24], ['delete', 17], ['find', 24], ['insert', 31],
  ]));
  assert.deepEqual(indices(result.operations[4]), [3, 4, 5]);
  assert.equal(result.operations[4].status, 'found');
  assert.equal(result.operations[4].index, 5);
  const insertion = result.operations[5];
  assert.deepEqual(indices(insertion), [3, 4, 5, 6]);
  assert.deepEqual(insertion.probes.map(probe => probe.decision),
    ['collision', 'remember-deleted', 'collision', 'empty-stop']);
  assert.equal(insertion.index, 4);
  assert.deepEqual(cells(result.finalSlots), ['empty', 'empty', 'empty', 10, 31, 24, 'empty']);
});

test('a tombstone before an existing key does not create a duplicate', () => {
  const result = runScenario(make(7, [
    ['insert', 10], ['insert', 17], ['insert', 24], ['delete', 10], ['insert', 24],
  ]));
  const duplicate = result.operations.at(-1);
  assert.deepEqual(indices(duplicate), [3, 4, 5]);
  assert.equal(duplicate.status, 'present');
  assert.equal(duplicate.index, 5);
  assert.deepEqual(duplicate.before, duplicate.after);
  assert.equal(duplicate.after[3].kind, 'deleted');
  assert.equal(duplicate.after.filter(slot => slot.kind === 'occupied' && slot.key === 24).length, 1);
});

test('wraparound, full refusal, duplicate success and full-cycle tombstone reuse', () => {
  const wrapped = runScenario(make(7, [['insert', 6], ['insert', 13], ['insert', 20]]));
  assert.deepEqual(indices(wrapped.operations[2]), [6, 0, 1]);
  assert.equal(wrapped.operations[2].index, 1);
  const full = runScenario(make(3, [
    ['insert', 0], ['insert', 3], ['insert', 6], ['insert', 9],
    ['insert', 6], ['delete', 3], ['insert', 9], ['find', 12],
  ]));
  assert.equal(full.operations[3].status, 'full');
  assert.deepEqual(full.operations[3].before, full.operations[3].after);
  assert.equal(full.operations[4].status, 'present');
  assert.deepEqual(indices(full.operations[6]), [0, 1, 2]);
  assert.equal(full.operations[6].index, 1);
  assert.equal(full.operations[6].status, 'inserted');
  assert.equal(full.operations[7].status, 'absent');
  assert.deepEqual(cells(full.finalSlots), [0, 9, 6]);
});

test('probe frames observe the pre-state; only a result frame applies changes', () => {
  const input = make(3, [['insert', 0], ['delete', 0]]);
  const before = structuredClone(input);
  const result = runScenario(input);
  assert.deepEqual(input, before);
  assert.deepEqual(result.trace.map(frame => frame.kind), ['initial', 'probe', 'result', 'probe', 'result']);
  assert.deepEqual(cells(result.trace[1].slots), ['empty', 'empty', 'empty']);
  assert.deepEqual(cells(result.trace[2].slots), [0, 'empty', 'empty']);
  assert.deepEqual(cells(result.trace[3].slots), [0, 'empty', 'empty']);
  assert.deepEqual(cells(result.trace[4].slots), ['deleted', 'empty', 'empty']);
  assert.ok(Object.isFrozen(result.trace[4].slots[0]));
  assert.deepEqual(runScenario(input), result);
  assert.equal(runScenario(make(17, [])).trace.length, 1);
});

test('the original course passes the existing importer and preserves its permission', async () => {
  const text = await readFile(new URL('../courses/hash-tables.json', import.meta.url), 'utf8');
  const deck = parseDeck(text);
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.equal(new Set(deck.items.map(item => item.id)).size, 12);
  assert.match(deck.attribution, /NIST/);
  assert.match(deck.attribution, /Pat Morin/);
  assert.match(deck.license, /CC0-1\.0/);
  assert.equal(deck.items.find(item => item.id === 'ht-probe-match').transfer.includes('The next question'), false);
});

test('standalone page is reproducible and embeds the exact downloadable deck text', async () => {
  const builder = fileURLToPath(new URL('../tools/make_hash_tables_explorer.mjs', import.meta.url));
  const receipt = JSON.parse(execFileSync(process.execPath, [builder, '--check'], { cwd: tmpdir(), encoding: 'utf8' }));
  assert.equal(receipt.mode, 'check');
  assert.equal(receipt.courseItems, 12);
  const html = await readFile(new URL('../courses/hash-tables-explorer.html', import.meta.url), 'utf8');
  const text = await readFile(new URL('../courses/hash-tables.json', import.meta.url), 'utf8');
  const literal = html.match(/^const COURSE_TEXT = (.+);$/m);
  assert.ok(literal);
  assert.equal(JSON.parse(literal[1]), text);
  assert.doesNotMatch(html, /\/\*__(?:MODEL|COURSE|UI)__\*\//);
  assert.doesNotMatch(html, /<script[^>]+src=/i);
});
