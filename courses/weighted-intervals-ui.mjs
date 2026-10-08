import {EXAMPLES, LIMITS, solveSchedule} from './weighted-intervals-core.mjs';

const byId = id => document.getElementById(id);
const courseText = JSON.stringify(JSON.parse(byId('course-data').textContent), null, 2) + '\n';
const fields = ['start', 'end', 'value'];
let draft = [];
let submitted = [];
let solution = null;
let prefix = null;
let rowIndex = 0;
let traceRevealed = 0;
let traceStarted = false;

function textNode(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function renderInputs(focusId = null) {
  const container = byId('activities');
  container.replaceChildren();
  for (const activity of draft) {
    const row = document.createElement('div');
    row.className = 'activity-row';
    row.append(textNode('span', activity.id, 'activity-id'));
    for (const field of fields) {
      const input = document.createElement('input');
      input.id = 'activity-' + activity.id + '-' + field;
      input.type = 'text';
      input.inputMode = 'numeric';
      input.autocomplete = 'off';
      input.maxLength = 2;
      input.value = activity[field];
      input.dataset.id = activity.id;
      input.dataset.field = field;
      input.setAttribute('aria-label', activity.id + ' ' + field);
      input.setAttribute('aria-describedby', 'activities-title');
      row.append(input);
    }
    const remove = textNode('button', '×');
    remove.type = 'button';
    remove.dataset.remove = activity.id;
    remove.setAttribute('aria-label', 'Remove ' + activity.id);
    row.append(remove);
    container.append(row);
  }
  if (!draft.length) container.append(textNode('p', 'No activities. You can solve the empty schedule or add one.', 'empty-input'));
  byId('add-activity').disabled = draft.length >= LIMITS.activities;
  if (focusId) byId(focusId)?.focus();
}

function clearError() {
  byId('input-error').hidden = true;
  byId('input-error').textContent = '';
  for (const input of byId('activities').querySelectorAll('input')) input.removeAttribute('aria-invalid');
}

function invalidate(message) {
  solution = null;
  prefix = null;
  submitted = [];
  traceRevealed = 0;
  traceStarted = false;
  clearError();
  byId('input-status').textContent = message;
  byId('result-content').hidden = true;
  byId('result-placeholder').hidden = false;
  byId('trace-card').hidden = true;
  for (const id of ['previous-row', 'next-row', 'show-result', 'trace-choices', 'next-choice', 'download-trace']) byId(id).disabled = true;
  for (const id of ['best-value', 'selected-activities', 'step-explanation', 'greedy-value', 'greedy-schedule', 'comparison-optimum', 'trace-result']) byId(id).textContent = '';
  byId('dp-rows').replaceChildren();
  byId('timeline').replaceChildren();
  byId('backtrack-steps').replaceChildren();
}

function readDraft() {
  return draft.map(activity => {
    const parsed = {id: activity.id};
    for (const field of fields) {
      const raw = activity[field].trim();
      const maximum = field === 'value' ? LIMITS.value : LIMITS.time;
      if (!/^\d+$/.test(raw) || !Number.isInteger(Number(raw)) || Number(raw) > maximum) {
        byId('activity-' + activity.id + '-' + field).setAttribute('aria-invalid', 'true');
        throw new RangeError(activity.id + ' ' + field + ' needs a whole number from 0 to ' + maximum + '.');
      }
      parsed[field] = Number(raw);
    }
    if (parsed.start >= parsed.end) {
      byId('activity-' + activity.id + '-end').setAttribute('aria-invalid', 'true');
      throw new RangeError(activity.id + ' must end after it starts.');
    }
    return parsed;
  });
}

function solve(focus = true) {
  invalidate('Checking the current activities…');
  try {
    const input = readDraft();
    const result = solveSchedule(input);
    submitted = input;
    solution = result;
    rowIndex = 0;
    traceRevealed = 0;
    traceStarted = false;
    byId('input-status').textContent = input.length + ' activities checked. Start at row 0, then inspect each decision.';
    byId('result-placeholder').hidden = true;
    byId('result-content').hidden = false;
    byId('trace-card').hidden = false;
    renderResult();
    if (focus) byId('table-title').focus({preventScroll: false});
  } catch (error) {
    byId('input-status').textContent = 'No result for this draft. Fix the marked activity and solve again.';
    byId('input-error').textContent = error.message;
    byId('input-error').hidden = false;
    if (focus) byId('input-error').focus({preventScroll: false});
  }
}

function svgNode(tag, attributes, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderTimeline() {
  if (!solution || !prefix) return;
  const svg = byId('timeline');
  const width = Math.max(280, Math.round(svg.getBoundingClientRect().width || 640));
  const left = 70;
  const right = width - 17;
  const top = 31;
  const height = top + Math.max(1, solution.ordered.length) * 31 + 34;
  const extent = Math.max(8, Math.ceil(Math.max(0, ...solution.ordered.map(a => a.end)) / 4) * 4);
  const x = time => left + time / extent * (right - left);
  const selected = new Set(prefix.selectedIds);
  const currentId = solution.rows[rowIndex].id;
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  svg.replaceChildren();
  svg.append(svgNode('title', {id: 'timeline-title'}, 'Activity windows and the selected prefix schedule'));
  const descriptions = solution.ordered.map(a => a.id + ': [' + a.start + ', ' + a.end + '), value ' + a.value + (selected.has(a.id) ? ', selected.' : ', not selected in this prefix.'));
  svg.append(svgNode('desc', {id: 'timeline-description'}, 'Horizontal position is abstract time from 0 to ' + extent + '. Labels show ID and value. ' + descriptions.join(' ')));
  svg.append(svgNode('text', {x: 4, y: 16, fill: '#526671', 'font-size': 10}, 'ID · VALUE'));
  for (let time = 0; time <= extent; time += extent <= 8 ? 2 : 4) {
    svg.append(svgNode('line', {x1: x(time), y1: top - 9, x2: x(time), y2: height - 26, stroke: '#dfe6df', 'stroke-width': 1}));
    svg.append(svgNode('text', {x: x(time), y: 16, fill: '#526671', 'font-size': 11, 'text-anchor': 'middle'}, String(time)));
  }
  solution.ordered.forEach((activity, index) => {
    const y = top + index * 31;
    const isSelected = selected.has(activity.id);
    const isCurrent = activity.id === currentId;
    svg.append(svgNode('text', {x: 4, y: y + 14, fill: '#193447', 'font-size': 11, 'font-weight': isSelected ? 750 : 500}, activity.id + ' · ' + activity.value));
    const bar = svgNode('rect', {x: x(activity.start), y, width: x(activity.end) - x(activity.start), height: 20, rx: 3, fill: isSelected ? '#096e64' : '#b9c9c3', stroke: isCurrent ? '#bc7c08' : 'none', 'stroke-width': isCurrent ? 3 : 0});
    bar.append(svgNode('title', {}, activity.id + ' [' + activity.start + ', ' + activity.end + '), value ' + activity.value));
    svg.append(bar);
    svg.append(svgNode('circle', {cx: x(activity.end), cy: y + 10, r: 3, fill: '#fffefa', stroke: isSelected ? '#096e64' : '#738d82', 'stroke-width': 1.5}));
  });
  if (!solution.ordered.length) svg.append(svgNode('text', {x: left, y: top + 15, fill: '#526671', 'font-size': 12}, 'Empty schedule · value 0'));
  svg.append(svgNode('text', {x: right, y: height - 5, fill: '#526671', 'font-size': 10, 'text-anchor': 'end'}, 'TIME UNITS · END EXCLUDED'));
}

function renderTable() {
  const body = byId('dp-rows');
  body.replaceChildren();
  for (const row of solution.rows) {
    const tr = document.createElement('tr');
    tr.dataset.row = String(row.j);
    tr.dataset.pending = String(row.j > rowIndex);
    if (row.j === rowIndex) tr.setAttribute('aria-current', 'step');
    const first = document.createElement('td');
    const button = textNode('button', 'Row ' + row.j);
    button.type = 'button';
    button.dataset.row = String(row.j);
    button.setAttribute('aria-label', 'Inspect row ' + row.j);
    first.append(button);
    tr.append(first, textNode('td', row.id ?? 'Empty'), textNode('td', String(row.p)));
    for (const field of ['take', 'skip', 'best', 'choice']) {
      const cell = textNode('td', row.j > rowIndex ? '—' : String(row[field]));
      if (field === 'choice') cell.dataset.choice = row.choice;
      tr.append(cell);
    }
    body.append(tr);
  }
}

function renderBacktrack() {
  byId('backtrack-steps').replaceChildren();
  byId('trace-result').hidden = true;
  byId('trace-result').textContent = '';
  byId('trace-choices').disabled = false;
  byId('trace-choices').textContent = traceStarted ? 'Restart trace' : 'Trace choices';
  byId('next-choice').disabled = !traceStarted || traceRevealed >= prefix.backtrack.length;
  byId('trace-prompt').hidden = traceStarted;
  if (!traceStarted) return;
  for (const step of prefix.backtrack.slice(0, traceRevealed)) {
    const row = solution.rows[step.j];
    let sentence;
    if (step.choice === 'take') sentence = 'Row ' + step.j + ': take ' + step.id + ' (' + row.take + ' > ' + row.skip + '), then jump to p(' + step.j + ') = ' + step.next + '.';
    else sentence = 'Row ' + step.j + ': skip ' + step.id + ' (' + row.take + (row.take === row.skip ? ' = ' : ' < ') + row.skip + '), then move to row ' + step.next + (row.take === row.skip ? '. The tie keeps the earlier prefix.' : '.');
    byId('backtrack-steps').append(textNode('li', sentence));
  }
  if (traceRevealed >= prefix.backtrack.length) {
    byId('trace-result').hidden = false;
    byId('trace-result').textContent = 'Reached row 0. Selected: ' + (prefix.selectedIds.join(' + ') || 'none') + '. Total value: ' + prefix.bestValue + '.';
  }
}

function renderResult() {
  if (!solution) return;
  // Re-solving the inspected prefix uses the same bounded pure consumer and leaves
  // the complete solution intact. Its choices are the first rowIndex table rows.
  prefix = solveSchedule(solution.ordered.slice(0, rowIndex));
  const row = solution.rows[rowIndex];
  const total = solution.ordered.length;
  byId('prefix-label').textContent = rowIndex ? 'Best value · rows 1–' + rowIndex : 'Best value · empty prefix';
  byId('best-value').textContent = String(prefix.bestValue);
  byId('prefix-detail').textContent = rowIndex === total ? 'All ' + total + ' activities considered.' : rowIndex + ' of ' + total + ' activities considered.';
  byId('selected-activities').textContent = prefix.selectedIds.join(' + ') || 'None';
  byId('selection-detail').textContent = prefix.selectedIds.length ? 'One compatible optimum for this prefix.' : 'An empty schedule is allowed.';
  byId('row-position').textContent = 'Row ' + rowIndex + ' of ' + total;
  byId('previous-row').disabled = rowIndex === 0;
  byId('next-row').disabled = rowIndex === total;
  byId('show-result').disabled = rowIndex === total;
  byId('download-trace').disabled = false;
  if (!rowIndex) byId('step-explanation').textContent = 'OPT(0) = 0. Before considering any activity, the only schedule is empty. Move to the next row to compare taking and skipping it.';
  else {
    const activity = solution.ordered[rowIndex - 1];
    const tie = row.take === row.skip;
    byId('step-explanation').textContent = 'Row ' + rowIndex + ' (' + row.id + '): take = ' + activity.value + ' + OPT(' + row.p + ') = ' + row.take + '; skip = OPT(' + (rowIndex - 1) + ') = ' + row.skip + '. ' + (tie ? 'The values tie, so keep the earlier prefix by skipping ' + row.id + '.' : row.choice === 'take' ? 'Taking ' + row.id + ' gives the larger value.' : 'Skipping ' + row.id + ' retains the larger value.') + ' OPT(' + rowIndex + ') = ' + row.best + '.';
  }
  byId('trace-caption').textContent = 'Reconstruct the optimum for the inspected prefix: row ' + rowIndex + '.';
  byId('greedy-schedule').textContent = 'Earliest-finish schedule for these ' + rowIndex + ' rows: ' + (prefix.greedy.selectedIds.join(' + ') || 'none') + '.';
  byId('greedy-value').textContent = String(prefix.greedy.value);
  byId('comparison-optimum').textContent = String(prefix.bestValue);
  byId('greedy-note').textContent = prefix.greedy.value < prefix.bestValue
    ? 'Choosing each next compatible earliest finish misses ' + (prefix.bestValue - prefix.greedy.value) + ' value here.'
    : 'The values tie for this prefix. One tied example does not prove that earliest finish always maximizes total value.';
  renderTimeline();
  renderTable();
  renderBacktrack();
}

function inspectRow(row) {
  if (!solution || !Number.isInteger(row) || row < 0 || row > solution.ordered.length) return;
  rowIndex = row;
  traceRevealed = 0;
  traceStarted = false;
  renderResult();
}

function download(text, filename) {
  const url = URL.createObjectURL(new Blob([text], {type: 'application/json;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

byId('activity-form').addEventListener('submit', event => {event.preventDefault(); solve();});
byId('activities').addEventListener('input', event => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !fields.includes(input.dataset.field)) return;
  const activity = draft.find(a => a.id === input.dataset.id);
  if (!activity) return;
  activity[input.dataset.field] = input.value;
  invalidate('Activities changed. Solve again to inspect this draft.');
});
byId('activities').addEventListener('click', event => {
  const button = event.target.closest('button[data-remove]');
  if (!button) return;
  const index = draft.findIndex(a => a.id === button.dataset.remove);
  draft = draft.filter(a => a.id !== button.dataset.remove);
  invalidate('Activity removed. Solve again to inspect this draft.');
  const next = draft[Math.min(index, draft.length - 1)];
  renderInputs(next ? 'activity-' + next.id + '-start' : 'add-activity');
});
byId('add-activity').addEventListener('click', () => {
  if (draft.length >= LIMITS.activities) return;
  const id = [...'ABCDEFGH'].find(id => !draft.some(a => a.id === id));
  draft.push({id, start: '0', end: '1', value: '1'});
  invalidate('Activity added. Set its times and value, then solve again.');
  renderInputs('activity-' + id + '-start');
});
byId('load-example').addEventListener('click', () => {
  const chosen = EXAMPLES[byId('example').value];
  if (!chosen) return;
  draft = chosen.map(activity => ({id: activity.id, ...Object.fromEntries(fields.map(field => [field, String(activity[field])]))}));
  renderInputs();
  solve(false);
});
byId('previous-row').addEventListener('click', () => inspectRow(rowIndex - 1));
byId('next-row').addEventListener('click', () => inspectRow(rowIndex + 1));
byId('show-result').addEventListener('click', () => {if (solution) inspectRow(solution.ordered.length);});
byId('dp-rows').addEventListener('click', event => {
  const button = event.target.closest('button[data-row]');
  if (!button) return;
  inspectRow(Number(button.dataset.row));
  byId('dp-rows').querySelector('button[data-row="' + rowIndex + '"]')?.focus({preventScroll: true});
});
byId('trace-choices').addEventListener('click', () => {
  if (!prefix) return;
  traceStarted = true;
  traceRevealed = Math.min(1, prefix.backtrack.length);
  renderBacktrack();
});
byId('next-choice').addEventListener('click', () => {
  if (!prefix || !traceStarted) return;
  traceRevealed = Math.min(prefix.backtrack.length, traceRevealed + 1);
  renderBacktrack();
});
byId('download-trace').addEventListener('click', () => {
  if (!solution || !prefix) return;
  const trace = {
    format: 'recallweave-weighted-interval-trace/1',
    conventions: {interval: '[start,end)', resourceCount: 1, timeUnit: 'abstract', sort: ['end', 'start', 'id-code-units'], tie: 'skip-current'},
    activities: submitted,
    solution,
    view: {row: rowIndex, backtrackRevealed: traceRevealed, prefix: {bestValue: prefix.bestValue, selectedIds: prefix.selectedIds, backtrack: prefix.backtrack, greedy: prefix.greedy}}
  };
  download(JSON.stringify(trace, null, 2) + '\n', 'weighted-interval-trace.json');
});
byId('download-course').addEventListener('click', () => download(courseText, 'weighted-interval-scheduling.json'));
byId('backtrack-steps').setAttribute('aria-live', 'polite');
byId('trace-result').setAttribute('role', 'status');
draft = EXAMPLES['greedy-trap'].map(activity => ({id: activity.id, ...Object.fromEntries(fields.map(field => [field, String(activity[field])]))}));
renderInputs();
solve(false);
new ResizeObserver(renderTimeline).observe(byId('timeline'));
