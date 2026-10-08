/**
 * Original bounded recursion teaching model. No I/O, random state, or shared cache.
 * All result arithmetic uses BigInt; public snapshots encode values as decimal strings.
 * Traces are immutable records created here, not a supported import/restore format.
 */
export const TRACE_FORMAT = 'recallweave-recursion-trace/1';
export const MAX_INPUT = 10;
export const ALGORITHMS = Object.freeze({
  factorial: 'Factorial',
  fibonacci: 'Fibonacci',
  'memo-fibonacci': 'Memoized Fibonacci'
});
export const COUNTER_DEFINITIONS = Object.freeze({
  calls: 'Invocations entered, including base cases and cache hits.',
  computedCalls: 'Invocations entered that are not cache hits, including base cases. This is not an arithmetic-operation or timing count.',
  cacheHits: 'Invocations served by a value already in this run’s cache.',
  returnedCalls: 'Invocations whose return has been delivered to their caller or the final result.',
  activeDepth: 'Frames currently on the stack, including root and base-case frames.',
  maxDepth: 'Largest active stack depth reached through this selected step.'
});
const traces = new WeakSet();
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
export function parseInput(text) {
  if (typeof text !== 'string' || !/^(?:[0-9]|10)$/.test(text.trim())) {
    throw new Error('Enter a whole number from 0 to 10, using digits only.');
  }
  return Number(text.trim());
}
function requireInput(input) {
  if (!Number.isInteger(input) || input < 0 || input > MAX_INPUT) {
    throw new Error('Choose an integer input from 0 to 10.');
  }
}
export function callLabel(algorithm, input) {
  if (!Object.hasOwn(ALGORITHMS, algorithm)) throw new Error('Choose a supported algorithm.');
  requireInput(input);
  return (algorithm === 'factorial' ? 'factorial' : 'F') + '(' + input + ')';
}

