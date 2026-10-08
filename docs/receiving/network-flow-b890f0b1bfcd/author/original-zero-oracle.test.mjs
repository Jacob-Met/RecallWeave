import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateNetwork, parseNetwork, networkText, solveNetwork, observationJSON, PRESETS } from "../src/network-flow.mjs";
import { parseDeck } from "../src/deck.mjs";

function cutOracle(network) {
  const middle = network.vertices.filter(v => v !== network.source && v !== network.sink);
  let minimum = Infinity;
  for (let mask = 0; mask < 2 ** middle.length; mask++) {
    const side = new Set([network.source]);
    middle.forEach((v, bit) => { if (mask & (1 << bit)) side.add(v); });
    let capacity = 0;
    for (const edge of network.edges) if (side.has(edge.from) && !side.has(edge.to)) capacity += edge.capacity;
    minimum = Math.min(minimum, capacity);
  }
  return minimum;
}

function receive(result) {
  const network = result.network;
  let previousValue = 0;
  for (const [index, step] of result.steps.entries()) {
    assert.equal(step.sequence, index);
    const balance = Object.fromEntries(network.vertices.map(v => [v, 0]));
    for (const edge of step.edges) {
      assert.ok(Number.isInteger(edge.flow) && edge.flow >= 0 && edge.flow <= edge.capacity);
      balance[edge.from] += edge.flow;
      balance[edge.to] -= edge.flow;
    }
    assert.equal(balance[network.source], step.value);
    assert.equal(balance[network.sink], -step.value);
    for (const vertex of network.vertices) if (![network.source, network.sink].includes(vertex)) assert.equal(balance[vertex], 0);
    if (step.kind === "augment") {
      assert.equal(step.value, previousValue + step.bottleneck);
      assert.equal(step.path[0].from, network.source);
      assert.equal(step.path.at(-1).to, network.sink);
      assert.equal(step.bottleneck, Math.min(...step.path.map(arc => arc.available)));
      for (let i = 1; i < step.path.length; i++) assert.equal(step.path[i - 1].to, step.path[i].from);
      for (const arc of step.path) {
        const before = result.steps[index - 1].edges.find(edge => edge.id === arc.edgeId);
        assert.equal(arc.available, arc.direction === 1 ? before.capacity - before.flow : before.flow);
        const after = step.edges.find(edge => edge.id === arc.edgeId);
        assert.equal(after.flow, before.flow + arc.direction * step.bottleneck);
      }
    }
    previousValue = step.value;
  }
  const final = result.steps.at(-1);
  assert.equal(final.kind, "complete");
  assert.equal(result.maximumFlow, cutOracle(network));
  assert.equal(final.cut.capacity, result.maximumFlow);
  assert.equal(final.cut.netFlow, result.maximumFlow);
  assert.ok(final.cut.sourceSide.includes(network.source));
  assert.ok(final.cut.sinkSide.includes(network.sink));
  for (const arc of final.residual) {
    assert.ok(!(final.cut.sourceSide.includes(arc.from) && final.cut.sinkSide.includes(arc.to)));
  }
}

test("rerouting cancels one exact original edge and increases total flow", () => {
  const result = solveNetwork(PRESETS[0]);
  assert.equal(result.maximumFlow, 2);
  assert.equal(result.augmentationCount, 2);
  assert.deepEqual(result.steps[1].path.map(a => a.from).concat("T"), ["S", "A", "C", "T"]);
  assert.deepEqual(result.steps[2].path.map(a => a.from).concat("T"), ["S", "B", "C", "A", "D", "T"]);
  const cancelled = result.steps[2].path.filter(a => a.direction === -1);
  assert.deepEqual(cancelled.map(a => [a.edgeId, a.from, a.to, a.available]), [["e3", "C", "A", 1]]);
  assert.deepEqual(result.steps[2].changes.find(c => c.edgeId === "e3"), { edgeId: "e3", before: 1, after: 0, delta: -1 });
  assert.equal(result.steps[1].edges[2].flow, 1);
  assert.equal(result.steps[2].edges[2].flow, 0);
  receive(result);
});

test("all worked presets meet independent cuts and conservation", () => {
  assert.deepEqual(PRESETS.map(p => solveNetwork(p).maximumFlow), [2, 6, 5, 0]);
  for (const preset of PRESETS) receive(solveNetwork(preset));
});

test("opposite original edge and cancellation remain two residual options", () => {
  const result = solveNetwork(PRESETS[2]);
  const options = result.steps.at(-1).residual.filter(a => a.from === "B" && a.to === "A");
  assert.deepEqual(options.map(a => [a.edgeId, a.direction, a.available]), [["e4", 1, 5], ["e3", -1, 3]]);
  assert.equal(result.steps.at(-1).edges.find(e => e.id === "e4").flow, 0);
});

test("all 4096 directed unit-capacity four-vertex networks match exhaustive cuts", () => {
  const vertices = ["S", "A", "B", "T"];
  const pairs = vertices.flatMap(from => vertices.filter(to => to !== from).map(to => ({ from, to })));
  for (let mask = 0; mask < 2 ** pairs.length; mask++) {
    const edges = pairs.flatMap((pair, index) => mask & (1 << index) ? [{ ...pair, capacity: 1 }] : []);
    receive(solveNetwork({ vertices, source: "S", sink: "T", edges }));
  }
});

