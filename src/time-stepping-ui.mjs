import {simulate, observation} from './time-stepping.mjs';

const byId = id => document.getElementById(id);
const form = byId('settings');
const fields = ['lambda', 'step', 'steps', 'initial'];
const presets = {
  small: {lambda: 1, step: 0.5, steps: 4, initial: 1},
  alternating: {lambda: 1, step: 1.5, steps: 8, initial: 1},
  boundary: {lambda: 1, step: 2, steps: 8, initial: 1},
  growing: {lambda: 1.25, step: 2, steps: 8, initial: 1},
  negative: {lambda: 2, step: 0.25, steps: 8, initial: -2},
  zero: {lambda: 4, step: 2, steps: 8, initial: 0}
};
const labels = {
  monotone_decay: 'Keeps sign; decays in magnitude',
  one_step_zero: 'Reaches zero after one update',
  alternating_decay: 'Alternates; decays in magnitude',
  alternating_boundary: 'Alternates; bounded but nondecaying',
  alternating_growth: 'Alternates; grows in magnitude'
};
const documents = JSON.parse(byId('documents').textContent);
const series = [
  {key: 'exact', label: 'Exact solution', color: '#273443', dash: ''},
  {key: 'forward', label: 'Forward Euler', color: '#bb3e24', dash: '9 4'},
  {key: 'backward', label: 'Backward Euler', color: '#006c91', dash: '3 4'}
];
let trace = null, selected = 0;
const format = value => value === 0 ? '0' : Number(value.toPrecision(7)).toString();
const svgNS = 'http://www.w3.org/2000/svg';

