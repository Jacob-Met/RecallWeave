// Original bounded teaching model. Array offset i - 1 represents one-based position i.
const TRACES = new WeakSet();
const INTEGER_TOKEN = /^[+-]?[0-9]+$/;

function fail(message) {
  throw new Error(message);
}

function integer(value, low, high, label) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < low || value > high) {
    fail(label + " must be an integer from " + low + " through " + high + ".");
  }
  return value;
}

function dataObject(value, keys, label) {
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    fail(label + " must be a plain data object.");
  }
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || own.some((key) => !keys.includes(key))) {
    fail(label + " has an unknown or missing field.");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of keys) {
    if (!Object.hasOwn(descriptors[key], "value") || !descriptors[key].enumerable) {
      fail(label + " must contain ordinary data fields.");
    }
  }
}

function denseArray(value, low, high, label) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype ||
      value.length < low || value.length > high ||
      Reflect.ownKeys(value).length !== value.length + 1) {
    fail(label + " must be a dense array with " + low + " through " + high + " entries.");
  }
  for (let i = 0; i < value.length; i += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
      fail(label + " must contain ordinary data entries.");
    }
  }
}

function freeze(value) {
  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) freeze(entry);
    Object.freeze(value);
  }
  return value;
}

function admit(spec) {
  dataObject(spec, ["initial", "operations"], "Input");
  denseArray(spec.initial, 1, 16, "Initial values");
  const initial = spec.initial.map((value, index) =>
    integer(value, -99, 99, "Value at position " + (index + 1)));
  denseArray(spec.operations, 0, 64, "Operations");
  const operations = spec.operations.map((operation, offset) => {
    const label = "Operation " + (offset + 1);
    if (!operation || typeof operation !== "object") fail(label + " must be a data object.");
    const kindDescriptor = Object.getOwnPropertyDescriptor(operation, "kind");
    if (!kindDescriptor || !Object.hasOwn(kindDescriptor, "value")) fail(label + " needs a command.");
    const kind = kindDescriptor.value;
    if (kind === "add") {
      dataObject(operation, ["kind", "index", "delta"], label);
      return {kind, index: integer(operation.index, 1, initial.length, label + " index"),
        delta: integer(operation.delta, -99, 99, label + " delta")};
    }
    if (kind === "prefix") {
      dataObject(operation, ["kind", "end"], label);
      return {kind, end: integer(operation.end, 0, initial.length, label + " end")};
    }
    if (kind === "range") {
      dataObject(operation, ["kind", "start", "end"], label);
      const start = integer(operation.start, 1, initial.length, label + " start");
      return {kind, start, end: integer(operation.end, start, initial.length, label + " end")};
    }
    fail(label + " must be add, prefix, or range.");
  });
  return freeze({initial, operations});
}

function token(text, label) {
  if (!INTEGER_TOKEN.test(text)) fail(label + " must use a signed decimal integer.");
  const value = Number(text);
  if (!Number.isSafeInteger(value)) fail(label + " is outside the supported integer range.");
  return value;
}

export function parseFenwickDraft(initialText, operationsText) {
  if (typeof initialText !== "string" || initialText.length > 512) {
    fail("Initial values must be text of at most 512 characters.");
  }
  if (typeof operationsText !== "string" || operationsText.length > 4096) {
    fail("Operations must be text of at most 4096 characters.");
  }
  const initial = initialText.split(",").map((part, index) =>
    token(part.trim(), "Value at position " + (index + 1)));
  const lines = operationsText.split(/\r\n|\n|\r/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 64) fail("Use at most 64 operations.");
  const operations = lines.map((line, index) => {
    const parts = line.split(/\s+/);
    const label = "Operation " + (index + 1);
    if (parts[0] === "add" && parts.length === 3) {
      return {kind: "add", index: token(parts[1], label + " index"), delta: token(parts[2], label + " delta")};
    }
    if (parts[0] === "prefix" && parts.length === 2) {
      return {kind: "prefix", end: token(parts[1], label + " end")};
    }
    if (parts[0] === "range" && parts.length === 3) {
      return {kind: "range", start: token(parts[1], label + " start"), end: token(parts[2], label + " end")};
    }
    fail(label + " must be add INDEX DELTA, prefix END, or range START END.");
  });
  return admit({initial, operations});
}

function lowbit(index) {
  return index & -index;
}

function block(index) {
  const width = lowbit(index);
  return {index, lowbit: width, start: index - width + 1, end: index};
}

function snapshot(values, tree) {
  return {values: values.slice(), tree: tree.slice()};
}

function query(tree, end, sign) {
  let index = end;
  let accumulator = 0;
  const visits = [];
  while (index > 0) {
    const interval = block(index);
    const stored = tree[index - 1];
    const next = index - interval.lowbit;
    const accumulatorBefore = accumulator;
    accumulator += stored;
    visits.push({...interval, stored, accumulatorBefore, accumulatorAfter: accumulator, next});
    index = next;
  }
  return {end, sign, visits, sum: accumulator};
}

export function buildFenwickTrace(spec) {
  const input = admit(spec); // Validate every operation before constructing any trace.
  const values = input.initial.slice();
  const blocks = values.map((_, index) => block(index + 1));
  const tree = blocks.map(({start, end}) => {
    let total = 0;
    for (let index = start; index <= end; index += 1) total += values[index - 1];
    return total;
  });
  const initial = snapshot(values, tree);
  const steps = [];
  for (const [offset, operation] of input.operations.entries()) {
    const before = snapshot(values, tree);
    const visits = [];
    const queries = [];
    let result = null;
    if (operation.kind === "add") {
      values[operation.index - 1] += operation.delta;
      let index = operation.index;
      while (index <= tree.length) {
        const interval = blocks[index - 1];
        const entryBefore = tree[index - 1];
        tree[index - 1] += operation.delta;
        const next = index + interval.lowbit;
        visits.push({...interval, before: entryBefore, after: tree[index - 1], next});
        index = next;
      }
    } else {
      queries.push(query(tree, operation.end, 1));
      if (operation.kind === "range") queries.push(query(tree, operation.start - 1, -1));
      result = queries.reduce((sum, part) => sum + part.sign * part.sum, 0);
    }
    steps.push({sequence: offset + 1, operation, before, after: snapshot(values, tree),
      visits, queries, result});
  }
  const trace = freeze({format: "recallweave-fenwick-trace/1", input, blocks, initial, steps,
    final: snapshot(values, tree)});
  TRACES.add(trace);
  return trace;
}

export function serializeFenwickTrace(trace) {
  if (!TRACES.has(trace)) fail("Export requires a trace built by this model.");
  return JSON.stringify(trace, null, 2) + "\n";
}
