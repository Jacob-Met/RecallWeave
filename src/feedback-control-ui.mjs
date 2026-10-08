import { DEFAULT_SETTINGS, PRESETS, simulateFeedback, feedbackCsv } from './feedback-control.mjs';

const byId = id => document.getElementById(id);
const form = byId('experiment-form');
const names = Object.keys(DEFAULT_SETTINGS);
const fields = Object.fromEntries(names.map(name => [name, byId(name)]));
const plot = byId('trace-plot');
const slider = byId('selected-step');
const status = byId('run-status');
const downloadStatus = byId('download-status');
const ns = 'http://www.w3.org/2000/svg';
let current;
let selected = 0;

function number(value, precision = 6) {
  if (value === null) return '—';
  if (value === 0) return '0';
  return Number(value.toPrecision(precision)).toString();
}
function setStatus(message, kind = '') {
  status.textContent = message;
  status.className = kind;
}
function setFields(settings) {
  for (const name of names) fields[name].value = String(settings[name]);
}
function readFields() {
  return Object.fromEntries(names.map(name => [name, fields[name].valueAsNumber]));
}
function markDraft() {
  byId('download-trace').disabled = true;
  setStatus('Settings changed. Apply them to compute a new run. The plot and table still show the last applied experiment.', 'dirty');
}
function svgElement(tag, attributes = {}, text = undefined) {
  const node = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}
