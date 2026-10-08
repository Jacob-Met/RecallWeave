import {RC_LIMITS, RC_EXAMPLES, RC_HORIZON_TAU, parseRcNumber, calculateRc, buildRcTrace, rcObservation} from './rc-transients.mjs';

const byId = id => document.getElementById(id);
const form = byId('circuit-form');
const fields = Object.fromEntries(Object.keys(RC_LIMITS).map(key => [key, byId(key)]));
const status = byId('status');
const error = byId('input-error');
const results = byId('results');
const pending = byId('pending');
const cursor = byId('time-range');
const observationButton = byId('download-observation');
const timeButtons = [...document.querySelectorAll('[data-time]')];
const exampleButtons = [...document.querySelectorAll('[data-example]')];
const courseText = JSON.parse(byId('course-payload').textContent);
const guideText = JSON.parse(byId('guide-payload').textContent);
let applied = null;
let trace = null;
let plots = [];

function format(value) {
  if (value === 0) return '0';
  const magnitude = Math.abs(value);
  if (magnitude >= 1e6 || magnitude < 1e-4) return value.toExponential(4);
  return Number(value.toPrecision(6)).toLocaleString('en', {maximumSignificantDigits: 6});
}

function say(message) { status.textContent = message; }

function retire(message) {
  applied = null;
  trace = null;
  plots = [];
  results.hidden = true;
  pending.hidden = false;
  cursor.disabled = true;
  observationButton.disabled = true;
  for (const button of timeButtons) button.disabled = true;
  error.hidden = true;
  error.textContent = '';
  for (const field of Object.values(fields)) field.removeAttribute('aria-invalid');
  say(message);
}

function fillExample(id, announce = true) {
  const example = RC_EXAMPLES.find(item => item.id === id);
  if (!example) return;
  for (const [key, value] of Object.entries(example.inputs)) fields[key].value = String(value);
  for (const button of exampleButtons) button.setAttribute('aria-pressed', String(button.dataset.example === id));
  byId('example-note').textContent = example.description;
  if (announce) retire(example.title + ' loaded as a draft. Apply circuit to calculate.');
}

for (const field of Object.values(fields)) {
  field.addEventListener('input', () => {
    for (const button of exampleButtons) button.setAttribute('aria-pressed', 'false');
    byId('example-note').textContent = 'Custom circuit. Apply these four values to inspect a new response.';
    retire('Circuit values changed. Previous results are retired. Apply circuit to calculate.');
  });
}
for (const button of exampleButtons) button.addEventListener('click', () => fillExample(button.dataset.example));

function svgElement(name, attributes = {}, text) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  if (text !== undefined) element.textContent = text;
  return element;
}

