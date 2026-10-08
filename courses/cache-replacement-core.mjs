/** Equal-size, fully associative page-cache teaching model. All runs start empty. */
const MAX_REFERENCES = 24;
const MAX_TEXT_LENGTH = 512;
const PAGE = /^[A-H1-8]$/;

function freezeTree(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeTree(child);
    Object.freeze(value);
  }
  return value;
}

/** Parse literal page IDs. Separators do not become requests; case is not normalized. */
export function parseReferenceText(text) {
  if (typeof text !== 'string' || text.length > MAX_TEXT_LENGTH) {
    throw new Error('Enter page references as text of at most 512 characters.');
  }
  const trimmed = text.trim();
  const references = trimmed ? trimmed.split(/[\s,]+/).filter(Boolean) : [];
  if (references.length > MAX_REFERENCES) throw new Error('Enter at most 24 page references.');
  if (references.some(page => !PAGE.test(page))) {
    throw new Error('Use single page IDs A–H or 1–8, separated by spaces or commas.');
  }
  return Object.freeze(references);
}

function checkedInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
      || Reflect.ownKeys(value).length !== 2
      || !Object.hasOwn(value, 'references') || !Object.hasOwn(value, 'capacity')) {
    throw new Error('Comparison input must contain only references and capacity.');
  }
  const { references, capacity } = value;
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 5) {
    throw new Error('Choose a whole-number capacity from 1 to 5.');
  }
  if (!Array.isArray(references) || references.length > MAX_REFERENCES
      || Reflect.ownKeys(references).length !== references.length + 1) {
    throw new Error('References must be a dense array of at most 24 page IDs.');
  }
  for (let index = 0; index < references.length; index++) {
    if (!Object.hasOwn(references, index) || typeof references[index] !== 'string'
        || !PAGE.test(references[index])) {
      throw new Error('Each reference must be one literal page ID: A–H or 1–8.');
    }
  }
  return { references: [...references], capacity };
}

function runPolicy(references, capacity, policy) {
  const pages = [];
  let hits = 0, misses = 0;
  const steps = references.map((request, index) => {
    const before = [...pages];
    const resident = pages.indexOf(request);
    const hit = resident !== -1;
    let evicted = null;
    if (hit) {
      hits++;
      if (policy === 'lru') {
        pages.splice(resident, 1);
        pages.push(request);
      }
    } else {
      misses++;
      if (pages.length === capacity) evicted = pages.shift();
      pages.push(request);
    }
    return { step: index + 1, request, before, hit, evicted, after: [...pages], hits, misses };
  });
  return {
    order: policy === 'fifo' ? 'oldest-inserted-first' : 'least-recently-used-first',
    initial: [], steps, totals: { requests: references.length, hits, misses }
  };
}

/** Return owned immutable traces and a same-sequence, empty-start capacity comparison. */
export function analyzeCacheTrace(value) {
  const input = checkedInput(value);
  const fifo = runPolicy(input.references, input.capacity, 'fifo');
  const lru = runPolicy(input.references, input.capacity, 'lru');
  const capacityComparison = Array.from({ length: 5 }, (_, index) => {
    const capacity = index + 1;
    return {
      capacity,
      fifoMisses: (capacity === input.capacity ? fifo : runPolicy(input.references, capacity, 'fifo')).totals.misses,
      lruMisses: (capacity === input.capacity ? lru : runPolicy(input.references, capacity, 'lru')).totals.misses
    };
  });
  return freezeTree({ format: 'recallweave-cache-trace/1', input, policies: { fifo, lru }, capacityComparison });
}
