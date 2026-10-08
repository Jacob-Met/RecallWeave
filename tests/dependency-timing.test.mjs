// Independent mathematical regression, frozen before implementation inspection.
import test from "node:test";
import * as timingModel from "../src/dependency-timing.mjs";
const {MAX_JOB_DURATION, analyzeTiming} = timingModel;
// Independent receiver: frozen before inspecting the timing implementation.
// Full path enumeration, rather than forward/backward scheduling passes.
import assert from 'node:assert/strict';

export function graphReference(graph) {
  const {jobs, edges} = graph;
  const index = new Map(jobs.map((job, i) => [job, i]));
  const paths = jobs.map(() => jobs.map(() => false));
  for (const [a, b] of edges) paths[index.get(a)][index.get(b)] = true;
  for (let k = 0; k < jobs.length; k++)
    for (let i = 0; i < jobs.length; i++)
      for (let j = 0; j < jobs.length; j++)
        paths[i][j] ||= paths[i][k] && paths[k][j];
  const members = jobs.map((_, i) => i).filter(i => paths[i][i]);
  const cycleMembers = members.map(i => jobs[i]);
  const seen = new Set(), cycleComponents = [];
  for (const i of members) if (!seen.has(i)) {
    const component = members.filter(j => paths[i][j] && paths[j][i]);
    component.forEach(j => seen.add(j));
    cycleComponents.push(component.map(j => jobs[j]));
  }
  const blockedByCycle = jobs.filter((job, i) =>
    !cycleMembers.includes(job) && members.some(j => paths[j][i]));
  const rows = jobs.map(job => {
    const prerequisites = jobs.filter(a => edges.some(([u, v]) => u === a && v === job));
    return {job, prerequisites, unmet: [...prerequisites],
      status: cycleMembers.includes(job) ? 'cycle' : blockedByCycle.includes(job) ? 'blocked'
        : prerequisites.length ? 'waiting' : 'ready'};
  });
  return {completed: [], ready: rows.filter(row => !row.unmet.length).map(row => row.job),
    cycleComponents, cycleMembers, blockedByCycle, rows, remaining: [...jobs], finished: false};
}

export function pathReference(graph, durationEntries) {
  const graphAnalysis = graphReference(graph);
  const durationMap = new Map(durationEntries.map(({job, duration}) => [job, duration === 0 ? 0 : duration]));
  const durations = graph.jobs.map(job => ({job, duration: durationMap.get(job)}));
  if (graphAnalysis.cycleMembers.length) return {graphAnalysis, durations, timing: null, maximalPaths: []};
  const index = new Map(graph.jobs.map((job, i) => [job, i]));
  const outgoing = new Map(graph.jobs.map(job => [job,
    graph.jobs.filter(other => graph.edges.some(([u, v]) => u === job && v === other))]));
  const starts = graph.jobs.filter(job => !graph.edges.some(([, v]) => v === job));
  const maximalPaths = [];
  function visit(path) {
    const next = outgoing.get(path.at(-1));
    if (!next.length) { maximalPaths.push(path); return; }
    for (const job of next) {
      assert(!path.includes(job), 'Path enumeration received a cyclic graph');
      visit([...path, job]);
    }
  }
  starts.forEach(job => visit([job]));
  assert(maximalPaths.length);
  const sum = names => names.reduce((n, job) => n + durationMap.get(job), 0);
  const projectDuration = Math.max(...maximalPaths.map(sum));
  const criticalPaths = maximalPaths.filter(path => sum(path) === projectDuration);
  const criticalNodes = new Set(criticalPaths.flat());
  const criticalPairs = new Set(criticalPaths.flatMap(path =>
    path.slice(1).map((job, i) => JSON.stringify([path[i], job]))));
  const rows = graph.jobs.map(job => {
    const through = maximalPaths.filter(path => path.includes(job));
    assert(through.length);
    const earliestStart = Math.max(...through.map(path => sum(path.slice(0, path.indexOf(job)))));
    const suffix = Math.max(...through.map(path => sum(path.slice(path.indexOf(job)))));
    const duration = durationMap.get(job);
    const latestStart = projectDuration - suffix;
    const totalSlack = latestStart - earliestStart;
    const critical = criticalNodes.has(job);
    assert(totalSlack >= 0);
    assert.equal(critical, totalSlack === 0, 'Independent path/slack definitions disagree');
    return {job, duration, earliestStart, earliestFinish: earliestStart + duration,
      latestStart, latestFinish: latestStart + duration, totalSlack, critical};
  });
  const criticalJobs = graph.jobs.filter(job => criticalNodes.has(job));
  const criticalEdges = graph.edges.filter(edge => criticalPairs.has(JSON.stringify(edge)))
    .map(edge => [...edge]).sort((a, b) => index.get(a[0]) - index.get(b[0]) || index.get(a[1]) - index.get(b[1]));
  return {graphAnalysis, durations,
    timing: {projectDuration, rows, criticalJobs, criticalEdges}, maximalPaths};
}

