import { parseReadings, parseMeasurementNumber, summarizeMeasurements, projectUncertainty } from './measurement-uncertainty.mjs';

/** The standalone builder inlines this module; it makes no network/storage calls. */
const byId = id => document.getElementById(id);
const form = byId('measurement-form');
const results = byId('measurement-results');
const errorBox = byId('lab-error');
const status = byId('calculation-status');
const format = value => value === 0 ? '0' : Number(value.toPrecision(6)).toString();
const formatTick = value => {
  if (value === 0) return '0';
  const magnitude = Math.abs(value);
  return magnitude >= 1e4 || magnitude < 1e-3
    ? value.toExponential(2).replace(/\.?0+(?=e)/, '')
    : Number(value.toPrecision(3)).toString();
};
const presets = Object.freeze({
  repeatability: { readings: '9.8, 10.2, 9.9, 10.1, 10.0', correction: '-0.04', halfWidth: '0.02' },
  calibration: { readings: '9.8, 10.2, 9.9, 10.1, 10.0', correction: '-0.04', halfWidth: '0.30' },
  identical: { readings: '10.00, 10.00, 10.00, 10.00, 10.00', correction: '-0.04', halfWidth: '0.10' },
});

function svgNode(name, attributes = {}, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}

function chartBase(id, title, description) {
  const svg = svgNode('svg', { viewBox: '0 0 720 270', role: 'img', 'aria-labelledby': `${id}-title ${id}-description` });
  svg.append(svgNode('title', { id: `${id}-title` }, title));
  svg.append(svgNode('desc', { id: `${id}-description` }, description));
  return svg;
}

function horizontalGuide(svg, value, y, label) {
  svg.append(svgNode('line', { x1: 96, x2: 694, y1: y, y2: y, class: 'grid-line' }));
  svg.append(svgNode('text', { x: 86, y: y + 4, 'text-anchor': 'end', class: 'axis-label' }, label ?? formatTick(value)));
}

function readingsChart(model, unit) {
  const deviations = model.readings.map(value => value - model.rawMean);
  const magnitude = Math.max(...deviations.map(Math.abs)) || 1;
  const span = magnitude * 1.18;
  const y = value => 124 - value / span * 98;
  const x = index => 108 + index / (model.n - 1) * 574;
  const svg = chartBase('readings', 'Readings in acquisition order',
    `${model.n} readings, each shown as its difference from the raw mean. Unit: ${unit}. The table lists every recorded value.`);
  for (const tick of [-1, -0.5, 0, 0.5, 1]) horizontalGuide(svg, magnitude * tick, y(magnitude * tick));
  svg.append(svgNode('text', { x: 395, y: 262, 'text-anchor': 'middle', class: 'axis-label' }, 'Reading number (acquisition order)'));
  svg.append(svgNode('text', { x: 16, y: 124, transform: 'rotate(-90 16 124)', 'text-anchor': 'middle', class: 'axis-label' }, 'Difference from mean'));
  svg.append(svgNode('text', { x: 96, y: 16, class: 'axis-label' }, `Difference unit: ${unit}`));
  svg.append(svgNode('line', { x1: 96, x2: 694, y1: y(0), y2: y(0), class: 'mean-line' }));
  svg.append(svgNode('polyline', { points: deviations.map((value, i) => `${x(i)},${y(value)}`).join(' '), class: 'reading-line' }));
  deviations.forEach((value, i) => {
    svg.append(svgNode('circle', { cx: x(i), cy: y(value), r: model.n > 40 ? 2.5 : 4, class: 'reading-point' }));
    if (model.n <= 10 || i === 0 || i === model.n - 1 || (i + 1) % Math.ceil(model.n / 8) === 0) {
      svg.append(svgNode('text', { x: x(i), y: 243, 'text-anchor': 'middle', class: 'axis-label' }, i + 1));
    }
  });
  byId('readings-chart').replaceChildren(svg);
  const rows = model.readings.map((value, index) => {
    const row = document.createElement('tr');
    for (const [column, text] of [index + 1, value, value + model.correction].entries()) {
      const cell = document.createElement(column === 0 ? 'th' : 'td');
      if (column === 0) cell.scope = 'row';
      cell.textContent = String(text);
      row.append(cell);
    }
    return row;
  });
  byId('readings-table-body').replaceChildren(...rows);
  byId('readings-table-caption').textContent = `All ${model.n} recorded readings and their corrected values (${unit}).`;
}

