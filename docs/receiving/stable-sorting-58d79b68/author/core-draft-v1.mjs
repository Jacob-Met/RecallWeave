const MIN_RECORDS = 2;
const MAX_RECORDS = 8;
const MAX_LABEL_LENGTH = 32;

function wellFormed(text) {
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

function parseSortingKey(raw) {
  if (typeof raw !== 'string') throw new TypeError('Enter an integer key as text.');
  const text = raw.trim();
  if (!/^-?(?:0|[1-9]\d?)$/.test(text)) {
    throw new RangeError('Use an integer from -99 to 99, without a plus sign, decimal, exponent or leading zero.');
  }
  const key = Number(text);
  return key === 0 ? 0 : key;
}

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function copyInput(records) {
  if (!Array.isArray(records) || Object.getPrototypeOf(records) !== Array.prototype ||
      records.length < MIN_RECORDS || records.length > MAX_RECORDS) {
    throw new TypeError('Provide an ordinary array of 2–8 records.');
  }
  const names = Object.getOwnPropertyNames(records);
  if (Object.getOwnPropertySymbols(records).length || names.length !== records.length + 1 ||
      !names.includes('length')) throw new TypeError('Use only ordered record slots.');
  const copied = [];
  for (let index = 0; index < records.length; index++) {
    const slot = Object.getOwnPropertyDescriptor(records, String(index));
    if (!slot || !Object.hasOwn(slot, 'value')) throw new TypeError('Every record slot must be an own data entry.');
    const row = slot.value;
    if (!row || typeof row !== 'object' || Array.isArray(row) ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(row))) {
      throw new TypeError(`Record ${index + 1} must contain a key and label.`);
    }
    const descriptors = Object.getOwnPropertyDescriptors(row);
    const fields = Object.keys(descriptors).sort();
    if (Object.getOwnPropertySymbols(row).length || fields.length !== 2 ||
        fields[0] !== 'key' || fields[1] !== 'label' ||
        !Object.hasOwn(descriptors.key, 'value') || !Object.hasOwn(descriptors.label, 'value')) {
      throw new TypeError(`Record ${index + 1} needs exactly its own key and label data fields.`);
    }
    const key = descriptors.key.value;
    const label = descriptors.label.value;
    if (!Number.isInteger(key) || key < -99 || key > 99) {
      throw new RangeError(`Record ${index + 1}: key must be an integer from -99 to 99.`);
    }
    if (typeof label !== 'string' || !label.trim() || label.length > MAX_LABEL_LENGTH ||
        !wellFormed(label) || /[\u0000-\u001f\u007f-\u009f]/u.test(label)) {
      throw new TypeError(`Record ${index + 1}: use a nonblank label of at most 32 characters, without control characters.`);
    }
    copied.push({id: `record-${index + 1}`, originalPosition: index + 1, key: key === 0 ? 0 : key, label});
  }
  return copied;
}

function tieOrder(input, finalRecords) {
  const groups = new Map();
  for (const row of input) {
    if (!groups.has(row.key)) groups.set(row.key, []);
    groups.get(row.key).push(row.id);
  }
  return [...groups.entries()].filter(([, ids]) => ids.length > 1)
    .sort(([a], [b]) => a - b)
    .map(([key, inputIds]) => {
      const outputIds = finalRecords.filter(row => row.key === key).map(row => row.id);
      return {key, inputIds: [...inputIds], outputIds, preserved: inputIds.every((id, i) => id === outputIds[i])};
    });
}