// Independent calibration for <=3 small jobs: enumerate every integer start
// vector in [0,sum(durations)], then inspect every minimum-makespan schedule.
export function scheduleReference(graph, durationEntries) {
  assert(graph.jobs.length <= 3);
  assert(!graphReference(graph).cycleMembers.length);
  const durations = new Map(durationEntries.map(({job, duration}) => [job, duration]));
  const bound = durationEntries.reduce((n, x) => n + x.duration, 0);
  assert(bound <= 6);
  const index = new Map(graph.jobs.map((job, i) => [job, i]));
  let best = Infinity, schedules = [];
  const visit = vector => {
    if (vector.length < graph.jobs.length) {
      for (let start = 0; start <= bound; start++) visit([...vector, start]);
      return;
    }
    if (graph.edges.some(([a, b]) => vector[index.get(a)] + durations.get(a) > vector[index.get(b)])) return;
    const finish = Math.max(...graph.jobs.map((job, i) => vector[i] + durations.get(job)));
    if (finish < best) { best = finish; schedules = []; }
    if (finish === best) schedules.push(vector);
  };
  visit([]);
  assert(schedules.length);
  return {projectDuration: best, rows: graph.jobs.map((job, i) => ({job,
    earliestStart: Math.min(...schedules.map(row => row[i])),
    latestStart: Math.max(...schedules.map(row => row[i]))}))};
}

export function* threeJobGraphs() {
  const jobs = ['Third', 'First', 'Second'];
  const possible = jobs.flatMap(a => jobs.map(b => [a, b]));
  for (let mask = 0; mask < 512; mask++)
    yield {jobs: [...jobs], edges: possible.filter((_, i) => mask & (1 << i)).reverse()};
}

export function* durationVectors(jobs, alphabet = [0, 1, 2]) {
  function* visit(prefix) {
    if (prefix.length === jobs.length) {
      yield jobs.map((job, i) => ({job, duration: prefix[i]})).reverse(); return;
    }
    for (const value of alphabet) yield* visit([...prefix, value]);
  }
  yield* visit([]);
}

export function* fiveJobDags() {
  const topological = ['A', 'B', 'C', 'D', 'E'];
  const jobs = ['E', 'C', 'A', 'D', 'B'];
  const possible = topological.flatMap((a, i) => topological.slice(i + 1).map(b => [a, b]));
  for (let mask = 0; mask < 1024; mask++) {
    const edges = possible.filter((_, i) => mask & (1 << i)).reverse();
    const durations = jobs.map((job, i) => ({job, duration: (mask >> i) % 4})).reverse();
    yield {graph: {jobs: [...jobs], edges}, durations};
  }
}

