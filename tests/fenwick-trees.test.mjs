import test from "node:test";
import assert from "node:assert/strict";
import {parseFenwickDraft, buildFenwickTrace, serializeFenwickTrace} from "../src/fenwick-trees.mjs";

function direct(initial, operations) {
  const values = initial.slice();
  return operations.map((operation) => {
    if (operation.kind === "add") { values[operation.index - 1] += operation.delta; return {values: values.slice(), result: null}; }
    const start = operation.kind === "prefix" ? 1 : operation.start;
    return {values: values.slice(), result: values.slice(start - 1, operation.end).reduce((sum, value) => sum + value, 0)};
  });
}
function isFrozen(value) {
  if (value && typeof value === "object") {
    assert.ok(Object.isFrozen(value));
    for (const child of Object.values(value)) isFrozen(child);
  }
}
function verifyTree(state) {
  state.tree.forEach((total, offset) => {
    const index = offset + 1;
    let width = 1;
    while (index % (width * 2) === 0) width *= 2;
    assert.equal(total, state.values.slice(index - width, index).reduce((sum, value) => sum + value, 0));
  });
}

test("signed example records actual paths and inclusive results", () => {
  const trace = buildFenwickTrace(parseFenwickDraft("3, -1, 4, 0, 2, -2, 5, 1",
    "prefix 7\nadd 3 -2\nprefix 7\nrange 3 6\nprefix 0"));
  assert.deepEqual(trace.initial.tree, [3, 2, 4, 6, 2, 0, 5, 12]);
  assert.deepEqual(trace.steps.map((step) => step.result), [11, null, 9, 2, 0]);
  assert.deepEqual(trace.steps[0].queries[0].visits.map((visit) => visit.index), [7, 6, 4]);
  assert.deepEqual(trace.steps[1].visits.map((visit) => visit.index), [3, 4, 8]);
  assert.equal(trace.steps[1].visits.at(-1).next, 16);
  assert.deepEqual(trace.steps[3].queries.map((part) => [part.end, part.sign, part.sum]), [[6, 1, 4], [2, -1, 2]]);
  assert.deepEqual(trace.steps[4].queries, [{end: 0, sign: 1, visits: [], sum: 0}]);
});

test("non-power-of-two tail stops without manufacturing an entry", () => {
  const trace = buildFenwickTrace({initial: [4, 1, -2, 3, 6], operations: [{kind: "add", index: 5, delta: 2}, {kind: "range", start: 1, end: 5}]});
  assert.deepEqual(trace.initial.tree, [4, 5, -2, 6, 6]);
  assert.deepEqual(trace.steps[0].visits, [{index: 5, lowbit: 1, start: 5, end: 5, before: 6, after: 8, next: 6}]);
  assert.equal(trace.final.tree.length, 5);
  assert.equal(trace.steps[1].result, 14);
  assert.deepEqual(trace.steps[1].queries[1], {end: 0, sign: -1, visits: [], sum: 0});
});

test("zero addition keeps its actual visit path; empty script is useful", () => {
  const initial = Array(8).fill(0);
  const trace = buildFenwickTrace({initial, operations: [{kind: "add", index: 2, delta: 0}]});
  assert.deepEqual(trace.steps[0].visits.map((visit) => visit.index), [2, 4, 8]);
  assert.deepEqual(trace.steps[0].before, trace.steps[0].after);
  const empty = buildFenwickTrace(parseFenwickDraft("0", "\n \r\n"));
  assert.deepEqual(empty.steps, []);
  assert.deepEqual(empty.initial, empty.final);
});

test("admitted extreme totals remain exactly signed 7920", () => {
  for (const sign of [-1, 1]) {
    const trace = buildFenwickTrace({initial: Array(16).fill(sign * 99),
      operations: Array.from({length: 64}, () => ({kind: "add", index: 1, delta: sign * 99}))});
    assert.equal(trace.final.tree[15], sign * 7920);
    assert.equal(trace.final.values[0], sign * 6435);
    verifyTree(trace.final);
  }
});

test("direct-array oracle checks changed inputs, all snapshots and pure queries", () => {
  let seed = 14391;
  const next = (limit) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % limit; };
  for (let n = 1; n <= 16; n += 1) {
    for (let sample = 0; sample < 8; sample += 1) {
      const initial = Array.from({length: n}, () => next(199) - 99);
      const operations = Array.from({length: 32}, (_, index) => {
        if (index % 3 === 0) return {kind: "add", index: next(n) + 1, delta: next(199) - 99};
        if (index % 3 === 1) return {kind: "prefix", end: next(n + 1)};
        const start = next(n) + 1;
        return {kind: "range", start, end: start + next(n - start + 1)};
      });
      const oracle = direct(initial, operations);
      const trace = buildFenwickTrace({initial, operations});
      verifyTree(trace.initial);
      trace.steps.forEach((step, index) => {
        assert.deepEqual(step.after.values, oracle[index].values);
        assert.equal(step.result, oracle[index].result);
        verifyTree(step.after);
        if (step.operation.kind !== "add") assert.deepEqual(step.before, step.after);
        for (const part of step.queries) {
          const coverage = part.visits.flatMap((visit) => Array.from({length: visit.end - visit.start + 1}, (_, i) => visit.start + i));
          assert.deepEqual(coverage.sort((a, b) => a - b), Array.from({length: part.end}, (_, i) => i + 1));
          let sum = 0;
          for (const visit of part.visits) {
            assert.equal(visit.accumulatorBefore, sum);
            sum += visit.stored;
            assert.equal(visit.accumulatorAfter, sum);
          }
          assert.equal(part.sum, sum);
        }
      });
    }
  }
});

