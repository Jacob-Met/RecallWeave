import test from "node:test";
import assert from "node:assert/strict";
import {
  LIMITS, PRESETS, validateProblem, parseProblem, problemFields, solveProblem, observationJSON
} from "../src/linear-programming.mjs";

const preset = id => PRESETS.find(value => value.id === id).problem;
const clone = value => JSON.parse(JSON.stringify(value));
const coordinates = result => result.vertices.map(v => [v.x, v.y]);
const geometry = result => ({
  points: result.vertices.map(v => [v.x, v.y, v.objective, v.optimal]),
  kind: result.region.kind, optimum: result.optimum && [result.optimum.value, result.optimum.kind, result.optimum.wholeRegion]
});
const boxOnly = (bounds = { xmin: 0, xmax: 4, ymin: 0, ymax: 4 }, objective = { p: 1, q: 1, sense: "max" }) =>
  ({ bounds, constraints: [], objective });
function everyFrozen(value) {
  if (value && typeof value === "object") {
    assert.ok(Object.isFrozen(value));
    Object.values(value).forEach(everyFrozen);
  }
}

test("an admitted mathematical rectangle is required and copied", () => {
  const input = clone(preset("unique"));
  const admitted = validateProblem(input);
  assert.deepEqual(admitted, input);
  everyFrozen(admitted);
  input.bounds.xmin = 3; input.constraints[0].c = -100;
  assert.equal(admitted.bounds.xmin, 0);
  assert.equal(admitted.constraints[0].c, 4);
  assert.throws(() => validateProblem({ constraints: [], objective: { p: 0, q: 0, sense: "min" } }));
  for (const key of ["xmin", "xmax", "ymin", "ymax"]) {
    for (const bad of [-21, 21, 0.5, NaN, Infinity, "0", null, true]) {
      const input = boxOnly(); input.bounds[key] = bad;
      assert.throws(() => validateProblem(input), key + " " + bad);
    }
  }
  for (const bounds of [
    { xmin: 2, xmax: 1, ymin: 0, ymax: 1 },
    { xmin: 0, xmax: 1, ymin: 2, ymax: 1 }
  ]) assert.throws(() => validateProblem(boxOnly(bounds)));
});

test("all coefficient and shape boundaries are checked before solving", () => {
  for (const key of ["a", "b", "c"]) for (const bad of [-101, 101, 0.1, NaN, Infinity, null, true, "1"]) {
    const input = clone(preset("unique")); input.constraints[0][key] = bad;
    assert.throws(() => solveProblem(input));
  }
  for (const key of ["p", "q"]) for (const bad of [-101, 101, -Infinity, NaN, "1"]) {
    const input = clone(preset("unique")); input.objective[key] = bad;
    assert.throws(() => solveProblem(input));
  }
  const maximum = boxOnly({ xmin: -20, xmax: 20, ymin: -20, ymax: 20 }, { p: -100, q: 100, sense: "min" });
  maximum.constraints = Array.from({ length: 8 }, () => ({ a: 100, b: -100, c: 100 }));
  assert.equal(solveProblem(maximum).pairs.length, 66);
  maximum.constraints.push({ a: 0, b: 0, c: 0 });
  assert.throws(() => solveProblem(maximum));
  for (const mutate of [
    p => { p.objective.sense = "MAX"; },
    p => { p.constraints = new Array(1); },
    p => { p.constraints = {}; },
    p => { p.bounds.extra = 0; },
    p => { p.constraints[0].ignored = 1; },
    p => { p.unrecognized = true; },
    p => { p.objective.constant = 4; }
  ]) { const p = clone(preset("unique")); mutate(p); assert.throws(() => solveProblem(p)); }
});