export const tiedFixture = {
  graph: {jobs: ['Finish', 'Right', '__proto__', 'Left', 'Detached'],
    edges: [['Right', 'Finish'], ['__proto__', 'Finish'], ['__proto__', 'Left'], ['Left', 'Finish'], ['__proto__', 'Right']]},
  durations: [{job: 'Left', duration: 2}, {job: 'Detached', duration: 0},
    {job: 'Finish', duration: 3}, {job: '__proto__', duration: 0}, {job: 'Right', duration: 2}],
  expected: {projectDuration: 5,
    rows: [
      {job: 'Finish', duration: 3, earliestStart: 2, earliestFinish: 5, latestStart: 2, latestFinish: 5, totalSlack: 0, critical: true},
      {job: 'Right', duration: 2, earliestStart: 0, earliestFinish: 2, latestStart: 0, latestFinish: 2, totalSlack: 0, critical: true},
      {job: '__proto__', duration: 0, earliestStart: 0, earliestFinish: 0, latestStart: 0, latestFinish: 0, totalSlack: 0, critical: true},
      {job: 'Left', duration: 2, earliestStart: 0, earliestFinish: 2, latestStart: 0, latestFinish: 2, totalSlack: 0, critical: true},
      {job: 'Detached', duration: 0, earliestStart: 0, earliestFinish: 0, latestStart: 5, latestFinish: 5, totalSlack: 5, critical: false}],
    criticalJobs: ['Finish', 'Right', '__proto__', 'Left'],
    criticalEdges: [['Right', 'Finish'], ['__proto__', 'Right'], ['__proto__', 'Left'], ['Left', 'Finish']]}
};


export function deeplyFrozen(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  assert(Object.isFrozen(value), 'Every returned object and array must be frozen');
  for (const key of Reflect.ownKeys(value)) deeplyFrozen(value[key], seen);
}

function inputFreezeFlags(value, out = [], seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return out;
  seen.add(value); out.push([value, Object.isFrozen(value)]);
  for (const key of Reflect.ownKeys(value)) inputFreezeFlags(value[key], out, seen);
  return out;
}

export function assertTiming(analyzeTiming, reference, graph, durations) {
  const beforeGraph = structuredClone(graph), beforeDurations = structuredClone(durations);
  const flags = inputFreezeFlags(graph).concat(inputFreezeFlags(durations));
  const expected = reference(graph, durations);
  const result = analyzeTiming(graph, durations);
  assert.deepEqual(Object.keys(result).sort(), ['durations', 'graph', 'graphAnalysis', 'timing']);
  assert.deepEqual(result.graph, {jobs: graph.jobs, edges: graph.edges});
  assert.deepEqual(result.durations, expected.durations);
  assert.deepEqual(result.graphAnalysis, expected.graphAnalysis);
  assert.deepEqual(result.timing, expected.timing);
  assert.deepEqual(graph, beforeGraph, 'Input graph changed');
  assert.deepEqual(durations, beforeDurations, 'Input duration entries changed');
  flags.forEach(([object, wasFrozen]) => assert.equal(Object.isFrozen(object), wasFrozen, 'Caller input was frozen'));
  assert.notEqual(result.graph, graph);
  assert.notEqual(result.graph.jobs, graph.jobs);
  assert.notEqual(result.graph.edges, graph.edges);
  graph.edges.forEach((edge, i) => assert.notEqual(result.graph.edges[i], edge));
  assert.notEqual(result.durations, durations);
  result.durations.forEach(row => durations.forEach(input => assert.notEqual(row, input)));
  deeplyFrozen(result);
  return result;
}

