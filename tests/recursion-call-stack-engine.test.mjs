import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {ALGORITHMS, MAX_INPUT, TRACE_FORMAT, createTrace, parseInput, snapshotAt, traceDocument} from '../courses/recursion-call-stack-core.mjs';

const fib = [0n, 1n];
for (let n = 2; n <= 11; n++) fib.push(fib[n - 1] + fib[n - 2]);
const factorial = [1n];
for (let n = 1; n <= 10; n++) factorial.push(factorial[n - 1] * BigInt(n));

test('all 33 bounded runs agree with independent numeric and invocation-count oracles', () => {
  for (let n = 0; n <= MAX_INPUT; n++) {
    for (const algorithm of Object.keys(ALGORITHMS)) {
      const run = createTrace(algorithm, n);
      const isFact = algorithm === 'factorial', isMemo = algorithm === 'memo-fibonacci';
      const calls = isFact ? n + 1 : isMemo ? (n < 2 ? 1 : 2 * n - 1) : Number(2n * fib[n + 1] - 1n);
      const computed = isMemo && n >= 2 ? n + 1 : calls;
      const maxDepth = isFact ? n + 1 : Math.max(1, n);
      assert.equal(run.result, String(isFact ? factorial[n] : fib[n]), algorithm + ':' + n);
      assert.deepEqual(run.finalCounters, {calls, computedCalls: computed, cacheHits: calls - computed, returnedCalls: calls, activeDepth: 0, maxDepth});
      assert.equal(run.steps.at(-1).complete, true);
      assert.equal(run.steps.at(-1).result, run.result);
      assert.equal(run.steps.filter(s => ['call', 'cache-hit'].includes(s.event.kind)).length, calls);
      assert.equal(run.steps.filter(s => s.event.kind === 'resolve').length, computed);
      assert.equal(run.steps.filter(s => s.event.kind === 'return').length, calls);
      assert.ok(run.steps.length <= 708, 'input bound keeps all traces at most 708 snapshots');
      assert.ok(Buffer.byteLength(JSON.stringify(traceDocument(run, run.steps.length - 1), null, 2)) < 4 * 1024 * 1024);
    }
  }
});

test('every prefix preserves stack identity, parent ownership, monotone counters, and exact return delivery', () => {
  for (let n = 0; n <= MAX_INPUT; n++) {
    for (const algorithm of Object.keys(ALGORITHMS)) {
      const run = createTrace(algorithm, n);
      const entered = new Set(), returned = new Set();
      let previous = run.steps[0];
      for (const state of run.steps) {
        const c = state.counters, event = state.event;
        assert.equal(c.calls, c.computedCalls + c.cacheHits);
        assert.equal(c.calls, c.returnedCalls + state.stack.length);
        assert.equal(c.activeDepth, state.stack.length);
        assert.ok(c.maxDepth >= c.activeDepth);
        assert.equal(new Set(state.stack.map(f => f.id)).size, state.stack.length);
        state.stack.forEach((frame, i) => {
          assert.equal(frame.parentId, i === 0 ? null : state.stack[i - 1].id);
          assert.ok(entered.has(frame.id) || (frame.id === event.frameId && ['call', 'cache-hit'].includes(event.kind)));
          assert.ok(!returned.has(frame.id));
        });
        for (const key of ['calls', 'computedCalls', 'cacheHits', 'returnedCalls', 'maxDepth']) assert.ok(c[key] >= previous.counters[key]);
        if (['call', 'cache-hit'].includes(event.kind)) {
          assert.ok(!entered.has(event.frameId));
          entered.add(event.frameId);
          assert.equal(state.stack.at(-1).id, event.frameId);
          assert.equal(state.stack.length, previous.stack.length + 1);
        }
        if (event.kind === 'return') {
          assert.equal(previous.stack.at(-1).id, event.frameId);
          assert.equal(state.stack.length, previous.stack.length - 1);
          assert.ok(!returned.has(event.frameId));
          returned.add(event.frameId);
          if (event.to === null) {
            assert.equal(state.result, event.value);
            assert.equal(state.stack.length, 0);
          } else {
            const caller = state.stack.at(-1);
            assert.equal(caller.id, event.to);
            assert.equal(caller[event.slot], event.value);
          }
        }
        for (const item of state.cache) assert.equal(item.value, String(fib[item.input]));
        assert.equal(state.result !== null, state.complete);
        previous = state;
      }
      assert.equal(entered.size, returned.size);
    }
  }
});

test('factorial unwinds in actual return order and retains each multiplication until its child returns', () => {
  const run = createTrace('factorial', 4);
  const returns = run.steps.filter(s => s.event.kind === 'return');
  assert.deepEqual(returns.map(s => s.event.input), [0, 1, 2, 3, 4]);
  assert.deepEqual(returns.map(s => s.event.value), ['1', '1', '2', '6', '24']);
  const beforeBase = run.steps.find(s => s.event.kind === 'call' && s.event.input === 0);
  assert.deepEqual(beforeBase.stack.map(f => f.input), [4, 3, 2, 1, 0]);
  assert.deepEqual(beforeBase.stack.slice(0, -1).map(f => f.pending), ['4 × factorial(3)', '3 × factorial(2)', '2 × factorial(1)', '1 × factorial(0)']);
});