test("signed integer text, line endings and leading zeros preserve numeric meaning", () => {
  const fields = {
    xmin: " -0 ", xmax: "+04", ymin: "00", ymax: "4",
    constraints: " 01, +1, 004\r\n\r\n2,01,5\r", p: "+3", q: "02", sense: "max"
  };
  assert.deepEqual(parseProblem(fields), preset("unique"));
  assert.equal(Object.is(parseProblem(fields).bounds.xmin, -0), false);
  assert.deepEqual(parseProblem(problemFields(preset("unique"))), preset("unique"));
  for (const bad of ["1.0", "1e0", "0x1", "1+0", "NaN", "Infinity", "--1", "", "1 0", "1".repeat(33)]) {
    assert.throws(() => parseProblem({ ...fields, p: bad }), bad);
    assert.throws(() => parseProblem({ ...fields, constraints: bad + ",1,2" }), bad);
  }
  for (const bad of ["1,2", "1,2,3,4", '"1",2,3', "# note\n1,2,3"]) {
    assert.throws(() => parseProblem({ ...fields, constraints: bad }));
  }
  assert.equal(parseProblem({ ...fields, constraints: " ".repeat(LIMITS.text) }).constraints.length, 0);
  assert.throws(() => parseProblem({ ...fields, constraints: " ".repeat(LIMITS.text + 1) }));
  assert.throws(() => parseProblem({ ...fields, constraints: Array(9).fill("0,0,0").join("\n") }));
});

test("the ordinary two-limit problem has all four vertices and unique maximum", () => {
  const result = solveProblem(preset("unique"));
  assert.deepEqual(coordinates(result), [["0", "0"], ["0", "4"], ["1", "3"], ["5/2", "0"]]);
  assert.deepEqual(result.vertices.map(v => v.objective), ["0", "8", "9", "15/2"]);
  assert.deepEqual(result.region, { kind: "polygon", boundary: ["V1", "V4", "V3", "V2"] });
  assert.deepEqual(result.optimum, { sense: "max", value: "9", kind: "point", vertices: ["V3"], wholeRegion: false });
  assert.deepEqual(result.vertices[2].active, ["C1", "C2"]);
  assert.deepEqual(result.vertices[2].slacks, [
    { id: "x-min", value: "1" }, { id: "x-max", value: "3" },
    { id: "y-min", value: "3" }, { id: "y-max", value: "1" },
    { id: "C1", value: "0" }, { id: "C2", value: "0" }
  ]);
});

test("continuous optimization retains fractional intersections and objective values", () => {
  const result = solveProblem(preset("fractional"));
  assert.deepEqual(coordinates(result), [["0", "0"], ["0", "5/2"], ["5/3", "5/3"], ["5/2", "0"]]);
  assert.equal(result.optimum.value, "10/3");
  assert.equal(result.vertices[2].slacks[0].value, "5/3");
  assert.equal(result.vertices[2].slacks[1].value, "7/3");
  assert.equal(result.pairs.find(x => x.first === "C1" && x.second === "C2").vertex, "V3");
});

test("a tied edge retains both endpoints rather than choosing an arbitrary winner", () => {
  const result = solveProblem(preset("edge"));
  assert.equal(result.optimum.value, "4");
  assert.equal(result.optimum.kind, "segment");
  assert.deepEqual(new Set(result.optimum.vertices), new Set(["V2", "V3"]));
  assert.equal(result.optimum.wholeRegion, false);
  assert.deepEqual(result.vertices.map(v => v.optimal), [false, true, true]);
  // The midpoint is also feasible and has the same value, independent of the solver.
  assert.ok(2 >= 0 && 2 <= 4 && 2 + 2 <= 4);
  assert.equal(2 + 2, 4);
});

test("zero objective identifies the whole nonempty polygon", () => {
  const result = solveProblem(preset("constant"));
  assert.equal(result.region.kind, "polygon");
  assert.equal(result.optimum.kind, "region");
  assert.equal(result.optimum.wholeRegion, true);
  assert.equal(result.optimum.value, "0");
  assert.deepEqual(new Set(result.optimum.vertices), new Set(result.vertices.map(v => v.id)));
  assert.ok(result.vertices.every(v => v.optimal));
});

test("a nonzero objective can be constant on an entire feasible segment", () => {
  const result = solveProblem(preset("line"));
  assert.deepEqual(coordinates(result), [["0", "3"], ["3", "0"]]);
  assert.equal(result.region.kind, "segment");
  assert.deepEqual(result.optimum, { sense: "min", value: "6", kind: "segment", vertices: ["V1", "V2"], wholeRegion: true });
  const varying = clone(preset("line")); varying.objective = { p: 1, q: 0, sense: "max" };
  assert.deepEqual(solveProblem(varying).optimum, { sense: "max", value: "3", kind: "point", vertices: ["V2"], wholeRegion: false });
});