export function malformedDurations() {
  const ordinary = () => [{job: 'A', duration: 1}, {job: 'B', duration: 0}];
  const values = [undefined, null, true, false, '', '0', '1', NaN, Infinity, -Infinity,
    -1, -0.25, 0.5, 1000001, Number.MAX_SAFE_INTEGER, new Number(1), 1n, Symbol('duration')];
  const cases = values.map((value, index) => ({name: `invalid-number-${index}`, make: () =>
    [{job: 'A', duration: value}, {job: 'B', duration: 0}]}));
  cases.push(
    {name: 'not-array-null', make: () => null},
    {name: 'not-array-undefined', make: () => undefined},
    {name: 'object-map', make: () => ({A: 1, B: 0})},
    {name: 'map-object', make: () => new Map([['A', 1], ['B', 0]])},
    {name: 'empty', make: () => []},
    {name: 'missing-job', make: () => ordinary().slice(0, 1)},
    {name: 'extra-entry', make: () => [...ordinary(), {job: 'A', duration: 2}]},
    {name: 'duplicate-replaces-job', make: () => [{job: 'A', duration: 1}, {job: 'A', duration: 0}]},
    {name: 'unknown-job', make: () => [{job: 'Unknown', duration: 1}, {job: 'B', duration: 0}]},
    {name: 'outer-space-job', make: () => [{job: ' A', duration: 1}, {job: 'B', duration: 0}]},
    {name: 'case-distinct-job', make: () => [{job: 'a', duration: 1}, {job: 'B', duration: 0}]},
    {name: 'missing-duration', make: () => [{job: 'A'}, {job: 'B', duration: 0}]},
    {name: 'missing-job-field', make: () => [{duration: 1}, {job: 'B', duration: 0}]},
    {name: 'entry-null', make: () => [null, {job: 'B', duration: 0}]},
    {name: 'entry-array', make: () => [['A', 1], {job: 'B', duration: 0}]},
    {name: 'entry-inherited-fields', make: () => [Object.create({job: 'A', duration: 1}), {job: 'B', duration: 0}]},
    {name: 'entry-inherited-job', make: () => [Object.assign(Object.create({job: 'A'}), {duration: 1}), {job: 'B', duration: 0}]},
    {name: 'entry-extra-field', make: () => [{job: 'A', duration: 1, note: 'extra'}, {job: 'B', duration: 0}]},
    {name: 'entry-extra-symbol', make: () => {const xs = ordinary(); xs[0][Symbol('extra')] = 1; return xs;}},
    {name: 'entry-extra-nonenumerable', make: () => {const xs = ordinary(); Object.defineProperty(xs[0], 'extra', {value: 1}); return xs;}},
    {name: 'sparse-entries', make: () => {const xs = Array(2); xs[0] = {job: 'A', duration: 1}; return xs;}}
  );
  return cases;
}

