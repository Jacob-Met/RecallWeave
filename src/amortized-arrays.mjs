/** An append/copy teaching model, not a memory allocator or timing benchmark. */
export const ARRAY_TRACE_FORMAT = 'recallweave-amortized-arrays/1';
export const MAX_APPENDS = 128;
export const MAX_INCREMENT = 32;

function integer(value, minimum, maximum, label) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be a whole number from ${minimum} to ${maximum}.`);
  }
  return value;
}

/** Admit bounded decimal text. No exponent, hexadecimal or coercion is accepted. */
export function parseArrayInputs(appendsText, incrementText) {
  function decimal(text, minimum, maximum, label) {
    if (typeof text !== 'string' || text.length > 16 || !/^\s*[0-9]{1,3}\s*$/.test(text)) {
      throw new RangeError(`${label} must be entered as decimal digits (${minimum}–${maximum}).`);
    }
    return integer(Number(text.trim()), minimum, maximum, label);
  }
  return Object.freeze({
    appends: decimal(appendsText, 0, MAX_APPENDS, 'Appends'),
    increment: decimal(incrementText, 1, MAX_INCREMENT, 'Fixed increment')
  });
}

function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function runPolicy(appends, increment, geometric) {
  let slots = [];
  let size = 0;
  let totalCost = 0;
  let totalCopies = 0;
  let resizes = 0;
  let totalAmortized = 0;
  const steps = [{
    step: 0, sizeBefore: 0, capacityBefore: 0, size: 0, capacity: 0,
    resized: false, copies: 0, writes: 0, cost: 0, totalCost: 0,
    spare: 0, elements: [], copiedElements: [],
    potentialBefore: geometric ? 0 : null, potential: geometric ? 0 : null,
    amortizedCost: geometric ? 0 : null, totalAmortized: geometric ? 0 : null
  }];
  for (let step = 1; step <= appends; step += 1) {
    const sizeBefore = size;
    const capacityBefore = slots.length;
    const potentialBefore = geometric ? 2 * size - slots.length : null;
    const copiedElements = [];
    const resized = size === slots.length;
    if (resized) {
      const capacity = geometric ? (slots.length === 0 ? 1 : slots.length * 2) : slots.length + increment;
      const replacement = new Array(capacity);
      for (let index = 0; index < size; index += 1) {
        replacement[index] = slots[index];
        copiedElements.push(slots[index]);
      }
      slots = replacement;
      resizes += 1;
    }
    slots[size] = step;
    size += 1;
    const copies = copiedElements.length;
    const cost = copies + 1;
    const potential = geometric ? 2 * size - slots.length : null;
    const amortizedCost = geometric ? cost + potential - potentialBefore : null;
    totalCost += cost;
    totalCopies += copies;
    if (geometric) totalAmortized += amortizedCost;
    steps.push({
      step, sizeBefore, capacityBefore, size, capacity: slots.length,
      resized, copies, writes: 1, cost, totalCost, spare: slots.length - size,
      elements: slots.slice(0, size), copiedElements,
      potentialBefore, potential, amortizedCost,
      totalAmortized: geometric ? totalAmortized : null
    });
  }
  return {
    policy: geometric ? 'doubling' : 'fixed-increment',
    increment: geometric ? null : increment,
    steps,
    totals: {
      appends, copies: totalCopies, writes: appends, cost: totalCost,
      capacity: slots.length, spare: slots.length - size, resizes,
      averageCost: appends === 0 ? null : totalCost / appends,
      worstCost: Math.max(...steps.map(step => step.cost)),
      potential: geometric ? 2 * size - slots.length : null,
      amortizedCost: geometric ? totalAmortized : null
    }
  };
}

/** Validate the complete input before allocating either private trace. */
export function traceArrays(appends, increment) {
  integer(appends, 0, MAX_APPENDS, 'Appends');
  integer(increment, 1, MAX_INCREMENT, 'Fixed increment');
  return freeze({
    format: ARRAY_TRACE_FORMAT,
    input: { appends, increment },
    costModel: {
      newElementWrite: 1, existingElementCopy: 1,
      initialSize: 0, initialCapacity: 0, operations: 'append only',
      excluded: ['allocation', 'zeroing', 'bytes', 'cache behavior', 'elapsed time'],
      potential: 'doubling only: 2 * size - capacity'
    },
    doubling: runPolicy(appends, increment, true),
    fixedIncrement: runPolicy(appends, increment, false)
  });
}

/** An explicit local mathematical observation; no wall-time or performance claim. */
export function arrayObservation(trace, inspectionStep) {
  if (!trace || trace.format !== ARRAY_TRACE_FORMAT) throw new TypeError('An applied array trace is required.');
  integer(inspectionStep, 0, trace.input.appends, 'Inspection step');
  return { kind: 'computed teaching observation', inspectionStep, trace };
}
