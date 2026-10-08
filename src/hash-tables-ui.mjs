import { LIMITS, runScenario } from './hash-tables.mjs';

const examples = {
  tombstone: { capacity: 7, operations: [
    ['insert', 10], ['insert', 17], ['insert', 24], ['delete', 17], ['find', 24], ['insert', 31],
  ] },
  duplicate: { capacity: 7, operations: [
    ['insert', 10], ['insert', 17], ['insert', 24], ['delete', 10], ['insert', 24],
  ] },
  wrap: { capacity: 7, operations: [
    ['insert', 6], ['insert', 13], ['insert', 20], ['find', 13], ['find', 27],
  ] },
  full: { capacity: 3, operations: [
    ['insert', 0], ['insert', 3], ['insert', 6], ['insert', 9], ['delete', 3], ['insert', 9], ['find', 12],
  ] },
  negative: { capacity: 7, operations: [
    ['insert', -1], ['insert', -8], ['find', -8], ['delete', -1], ['insert', -15],
  ] },
};

const byId = id => document.getElementById(id);
const elements = Object.fromEntries([
  'scenario-form', 'capacity', 'operations', 'example', 'load-example', 'apply',
  'revert', 'draft-status', 'error', 'table', 'step-heading', 'step-detail',
  'step-counter', 'counts', 'probe-list', 'candidate', 'previous', 'next', 'restart',
  'final', 'operation-picker', 'result-body', 'download-trace', 'download-course',
  'lesson-title', 'lesson-credit', 'lesson-license', 'applied-summary',
].map(id => [id, byId(id)]));
let result;
let cursor = 0;
let dirty = false;