function node(tag, attributes = {}, content) {
  const element = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (content !== undefined) element.textContent = content;
  return element;
}
function status(text, error = false) {
  byId('status').textContent = text;
  byId('status').classList.toggle('error', error);
}
function retire() {
  trace = null;
  byId('results').hidden = true;
  byId('download-observation').disabled = true;
  status('Draft settings. Apply them to produce a new experiment.');
}
function fill(settings) {
  for (const key of fields) byId(key).value = settings[key];
}
function draw() {
  const plot = byId('plot-content');
  plot.replaceChildren();
  const width = 900, height = 350;
  const margin = {left: 100, right: 22, top: 22, bottom: 50};
  const values = trace.rows.flatMap(row => series.map(s => row[s.key]));
  let low = Math.min(0, ...values), high = Math.max(0, ...values);
  const span = high - low;
  if (span === 0) { low = -1; high = 1; }
  else { low -= span * 0.08; high += span * 0.08; }
  const lastTime = trace.rows.at(-1).time;
  const x = time => margin.left + time / lastTime * (width - margin.left - margin.right);
  const y = value => margin.top + (high - value) / (high - low) * (height - margin.top - margin.bottom);
  for (let i = 0; i <= 4; i++) {
    const value = low + (high - low) * i / 4, time = lastTime * i / 4;
    plot.append(node('line', {x1: margin.left, x2: width - margin.right, y1: y(value), y2: y(value), class: 'grid'}));
    plot.append(node('text', {x: margin.left - 10, y: y(value) + 4, 'text-anchor': 'end', class: 'tick'}, format(value)));
    plot.append(node('text', {x: x(time), y: height - 24, 'text-anchor': 'middle', class: 'tick'}, format(time)));
  }
  plot.append(node('line', {x1: margin.left, x2: width - margin.right, y1: y(0), y2: y(0), class: 'zero-axis'}));
  for (const s of series) {
    const path = trace.rows.map((row, index) => (index ? 'L' : 'M') + x(row.time) + ',' + y(row[s.key])).join(' ');
    plot.append(node('path', {d: path, fill: 'none', stroke: s.color, 'stroke-width': 2.5,
      'stroke-dasharray': s.dash, 'data-series': s.key}));
  }
  const row = trace.rows[selected];
  plot.append(node('line', {x1: x(row.time), x2: x(row.time), y1: margin.top,
    y2: height - margin.bottom, stroke: '#8c7165', 'stroke-dasharray': '2 5'}));
  for (const s of series) {
    plot.append(node('circle', {cx: x(row.time), cy: y(row[s.key]), r: s.key === 'exact' ? 6 : 4,
      fill: s.color, stroke: 'white', 'stroke-width': 1.5, 'data-marker': s.key}));
  }
  byId('plot-description').textContent = 'Shared linear scale from ' + format(low) + ' to ' + format(high) +
    '. Recorded times from 0 to ' + format(lastTime) + ' seconds. Selected row ' + selected + '. ' +
    series.map(s => s.label + ' ' + format(row[s.key])).join('; ') + '.';
}
function select(index) {
  if (!trace) return;
  selected = Math.max(0, Math.min(trace.settings.steps, index));
  const row = trace.rows[selected];
  byId('selected-step').value = selected;
  byId('row-label').textContent = 'Row ' + selected + ' of ' + trace.settings.steps + ' · t = ' + format(row.time) + ' s';
  byId('selected-step').setAttribute('aria-valuetext', 'Row ' + selected + ', time ' + format(row.time) + ' seconds');
  byId('previous').disabled = selected === 0;
  byId('next').disabled = selected === trace.settings.steps;
  byId('final').disabled = selected === trace.settings.steps;
  for (const key of ['exact', 'forward', 'backward', 'forwardError', 'backwardError', 'forwardAbsError', 'backwardAbsError']) {
    byId('value-' + key).textContent = format(row[key]);
    byId('value-' + key).dataset.value = String(row[key]);
  }
  byId('inspector').dataset.index = String(selected);
  draw();
}
function apply() {
  try {
    const settings = {};
    for (const key of fields) {
      const text = byId(key).value.trim();
      if (!text) throw new TypeError('Enter a value for every setting.');
      settings[key] = Number(text);
    }
    trace = simulate(settings);
    byId('results').hidden = false;
    byId('selected-step').max = trace.settings.steps;
    byId('product').textContent = format(trace.z);
    byId('forward-multiplier').textContent = format(trace.forwardMultiplier);
    byId('backward-multiplier').textContent = format(trace.backwardMultiplier);
    byId('behavior').textContent = labels[trace.forwardBehavior];
    byId('behavior').dataset.behavior = trace.forwardBehavior;
    byId('zero-note').hidden = trace.settings.initial !== 0;
    byId('applied-settings').textContent = 'Applied: λ = ' + format(trace.settings.lambda) +
      ' s⁻¹; h = ' + format(trace.settings.step) + ' s; y₀ = ' + format(trace.settings.initial) +
      '; N = ' + trace.settings.steps + '; final time = ' + format(trace.rows.at(-1).time) + ' s.';
    select(0);
    byId('download-observation').disabled = false;
    status('Experiment applied. Select a recorded row to compare values at the same time.');
  } catch (error) {
    retire();
    status(error.message + ' Previous results are retired; no observation is available.', true);
  }
}
function download(name, text, type) {
  const blob = new Blob([text], {type});
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
form.addEventListener('input', retire);
form.addEventListener('submit', event => { event.preventDefault(); apply(); });
for (const button of document.querySelectorAll('[data-preset]')) {
  button.addEventListener('click', () => { fill(presets[button.dataset.preset]); retire(); });
}
byId('selected-step').addEventListener('input', event => select(Number(event.target.value)));
byId('previous').addEventListener('click', () => select(selected - 1));
byId('next').addEventListener('click', () => select(selected + 1));
byId('final').addEventListener('click', () => select(trace.settings.steps));
byId('download-observation').addEventListener('click', () => {
  if (trace) download('time-stepping-observation.json',
    JSON.stringify(observation(trace.settings, selected), null, 2) + '\n', 'application/json');
});
byId('download-course').addEventListener('click', () => download('time-stepping.json', documents.course, 'application/json'));
byId('download-guide').addEventListener('click', () => download('time-stepping.md', documents.guide, 'text/markdown'));
fill(presets.small);
apply();