test("seeded integer networks up to eight vertices match cut enumeration", () => {
  let state = 728391;
  const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state; };
  for (let sample = 0; sample < 320; sample++) {
    const count = 2 + sample % 7;
    const vertices = Array.from({ length: count }, (_, i) => "v" + i);
    const source = vertices[sample % count], sink = vertices[(sample + 1) % count];
    const edges = [];
    for (const from of vertices) for (const to of vertices) {
      if (from !== to && random() % 3 !== 0) edges.push({ from, to, capacity: random() % 100 });
    }
    const network = { vertices, source, sink, edges };
    const result = solveNetwork(network);
    receive(result);
    assert.equal(solveNetwork({ ...network, edges: [...edges].reverse() }).maximumFlow, result.maximumFlow);
  }
});

test("empty, direct, zero and irrelevant source/sink reverse edges", () => {
  const base = { vertices: ["S", "T"], source: "S", sink: "T", edges: [] };
  assert.equal(solveNetwork(base).maximumFlow, 0);
  assert.equal(solveNetwork({ ...base, edges: [{ from: "S", to: "T", capacity: 99 }] }).maximumFlow, 99);
  assert.equal(solveNetwork({ ...base, edges: [{ from: "T", to: "S", capacity: 99 }] }).maximumFlow, 0);
  assert.equal(solveNetwork({ ...base, edges: [{ from: "S", to: "T", capacity: 0 }] }).maximumFlow, 0);
});

test("input and every retained snapshot are detached and immutable", () => {
  const input = structuredClone(PRESETS[0]);
  const result = solveNetwork(input);
  const before = JSON.stringify(result);
  input.vertices[0] = "changed"; input.edges[0].capacity = 99;
  assert.equal(JSON.stringify(result), before);
  assert.throws(() => { result.steps[1].edges[0].flow = 99; }, TypeError);
  assert.throws(() => { result.steps[1].path[0].available = 99; }, TypeError);
  assert.throws(() => result.network.vertices.push("X"), TypeError);
  assert.equal(JSON.stringify(solveNetwork(PRESETS[0])), before);
});

test("structural and numeric refusals happen before solving", () => {
  const copy = () => structuredClone(PRESETS[0]);
  for (const invalid of [null, [], {}, { ...copy(), vertices: ["S"] }, { ...copy(), vertices: ["S", "S"] },
    { ...copy(), source: "T" }, { ...copy(), source: "missing" }, { ...copy(), sink: null },
    { ...copy(), vertices: Array.from({ length: 9 }, (_, i) => "v" + i) },
    { ...copy(), vertices: ["S", "<script>"] }, { ...copy(), edges: null }]) assert.throws(() => solveNetwork(invalid));
  for (const capacity of [-1, 100, 1.5, NaN, Infinity, "2", null, true]) {
    const input = copy(); input.edges[0].capacity = capacity; assert.throws(() => solveNetwork(input));
  }
  for (const edge of [{ from: "S", to: "S", capacity: 1 }, { from: "S", to: "X", capacity: 1 }, null]) {
    const input = copy(); input.edges.push(edge); assert.throws(() => solveNetwork(input));
  }
  const duplicate = copy(); duplicate.edges.push({ ...duplicate.edges[0] }); assert.throws(() => solveNetwork(duplicate), /Duplicate/);
});

test("text parsing and observation downloads preserve the applied inputs", () => {
  const text = networkText(PRESETS[0]);
  const network = parseNetwork(text.vertices, text.edges.replaceAll("\n", "\r\n"), text.source, text.sink);
  assert.deepEqual(network, validateNetwork(PRESETS[0]));
  for (const invalid of ["S A 1e1", "S A 2.0", "S A -1", "S A", "S A 1 extra"]) {
    assert.throws(() => parseNetwork(text.vertices, invalid, text.source, text.sink));
  }
  const result = solveNetwork(network);
  const observation = JSON.parse(observationJSON(result, 2));
  assert.equal(observation.selectedStep, 2);
  assert.deepEqual(observation.trace, result);
  for (const step of [-1, 1.2, result.steps.length, "1", NaN]) assert.throws(() => observationJSON(result, step));
  assert.throws(() => parseNetwork("a".repeat(8193), "", "S", "T"));
});

test("original course is accepted by the unchanged native deck validator", () => {
  const course = parseDeck(readFileSync(new URL("../courses/network-flow.json", import.meta.url), "utf8"));
  assert.equal(course.items.length, 14);
  assert.equal(course.concepts.length, 5);
  assert.ok(course.items.every(item => item.explanation.length > 100 && item.transfer.length > 30));
});

test("the standalone explorer matches its exact maintained inputs", () => {
  execFileSync(process.execPath, [fileURLToPath(new URL("../tools/build-network-flow.mjs", import.meta.url)), "--check"]);
});