test("singleton and degenerate rectangle problems remain first-class", () => {
  const point = solveProblem(preset("point"));
  assert.deepEqual(coordinates(point), [["2", "1"]]);
  assert.deepEqual(point.optimum, { sense: "min", value: "0", kind: "point", vertices: ["V1"], wholeRegion: true });
  const line = solveProblem(boxOnly({ xmin: 1, xmax: 1, ymin: -2, ymax: 3 }, { p: 2, q: 0, sense: "max" }));
  assert.deepEqual(coordinates(line), [["1", "-2"], ["1", "3"]]);
  assert.equal(line.optimum.wholeRegion, true);
  assert.equal(line.optimum.value, "2");
  const collapsed = solveProblem(boxOnly({ xmin: -2, xmax: -2, ymin: 3, ymax: 3 }, { p: 3, q: 2, sense: "min" }));
  assert.deepEqual(coordinates(collapsed), [["-2", "3"]]);
  assert.equal(collapsed.optimum.value, "0");
  assert.equal(collapsed.optimum.kind, "point");
  assert.equal(collapsed.optimum.wholeRegion, true);
});

test("infeasible is separate from zero objective and empty authored constraints", () => {
  for (const objective of [{ p: 1, q: 1, sense: "max" }, { p: 0, q: 0, sense: "min" }]) {
    const problem = clone(preset("empty")); problem.objective = objective;
    const result = solveProblem(problem);
    assert.deepEqual(result.vertices, []);
    assert.deepEqual(result.region, { kind: "empty", boundary: [] });
    assert.equal(result.optimum, null);
    assert.ok(result.pairs.some(pair => pair.kind === "intersection" && pair.violated.includes("C1")));
  }
  const uncut = solveProblem(boxOnly());
  assert.equal(uncut.vertices.length, 4);
  assert.equal(uncut.optimum.value, "8");
});

test("zero-normal tautologies and contradictions retain their own row identities", () => {
  const problem = clone(preset("unique"));
  problem.constraints.push({ a: 0, b: 0, c: 0 }, { a: 0, b: 0, c: 4 });
  const result = solveProblem(problem);
  assert.deepEqual(geometry(result), geometry(solveProblem(preset("unique"))));
  assert.ok(result.vertices.every(v => v.active.includes("C3") && !v.active.includes("C4")));
  assert.ok(result.vertices.every(v => v.slacks.find(s => s.id === "C4").value === "4"));
  assert.equal(result.pairs.filter(p => p.kind === "zero-normal").length, 13);
  problem.constraints.push({ a: 0, b: 0, c: -1 });
  const impossible = solveProblem(problem);
  assert.equal(impossible.region.kind, "empty");
  assert.ok(impossible.pairs.filter(p => p.kind === "intersection").every(p => p.violated.includes("C5")));
});

test("parallel, coincident, duplicate and multiple-active boundaries stay distinguishable", () => {
  const problem = clone(preset("edge"));
  problem.constraints.push({ a: 2, b: 2, c: 8 }, { a: 1, b: 1, c: 5 });
  const result = solveProblem(problem);
  assert.deepEqual(geometry(result), geometry(solveProblem(preset("edge"))));
  assert.equal(result.pairs.find(p => p.first === "C1" && p.second === "C2").kind, "coincident");
  assert.equal(result.pairs.find(p => p.first === "C1" && p.second === "C3").kind, "parallel");
  const vertex = result.vertices.find(v => v.x === "4" && v.y === "0");
  assert.ok(vertex.active.includes("C1") && vertex.active.includes("C2"));
  assert.ok(vertex.pairs.some(pair => pair.includes("C1")));
  assert.ok(vertex.pairs.some(pair => pair.includes("C2")));
});