test("input is untouched and every returned record is copied and frozen", () => {
  const spec = {initial: [2, -1, 7], operations: [{kind: "add", index: 2, delta: 3}, {kind: "range", start: 1, end: 3}]};
  const before = JSON.stringify(spec);
  const trace = buildFenwickTrace(spec);
  assert.equal(JSON.stringify(spec), before);
  assert.notEqual(trace.input.initial, spec.initial);
  assert.notEqual(trace.input.operations[0], spec.operations[0]);
  isFrozen(trace);
  spec.initial[0] = 90;
  spec.operations[0].delta = 90;
  assert.deepEqual(trace.input.initial, [2, -1, 7]);
  assert.equal(trace.input.operations[0].delta, 3);
});

test("whole input validation refuses a bad later operation without mutation", () => {
  const spec = {initial: [1, 2], operations: [{kind: "add", index: 1, delta: 9}, {kind: "range", start: 2, end: 1}]};
  const before = JSON.stringify(spec);
  assert.throws(() => buildFenwickTrace(spec), /Operation 2/);
  assert.equal(JSON.stringify(spec), before);
});

test("structured admission rejects coercion, non-data fields and out-of-range values", () => {
  const baseline = {initial: [1], operations: []};
  const invalid = [
    {...baseline, initial: []}, {...baseline, initial: Array(17).fill(0)}, {...baseline, initial: ["1"]},
    {...baseline, initial: [NaN]}, {...baseline, initial: [Infinity]}, {...baseline, initial: [1.5]},
    {...baseline, initial: [100]}, {...baseline, initial: [-100]}, {...baseline, extra: true},
    {...baseline, initial: new Array(1)}, {...baseline, operations: Array(65).fill({kind: "prefix", end: 0})},
    {...baseline, operations: [{kind: "prefix", end: -1}]}, {...baseline, operations: [{kind: "prefix", end: 2}]},
    {...baseline, operations: [{kind: "prefix", end: 0, extra: true}]},
    {...baseline, operations: [{kind: "add", index: 0, delta: 0}]},
    {...baseline, operations: [{kind: "add", index: 1, delta: 100}]},
    {...baseline, operations: [{kind: "add", index: "1", delta: 0}]},
    {...baseline, operations: [{kind: "range", start: 0, end: 1}]},
    {...baseline, operations: [{kind: "sum", end: 1}]}, Object.assign(Object.create(null), baseline)
  ];
  for (const input of invalid) assert.throws(() => buildFenwickTrace(input));
  let reads = 0;
  const operation = {get kind() { reads += 1; return "prefix"; }, end: 0};
  assert.throws(() => buildFenwickTrace({...baseline, operations: [operation]}));
  assert.equal(reads, 0);
});

test("draft grammar is explicit about signs, whitespace and leading zeros", () => {
  const parsed = parseFenwickDraft(" +02, -03, 0 ", "\r\nprefix 00\radd 01 +02\nrange 1 3\n");
  assert.deepEqual(parsed, {initial: [2, -3, 0], operations: [{kind: "prefix", end: 0}, {kind: "add", index: 1, delta: 2}, {kind: "range", start: 1, end: 3}]});
  isFrozen(parsed);
  for (const text of ["", "1,", ",1", "1,,2", "1e1", "0x10", "1.0", "∞", "１", "+ 1"]) {
    assert.throws(() => parseFenwickDraft(text, ""));
  }
  for (const text of ["PREFIX 1", "prefix 1 extra", "prefix", "add 1", "range 1 1 # note", "add 1 2.0"]) {
    assert.throws(() => parseFenwickDraft("1", text));
  }
  assert.throws(() => parseFenwickDraft(" ".repeat(512) + "0", ""));
  assert.throws(() => parseFenwickDraft("0", " ".repeat(4097)));
});

test("export contains all steps deterministically and refuses foreign objects", () => {
  const trace = buildFenwickTrace(parseFenwickDraft("2, 3", "prefix 2\nadd 1 -1\nrange 1 2"));
  const output = serializeFenwickTrace(trace);
  assert.equal(output, JSON.stringify(trace, null, 2) + "\n");
  assert.equal(output, serializeFenwickTrace(trace));
  assert.equal(JSON.parse(output).steps.length, 3);
  assert.throws(() => serializeFenwickTrace(JSON.parse(output)));
});
