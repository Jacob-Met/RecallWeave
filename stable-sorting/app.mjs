import {buildSortingComparison, parseSortingKey} from '../src/stable-sorting.mjs';

// LESSON_LOADER_START
async function loadLessonText() {
  const response = await fetch(new URL('../courses/stable-sorting.json', import.meta.url));
  if (!response.ok) throw new Error('The course file could not be read.');
  return response.text();
}
// LESSON_LOADER_END

const presets = {
  crossing: [{key: 2, label: 'A'}, {key: 2, label: 'B'}, {key: 1, label: 'C'}],
  ordered: [1, 2, 3, 4, 5].map((key, i) => ({key, label: String.fromCharCode(65 + i)})),
  reverse: [4, 3, 2, 1].map((key, i) => ({key, label: String.fromCharCode(65 + i)})),
  equal: [2, 2, 2, 2].map((key, i) => ({key, label: String.fromCharCode(65 + i)})),
  mixed: [0, -1, 0, -2, 3].map((key, i) => ({key, label: String.fromCharCode(65 + i)}))
};
const byId = id => document.getElementById(id);
const state = {draft: [], comparison: null, indices: {insertion: 0, selection: 0}, lessonText: null};
const kinds = {initial: 'Initial order', compare: 'Key comparison', exchange: 'Record exchange', 'pass-complete': 'Pass complete', complete: 'Final result'};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function currentDraft() {
  return state.draft.map(row => ({key: parseSortingKey(row.keyText), label: row.label}));
}
function retireComparison() {
  state.comparison = null;
  state.indices = {insertion: 0, selection: 0};
  byId('comparison-panels').hidden = true;
  byId('empty-results').hidden = false;
  byId('restart-steps').disabled = true;
  byId('download-comparison').disabled = true;
  for (const button of byId('comparison-panels').querySelectorAll('button')) button.disabled = true;
}
function refreshDraft(message = 'Draft changed. Start a new comparison to use these records.') {
  retireComparison();
  byId('comparison-status').textContent = message;
  byId('row-count').textContent = `${state.draft.length} of 8 records`;
  byId('add-record').disabled = state.draft.length >= 8;
  try {
    // Validation is pure. Only the explicit Start action retains and displays a comparison.
    buildSortingComparison(currentDraft());
    byId('draft-status').textContent = 'Ready. Start comparison captures this exact input for both traces.';
    byId('draft-status').classList.remove('invalid');
    byId('start-comparison').disabled = false;
  } catch (error) {
    byId('draft-status').textContent = error.message;
    byId('draft-status').classList.add('invalid');
    byId('start-comparison').disabled = true;
  }
}
function renderDraft() {
  const container = byId('draft-rows');
  container.replaceChildren();
  state.draft.forEach((row, index) => {
    const line = element('div', 'draft-row');
    line.append(element('span', 'identity-badge', `Input ${index + 1}`));
    const labelField = element('label', 'record-field', 'Label');
    const label = element('input');
    label.id = `label-${index}`;
    label.value = row.label;
    label.dataset.index = String(index);
    label.dataset.field = 'label';
    label.autocomplete = 'off';
    label.spellcheck = false;
    label.setAttribute('aria-label', `Label for input ${index + 1}`);
    labelField.append(label);
    const keyField = element('label', 'key-field', 'Key');
    const key = element('input');
    key.id = `key-${index}`;
    key.type = 'text';
    key.inputMode = 'numeric';
    key.value = row.keyText;
    key.dataset.index = String(index);
    key.dataset.field = 'keyText';
    key.autocomplete = 'off';
    key.spellcheck = false;
    key.setAttribute('aria-label', `Key for input ${index + 1}`);
    keyField.append(key);
    const remove = element('button', 'remove-record', 'Remove');
    remove.type = 'button';
    remove.dataset.remove = String(index);
    remove.disabled = state.draft.length <= 2;
    remove.setAttribute('aria-label', `Remove input ${index + 1}`);
    line.append(labelField, keyField, remove);
    container.append(line);
  });
}
function loadPreset(name) {
  const preset = presets[name];
  if (!preset) return;
  state.draft = preset.map(row => ({keyText: String(row.key), label: row.label}));
  renderDraft();
  refreshDraft('Example loaded. Start comparison when you are ready.');
}
function displayIds(ids) {
  const positions = new Map(state.comparison.input.map(row => [row.id, row.originalPosition]));
  return ids.map(id => `Input ${positions.get(id)}`).join(' → ');
}
function renderTieReport(panel, algorithm, atFinal) {
  const target = panel.querySelector('[data-tie-report]');
  target.replaceChildren();
  target.append(element('h4', '', 'Final equal-key order'));
  if (!atFinal) {
    target.append(element('p', '', 'Use Show final, or step to the end, to inspect the final order of tied records.'));
    return;
  }
  if (!algorithm.tieGroups.length) {
    target.append(element('p', '', 'This input has no tied keys to compare. It does not test equal-key order.'));
    return;
  }
  target.append(element('p', algorithm.observedStable ? 'tie-preserved' : 'tie-changed',
    algorithm.observedStable
      ? 'Observed in this final result: every tied-key group kept its relative input order.'
      : 'Observed in this final result: at least one tied-key group changed its relative input order.'));
  const table = element('table', 'tie-table');
  const caption = element('caption', 'sr-only', 'Original and final identity order for repeated keys');
  const head = element('thead'), header = element('tr');
  for (const title of ['Key', 'Input → final identity order']) {
    const th = element('th', '', title); th.scope = 'col'; header.append(th);
  }
  head.append(header);
  const body = element('tbody');
  for (const group of algorithm.tieGroups) {
    const row = element('tr');
    const key = element('th', '', String(group.key)); key.scope = 'row';
    const detail = element('td');
    detail.append(element('span', 'order-line', `Input: ${displayIds(group.inputIds)}`),
      element('span', 'order-line', `Final: ${displayIds(group.outputIds)}`),
      element('strong', group.preserved ? 'tie-preserved' : 'tie-changed', group.preserved ? 'Order preserved' : 'Order changed'));
    row.append(key, detail); body.append(row);
  }
  table.append(caption, head, body); target.append(table);
}
function renderPanel(name) {
  const panel = document.querySelector(`[data-algorithm="${name}"]`);
  const algorithm = state.comparison.algorithms[name];
  const index = state.indices[name], step = algorithm.steps[index], last = algorithm.steps.length - 1;
  panel.querySelector('[data-step-count]').textContent = `State ${index + 1} of ${last + 1} · ${kinds[step.kind]}`;
  const track = panel.querySelector('[data-record-track]');
  track.replaceChildren();
  const compared = step.comparison ? [step.comparison.leftIndex, step.comparison.rightIndex] : [];
  const exchanged = step.exchange ? step.exchange.indices : [];
  step.records.forEach((row, position) => {
    const card = element('li', 'record-card');
    card.dataset.recordId = row.id;
    if (position < step.sortedPrefix) card.classList.add('in-prefix');
    if (compared.includes(position)) card.classList.add('compared');
    if (exchanged.includes(position)) card.classList.add('exchanged');
    card.append(element('span', 'position', `Position ${position + 1}`),
      element('strong', 'record-key', String(row.key)),
      element('span', 'record-label', row.label),
      element('span', 'record-origin', `Input ${row.originalPosition}`));
    if (compared.includes(position)) card.append(element('span', 'operation-tag', 'Compared'));
    if (exchanged.includes(position)) card.append(element('span', 'operation-tag', 'Exchanged'));
    track.append(card);
  });
  panel.querySelector('[data-step-message]').textContent = step.message;
  panel.querySelector('[data-prefix-context]').textContent =
    `${step.pass ? `Pass ${step.pass} · ` : ''}Known sorted prefix: first ${step.sortedPrefix} of ${step.records.length} records.` +
    (name === 'insertion' && index !== last ? ' These records can still move in later exchanges.' : '');
  panel.querySelector('[data-comparisons]').textContent = String(step.counts.comparisons);
  panel.querySelector('[data-exchanges]').textContent = String(step.counts.exchanges);
  panel.querySelector('[data-action="back"]').disabled = index === 0;
  panel.querySelector('[data-action="next"]').disabled = index === last;
  panel.querySelector('[data-action="final"]').disabled = index === last;
  renderTieReport(panel, algorithm, index === last);
}
function renderComparison() {
  byId('empty-results').hidden = true;
  byId('comparison-panels').hidden = false;
  byId('restart-steps').disabled = false;
  byId('download-comparison').disabled = false;
  renderPanel('insertion');
  renderPanel('selection');
}
function download(text, filename) {
  const blob = new Blob([text], {type: 'application/json;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = element('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
byId('draft-rows').addEventListener('input', event => {
  const {index, field} = event.target.dataset;
  if (index === undefined || !['label', 'keyText'].includes(field)) return;
  state.draft[Number(index)][field] = event.target.value;
  refreshDraft();
});
byId('draft-rows').addEventListener('click', event => {
  const button = event.target.closest('button[data-remove]');
  if (!button || state.draft.length <= 2) return;
  const index = Number(button.dataset.remove);
  state.draft.splice(index, 1);
  renderDraft();
  refreshDraft();
  byId(`label-${Math.min(index, state.draft.length - 1)}`).focus();
});
byId('add-record').addEventListener('click', () => {
  if (state.draft.length >= 8) return;
  state.draft.push({keyText: '0', label: String.fromCharCode(65 + state.draft.length)});
  renderDraft(); refreshDraft();
  byId(`label-${state.draft.length - 1}`).focus();
});
byId('preset').addEventListener('change', event => loadPreset(event.target.value));
byId('draft-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    state.comparison = buildSortingComparison(currentDraft());
    state.indices = {insertion: 0, selection: 0};
    renderComparison();
    byId('comparison-status').textContent = `Current comparison: ${state.comparison.input.length} captured records. Each panel advances independently. Editing the draft retires this run.`;
    byId('results-title').focus();
  } catch (error) {
    refreshDraft();
    byId('comparison-status').textContent = `Comparison could not start: ${error.message}`;
  }
});
for (const panel of document.querySelectorAll('[data-algorithm]')) {
  panel.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled || !state.comparison) return;
    const name = panel.dataset.algorithm, last = state.comparison.algorithms[name].steps.length - 1;
    if (button.dataset.action === 'back') state.indices[name] = Math.max(0, state.indices[name] - 1);
    else if (button.dataset.action === 'next') state.indices[name] = Math.min(last, state.indices[name] + 1);
    else state.indices[name] = last;
    renderPanel(name);
  });
}
byId('restart-steps').addEventListener('click', () => {
  if (!state.comparison) return;
  state.indices = {insertion: 0, selection: 0};
  renderComparison();
  byId('comparison-status').textContent = 'Both traces returned to their initial states for the same captured input.';
});
byId('download-comparison').addEventListener('click', () => {
  if (!state.comparison) return;
  download(JSON.stringify(state.comparison, null, 2) + '\n', 'stable-sorting-comparison.json');
  byId('comparison-status').textContent = 'Complete comparison download requested. Both full traces are included; the viewed steps are unchanged.';
});
byId('download-lesson').addEventListener('click', () => {
  if (state.lessonText === null) return;
  download(state.lessonText, 'stable-sorting.json');
  byId('lesson-status').textContent = 'Lesson download requested. Import this file in the RecallWeave learner.';
});
loadPreset('crossing');
loadLessonText().then(text => {
  state.lessonText = text;
  byId('download-lesson').disabled = false;
  byId('lesson-status').textContent = '12 original questions · 4 concepts · exact course file';
}).catch(() => {
  byId('lesson-status').textContent = 'The course file could not be loaded. Keep the courses folder beside the modular explorer, or use the complete standalone file.';
});