test("every original boundary pair appears once, including infeasible intersections", () => {
  const result = solveProblem(preset("unique"));
  assert.equal(result.pairs.length, 15);
  const keys = new Set(result.pairs.map(p => p.first + ":" + p.second));
  assert.equal(keys.size, 15);
  for (let i = 0; i < result.boundaries.length; i += 1) for (let j = i + 1; j < result.boundaries.length; j += 1) {
    assert.ok(keys.has(result.boundaries[i].id + ":" + result.boundaries[j].id));
  }
  const outside = result.pairs.find(p => p.first === "x-max" && p.second === "y-max");
  assert.deepEqual(outside.point, { x: "4", y: "4" });
  assert.deepEqual(outside.violated, ["C1", "C2"]);
  assert.equal(outside.feasible, false);
  assert.equal(Object.hasOwn(outside, "vertex"), false);
});

test("minimization and objective negation preserve exact geometry", () => {
  const original = clone(preset("unique"));
  const min = solveProblem({ ...original, objective: { ...original.objective, sense: "min" } });
  assert.equal(min.optimum.value, "0");
  assert.deepEqual(min.optimum.vertices, ["V1"]);
  const reversed = solveProblem({ ...original, objective: { p: -3, q: -2, sense: "min" } });
  assert.deepEqual(coordinates(reversed), coordinates(solveProblem(original)));
  assert.equal(reversed.optimum.value, "-9");
  assert.deepEqual(reversed.optimum.vertices, ["V3"]);
});

test("row order and positive scaling change provenance but not the feasible optimum", () => {
  const base = preset("unique"), changed = clone(base);
  changed.constraints = changed.constraints.reverse().map(row => ({ a: 2 * row.a, b: 2 * row.b, c: 2 * row.c }));
  assert.deepEqual(geometry(solveProblem(changed)), geometry(solveProblem(base)));
  const result = solveProblem(changed);
  assert.deepEqual(result.problem.constraints, changed.constraints);
  assert.deepEqual(result.vertices.find(v => v.id === "V2").active, ["x-min", "y-max", "C2"]);
});

test("changing explicit rectangle limits changes the mathematical feasible problem", () => {
  const problem = clone(preset("fractional")); problem.bounds.xmax = 1;
  const result = solveProblem(problem);
  assert.equal(result.optimum.value, "3");
  const best = result.vertices.find(v => v.optimal);
  assert.deepEqual([best.x, best.y], ["1", "2"]);
  assert.equal(solveProblem(preset("fractional")).optimum.value, "10/3");
});

test("result and preset objects are deeply immutable and retain no caller-owned data", () => {
  const problem = clone(preset("unique")), result = solveProblem(problem);
  const saved = JSON.stringify(result);
  everyFrozen(result); everyFrozen(PRESETS);
  problem.constraints[0].a = 99; problem.bounds.xmax = 0; problem.objective.p = 0;
  assert.equal(JSON.stringify(result), saved);
  assert.throws(() => { result.vertices[0].x = "100"; }, TypeError);
  assert.throws(() => { result.pairs.push({}); }, TypeError);
  assert.throws(() => { PRESETS[0].problem.bounds.xmax = 0; }, TypeError);
});

test("observations preserve exact complete records and bind the chosen vertex", () => {
  const result = solveProblem(preset("fractional"));
  const output = observationJSON(result, "V3"), parsed = JSON.parse(output);
  assert.ok(output.endsWith("\n"));
  assert.deepEqual(parsed, { ...result, inspection: { selectedVertex: "V3" } });
  assert.equal(parsed.optimum.value, "10/3");
  assert.equal(parsed.vertices.length, 4);
  assert.equal(parsed.pairs.length, 15);
  assert.throws(() => observationJSON(result, "V99"));
  assert.equal(JSON.parse(observationJSON(solveProblem(preset("empty")))).inspection.selectedVertex, null);
});

test("a null-prototype request and literal hostile extra keys have explicit admission", () => {
  const regular = clone(preset("unique"));
  const nullPrototype = Object.assign(Object.create(null), regular);
  assert.deepEqual(validateProblem(nullPrototype), validateProblem(regular));
  const extra = JSON.parse(JSON.stringify(regular).slice(0, -1) + ',"__proto__":{"polluted":true}}');
  assert.throws(() => validateProblem(extra));
  assert.equal(Object.prototype.polluted, undefined);
});