/** Each parent resumes only after its child returns. Fibonacci evaluates the left child first. */
export function createTrace(algorithm, input) {
  if (!Object.hasOwn(ALGORITHMS, algorithm)) throw new Error('Choose a supported algorithm.');
  requireInput(input);
  input = input === 0 ? 0 : input;
  const memoized = algorithm === 'memo-fibonacci';
  const cache = new Map();
  const stack = [];
  const steps = [];
  let nextId = 1, calls = 0, computedCalls = 0, cacheHits = 0, returnedCalls = 0, maxDepth = 0;
  let finalResult = null;
  const label = n => callLabel(algorithm, n);
  function capture(event) {
    steps.push({
      index: steps.length,
      event,
      stack: stack.map(frame => ({...frame})),
      cache: [...cache].sort((a, b) => a[0] - b[0]).map(([n, value]) => ({input: n, value: String(value)})),
      counters: {calls, computedCalls, cacheHits, returnedCalls, activeDepth: stack.length, maxDepth},
      result: finalResult,
      complete: returnedCalls > 0 && stack.length === 0
    });
  }
  capture({
    kind: 'start', frameId: null, input, line: null,
    text: 'Before the first call. ' + (memoized ? 'This run starts with an empty cache.' : 'This algorithm does not use a cache.')
  });
  function invoke(n, slot = null) {
    const parent = stack.at(-1) ?? null;
    const cached = memoized && cache.has(n);
    const frame = {
      id: nextId++, parentId: parent?.id ?? null, input: n,
      status: cached ? 'cache-hit' : 'entered',
      pending: cached ? 'return cached ' + String(cache.get(n)) : 'check the base case',
      left: null, right: null, result: cached ? String(cache.get(n)) : null
    };
    stack.push(frame);
    calls++;
    if (cached) cacheHits++; else computedCalls++;
    maxDepth = Math.max(maxDepth, stack.length);
    capture({
      kind: cached ? 'cache-hit' : 'call', frameId: frame.id, input: n,
      line: cached ? 'cache' : 'entry',
      ...(cached ? {value: frame.result} : {}),
      text: '#' + frame.id + ' enters ' + label(n) + (cached
        ? '; cache hit returns the saved value ' + frame.result + '. This invocation still occupies a frame.'
        : '. It has its own frame' + (parent ? '; caller #' + parent.id + ' is suspended.' : '; this is the root call.'))
    });
    let value;
    if (cached) {
      value = cache.get(n);
    } else {
      const base = algorithm === 'factorial' ? n === 0 : n <= 1;
      if (base) {
        value = algorithm === 'factorial' ? 1n : BigInt(n);
      } else if (algorithm === 'factorial') {
        frame.status = 'waiting-child';
        frame.pending = n + ' × ' + label(n - 1);
        capture({
          kind: 'suspend', frameId: frame.id, input: n, line: 'child',
          text: '#' + frame.id + ' saves n = ' + n + ' and waits for ' + frame.pending + '. Multiplication happens after the child returns.'
        });
        const child = invoke(n - 1, 'left');
        value = BigInt(n) * child;
      } else {
        frame.status = 'waiting-left';
        frame.pending = label(n - 1) + ' + ' + label(n - 2);
        capture({
          kind: 'suspend', frameId: frame.id, input: n, line: 'left',
          text: '#' + frame.id + ' suspends before the addition and calls the left child ' + label(n - 1) + '.'
        });
        const left = invoke(n - 1, 'left');
        frame.status = 'waiting-right';
        frame.pending = String(left) + ' + ' + label(n - 2);
        capture({
          kind: 'suspend', frameId: frame.id, input: n, line: 'right',
          text: '#' + frame.id + ' keeps left = ' + left + ' in its frame, then calls the right child ' + label(n - 2) + '.'
        });
        const right = invoke(n - 2, 'right');
        value = left + right;
      }
      frame.result = String(value);
      frame.status = 'return-ready';
      const calculation = base ? label(n) + ' = ' + value + ' is a base case.'
        : algorithm === 'factorial' ? n + ' × ' + frame.left + ' = ' + value + '.'
          : frame.left + ' + ' + frame.right + ' = ' + value + '.';
      frame.pending = 'return ' + value;
      if (memoized) cache.set(n, value);
      capture({
        kind: 'resolve', frameId: frame.id, input: n, line: base ? 'base' : 'combine',
        value: String(value), ...(memoized ? {cacheWrite: {input: n, value: String(value)}} : {}),
        text: '#' + frame.id + ' resolves ' + calculation + (memoized ? ' Save F(' + n + ') = ' + value + ' in this run’s cache.' : '')
      });
    }
    stack.pop();
    returnedCalls++;
    if (parent) {
      parent[slot] = String(value);
      parent.status = slot === 'right' || algorithm === 'factorial' ? 'children-returned' : 'left-returned';
      parent.pending = algorithm === 'factorial' ? parent.input + ' × ' + value
        : slot === 'left' ? value + ' + ' + label(parent.input - 2) : parent.left + ' + ' + value;
    } else {
      finalResult = String(value);
    }
    capture({
      kind: 'return', frameId: frame.id, input: n, line: 'return',
      value: String(value), to: parent?.id ?? null, slot,
      text: '#' + frame.id + ' returns ' + value + (parent
        ? ' to caller #' + parent.id + ', then leaves the stack. The caller keeps that value.'
        : ' as the final result, then leaves the stack. The run is complete.')
    });
    return value;
  }
  const result = String(invoke(input));
  const trace = deepFreeze({
    format: TRACE_FORMAT,
    algorithm,
    algorithmLabel: ALGORITHMS[algorithm],
    input,
    policies: {
      inputBounds: [0, MAX_INPUT],
      factorial: 'Only n = 0 is a base case, returning 1; every positive n invokes factorial(n − 1).',
      fibonacci: 'F(0) = 0; F(1) = 1; fully evaluate F(n − 1) before F(n − 2).',
      cache: memoized ? 'Fresh empty cache for every run; lookup before base handling; store every completed result, including F(0) and F(1).'
        : 'No cache.',
      arithmetic: 'Exact BigInt result arithmetic; result values are encoded as decimal strings.',
      events: 'Each snapshot is after its named event. Return events have removed the returning frame and delivered its value.',
      cacheOrder: 'Cached input keys are displayed in numeric order; this order is not insertion order.'
    },
    counterDefinitions: COUNTER_DEFINITIONS,
    steps,
    result,
    finalCounters: steps.at(-1).counters
  });
  traces.add(trace);
  return trace;
}
function requireTrace(trace) {
  if (!traces.has(trace)) throw new Error('Create a trace before inspecting it.');
}
export function snapshotAt(trace, index) {
  requireTrace(trace);
  if (!Number.isInteger(index) || index < 0 || index >= trace.steps.length) {
    throw new Error('Choose a step in this trace.');
  }
  return trace.steps[index];
}
/** Full trace plus an explicit inspection cursor. This is not a learner answer archive. */
export function traceDocument(trace, selectedStep) {
  const selectedState = snapshotAt(trace, selectedStep);
  return deepFreeze({
    ...trace,
    exportKind: 'Full algorithm trace and selected inspection step; no restore/import support.',
    selectedStep,
    selectedState
  });
}