test('Fibonacci completes the left child first and preserves it across the right branch', () => {
  const run = createTrace('fibonacci', 3);
  assert.deepEqual(run.steps.filter(s => s.event.kind === 'call').map(s => s.event.input), [3, 2, 1, 0, 1]);
  assert.deepEqual(run.steps.filter(s => s.event.kind === 'return').map(s => [s.event.input, s.event.value]), [[1, '1'], [0, '0'], [2, '1'], [1, '1'], [3, '2']]);
  const right = run.steps.find(s => s.event.kind === 'suspend' && s.event.frameId === 1 && s.event.line === 'right');
  assert.equal(right.stack[0].left, '1');
  assert.equal(right.stack[0].pending, '1 + F(1)');
  assert.equal(right.counters.calls, 4);
});

test('memoization starts empty, caches bases, counts cache-hit frames, and never shares a previous run', () => {
  const run = createTrace('memo-fibonacci', 5);
  assert.deepEqual(run.steps[0].cache, []);
  assert.deepEqual(run.finalCounters, {calls: 9, computedCalls: 6, cacheHits: 3, returnedCalls: 9, activeDepth: 0, maxDepth: 5});
  assert.deepEqual(run.steps.at(-1).cache.map(item => item.input), [0, 1, 2, 3, 4, 5]);
  const firstHit = run.steps.find(s => s.event.kind === 'cache-hit');
  assert.equal(firstHit.event.input, 1);
  assert.equal(firstHit.event.value, '1');
  assert.equal(firstHit.stack.at(-1).status, 'cache-hit');
  assert.equal(firstHit.counters.cacheHits, 1);
  assert.equal(run.steps[firstHit.index + 1].event.kind, 'return');
  assert.deepEqual(createTrace('memo-fibonacci', 5), run);
  assert.deepEqual(createTrace('memo-fibonacci', 0).steps.at(-1).cache, [{input: 0, value: '0'}]);
  assert.deepEqual(createTrace('memo-fibonacci', 1).steps.at(-1).cache, [{input: 1, value: '1'}]);
});

test('inspection is reversible, immutable, and exported cursor binds the exact displayed state', () => {
  for (const algorithm of Object.keys(ALGORITHMS)) {
    const run = createTrace(algorithm, 6);
    const before = JSON.stringify(run);
    for (let i = run.steps.length - 1; i >= 0; i--) assert.equal(snapshotAt(run, i), run.steps[i]);
    for (let i = 0; i < run.steps.length; i++) assert.equal(snapshotAt(run, i), run.steps[i]);
    assert.throws(() => { run.steps[1].stack[0].input = 100; }, TypeError);
    assert.throws(() => { run.steps[1].counters.calls = 100; }, TypeError);
    assert.throws(() => { run.steps.push({}); }, TypeError);
    const cursor = Math.floor(run.steps.length / 2), exported = traceDocument(run, cursor);
    assert.equal(exported.format, TRACE_FORMAT);
    assert.equal(exported.selectedStep, cursor);
    assert.equal(exported.selectedState, snapshotAt(run, cursor));
    assert.deepEqual(JSON.parse(JSON.stringify(exported)).selectedState, snapshotAt(run, cursor));
    assert.equal(exported.steps.length, run.steps.length);
    assert.equal(JSON.stringify(run), before);
    assert.throws(() => snapshotAt(JSON.parse(before), 0));
    for (const i of [-1, 0.5, run.steps.length, NaN, Infinity, '1']) assert.throws(() => snapshotAt(run, i));
  }
});

test('invalid and ambiguous input is refused before tracing', () => {
  for (const value of ['', ' ', '-1', '+1', '01', '1.0', '1e0', '11', '999999999999999999', '١', '1x', null, undefined, 1]) assert.throws(() => parseInput(value));
  for (const value of ['0', '5', '10', ' 3 ']) assert.equal(parseInput(value), Number(value));
  for (const value of [-1, 11, 0.5, NaN, Infinity, '5', null, undefined, {}, [], 5n]) assert.throws(() => createTrace('factorial', value));
  for (const algorithm of ['__proto__', 'constructor', '', 'memo', null, undefined]) assert.throws(() => createTrace(algorithm, 4));
});

test('checked-in direct-file page reproduces exactly and contains no runtime module imports', async () => {
  const root = new URL('../', import.meta.url);
  const checked = spawnSync(process.execPath, ['tools/build_recursion_call_stack.mjs', '--check'], {cwd: root, encoding: 'utf8'});
  assert.equal(checked.status, 0, checked.stdout + checked.stderr);
  const html = await readFile(new URL('courses/recursion-call-stack-explorer.html', root), 'utf8');
  assert.equal((html.match(/id="course-data"/g) ?? []).length, 1);
  assert.ok(!html.includes("from './recursion-call-stack-core.mjs'"));
  assert.ok(!html.includes('<!-- RECURSION_'));
  const embedded = html.match(/<script type="application\/json" id="course-data">([\s\S]*?)<\/script>/)[1];
  const course = await readFile(new URL('courses/recursion-call-stack.json', root), 'utf8');
  assert.equal(JSON.stringify(JSON.parse(embedded), null, 2) + '\n', course);
});