function traceSort(input, algorithm) {
  const records = [...input];
  const steps = [];
  let comparisons = 0;
  let exchanges = 0;
  function emit(kind, message, sortedPrefix, extra = {}) {
    steps.push({
      index: steps.length, kind, message, records: [...records], sortedPrefix,
      counts: {comparisons, exchanges}, ...extra
    });
  }
  function compare(leftIndex, rightIndex, sortedPrefix, pass, messageFor) {
    comparisons++;
    const left = records[leftIndex], right = records[rightIndex];
    const result = left.key < right.key ? 'less' : left.key === right.key ? 'equal' : 'greater';
    emit('compare', messageFor(result), sortedPrefix, {
      pass, comparison: {leftIndex, rightIndex, leftId: left.id, rightId: right.id, result}
    });
    return result;
  }
  function exchange(leftIndex, rightIndex, sortedPrefix, pass) {
    const idsBefore = [records[leftIndex].id, records[rightIndex].id];
    [records[leftIndex], records[rightIndex]] = [records[rightIndex], records[leftIndex]];
    exchanges++;
    emit('exchange', `Exchange the complete records at positions ${leftIndex + 1} and ${rightIndex + 1}.`,
      sortedPrefix, {pass, exchange: {indices: [leftIndex, rightIndex], idsBefore}});
  }
  emit('initial', 'Start with the records in their original input order.', algorithm === 'insertion' ? 1 : 0);
  if (algorithm === 'insertion') {
    for (let i = 1; i < records.length; i++) {
      let j = i;
      const pass = i;
      while (j > 0) {
        const result = compare(j, j - 1, j, pass, relation =>
          relation === 'less'
            ? `The key at position ${j + 1} is smaller than its predecessor; exchange these neighbors next.`
            : relation === 'equal'
              ? 'The keys are equal. Keep their relative order and finish this insertion pass.'
              : 'This record is no smaller than its predecessor. Finish this insertion pass.');
        if (result !== 'less') break;
        exchange(j - 1, j, j - 1, pass);
        j--;
      }
      emit('pass-complete', `The first ${i + 1} records now form a sorted prefix.`, i + 1, {pass});
    }
  } else {
    for (let i = 0; i < records.length - 1; i++) {
      let minimum = i;
      const pass = i + 1;
      for (let j = i + 1; j < records.length; j++) {
        const result = compare(j, minimum, i, pass, relation =>
          relation === 'less'
            ? `Position ${j + 1} has a smaller key than the current minimum at position ${minimum + 1}. Select it as the new minimum.`
            : relation === 'equal'
              ? 'The candidate ties the current minimum. Keep the earlier minimum in this scan.'
              : 'The candidate has a larger key. Keep the current minimum.');
        if (result === 'less') minimum = j;
      }
      if (minimum !== i) exchange(i, minimum, i + 1, pass);
      emit('pass-complete', `The first ${i + 1} position${i === 0 ? ' is' : 's are'} fixed in ascending order.`, i + 1, {pass});
    }
  }
  emit('complete', 'The keys are in ascending order. Inspect the original identities within each tied-key group.',
    records.length);
  const tieGroups = tieOrder(input, records);
  return {
    name: algorithm === 'insertion' ? 'Insertion sort' : 'Selection sort',
    guaranteedStable: algorithm === 'insertion',
    observedStable: tieGroups.length ? tieGroups.every(group => group.preserved) : null,
    tieGroups,
    finalRecords: [...records],
    counts: {comparisons, exchanges},
    steps
  };
}

function buildSortingComparison(records) {
  const input = copyInput(records);
  return freeze({
    schema: 'recallweave-sorting-comparison/1',
    input,
    rules: {
      direction: 'Ascending numeric key; records retain their original identities.',
      insertion: 'Compare adjacent records and exchange only when the later key is strictly smaller.',
      selection: 'Choose the earliest strictly minimal remaining record; exchange with the pass position only when those positions differ.',
      comparison: 'One numeric key-ordering predicate. Index bounds and rendering are not counted.',
      exchange: 'One exchange of two distinct positions; no self-exchanges.',
      countMeaning: 'Operation counts for these two recipes, not timings or a benchmark.',
      exportMeaning: 'Both complete deterministic traces. This is an inspection artifact, not a restorable learner session.'
    },
    algorithms: {
      insertion: traceSort(input, 'insertion'),
      selection: traceSort(input, 'selection')
    }
  });
}

export { buildSortingComparison, parseSortingKey };