function operationName(operation) {
  return operation.type[0].toUpperCase() + operation.type.slice(1) + ' ' + operation.key;
}
function slotName(slot) {
  return slot.kind === 'occupied' ? 'key ' + slot.key : slot.kind === 'empty' ? 'never-used empty' : 'deleted';
}
function setDraftStatus() {
  elements['draft-status'].textContent = dirty
    ? 'Unapplied edits. The table and downloads still show the last applied operations.'
    : 'The table and downloads match the applied operations.';
  elements['draft-status'].classList.toggle('dirty', dirty);
  elements.revert.disabled = !dirty;
}
function writeEditor(scenario) {
  elements.capacity.value = String(scenario.capacity);
  elements.operations.value = scenario.operations.map(op => op.type + ' ' + op.key).join('\n');
}
function clearError() {
  elements.error.textContent = '';
  elements.error.hidden = true;
  elements.capacity.removeAttribute('aria-invalid');
  elements.operations.removeAttribute('aria-invalid');
}
function readEditor() {
  const capacityText = elements.capacity.value.trim();
  if (!/^[+-]?\d+$/.test(capacityText)) {
    elements.capacity.setAttribute('aria-invalid', 'true');
    throw new TypeError('Capacity must be a whole number from 3 to 17.');
  }
  const capacity = Number(capacityText);
  if (capacity < LIMITS.minCapacity || capacity > LIMITS.maxCapacity) {
    elements.capacity.setAttribute('aria-invalid', 'true');
    throw new RangeError('Capacity must be between 3 and 17.');
  }
  const operations = [];
  const lines = elements.operations.value.split(/\r?\n/);
  for (let line = 0; line < lines.length; line += 1) {
    const text = lines[line].trim();
    if (!text) continue;
    const match = /^(insert|find|delete)\s+([+-]?\d+)$/i.exec(text);
    if (!match) {
      elements.operations.setAttribute('aria-invalid', 'true');
      throw new TypeError('Line ' + (line + 1) + ': use insert, find or delete followed by one whole-number key.');
    }
    const key = Number(match[2]);
    if (!Number.isSafeInteger(key) || key < LIMITS.minKey || key > LIMITS.maxKey) {
      elements.operations.setAttribute('aria-invalid', 'true');
      throw new RangeError('Line ' + (line + 1) + ': key must be a whole number from -9999 to 9999.');
    }
    operations.push({ type: match[1].toLowerCase(), key });
    if (operations.length > LIMITS.maxOperations) {
      elements.operations.setAttribute('aria-invalid', 'true');
      throw new RangeError('Use at most 24 operations. Blank lines do not count.');
    }
  }
  return { capacity, operations };
}
function resultText(operation) {
  const { status, index, probes } = operation;
  const suffix = ' ' + probes.length + (probes.length === 1 ? ' probe.' : ' probes.');
  if (status === 'inserted') return 'Inserted at slot ' + index + '.' + suffix;
  if (status === 'present') return 'Already present at slot ' + index + '; no change.' + suffix;
  if (status === 'found') return 'Found at slot ' + index + '; no change.' + suffix;
  if (status === 'deleted') return 'Deleted at slot ' + index + '; tombstone retained.' + suffix;
  if (status === 'full') return 'Full: no usable slot; no change.' + suffix;
  return 'Absent; no change.' + suffix;
}
function probeText(operation, probe) {
  const prefix = 'Slot ' + probe.index + ' is ' + slotName(probe.slot) + '. ';
  if (probe.decision === 'match') return prefix + 'The key matches; stop probing.';
  if (probe.decision === 'empty-stop') {
    return prefix + 'This proves the key is absent; stop probing.';
  }
  if (operation.probes.length === operation.before.length && operation.probes.at(-1) === probe) {
    return prefix + 'Every slot has now been inspected once, proving absence.' +
      (operation.operation.type === 'insert' && probe.firstDeleted !== null
        ? ' The first remembered tombstone can be used at the result step.' : '');
  }
  if (probe.decision === 'remember-deleted') {
    return prefix + 'Remember it for insertion, then keep checking for an existing key.';
  }
  if (probe.decision === 'skip-deleted') {
    return prefix + 'Deletion does not prove absence; continue probing.';
  }
  return prefix + 'A different key occupies it; continue to the next slot.';
}
function outcomeDetail(operation) {
  const last = operation.probes.at(-1);
  if (operation.status === 'present') {
    return operation.probes.some(probe => probe.firstDeleted !== null)
      ? 'An earlier tombstone is only a candidate. A matching key takes priority, so this set never gains a duplicate.'
      : 'The existing key is already in the set. No duplicate copy is added and no slot changes.';
  }
  if (operation.status === 'inserted') {
    const proof = last.decision === 'empty-stop'
      ? 'Never-used empty slot ' + last.index + ' proved absence.'
      : 'One complete cycle proved absence.';
    const destination = operation.before[operation.index].kind === 'deleted'
      ? ' The first remembered tombstone, slot ' + operation.index + ', is now reused.'
      : ' That empty slot now holds the key.';
    return proof + destination + ' Only this result step changes the table.';
  }
  if (operation.status === 'deleted') {
    return 'The matching key is replaced by a deleted marker. Keys farther along the probe path stay searchable.';
  }
  if (operation.status === 'full') {
    return 'One complete cycle found no match and no empty or deleted slot. Fixed capacity means refusal, with the table preserved.';
  }
  if (operation.status === 'found') {
    return 'The matching key ends the search. Find does not change any slot.';
  }
  return last.decision === 'empty-stop'
    ? 'A never-used empty slot ends the search. No slot changes.'
    : 'Every slot was inspected once without a match. No slot changes.';
}
function render() {
  const frame = result.trace[cursor];
  const operation = frame.operationIndex === null ? null : result.operations[frame.operationIndex];
  const probe = frame.kind === 'probe' ? operation.probes[frame.probeIndex] : null;
  const focus = probe ? probe.index : frame.kind === 'result' ? operation.index : null;
  const remembered = probe ? probe.firstDeleted : null;
  elements.table.replaceChildren();
  frame.slots.forEach((slot, index) => {
    const li = document.createElement('li');
    li.className = 'slot ' + slot.kind;
    li.dataset.index = String(index);
    li.dataset.kind = slot.kind;
    if (slot.kind === 'occupied') li.dataset.key = String(slot.key);
    if (index === focus) {
      li.classList.add('focused');
      li.setAttribute('aria-current', 'step');
    }
    if (index === remembered) li.classList.add('remembered');
    li.setAttribute('aria-label', 'Slot ' + index + ': ' + slotName(slot) +
      (index === focus ? '. Current slot.' : '') + (index === remembered ? ' Remembered insertion candidate.' : ''));
    const label = document.createElement('span');
    label.className = 'slot-index';
    label.textContent = 'Slot ' + index;
    const value = document.createElement('strong');
    value.textContent = slot.kind === 'occupied' ? String(slot.key) : slot.kind === 'empty' ? 'Empty' : 'Deleted';
    const state = document.createElement('span');
    state.className = 'slot-state';
    state.textContent = slot.kind === 'occupied' ? 'occupied' : slot.kind === 'empty' ? 'never used' : 'tombstone';
    li.append(label, value, state);
    elements.table.append(li);
  });
  const occupied = frame.slots.filter(slot => slot.kind === 'occupied').length;
  const deleted = frame.slots.filter(slot => slot.kind === 'deleted').length;
  elements.counts.textContent = occupied + ' occupied · ' + deleted + ' deleted · ' +
    (frame.slots.length - occupied - deleted) + ' never-used empty. Occupied fraction: ' + occupied + '/' + frame.slots.length + '.';
  elements['step-counter'].textContent = 'Step ' + cursor + ' of ' + (result.trace.length - 1);
  elements['step-counter'].dataset.step = String(cursor);
  elements.candidate.textContent = remembered === null ? 'Remembered insertion slot: none.' : 'Remembered insertion slot: ' + remembered + '.';
  elements['probe-list'].replaceChildren();
  if (!operation) {
    elements['step-heading'].textContent = 'Start with an empty table';
    elements['step-detail'].textContent = result.operations.length
      ? 'Choose Next step to inspect the first slot. Probe steps observe the table; a result step applies any change.'
      : 'No operations were supplied. This empty table is also the final table.';
    const li = document.createElement('li');
    li.textContent = 'No slot has been inspected.';
    elements['probe-list'].append(li);
  } else {
    const name = operationName(operation.operation);
    elements['step-heading'].textContent = frame.kind === 'probe'
      ? name + ' · probe ' + (frame.probeIndex + 1) + ' at slot ' + probe.index
      : name + ' · ' + resultText(operation);
    elements['step-detail'].textContent = frame.kind === 'probe'
      ? probeText(operation, probe) + (frame.probeIndex === operation.probes.length - 1 ? ' Next step shows the result.' : '')
      : outcomeDetail(operation);
    const seen = frame.kind === 'result' ? operation.probes : operation.probes.slice(0, frame.probeIndex + 1);
    for (const step of seen) {
      const li = document.createElement('li');
      li.dataset.slot = String(step.index);
      li.dataset.decision = step.decision;
      li.textContent = probeText(operation, step);
      elements['probe-list'].append(li);
    }
  }
  elements['operation-picker'].value = frame.operationIndex === null ? '-1' : String(frame.operationIndex);
  elements.previous.disabled = cursor === 0;
  elements.restart.disabled = cursor === 0;
  elements.next.disabled = cursor === result.trace.length - 1;
  elements.final.disabled = cursor === result.trace.length - 1;
}
function populateResults() {
  elements['operation-picker'].replaceChildren(new Option('Empty table', '-1'));
  elements['result-body'].replaceChildren();
  for (const operation of result.operations) {
    elements['operation-picker'].append(new Option(
      (operation.operationIndex + 1) + '. ' + operationName(operation.operation), String(operation.operationIndex)));
    const row = document.createElement('tr');
    row.dataset.operation = String(operation.operationIndex);
    for (const text of [
      (operation.operationIndex + 1) + '. ' + operationName(operation.operation),
      String(operation.home), operation.probes.map(probe => probe.index).join(' → '), resultText(operation),
    ]) {
      const cell = document.createElement('td');
      cell.textContent = text;
      row.append(cell);
    }
    elements['result-body'].append(row);
  }
  if (!result.operations.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = 'No operations. The table stays empty.';
    row.append(cell);
    elements['result-body'].append(row);
  }
}
function applyScenario(scenario) {
  const nextResult = runScenario(scenario);
  result = nextResult;
  cursor = 0;
  dirty = false;
  clearError();
  writeEditor(result.scenario);
  elements['applied-summary'].textContent = 'Applied: capacity ' + result.scenario.capacity + ' · ' +
    result.operations.length + (result.operations.length === 1 ? ' operation.' : ' operations.');
  setDraftStatus();
  populateResults();
  render();
}
function download(text, type, filename) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
elements['scenario-form'].addEventListener('submit', event => {
  event.preventDefault();
  clearError();
  try {
    applyScenario(readEditor());
  } catch (error) {
    elements.error.textContent = error.message + ' The last applied trace has been preserved.';
    elements.error.hidden = false;
    setDraftStatus();
  }
});
for (const field of [elements.capacity, elements.operations]) {
  field.addEventListener('input', () => {
    dirty = true;
    clearError();
    setDraftStatus();
  });
}
elements.revert.addEventListener('click', () => {
  writeEditor(result.scenario);
  dirty = false;
  clearError();
  setDraftStatus();
});
elements['load-example'].addEventListener('click', () => {
  const example = examples[elements.example.value];
  applyScenario({ capacity: example.capacity, operations: example.operations.map(([type, key]) => ({ type, key })) });
});
elements.previous.addEventListener('click', () => { cursor = Math.max(0, cursor - 1); render(); });
elements.next.addEventListener('click', () => { cursor = Math.min(result.trace.length - 1, cursor + 1); render(); });
elements.restart.addEventListener('click', () => { cursor = 0; render(); });
elements.final.addEventListener('click', () => { cursor = result.trace.length - 1; render(); });
elements['operation-picker'].addEventListener('change', () => {
  const operationIndex = Number(elements['operation-picker'].value);
  cursor = operationIndex === -1 ? 0 : result.trace.findIndex(frame => frame.operationIndex === operationIndex);
  render();
});
elements['download-trace'].addEventListener('click', () => {
  download(JSON.stringify({
    format: 'recallweave-hash-trace/1',
    convention: 'Integer set; nonnegative key mod capacity; linear probing; tombstones; fixed capacity; no resizing.',
    scenario: result.scenario,
    operations: result.operations,
    finalSlots: result.finalSlots,
  }, null, 2) + '\n', 'application/json;charset=utf-8', 'hash-table-trace.json');
});
elements['download-course'].addEventListener('click', () => {
  download(COURSE_TEXT, 'application/json;charset=utf-8', 'hash-tables.json');
});
const course = JSON.parse(COURSE_TEXT);
elements['lesson-title'].textContent = course.title;
elements['lesson-credit'].textContent = course.attribution;
elements['lesson-license'].textContent = course.license;
elements['load-example'].click();
document.documentElement.classList.add('ready');
