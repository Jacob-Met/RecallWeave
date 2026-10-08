import { EIGEN_PRESETS, analyzeEigen, serializeEigen } from './eigen-directions.mjs';

const byId = id => document.getElementById(id);
const fieldIds = ['a11', 'a12', 'a21', 'a22', 'probe-x', 'probe-y'];
const fields = fieldIds.map(byId);
let accepted = null;

function vectorText(vector) { return '(' + vector.join(', ') + ')'; }
function decimal(value) {
  if (value === 0) return '0';
  return Number(value.toPrecision(7)).toString();
}
function status(state, message) {
  byId('input-status').dataset.state = state;
  byId('input-status').textContent = message;
}
function inputValues() {
  return {
    matrix: [[fields[0].value, fields[1].value], [fields[2].value, fields[3].value]],
    probe: [fields[4].value, fields[5].value]
  };
}
function svgElement(name, attributes, parent) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  parent.append(element);
  return element;
}
function svgText(text, attributes, parent) {
  const element = svgElement('text', attributes, parent);
  element.textContent = text;
  return element;
}
function niceStep(target) {
  const exponent = 10 ** Math.floor(Math.log10(target));
  const scaled = target / exponent;
  return (scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10) * exponent;
}
function plot(result) {
  const grid = byId('plot-grid');
  const eigen = byId('plot-eigen');
  const vectors = byId('plot-vectors');
  [grid, eigen, vectors].forEach(group => group.replaceChildren());
  const maximum = Math.max(2, ...result.probe.map(Math.abs), ...result.image.map(Math.abs));
  const step = niceStep(maximum / 3);
  const range = step * (Math.ceil(maximum / step) + 1);
  const size = Math.max(280, Math.min(560, byId('vector-plot').clientWidth || 560));
  const middle = size / 2;
  const edge = size - 50;
  byId('vector-plot').setAttribute('viewBox', '0 0 ' + size + ' ' + size);
  const boundary = byId('plot-bound').firstElementChild;
  boundary.setAttribute('width', size - 100);
  boundary.setAttribute('height', size - 100);
  const scale = (middle - 50) / range;
  const screen = ([x, y]) => [middle + x * scale, middle - y * scale];
  const point = vector => screen(vector).map(value => Number(value.toFixed(5)));
  for (let tick = -range; tick <= range + step / 10; tick += step) {
    const cleanTick = Math.abs(tick) < step / 100 ? 0 : Number(tick.toPrecision(10));
    const [coordinate] = screen([cleanTick, 0]);
    const color = cleanTick === 0 ? '#8a9ba5' : '#e2e8e9';
    svgElement('line', { x1: coordinate, y1: 50, x2: coordinate, y2: edge, stroke: color, 'stroke-width': cleanTick === 0 ? 1.5 : 1 }, grid);
    svgElement('line', { x1: 50, y1: size - coordinate, x2: edge, y2: size - coordinate, stroke: color, 'stroke-width': cleanTick === 0 ? 1.5 : 1 }, grid);
    if (cleanTick !== 0) {
      svgText(String(cleanTick), { x: coordinate, y: size - 28, 'text-anchor': 'middle', class: 'tick' }, grid);
      svgText(String(cleanTick), { x: 41, y: size + 5 - coordinate, 'text-anchor': 'end', class: 'tick' }, grid);
    }
  }
  svgText('x', { x: size - 16, y: middle + 5, class: 'axis-label' }, grid);
  svgText('y', { x: middle - 4, y: 28, class: 'axis-label' }, grid);
  svgText('0', { x: middle - 13, y: middle + 17, class: 'tick' }, grid);
  if (byId('show-lines').checked) {
    const directions = result.classification === 'every-direction'
      ? [[1, 0], [0, 1], [1, 1], [1, -1], [1, 2], [2, 1]]
      : result.eigenspaces.flatMap(space => space.basisApproximate);
    directions.forEach((direction, index) => {
      const norm = Math.hypot(...direction);
      const extent = range * 2;
      const [x1, y1] = point(direction.map(value => -value * extent / norm));
      const [x2, y2] = point(direction.map(value => value * extent / norm));
      svgElement('line', { x1, y1, x2, y2, stroke: '#95690f', 'stroke-width': 1.8,
        'stroke-dasharray': index % 2 ? '3 5' : '9 5', opacity: result.classification === 'every-direction' ? .55 : .85 }, eigen);
    });
  }
  const drawVector = (vector, label, color, marker, output) => {
    const [x2, y2] = point(vector);
    const length = Math.hypot(...vector) * scale;
    if (length === 0) {
      svgElement('circle', { cx: middle, cy: middle, r: 6, fill: 'white', stroke: color, 'stroke-width': 3 }, vectors);
      svgText(label + ' = 0', { x: middle + 13, y: middle + 28, class: 'vector-label', fill: color }, vectors);
      return;
    }
    const attrs = { x1: middle, y1: middle, x2, y2, stroke: color, 'stroke-width': output ? 5 : 3 };
    if (output) attrs['stroke-dasharray'] = '8 5';
    if (length >= 22) attrs['marker-end'] = 'url(#' + marker + ')';
    svgElement('line', attrs, vectors);
    if (length < 22) svgElement('circle', { cx: x2, cy: y2, r: output ? 4 : 3, fill: color }, vectors);
    const right = vector[0] >= 0;
    svgText(label, { x: x2 + (right ? 9 : -9), y: y2 + (output ? 21 : -10),
      'text-anchor': right ? 'start' : 'end', class: 'vector-label', fill: color }, vectors);
  };
  drawVector(result.image, 'Av', '#a82c68', 'arrow-output', true);
  drawVector(result.probe, 'v', '#165d9e', 'arrow-input', false);
  const eigenDescription = result.classification === 'every-direction'
    ? 'Every line is an eigenline; the dashed spokes are examples.'
    : result.classification === 'no-real-eigenline' ? 'There is no real eigenline.'
    : result.classification === 'one-real-eigenline' ? 'There is one real eigenline.' : 'There are two real eigenlines.';
  byId('plot-description').textContent = 'Input v = ' + vectorText(result.probe) + '; output Av = ' + vectorText(result.image) + '. ' + eigenDescription + ' Both axes use the same scale.';
  byId('plot-caption').textContent = 'Equal axis scale: each grid interval is ' + decimal(step) + '. Tiny vectors use an endpoint dot. ' +
    (byId('show-lines').checked ? eigenDescription + ' Eigenline geometry is approximate.' : 'Eigenline drawings are hidden.');
}
function appendCell(row, text) {
  const cell = document.createElement('td');
  cell.textContent = text;
  row.append(cell);
}
function render(result) {
  const isEigen = result.isEigenvector;
  byId('result-title').dataset.eigen = isEigen ? 'yes' : 'no';
  byId('result-title').textContent = isEigen ? 'Yes — eigenvalue ' + result.scale.text : 'This probe changes line';
  byId('action-description').textContent = !isEigen
    ? 'No single real scale turns this input into its output. This probe is not an eigenvector of the applied matrix.'
    : result.action === 'vanishes'
      ? 'The nonzero input maps to zero. Av = 0v still holds, so the input is an eigenvector; the zero output itself is not.'
      : result.action === 'reverses-direction'
        ? 'The output reverses direction on the same line. A negative eigenvalue is allowed.'
        : 'The output keeps the input direction on the same line. The eigenvalue gives its scale.';
  const [[a, b], [c, d]] = result.matrix;
  const [x, y] = result.probe;
  const [u, w] = result.image;
  byId('action-equation').textContent = 'A = [[' + a + ', ' + b + '], [' + c + ', ' + d + ']]\n' +
    'v = ' + vectorText(result.probe) + '  →  Av = ' + vectorText(result.image) +
    (isEigen ? ' = (' + result.scale.text + ')v' : '');
  byId('action-equation').style.whiteSpace = 'pre-wrap';
  byId('cross-equation').textContent = '(' + x + ')×(' + w + ') − (' + y + ')×(' + u + ') = ' +
    result.crossProduct + (isEigen ? '  →  collinear' : '  ≠ 0  →  not collinear');
  byId('trace').textContent = result.trace;
  byId('determinant').textContent = result.determinant;
  byId('discriminant').textContent = result.discriminant;
  byId('polynomial').textContent = 'λ² − (' + result.trace + ')λ + (' + result.determinant + ') = 0';
  const descriptions = {
    'two-real-eigenlines': 'Two distinct real roots, with one eigenline for each.',
    'one-real-eigenline': 'One repeated real root, with only one eigenline.',
    'every-direction': 'One repeated real root, and every real direction is an eigendirection.',
    'no-real-eigenline': 'No real roots and no nonzero real eigenvectors.'
  };
  byId('direction-summary').textContent = descriptions[result.classification];
  const rows = byId('eigen-rows');
  rows.replaceChildren();
  if (result.complexPair) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = 'No real eigenspace. Over the complex numbers: λ = ' + result.complexPair.expression + '.';
    row.append(cell);
    rows.append(row);
  } else {
    result.eigenspaces.forEach(space => {
      const row = document.createElement('tr');
      appendCell(row, space.eigenvalue.exact + (space.algebraicMultiplicity === 2 ? ' · repeated twice' : ''));
      appendCell(row, decimal(space.eigenvalue.approximate));
      appendCell(row, space.dimension === 2 ? 'Whole real plane · dimension 2' : 'One line · dimension 1');
      appendCell(row, space.dimension === 2 ? 'Any nonzero vector; (1, 0) and (0, 1) are a basis.'
        : vectorText(space.basisApproximate[0].map(decimal)));
      rows.append(row);
    });
  }
  byId('direction-note').textContent = result.classification === 'every-direction'
    ? 'A scalar matrix multiplies every vector by the same value. A two-dimensional eigenspace contains infinitely many lines; the origin is excluded when choosing an eigenvector.'
    : result.classification === 'one-real-eigenline'
      ? 'The root appears twice in the polynomial, but solving (A − λI)v = 0 leaves only one independent direction. Nonzero multiples on that line share the eigenvalue.'
      : result.classification === 'no-real-eigenline'
        ? 'A negative discriminant gives a complex-conjugate pair. The real plane has no nonzero direction satisfying Av = λv with real λ.'
        : 'Each listed unit vector is a rounded representative. Every nonzero scalar multiple on the same eigenline shares its eigenvalue.';
  plot(result);
}
function apply() {
  const values = inputValues();
  try {
    const next = analyzeEigen(values.matrix, values.probe);
    accepted = next;
    render(next);
    status('applied', 'Applied. The diagram, exact check and experiment download use the matrix and vector shown in the result.');
  } catch (error) {
    status('invalid', error.message + ' The last applied experiment is still shown and exported.');
  }
}
function loadPreset() {
  const preset = EIGEN_PRESETS.find(entry => entry.id === byId('preset').value);
  if (!preset) return;
  const values = [...preset.matrix.flat(), ...preset.probe];
  fields.forEach((field, index) => { field.value = String(values[index]); });
  byId('challenge').textContent = preset.prompt;
  apply();
}
function download(text, type, filename) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
EIGEN_PRESETS.forEach(preset => {
  const option = document.createElement('option');
  option.value = preset.id;
  option.textContent = preset.label;
  byId('preset').append(option);
});
byId('experiment-form').addEventListener('submit', event => { event.preventDefault(); apply(); });
fields.forEach(field => field.addEventListener('input', () => {
  status('pending', 'Edits are pending. Apply the complete experiment to change the result. The last applied values are still shown and exported.');
  byId('challenge').textContent = 'Try your own matrix and probe. Predict what will happen before applying them.';
}));
byId('load-preset').addEventListener('click', loadPreset);
byId('show-lines').addEventListener('change', () => { if (accepted) plot(accepted); });
byId('download-observation').addEventListener('click', () => {
  if (accepted) download(serializeEigen(accepted), 'application/json;charset=utf-8', 'eigen-directions-experiment.json');
});
byId('download-course').addEventListener('click', () => download(EIGEN_DECK_SOURCE, 'application/json;charset=utf-8', 'eigen-directions.json'));
byId('download-guide').addEventListener('click', () => download(EIGEN_GUIDE_SOURCE, 'text/markdown;charset=utf-8', 'eigen-directions.md'));
window.addEventListener('resize', () => { if (accepted) plot(accepted); });
loadPreset();