function drawPlot(id, series, label, title) {
  const svg = byId(id);
  const width = 480, height = 260;
  const box = {left: 67, right: 20, top: 25, bottom: 48};
  const plotWidth = width - box.left - box.right;
  const plotHeight = height - box.top - box.bottom;
  const values = [0, ...series.flatMap(line => line.values)];
  let low = Math.min(...values), high = Math.max(...values);
  if (low === high) { low -= 1; high += 1; }
  const pad = (high - low) * 0.08;
  low -= pad; high += pad;
  const x = u => box.left + u / RC_HORIZON_TAU * plotWidth;
  const y = value => box.top + (high - value) / (high - low) * plotHeight;
  svg.replaceChildren();
  svg.append(svgElement('title', {id: id + '-title'}, title));
  const description = svgElement('desc', {id: id + '-desc'}, title + '. Exact selected values and all 161 samples are available in the tables below.');
  svg.append(description);
  for (let step = 0; step <= 4; step++) {
    const u = step * 2;
    svg.append(svgElement('line', {x1: x(u), x2: x(u), y1: box.top, y2: height - box.bottom, class: 'grid-line'}));
    svg.append(svgElement('text', {x: x(u), y: height - 23, 'text-anchor': 'middle', class: 'axis-text'}, String(u)));
    const value = low + (high - low) * step / 4;
    svg.append(svgElement('line', {x1: box.left, x2: width - box.right, y1: y(value), y2: y(value), class: 'grid-line'}));
    svg.append(svgElement('text', {x: box.left - 8, y: y(value) + 5, 'text-anchor': 'end', class: 'axis-text'}, format(value)));
  }
  svg.append(svgElement('line', {x1: box.left, x2: width - box.right, y1: y(0), y2: y(0), class: 'zero-line'}));
  svg.append(svgElement('text', {x: box.left, y: 16, class: 'axis-label'}, label));
  svg.append(svgElement('text', {x: width - box.right, y: height - 3, 'text-anchor': 'end', class: 'axis-label'}, 't / τ'));
  for (const line of series) {
    const points = line.values.map((value, index) => x(trace.samples[index].normalizedTime) + ',' + y(value)).join(' ');
    svg.append(svgElement('polyline', {points, fill: 'none', stroke: line.color, 'stroke-width': 2.8, 'stroke-dasharray': line.dashed ? '7 5' : 'none', 'vector-effect': 'non-scaling-stroke'}));
  }
  const rule = svgElement('line', {x1: x(1), x2: x(1), y1: box.top, y2: height - box.bottom, class: 'cursor-line'});
  const point = svgElement('circle', {cx: x(1), cy: y(series[0].values[20]), r: 5, fill: series[0].color, stroke: '#fff', 'stroke-width': 2});
  svg.append(rule, point);
  return {x, y, rule, point, description, title, value: series[0].value};
}

function showSamples() {
  const body = byId('sample-rows');
  const fragment = document.createDocumentFragment();
  for (const sample of trace.samples) {
    const row = document.createElement('tr');
    for (const value of [sample.normalizedTime, sample.seconds, sample.capacitorVolts, sample.currentAmps * 1000]) {
      const cell = document.createElement('td');
      cell.textContent = format(value);
      row.append(cell);
    }
    fragment.append(row);
  }
  body.replaceChildren(fragment);
}

function inspect() {
  if (!applied) return;
  const u = Number(cursor.value);
  const point = calculateRc(applied, u);
  byId('time-output').textContent = u.toFixed(2) + ' τ';
  byId('time-seconds').textContent = format(point.seconds) + ' s';
  byId('time-constant').textContent = format(point.timeConstantSeconds) + ' s';
  byId('decay-factor').textContent = format(point.remainingFraction * 100) + '%';
  byId('decay-note').textContent = applied.sourceVolts === applied.initialVolts
    ? 'Multiplier only: the initial voltage gap is zero, so this circuit is already at equilibrium.'
    : 'of the initial voltage gap remains at this finite time.';
  const cells = {
    'value-vc': [point.capacitorVolts, 'V'],
    'value-vr': [point.resistorVolts, 'V'],
    'value-current': [point.currentAmps * 1000, 'mA'],
    'value-charge': [point.chargeCoulombs * 1000, 'mC'],
    'value-stored': [point.storedEnergyJoules * 1000, 'mJ'],
    'value-change': [point.changeStoredEnergyJoules * 1000, 'mJ'],
    'value-heat': [point.resistorHeatJoules * 1000, 'mJ'],
    'value-work': [point.sourceWorkJoules * 1000, 'mJ'],
    'value-source-power': [point.sourcePowerWatts * 1000, 'mW'],
    'value-resistor-power': [point.resistorPowerWatts * 1000, 'mW'],
    'value-balance': [(point.sourceWorkJoules - point.changeStoredEnergyJoules - point.resistorHeatJoules) * 1000, 'mJ'],
  };
  for (const [id, [value, unit]] of Object.entries(cells)) byId(id).textContent = format(value) + ' ' + unit;
  byId('flow-note').textContent = point.sourcePowerWatts < 0
    ? 'The source absorbs energy at this instant. Current is signed; resistor dissipation remains nonnegative.'
    : point.currentAmps === 0
      ? 'No current flows in this equilibrium circuit. A charged capacitor can still store energy.'
      : point.sourcePowerWatts === 0
        ? 'The 0 V source does no work. Stored capacitor energy becomes resistor heat.'
        : 'The source delivers energy at this instant. The energy table tracks work and heat since t = 0.';
  for (const plot of plots) {
    plot.rule.setAttribute('x1', plot.x(u));
    plot.rule.setAttribute('x2', plot.x(u));
    plot.point.setAttribute('cx', plot.x(u));
    plot.point.setAttribute('cy', plot.y(plot.value(point)));
    plot.description.textContent = plot.title + '. Cursor at ' + u.toFixed(2) + ' time constants, or ' + format(point.seconds) + ' seconds. Exact values are available in the inspection and sample tables.';
  }
  byId('inspection-summary').textContent = 'At ' + u.toFixed(2) + ' τ: capacitor ' + format(point.capacitorVolts) + ' V; current ' + format(point.currentAmps * 1000) + ' mA.';
}