export function eightJobFixtures() {
  const jobs = ['H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];
  const chain = [...jobs].reverse().slice(1).map((job, i) => [[...jobs].reverse()[i], job]);
  const ascending = [...jobs].reverse();
  const dense = ascending.flatMap((job, i) => ascending.slice(i + 1).map(next => [job, next]));
  const entries = duration => jobs.map(job => ({job, duration}));
  return [
    {name: 'maximum-chain', graph: {jobs, edges: chain}, durations: entries(1000000), total: 8000000, tight: 7},
    {name: 'maximum-dense', graph: {jobs, edges: dense.reverse()}, durations: entries(1000000), total: 8000000, tight: 7},
    {name: 'independent-maximum', graph: {jobs, edges: []}, durations: entries(1000000), total: 1000000, tight: 0},
    {name: 'all-zero-dense', graph: {jobs, edges: dense}, durations: entries(0), total: 0, tight: 28},
    {name: 'all-zero-independent', graph: {jobs, edges: []}, durations: entries(0), total: 0, tight: 0},
    {name: 'all-64-edges-cyclic', graph: {jobs, edges: jobs.flatMap(a => jobs.map(b => [a, b]))}, durations: entries(1000000), total: null}
  ];
}
// Maintained regression groups. Oracles above were independently frozen before
// the product timing implementation was inspected.
test('timing exports the admitted API and preserves every tied critical branch', () => {
  assert.deepEqual(Object.keys(timingModel).sort(), ['MAX_JOB_DURATION', 'analyzeTiming']);
  assert.equal(MAX_JOB_DURATION, 1000000);
  const f = structuredClone(tiedFixture);
  const r = assertTiming(analyzeTiming, pathReference, f.graph, f.durations);
  assert.deepEqual(r.timing, f.expected);
  assert(!r.timing.criticalEdges.some(([u, v]) => u === '__proto__' && v === 'Finish'));
});

test('all three-job DAGs and binary duration vectors match enumerated maximal paths', () => {
  let graphs = 0, examples = 0;
  for (const graph of threeJobGraphs()) {
    if (graphReference(graph).cycleMembers.length) continue;
    graphs++;
    for (const durations of durationVectors(graph.jobs, [0, 1])) {
      assertTiming(analyzeTiming, pathReference, graph, durations); examples++;
    }
  }
  assert.deepEqual({graphs, examples}, {graphs: 25, examples: 200});
});

test('zero milestones and disconnected jobs use the global project deadline', () => {
  const graph = {jobs: ['Short', 'Long', 'Zero', 'End'], edges: [['Short', 'End']]};
  const d = [{job: 'Long', duration: 5}, {job: 'End', duration: 1},
    {job: 'Short', duration: 1}, {job: 'Zero', duration: -0}];
  const r = assertTiming(analyzeTiming, pathReference, graph, d);
  assert.equal(r.timing.projectDuration, 5);
  assert.deepEqual(r.timing.rows.map(row => row.totalSlack), [3, 0, 5, 3]);
  assert.deepEqual(r.timing.criticalJobs, ['Long']);
  assert.deepEqual(r.timing.criticalEdges, []);
  assert.equal(Object.is(r.durations.find(row => row.job === 'Zero').duration, -0), false);
  assert.equal(Object.is(d.find(row => row.job === 'Zero').duration, -0), true);
});

test('eight-job bounds retain exact integer arithmetic and all tight zero branches', () => {
  for (const f of eightJobFixtures()) {
    const r = assertTiming(analyzeTiming, pathReference, structuredClone(f.graph), structuredClone(f.durations));
    if (f.total === null) { assert.equal(r.timing, null); continue; }
    assert.equal(r.timing.projectDuration, f.total, f.name);
    assert.equal(r.timing.criticalEdges.length, f.tight, f.name);
    assert.equal(r.timing.criticalJobs.length, 8, f.name);
  }
});

test('cyclic projects retain separate SCC, blocked-descendant and ready-job explanations', () => {
  const graph = {jobs: ['Tail', 'A', 'Free', 'B', 'C', 'D', 'Out', 'Lead'],
    edges: [['A', 'B'], ['B', 'A'], ['B', 'Tail'], ['C', 'D'], ['D', 'C'], ['D', 'Out'], ['Lead', 'A']]};
  const r = assertTiming(analyzeTiming, pathReference, graph,
    graph.jobs.map((job, i) => ({job, duration: i % 2})));
  assert.equal(r.timing, null);
  assert.deepEqual(r.graphAnalysis.cycleComponents, [['A', 'B'], ['C', 'D']]);
  assert.deepEqual(r.graphAnalysis.cycleMembers, ['A', 'B', 'C', 'D']);
  assert.deepEqual(r.graphAnalysis.blockedByCycle, ['Tail', 'Out']);
  assert.deepEqual(r.graphAnalysis.ready, ['Free', 'Lead']);
});

test('duration records are complete, exact-own-key, strict integer inputs even for cycles', () => {
  const graphs = [{jobs: ['A', 'B'], edges: [['A', 'B']]}, {jobs: ['A', 'B'], edges: [['A', 'A']]}];
  for (const f of malformedDurations()) for (const graph of graphs)
    assert.throws(() => analyzeTiming(graph, f.make()), undefined, f.name);
  const nullRecord = Object.assign(Object.create(null), {job: 'A', duration: 0});
  const nonenumerable = Object.create(null);
  Object.defineProperties(nonenumerable, {job: {value: 'A'}, duration: {value: 0}});
  for (const record of [nullRecord, nonenumerable]) {
    const r = analyzeTiming({jobs: ['A'], edges: []}, [record]);
    assert.deepEqual(r.timing, pathReference({jobs: ['A'], edges: []}, [{job: 'A', duration: 0}]).timing);
    deeplyFrozen(r);
  }
});

test('literal Unicode and prototype-like job names preserve exact identities and order', () => {
  const jobs = ['__proto__', 'constructor', '<b>Plan</b>', '工程🔧', 'é', 'é', 'a', 'A'];
  const graph = {jobs, edges: [['__proto__', 'constructor'], ['工程🔧', 'é'], ['é', 'é']]};
  const durations = jobs.map((job, i) => ({job, duration: i % 3})).reverse();
  assertTiming(analyzeTiming, pathReference, graph, durations);
  const longest = '🧭'.repeat(32);
  assertTiming(analyzeTiming, pathReference, {jobs: [longest], edges: []}, [{job: longest, duration: 0}]);
});

test('graph refusal remains delegated to the unchanged original admission contract', () => {
  const graphs = [null, {jobs: [], edges: []}, {jobs: ['A', 'A'], edges: []},
    {jobs: ['A'], edges: [['A', 'Unknown']]}, {jobs: ['A'], edges: [['A', 'A'], ['A', 'A']]},
    {jobs: ['A\u0085B'], edges: []}, {jobs: [' A'], edges: []},
    {jobs: ['A'], edges: Array(65).fill(['A', 'A'])}];
  graphs.forEach(graph => assert.throws(() => analyzeTiming(graph, [{job: 'A', duration: 0}])));
});

test('returned timing is detached and deeply frozen without freezing caller input', () => {
  const f = structuredClone(tiedFixture);
  const r = assertTiming(analyzeTiming, pathReference, f.graph, f.durations), old = JSON.stringify(r);
  f.graph.jobs[0] = 'Changed'; f.graph.edges[0][0] = 'Changed'; f.durations[0].duration = 99;
  assert.equal(JSON.stringify(r), old);
  assert.throws(() => {r.timing.rows[0].totalSlack = 99;}, TypeError);
  assert.throws(() => r.timing.criticalEdges[0].push('Changed'), TypeError);
  const graph = Object.freeze({jobs: Object.freeze(['A']), edges: Object.freeze([])});
  const durations = Object.freeze([Object.freeze({job: 'A', duration: 0})]);
  assertTiming(analyzeTiming, pathReference, graph, durations);
});

// Receiving addendum, 2026-10-08: root explicitly clarified ordinary own
// data descriptors after the original independent mathematical oracle freeze.
// This file adds admission checks only; the frozen path oracle is unchanged.

export function checkOrdinaryDurationRecords(analyzeTiming) {
  const cases = [];
  const job = 'constructor', end = '工程🔧';
  const hooks = {get: 0, set: 0, primitive: 0};
  const zeroHooks = () => assert.deepEqual(hooks, {get: 0, set: 0, primitive: 0},
    'Admission must not invoke record accessors or value coercion hooks');
  const valueFor = field => field === 'job' ? job : 0;
  const toxicValue = kind => {
    const value = kind === 'boxed-number' ? new Number(0) :
      kind === 'boxed-string' ? new String(job) : {};
    Object.defineProperties(value, {
      [Symbol.toPrimitive]: {value() { hooks.primitive++; throw new Error('coercion ran'); }},
      valueOf: {value() { hooks.primitive++; throw new Error('valueOf ran'); }},
      toString: {value() { hooks.primitive++; throw new Error('toString ran'); }}
    });
    return value;
  };
  const unchanged = (record, descriptors, frozen) => {
    assert.deepEqual(Reflect.ownKeys(record), Reflect.ownKeys(descriptors));
    const after = Object.getOwnPropertyDescriptors(record);
    for (const key of Reflect.ownKeys(descriptors)) {
      assert.deepEqual(Reflect.ownKeys(after[key]), Reflect.ownKeys(descriptors[key]));
      for (const attr of Reflect.ownKeys(descriptors[key]))
        assert.equal(after[key][attr], descriptors[key][attr], 'Input descriptor changed');
    }
    assert.equal(Object.isFrozen(record), frozen, 'Caller record freezing changed');
  };
  const run = (name, make, accept) => {
    for (const cyclic of [false, true]) {
      const graph = {jobs: [job, end], edges: cyclic ? [[job, job]] : [[job, end]]};
      const beforeGraph = JSON.stringify(graph);
      const record = make(), second = {job: end, duration: 2};
      const entries = [record, second], descriptors = Object.getOwnPropertyDescriptors(record);
      const frozen = Object.isFrozen(record);
      if (accept) {
        const result = analyzeTiming(graph, entries);
        assert.deepEqual(result.durations, [{job, duration: 0}, {job: end, duration: 2}]);
        assert.equal(Object.is(result.durations[0].duration, -0), false);
        assert.notEqual(result.durations[0], record);
        assert(Object.isFrozen(result) && Object.isFrozen(result.durations) &&
          Object.isFrozen(result.durations[0]));
        if (cyclic) {
          assert.equal(result.timing, null);
          assert.deepEqual(result.graphAnalysis.cycleMembers, [job]);
          assert.deepEqual(result.graphAnalysis.blockedByCycle, []);
        } else {
          assert.equal(result.timing.projectDuration, 2);
          assert.deepEqual(result.timing.criticalEdges, [[job, end]]);
        }
      } else assert.throws(() => analyzeTiming(graph, entries));
      zeroHooks();
      unchanged(record, descriptors, frozen);
      assert.equal(JSON.stringify(graph), beforeGraph);
      assert.equal(entries.length, 2);
      assert.equal(entries[0], record); assert.equal(entries[1], second);
      assert.deepEqual(second, {job: end, duration: 2});
      assert.equal(Object.isFrozen(entries), false);
      cases.push({name, graph: cyclic ? 'cyclic' : 'acyclic', accepted: accept,
        input_preserved: true, accessor_and_coercion_calls: 0});
    }
  };
  for (const field of ['job', 'duration']) for (const kind of
    ['getter', 'throwing-getter', 'setter-only', 'getter-and-setter']) {
    run(field + '/' + kind, () => {
      const record = {job, duration: 0};
      const descriptor = {enumerable: true, configurable: true};
      if (kind !== 'setter-only') descriptor.get = () => {
        hooks.get++; if (kind === 'throwing-getter') throw new Error('getter ran');
        return valueFor(field);
      };
      if (kind === 'setter-only' || kind === 'getter-and-setter')
        descriptor.set = () => { hooks.set++; };
      Object.defineProperty(record, field, descriptor);
      return record;
    }, false);
  }
  run('both-fields/getters', () => Object.defineProperties({}, {
    job: {get() { hooks.get++; return job; }},
    duration: {get() { hooks.get++; return 0; }}
  }), false);
  for (const [field, kind] of [
    ['job', 'object'], ['duration', 'object'],
    ['duration', 'boxed-number'], ['job', 'boxed-string']
  ]) run(field + '/' + kind + '-without-coercion', () =>
    ({job, duration: 0, [field]: toxicValue(kind)}), false);
  run('null-prototype/ordinary-negative-zero', () =>
    Object.assign(Object.create(null), {job, duration: -0}), true);
  run('nonenumerable/ordinary-negative-zero', () => Object.defineProperties({}, {
    job: {value: job}, duration: {value: -0}
  }), true);
  run('ordinary-own-data-shadows-inherited-accessors', () => {
    const inherited = Object.defineProperties({}, {
      job: {get() { hooks.get++; throw new Error('inherited getter ran'); }},
      duration: {get() { hooks.get++; throw new Error('inherited getter ran'); }}
    });
    return Object.defineProperties(Object.create(inherited), {
      job: {value: job, enumerable: true}, duration: {value: -0, enumerable: true}
    });
  }, true);
  assert.equal(cases.filter(row => !row.accepted).length, 26);
  assert.equal(cases.filter(row => row.accepted).length, 6);
  return {cases, hooks, refusal_cases: 26, accepted_controls: 6};
}


// Dated receiving addendum (2026-10-08). The original independently frozen
// mathematical tests above remain byte-exact; ordinary descriptor admission
// was explicitly clarified by the model author after that initial freeze.
test('duration admission refuses accessors without executing getters or coercion', () => {
  const result = checkOrdinaryDurationRecords(analyzeTiming);
  assert.equal(result.refusal_cases, 26);
  assert.equal(result.accepted_controls, 6);
});

test('the checked-in timing page exactly matches the native builder output', async () => {
  const {buildDependencyTiming, dependencyTimingPath} =
    await import('../tools/build-dependency-timing.mjs');
  const {readFileSync} = await import('node:fs');
  assert.equal(buildDependencyTiming(), readFileSync(dependencyTimingPath, 'utf8'));
});