function drawPlot() {
  if (!current) return;
  const width = Math.max(250, Math.round(plot.parentElement.getBoundingClientRect().width));
  const height = width < 400 ? 280 : 310;
  const left = width < 400 ? 63 : 70;
  const right = width - 13;
  const top = 21;
  const bottom = height - 36;
  const values = current.rows.flatMap(row => [row.x, row.compared]);
  values.push(current.settings.reference);
  const smallest = Math.min(...values);
  const largest = Math.max(...values);
  const padding = Math.max((largest - smallest) * 0.08, 0.125);
  const low = smallest - padding;
  const high = largest + padding;
  const px = n => left + n / current.settings.steps * (right - left);
  const py = state => bottom - (state - low) / (high - low) * (bottom - top);
  plot.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  plot.replaceChildren(
    svgElement('title', { id: 'trace-title' }, 'Two starting states under the same feedback rule'),
    svgElement('desc', { id: 'trace-description' },
      'Updates 0 to ' + current.settings.steps + '. Recorded state range ' + number(smallest) + ' to ' +
      number(largest) + '. ' + current.label + '. The table contains the recorded values.')
  );
  const add = node => plot.appendChild(node);
  for (let tick = 0; tick <= 4; tick += 1) {
    const value = low + (high - low) * tick / 4;
    const y = py(value);
    add(svgElement('line', { x1: left, y1: y, x2: right, y2: y, stroke: '#dce4de', 'stroke-width': 1 }));
    add(svgElement('text', { x: left - 9, y: y + 4, 'text-anchor': 'end', fill: '#4d626b', 'font-size': 11 }, number(value, 3)));
  }
  const ticks = [...new Set([0, Math.floor(current.settings.steps / 2), current.settings.steps])];
  for (const n of ticks) {
    add(svgElement('text', { x: px(n), y: bottom + 19, 'text-anchor': 'middle', fill: '#4d626b', 'font-size': 11 }, String(n)));
  }
  add(svgElement('text', { x: left, y: 12, fill: '#4d626b', 'font-size': 11 }, 'state'));
  add(svgElement('text', { x: right, y: height - 2, 'text-anchor': 'end', fill: '#4d626b', 'font-size': 11 }, 'update n'));
  add(svgElement('line', { x1: left, y1: py(current.settings.reference), x2: right, y2: py(current.settings.reference), stroke: '#465eab', 'stroke-width': 1.5, 'stroke-dasharray': '2 4' }));
  const path = key => current.rows.map((row, index) => (index ? 'L' : 'M') + px(row.n) + ',' + py(row[key])).join(' ');
  add(svgElement('path', { d: path('x'), fill: 'none', stroke: '#006c70', 'stroke-width': 2.8, 'stroke-linejoin': 'round' }));
  add(svgElement('path', { d: path('compared'), fill: 'none', stroke: '#b4462e', 'stroke-width': 2.1, 'stroke-dasharray': '7 4', 'stroke-linejoin': 'round' }));
  const row = current.rows[selected];
  add(svgElement('line', { x1: px(row.n), y1: top, x2: px(row.n), y2: bottom, stroke: '#7c897f', 'stroke-width': 1, 'stroke-dasharray': '3 4' }));
  add(svgElement('circle', { cx: px(row.n), cy: py(row.x), r: 4, fill: '#006c70', stroke: '#fffdf7', 'stroke-width': 1.5 }));
  add(svgElement('circle', { cx: px(row.n), cy: py(row.compared), r: 3, fill: '#b4462e', stroke: '#fffdf7', 'stroke-width': 1 }));
}
function renderSelected() {
  const row = current.rows[selected];
  byId('step-label').textContent = 'n = ' + selected + ' of ' + current.settings.steps;
  byId('step-state').textContent = number(row.x);
  byId('step-error').textContent = number(row.error);
  byId('step-control').textContent = number(row.control);
  byId('step-next').textContent = number(row.next);
  byId('step-note').textContent = row.applied
    ? 'Read x[' + row.n + '], compute u[' + row.n + '], then obtain x[' + (row.n + 1) + ']. Values above are rounded for reading.'
    : 'This is the final recorded state. No correction is applied after it in this run, and no next state is recorded.';
  for (const node of byId('trace-rows').children) node.classList.toggle('selected', Number(node.dataset.step) === selected);
  drawPlot();
}
function renderTable() {
  const body = byId('trace-rows');
  const rows = current.rows.map(row => {
    const tr = document.createElement('tr');
    tr.dataset.step = String(row.n);
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = String(row.n);
    tr.appendChild(heading);
    for (const key of ['x', 'compared', 'error', 'control', 'next', 'difference', 'predictedDifference']) {
      const cell = document.createElement('td');
      cell.textContent = number(row[key]);
      tr.appendChild(cell);
    }
    return tr;
  });
  body.replaceChildren(...rows);
}
function apply(settings) {
  try {
    const run = simulateFeedback(settings);
    current = run;
    selected = 0;
    slider.max = String(run.settings.steps);
    slider.value = '0';
    byId('multiplier').textContent = number(run.q);
    byId('behavior').textContent = run.label;
    byId('behavior-detail').textContent = run.detail;
    byId('fixed-point').textContent = run.fixedPoint.kind === 'unique'
      ? number(run.fixedPoint.value)
      : run.fixedPoint.kind === 'every-state' ? 'Every state is fixed' : 'No fixed point';
    const s = run.settings;
    byId('applied-settings').textContent = 'Applied: a = ' + s.a + ', k = ' + s.gain + ', r = ' + s.reference +
      ', d = ' + s.disturbance + ', x[0] = ' + s.initial + ', δ = ' + s.offset + ', N = ' + s.steps + '.';
    for (const button of byId('presets').children) {
      const preset = PRESETS.find(item => item.id === button.dataset.preset);
      button.setAttribute('aria-pressed', String(names.every(name => preset.settings[name] === s[name])));
    }
    renderTable();
    renderSelected();
    byId('download-trace').disabled = false;
    setStatus('Applied ' + s.steps + ' updates; showing ' + run.rows.length + ' state rows. The trace download uses these settings.');
    downloadStatus.textContent = '';
  } catch (error) {
    byId('download-trace').disabled = true;
    setStatus(error.message + ' The last applied plot and table are unchanged. Correct the settings and apply again.', 'error');
  }
}
function requestDownload(bytes, filename, type) {
  let url;
  try {
    url = URL.createObjectURL(new Blob([bytes], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    downloadStatus.textContent = 'Download requested: ' + filename;
  } catch (error) {
    downloadStatus.textContent = 'The download could not be requested: ' + error.message;
  } finally {
    if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
for (const preset of PRESETS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.preset = preset.id;
  button.textContent = preset.title;
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => { setFields(preset.settings); apply(preset.settings); });
  byId('presets').appendChild(button);
}
form.addEventListener('input', markDraft);
form.addEventListener('submit', event => { event.preventDefault(); apply(readFields()); });
byId('restore-defaults').addEventListener('click', () => { setFields(DEFAULT_SETTINGS); apply(DEFAULT_SETTINGS); });
slider.addEventListener('input', () => { selected = Number(slider.value); renderSelected(); });
byId('download-trace').addEventListener('click', () => {
  if (current && !byId('download-trace').disabled) requestDownload(feedbackCsv(current), 'feedback-control-trace.csv', 'text/csv;charset=utf-8');
});
byId('download-course').addEventListener('click', () => {
  const encoded = byId('course-bytes').textContent.trim();
  const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
  requestDownload(bytes, 'feedback-control.json', 'application/json;charset=utf-8');
});
new ResizeObserver(drawPlot).observe(plot.parentElement);
setFields(DEFAULT_SETTINGS);
apply(DEFAULT_SETTINGS);