function applyCircuit(event) {
  if (event) event.preventDefault();
  const values = {};
  let badField = null;
  try {
    for (const [key, field] of Object.entries(fields)) {
      badField = field;
      values[key] = parseRcNumber(field.value, key);
    }
    const nextTrace = buildRcTrace(values);
    applied = nextTrace.inputs;
    trace = nextTrace;
    error.hidden = true;
    error.textContent = '';
    for (const field of Object.values(fields)) field.removeAttribute('aria-invalid');
    cursor.value = '1';
    cursor.disabled = false;
    observationButton.disabled = false;
    for (const button of timeButtons) button.disabled = false;
    pending.hidden = true;
    results.hidden = false;
    byId('applied-circuit').textContent = 'Applied: R = ' + format(applied.resistanceOhms) + ' Ω; C = ' + format(applied.capacitanceMicrofarads) + ' µF; Vs = ' + format(applied.sourceVolts) + ' V; V0 = ' + format(applied.initialVolts) + ' V.';
    plots = [
      drawPlot('voltage-plot', [
        {values: trace.samples.map(p => p.capacitorVolts), value: p => p.capacitorVolts, color: '#086b62'},
        {values: trace.samples.map(() => applied.sourceVolts), color: '#73756f', dashed: true},
      ], 'Voltage / V', 'Capacitor voltage approaches the fixed source voltage'),
      drawPlot('current-plot', [
        {values: trace.samples.map(p => p.currentAmps * 1000), value: p => p.currentAmps * 1000, color: '#a2471e'},
      ], 'Current / mA', 'Signed current approaches zero'),
    ];
    showSamples();
    inspect();
    say('Circuit applied. Inspect the same response from 0 to 8 time constants, or download this observation.');
  } catch (problem) {
    retire('Circuit was not applied. Correct the indicated value.');
    error.hidden = false;
    error.textContent = problem.message;
    if (badField) {
      badField.setAttribute('aria-invalid', 'true');
      badField.focus();
    }
  }
}

function download(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], {type}));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

form.addEventListener('submit', applyCircuit);
cursor.addEventListener('input', inspect);
for (const button of timeButtons) button.addEventListener('click', () => {
  if (!applied) return;
  cursor.value = button.dataset.time;
  inspect();
});
observationButton.addEventListener('click', () => {
  if (!applied) return;
  download(JSON.stringify(rcObservation(applied, Number(cursor.value)), null, 2) + '\n', 'rc-transients-observation.json', 'application/json');
  say('Observation downloaded with the applied circuit, selected time and all 161 samples.');
});
for (const button of document.querySelectorAll('[data-download-course]')) button.addEventListener('click', () => {
  download(courseText, 'rc-transients.json', 'application/json');
  say('The fixed 16-question RC course was downloaded. Import it in RecallWeave to begin.');
});
for (const button of document.querySelectorAll('[data-download-guide]')) button.addEventListener('click', () => {
  download(guideText, 'rc-transients.md', 'text/markdown;charset=utf-8');
  say('The study guide was downloaded with equations, worked examples and transfer answers.');
});

fillExample('charge', false);
applyCircuit();