function projectionChart(model, points, unit) {
  const maximum = points[0].combinedUncertainty || 1;
  const y = value => 224 - value / maximum * 190;
  const x = n => 108 + Math.log(n / model.n) / Math.log(100) * 574;
  const svg = chartBase('projection', 'Projected uncertainty with more independent readings',
    `At fixed estimated reading scatter, the shared calibration component stays ${format(model.calibrationUncertainty)} ${unit}. The adjacent table gives all projected values.`);
  for (const fraction of [0, 0.25, 0.5, 0.75, 1]) horizontalGuide(svg, maximum * fraction, y(maximum * fraction));
  svg.append(svgNode('text', { x: 395, y: 263, 'text-anchor': 'middle', class: 'axis-label' }, 'Hypothetical sample size (log scale)'));
  svg.append(svgNode('text', { x: 16, y: 128, transform: 'rotate(-90 16 128)', 'text-anchor': 'middle', class: 'axis-label' }, 'Standard uncertainty'));
  svg.append(svgNode('text', { x: 96, y: 16, class: 'axis-label' }, `Uncertainty unit: ${unit}`));
  for (const [key, style] of [['combinedUncertainty', 'combined'], ['meanUncertainty', 'repeatability'], ['calibrationUncertainty', 'calibration']]) {
    svg.append(svgNode('polyline', { points: points.map(point => `${x(point.n)},${y(point[key])}`).join(' '), class: `series ${style}` }));
    points.forEach(point => svg.append(svgNode('circle', { cx: x(point.n), cy: y(point[key]), r: 3.5, class: `point ${style}` })));
  }
  points.forEach(point => svg.append(svgNode('text', { x: x(point.n), y: 243, 'text-anchor': 'middle', class: 'axis-label' }, point.n)));
  byId('projection-chart').replaceChildren(svg);
  const rows = points.map((point, index) => {
    const row = document.createElement('tr');
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = `${point.n}${index === 0 ? ' (current n)' : ''}`;
    row.append(heading);
    for (const key of ['meanUncertainty', 'calibrationUncertainty', 'combinedUncertainty']) {
      const cell = document.createElement('td');
      cell.textContent = format(point[key]);
      cell.dataset.component = key;
      row.append(cell);
    }
    return row;
  });
  byId('projection-table-body').replaceChildren(...rows);
  byId('projection-table-caption').textContent = `Projected standard uncertainties (${unit}); estimated scatter and calibration information stay fixed.`;
  byId('projection-floor').textContent = model.calibrationUncertainty === 0
    ? 'This model includes no shared calibration uncertainty because its half-width is set to zero. That setting is an assumption, not evidence of perfect calibration.'
    : `With these assumptions, more readings approach a floor of ${format(model.calibrationUncertainty)} ${unit}. Changing the calibration information can change that floor.`;
}

function retireResults() {
  results.hidden = true;
  for (const id of ['readings-chart', 'projection-chart', 'readings-table-body', 'projection-table-body']) byId(id).replaceChildren();
  for (const node of results.querySelectorAll('[data-value]')) node.textContent = '—';
  errorBox.hidden = true;
  for (const input of form.querySelectorAll('[aria-invalid]')) input.removeAttribute('aria-invalid');
  status.textContent = 'Inputs changed. Calculate to show the new case.';
}

function calculate(moveFocus = true) {
  retireResults();
  let field = byId('readings-input');
  try {
    const readings = parseReadings(field.value);
    field = byId('correction-input');
    const correction = parseMeasurementNumber(field.value, 'Additive correction');
    field = byId('half-width-input');
    const calibrationHalfWidth = parseMeasurementNumber(field.value, 'Calibration half-width', true);
    field = byId('unit-input');
    const unit = field.value.trim();
    const visibleUnit = unit.replace(/[\p{White_Space}\p{Default_Ignorable_Code_Point}\p{Cc}]/gu, '');
    if (!visibleUnit || unit.length > 16 || /\p{Cc}/u.test(unit)) throw new Error('Use a unit label of 1–16 visible characters, such as mm or ms.');
    const model = summarizeMeasurements({ readings, correction, calibrationHalfWidth });
    const points = projectUncertainty({ sampleSD: model.sampleSD, calibrationHalfWidth, sampleSizes: [model.n, model.n * 2, model.n * 4, model.n * 10, model.n * 100] });
    for (const node of results.querySelectorAll('[data-value]')) {
      const key = node.dataset.value;
      node.textContent = key === 'n' ? String(model.n) : `${format(model[key])} ${unit}`;
    }
    readingsChart(model, unit);
    projectionChart(model, points, unit);
    byId('zero-scatter-note').hidden = model.sampleSD !== 0;
    results.hidden = false;
    status.textContent = `Calculated ${model.n} readings. Corrected mean ${format(model.correctedMean)} ${unit}; combined standard uncertainty ${format(model.combinedUncertainty)} ${unit}.`;
    if (moveFocus) byId('results-heading').focus();
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.hidden = false;
    field.setAttribute('aria-invalid', 'true');
    status.textContent = 'No current result. Correct the indicated input and calculate again.';
    if (moveFocus) field.focus();
  }
}

form.addEventListener('input', retireResults);
form.addEventListener('submit', event => { event.preventDefault(); calculate(); });
for (const button of document.querySelectorAll('[data-preset]')) {
  button.addEventListener('click', () => {
    const preset = presets[button.dataset.preset];
    byId('readings-input').value = preset.readings;
    byId('correction-input').value = preset.correction;
    byId('half-width-input').value = preset.halfWidth;
    byId('unit-input').value = 'mm';
    calculate();
  });
}

byId('download-measurement-deck').addEventListener('click', () => {
  const downloadStatus = byId('deck-download-status');
  let objectUrl;
  let link;
  try {
    const deckText = JSON.parse(byId('measurement-deck').textContent);
    objectUrl = URL.createObjectURL(new Blob([deckText], { type: 'application/json;charset=utf-8' }));
    link = document.createElement('a');
    link.href = objectUrl;
    link.download = 'measurement-uncertainty.json';
    document.body.append(link);
    link.click();
    downloadStatus.textContent = 'Practice deck offered to your browser. Check its download list for measurement-uncertainty.json.';
  } catch {
    downloadStatus.textContent = 'The browser could not start this download. The separate measurement-uncertainty.json file also contains the practice deck.';
  } finally {
    link?.remove();
    if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
});

calculate(false);
