/**
 * Bounded integer-set model for the original RecallWeave hash-table lesson.
 * Linear probing visits (home + offset) mod capacity, at most capacity times.
 * See courses/hash-tables.md for conventions, references and the public API.
 */
export const LIMITS = Object.freeze({
  minCapacity: 3, maxCapacity: 17, minKey: -9999, maxKey: 9999, maxOperations: 24,
});

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function objectFields(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError(path + ' must be a plain object.');
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== fields.length || keys.some(key => !fields.includes(key))) {
    throw new TypeError(path + ' must contain exactly ' + fields.join(' and ') + '.');
  }
}

function integer(value, min, max, path) {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new TypeError(path + ' must be a finite integer.');
  }
  if (value < min || value > max) {
    throw new RangeError(path + ' must be between ' + min + ' and ' + max + '.');
  }
  return value === 0 ? 0 : value;
}

export function validateScenario(value) {
  objectFields(value, ['capacity', 'operations'], 'scenario');
  const capacity = integer(value.capacity, LIMITS.minCapacity, LIMITS.maxCapacity, 'capacity');
  if (!Array.isArray(value.operations)) throw new TypeError('operations must be an array.');
  if (value.operations.length > LIMITS.maxOperations) {
    throw new RangeError('operations must contain at most ' + LIMITS.maxOperations + ' entries.');
  }
  const operations = [];
  for (let i = 0; i < value.operations.length; i += 1) {
    const operation = value.operations[i];
    const path = 'operations[' + i + ']';
    objectFields(operation, ['type', 'key'], path);
    if (!['insert', 'find', 'delete'].includes(operation.type)) {
      throw new TypeError(path + '.type must be insert, find or delete.');
    }
    operations.push({
      type: operation.type,
      key: integer(operation.key, LIMITS.minKey, LIMITS.maxKey, path + '.key'),
    });
  }
  return freeze({ capacity, operations });
}

export function homeIndex(key, capacity) {
  const k = integer(key, LIMITS.minKey, LIMITS.maxKey, 'key');
  const m = integer(capacity, LIMITS.minCapacity, LIMITS.maxCapacity, 'capacity');
  return ((k % m) + m) % m;
}

function snapshot(slots) {
  return slots.map(slot => ({ ...slot }));
}

export function runScenario(value) {
  const scenario = validateScenario(value);
  const slots = Array.from({ length: scenario.capacity }, () => ({ kind: 'empty' }));
  const initialSlots = snapshot(slots);
  const operations = [];
  const trace = [{ kind: 'initial', operationIndex: null, probeIndex: null, slots: initialSlots }];

  for (let operationIndex = 0; operationIndex < scenario.operations.length; operationIndex += 1) {
    const operation = scenario.operations[operationIndex];
    const { type, key } = operation;
    const home = homeIndex(key, scenario.capacity);
    const before = snapshot(slots);
    const probes = [];
    let firstDeleted = null;
    let match = null;
    let firstEmpty = null;

    for (let offset = 0; offset < scenario.capacity; offset += 1) {
      const index = (home + offset) % scenario.capacity;
      const slot = { ...slots[index] };
      let decision;
      if (slot.kind === 'occupied') {
        if (slot.key === key) {
          decision = 'match';
          match = index;
        } else {
          decision = 'collision';
        }
      } else if (slot.kind === 'empty') {
        decision = 'empty-stop';
        firstEmpty = index;
      } else if (type === 'insert' && firstDeleted === null) {
        firstDeleted = index;
        decision = 'remember-deleted';
      } else {
        decision = 'skip-deleted';
      }
      probes.push({ index, slot, decision, firstDeleted });
      trace.push({ kind: 'probe', operationIndex, probeIndex: probes.length - 1, slots: before });
      if (match !== null || firstEmpty !== null) break;
    }

    let status;
    let index = match;
    if (type === 'insert') {
      if (match !== null) {
        status = 'present';
      } else {
        index = firstDeleted !== null ? firstDeleted : firstEmpty;
        if (index === null) {
          status = 'full';
        } else {
          slots[index] = { kind: 'occupied', key };
          status = 'inserted';
        }
      }
    } else if (type === 'delete') {
      status = match === null ? 'absent' : 'deleted';
      if (match !== null) slots[match] = { kind: 'deleted' };
    } else {
      status = match === null ? 'absent' : 'found';
    }
    const after = snapshot(slots);
    operations.push({ operationIndex, operation, home, before, probes, status, index, after });
    trace.push({ kind: 'result', operationIndex, probeIndex: null, slots: after });
  }
  return freeze({ scenario, initialSlots, operations, finalSlots: snapshot(slots), trace });
}
