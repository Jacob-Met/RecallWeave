import { parseBezierInput, traceBezier, BEZIER_PRESETS } from './bezier-curves.mjs';
const $ = id => document.getElementById(id);
const ns = 'http://www.w3.org/2000/svg';
const entered = { points: $('points'), parameter: $('parameter') };
let applied = null;
let selectedLevel = 0;
function exactNumber(value) { const [n, d = '1'] = String(value).split('/'); return Number(n) / Number(d); }
function pair(value) { return '(' + value.join(', ') + ')'; }
function svg(tag, attrs = {}, text) {
  const node = document.createElementNS(ns, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}
const xy = point => [260 + 10 * exactNumber(point[0]), 240 - 10 * exactNumber(point[1])];
const xyText = point => xy(point).join(',');
function path(points) {
  const values = points.map(xyText);
  return 'M' + values[0] + (values.length === 2 ? 'L' : values.length === 3 ? 'Q' : 'C') + values.slice(1).join(' ');
}
function draw() {
  const plot = $('plot');
  plot.replaceChildren(svg('title', {}, 'Bézier curve and interpolation construction'), svg('desc', {}, 'Positive x points right and positive y points up, at the same scale. Exact coordinates are in the tables below.'));
  for (let v = -20; v <= 20; v += 5) {
    plot.append(svg('line', { x1: 60, y1: 240 - 10 * v, x2: 460, y2: 240 - 10 * v, class: v ? 'grid' : 'axis' }));
    plot.append(svg('line', { x1: 260 + 10 * v, y1: 40, x2: 260 + 10 * v, y2: 440, class: v ? 'grid' : 'axis' }));
    if (v !== 0) {
      plot.append(svg('text', { x: 260 + 10 * v, y: 256, class: 'tick', 'text-anchor': 'middle' }, v));
      plot.append(svg('text', { x: 254, y: 244 - 10 * v, class: 'tick', 'text-anchor': 'end' }, v));
    }
  }
  plot.append(svg('text', { x: 475, y: 246, class: 'tick' }, 'x'), svg('text', { x: 266, y: 27, class: 'tick' }, 'y'));
  const trace = applied.trace;
  plot.append(svg('polyline', { points: trace.controlPoints.map(xyText).join(' '), class: 'control-line' }));
  plot.append(svg('path', { d: path(trace.controlPoints), class: 'curve' }));
  if ($('show-split').checked) {
    for (const [points, name] of [[trace.leftControlPoints, 'left'], [trace.rightControlPoints, 'right']]) {
      plot.append(svg('path', { d: path(points), class: 'split-curve ' + name }));
      plot.append(svg('polyline', { points: points.map(xyText).join(' '), class: 'split-control ' + name }));
    }
  }
  const level = trace.levels[selectedLevel];
  if (level.length > 1) plot.append(svg('polyline', { points: level.map(xyText).join(' '), class: 'level-line' }));
  trace.controlPoints.forEach((point, i) => {
    const [cx, cy] = xy(point);
    plot.append(svg('rect', { x: cx - 4, y: cy - 4, width: 8, height: 8, class: 'control-point' }));
    plot.append(svg('text', { x: cx + 8, y: cy - 10 + (trace.controlPoints.some((p, j) => j < i && p[0] === point[0] && p[1] === point[1]) ? i * 15 : 0), class: 'point-label' }, 'P' + i));
  });
  level.forEach(point => { const [cx, cy] = xy(point); plot.append(svg('circle', { cx, cy, r: 5, class: 'level-point' })); });
  const [cx, cy] = xy(trace.point);
  plot.append(svg('circle', { cx, cy, r: 7, class: 'evaluated' }));
}
function cell(text, tag = 'td') { const node = document.createElement(tag); node.textContent = text; return node; }
function renderLevel() {
  $('level').value = String(selectedLevel);
  $('previous').disabled = selectedLevel === 0;
  $('next').disabled = selectedLevel === applied.trace.degree;
  $('level-description').textContent = selectedLevel === 0 ? 'Level 0: the entered control polygon.' :
    'Level ' + selectedLevel + ': ' + (applied.trace.degree + 1 - selectedLevel) + ' exact point' + (selectedLevel === applied.trace.degree ? ' — the evaluated curve point.' : 's from adjacent interpolation.');
  for (const row of $('construction').querySelectorAll('tbody tr')) {
    const active = Number(row.dataset.level) === selectedLevel;
    row.classList.toggle('selected', active);
    if (active) row.setAttribute('aria-current', 'step'); else row.removeAttribute('aria-current');
  }
  draw();
}
function render() {
  const trace = applied.trace;
  $('degree-label').textContent = ['','Linear','Quadratic','Cubic'][trace.degree] + ' representation · t = ' + trace.parameter;
  $('point-value').textContent = pair(trace.point);
  $('derivative-value').textContent = pair(trace.derivative);
  $('stationary').textContent = trace.stationary ? 'Zero first derivative at this parameter; a tangent direction cannot be obtained by normalizing it.' : 'Change in coordinates per unit of t; not a unit direction or curve length.';
  $('endpoint-values').textContent = "B′(0) = " + pair(trace.startDerivative) + " · B′(1) = " + pair(trace.endDerivative);
  $('level').replaceChildren(...trace.levels.map((_, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = 'Level ' + i; return o; }));
  const tbody = $('construction').querySelector('tbody');
  tbody.replaceChildren();
  trace.levels.forEach((points, i) => {
    const row = document.createElement('tr'); row.dataset.level = String(i);
    row.append(cell(String(i), 'th'), cell(points.map(pair).join(' → '))); tbody.append(row);
  });
  const splitbody = $('subdivision').querySelector('tbody'); splitbody.replaceChildren();
  [['Left', trace.leftControlPoints], ['Right', trace.rightControlPoints]].forEach(([name, points]) => {
    const row = document.createElement('tr'); row.append(cell(name, 'th'), cell(points.map(pair).join(' → '))); splitbody.append(row);
  });
  $('mapping').textContent = 'For a fresh local u from 0 to 1: L(u) = B((' + trace.parameter + ')u); R(u) = B(' + trace.parameter + ' + (1 − ' + trace.parameter + ')u).';
  $('result').hidden = false; $('download-trace').disabled = false;
  renderLevel();
}
function retire() {
  applied = null;
  $('result').hidden = true; $('download-trace').disabled = true; $('error').hidden = true;
  $('status').textContent = 'Inputs changed. Apply construction to inspect these values.';
}
function apply() {
  retire();
  try {
    const input = parseBezierInput(entered.points.value, entered.parameter.value);
    applied = { entered: { points: entered.points.value, parameter: entered.parameter.value }, trace: traceBezier(input.points, input.parameter) };
    selectedLevel = 0; render();
    $('status').textContent = 'Construction ready. Inspect a level or compare its two exact subcurves.';
  } catch (error) {
    $('status').textContent = 'No construction is displayed.';
    $('error').textContent = error.message; $('error').hidden = false;
    entered[error.field]?.focus();
  }
}
function loadPreset(id) {
  const preset = BEZIER_PRESETS.find(value => value.id === id);
  if (!preset) return;
  entered.points.value = preset.points; entered.parameter.value = preset.parameter; apply();
}
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
for (const preset of BEZIER_PRESETS) { const o = document.createElement('option'); o.value = preset.id; o.textContent = preset.label; $('preset').append(o); }
$('form').addEventListener('submit', event => { event.preventDefault(); apply(); });
for (const input of Object.values(entered)) input.addEventListener('input', retire);
$('load-preset').addEventListener('click', () => loadPreset($('preset').value));
$('reset').addEventListener('click', () => { $('preset').value = BEZIER_PRESETS[0].id; $('show-split').checked = false; loadPreset(BEZIER_PRESETS[0].id); });
$('next').addEventListener('click', () => { if (applied && selectedLevel < applied.trace.degree) { selectedLevel++; renderLevel(); } });
$('previous').addEventListener('click', () => { if (applied && selectedLevel > 0) { selectedLevel--; renderLevel(); } });
$('level').addEventListener('change', () => { if (applied) { selectedLevel = Number($('level').value); renderLevel(); } });
$('show-split').addEventListener('change', () => { if (applied) draw(); });
$('download-trace').addEventListener('click', () => { if (applied) download('bezier-construction.json', JSON.stringify({ format: 'recallweave.bezier-observation/1', entered: applied.entered, selectedLevel, trace: applied.trace }, null, 2) + '\n', 'application/json'); });
$('download-deck').addEventListener('click', () => download('bezier-curves.json', COURSE_TEXT, 'application/json'));
$('download-guide').addEventListener('click', () => download('bezier-curves.md', GUIDE_TEXT, 'text/markdown'));
loadPreset(BEZIER_PRESETS[0].id);
