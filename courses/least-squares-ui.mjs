import {analyze, EXAMPLES, LIMITS, parseCoordinate, parseScalar, rationalText, rationalNumber} from './least-squares-core.mjs';

const byId = id => document.getElementById(id);
const pointRows = byId('point-rows');
const trialA = byId('trial-a'), trialB = byId('trial-b'), queryInput = byId('query-x');
const chooseExample = byId('example-select'), residualModel = byId('residual-model');
const fitButton = byId('use-fit'), addButton = byId('add-row');
const plotHost = byId('plot');
let current = null;
let activeExample = EXAMPLES[0];
let dataEdited = false;

const exact = rationalText;
const approximate = value => Number(rationalNumber(value).toPrecision(6)).toString();
function showExact(id, value) {
  const target = byId(id);
  target.replaceChildren(document.createTextNode(exact(value)));
  if (value.d !== 1n) {
    const small = document.createElement('small');
    small.textContent = `≈ ${approximate(value)} (display only)`;
    target.append(small);
  }
}
function lineText(a, b) {
  const magnitude = exact({n: b.n < 0n ? -b.n : b.n, d: b.d});
  return `ŷ = ${exact(a)} ${b.n < 0n ? '−' : '+'} ${magnitude} × x`;
}
function markRead(input, read) {
  try { return read(input.value); }
  catch (error) { input.setAttribute('aria-invalid', 'true'); throw error; }
}
function readInputs() {
  document.querySelectorAll('input[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
  const entered = [...pointRows.children].map((row, i) => ({
    x: markRead(row.querySelector('[data-axis=x]'), text => parseCoordinate(text, `Point ${i + 1}, x`)),
    y: markRead(row.querySelector('[data-axis=y]'), text => parseCoordinate(text, `Point ${i + 1}, y`))
  }));
  markRead(trialA, text => parseScalar(text, {label: 'Trial intercept a'}));
  markRead(trialB, text => parseScalar(text, {label: 'Trial slope b'}));
  markRead(queryInput, text => parseScalar(text, {limit: LIMITS.query, label: 'Query x'}));
  return analyze(entered, {intercept: trialA.value, slope: trialB.value, query: queryInput.value});
}

function changeVisibility(valid) {
  for (const id of ['fit-content', 'table-content', 'prediction-content', 'minimum-content']) byId(id).hidden = !valid;
  for (const id of ['fit-empty', 'table-empty']) byId(id).hidden = valid;
}
function retireResults(message) {
  current = null;
  fitButton.disabled = true;
  byId('copy-note').textContent = 'Correct the input before copying a fitted line.';
  changeVisibility(false);
  byId('residual-rows').replaceChildren();
  for (const id of ['fit-equation', 'fit-scope', 'fit-a', 'fit-b', 'mean-point', 'fit-sse', 'trial-sse',
    'excess-sse', 'comparison', 'prediction-result', 'prediction-scope', 'identity-values', 'normal-values',
    'identity-explanation', 'table-caption']) byId(id).replaceChildren();
  plotHost.replaceChildren();
  const empty = document.createElement('p'); empty.className = 'empty';
  empty.textContent = 'No current plot. Correct the input to calculate these visible rows.';
  plotHost.append(empty);
  byId('plot-note').textContent = 'The previous result has been retired. The fixed course and guide are still available below.';
  byId('lab-status').className = 'status invalid';
  byId('lab-status').textContent = message;
}
function update() {
  try {
    current = readInputs();
    showResult(current);
  } catch (error) {
    retireResults(error.message);
  }
}

function makeRow(x, y, i) {
  const row = document.createElement('div'); row.className = 'point-row';
  const index = document.createElement('span'); index.className = 'point-index'; index.textContent = String(i + 1);
  row.append(index);
  for (const [axis, value] of [['x', x], ['y', y]]) {
    const input = document.createElement('input');
    input.type = 'text'; input.inputMode = 'numeric'; input.maxLength = 16;
    input.autocomplete = 'off'; input.spellcheck = false;
    input.dataset.axis = axis; input.value = String(value);
    input.setAttribute('aria-label', `Point ${i + 1}, ${axis}`);
    input.addEventListener('input', () => { dataEdited = true; showExampleNote(); update(); });
    row.append(input);
  }
  const remove = document.createElement('button');
  remove.type = 'button'; remove.className = 'secondary'; remove.textContent = '−';
  remove.setAttribute('aria-label', `Remove point ${i + 1}`);
  remove.addEventListener('click', () => {
    if (pointRows.children.length <= LIMITS.minPoints) return;
    const remaining = [...pointRows.children].filter(item => item !== row).map(item => [
      item.querySelector('[data-axis=x]').value, item.querySelector('[data-axis=y]').value
    ]);
    renderRows(remaining); dataEdited = true; showExampleNote(); update();
    pointRows.children[Math.min(i, remaining.length - 1)].querySelector('input').focus();
  });
  row.append(remove); return row;
}
function renderRows(rows) {
  pointRows.replaceChildren(...rows.map(([x, y], i) => makeRow(x, y, i)));
  updateRowButtons();
}
function updateRowButtons() {
  const n = pointRows.children.length;
  addButton.disabled = n >= LIMITS.maxPoints;
  pointRows.querySelectorAll('button').forEach(button => { button.disabled = n <= LIMITS.minPoints; });
}
function showExampleNote() {
  byId('example-note').textContent = dataEdited
    ? `Your edited data began with “${activeExample.name}”. Load / reset restores the authored rows.`
    : `Loaded: ${activeExample.name}. ${activeExample.note}`;
}
function loadExample(moveFocus = false) {
  activeExample = EXAMPLES.find(example => example.id === chooseExample.value) ?? EXAMPLES[0];
  dataEdited = false;
  renderRows(activeExample.points.map(point => [point.x, point.y]));
  trialA.value = activeExample.intercept; trialB.value = activeExample.slope; queryInput.value = activeExample.query;
  showExampleNote(); update();
  if (moveFocus) pointRows.querySelector('input').focus();
}

function showResult(result) {
  changeVisibility(true);
  const unique = result.fit.kind === 'unique';
  byId('fit-legend').hidden = !unique;
  fitButton.disabled = !unique;
  byId('copy-note').textContent = unique ? 'Copies exact coefficients into your trial, including fractions.'
    : 'No unique coefficients to copy. Try two lines that satisfy the displayed relation.';
  byId('lab-status').className = 'status';
  byId('lab-status').textContent = unique
    ? `${result.count} rows · a unique fitted line. Every row counts equally; calculated fractions are exact.`
    : `${result.count} rows · all x values equal ${result.fit.sharedX}. A family of lines shares the minimum; no unique slope is identified.`;
  if (unique) {
    byId('fit-equation').textContent = lineText(result.fit.intercept, result.fit.slope);
    byId('fit-scope').textContent = 'The unique line with the smallest SSE for these rows. A minimum can still leave a pattern in the residuals.';
    showExact('fit-a', result.fit.intercept); showExact('fit-b', result.fit.slope);
  } else {
    byId('fit-equation').textContent = `a + (${result.fit.sharedX}) × b = ${exact(result.meanY)}`;
    byId('fit-scope').textContent = `Every line satisfying this relation is a minimizer. At the shared x = ${result.fit.sharedX}, the fitted value is ${exact(result.meanY)}; no unique line is drawn.`;
    byId('fit-a').textContent = 'Not unique'; byId('fit-b').textContent = 'Not unique';
  }
  byId('mean-point').textContent = `(${exact(result.meanX)}, ${exact(result.meanY)})`;
  showExact('fit-sse', result.fit.sse); showExact('trial-sse', result.trial.sse); showExact('excess-sse', result.excessSSE);
  byId('comparison').textContent = result.excessSSE.n === 0n
    ? 'Your trial line attains the same minimum SSE for these rows.'
    : `Your trial line adds exactly ${exact(result.excessSSE)} to the minimum SSE.`;
  showTable(result); showPrediction(result); showMinimum(result); drawPlot(result);
}

function showTable(result) {
  const body = byId('residual-rows');
  body.replaceChildren(...result.fit.rows.map((fitRow, i) => {
    const trialRow = result.trial.rows[i];
    const row = document.createElement('tr');
    const cells = [fitRow.index, fitRow.x, fitRow.y, exact(fitRow.predicted), exact(fitRow.residual), exact(fitRow.squared),
      exact(trialRow.predicted), exact(trialRow.residual), exact(trialRow.squared)];
    for (const value of cells) { const cell = document.createElement('td'); cell.textContent = String(value); row.append(cell); }
    return row;
  }));
  byId('table-caption').textContent = result.fit.kind === 'unique'
    ? 'Exact fractions for all entered rows. Positive residuals are above their line; negative residuals are below. Repeated rows remain separate.'
    : `The Fit columns show the common minimizing value at the observed x = ${result.fit.sharedX}. They do not select a unique slope or a line elsewhere.`;
}
function showPrediction(result) {
  const prediction = result.prediction;
  byId('prediction-result').textContent = prediction.value === null
    ? `At x = ${exact(prediction.x)}: no unique fitted value`
    : `At x = ${exact(prediction.x)}: ŷ = ${exact(prediction.value)}`;
  const descriptions = {
    in_range: `Inside the observed x range [${result.range.minX}, ${result.range.maxX}]. This is an evaluation of the fitted line, not a guarantee about a new observation.`,
    extrapolation: `Extrapolation: outside the observed x range [${result.range.minX}, ${result.range.maxX}]. Extending the fitted line beyond these rows is not supported by observations there.`,
    shared_x_only: 'This is the shared observed x. All minimizing lines agree here, but they can disagree at every other x.',
    underdetermined: `All observations share x = ${result.fit.sharedX}. The minimizing lines can disagree at this query, so the lab does not invent one prediction.`
  };
  byId('prediction-scope').textContent = descriptions[prediction.kind];
}
function showMinimum(result) {
  byId('identity-values').textContent = `${exact(result.excessSSE)} = ${exact(result.decomposition.meanTerm)} + ${exact(result.decomposition.slopeTerm)}`;
  byId('normal-values').textContent = `Fitted residual checks: Σr = ${exact(result.fit.residualSum)}; Σ(xr) = ${exact(result.fit.xResidualSum)}.`;
  byId('identity-explanation').textContent = result.fit.kind === 'unique'
    ? `For trial a,b and fitted a*,b*, the excess is n[(a − a*) + x̄(b − b*)]² + Sxx(b − b*)². Here n = ${result.count}, x̄ = ${exact(result.meanX)} and Sxx = ${exact(result.centeredXX)}. The first term measures the trial's miss at the mean point; the second measures its slope difference.`
    : `All x equal ${result.fit.sharedX}, so Sxx = 0 and there is no identified slope to subtract. The excess is n[a + b × (${result.fit.sharedX}) − ȳ]², with n = ${result.count} and ȳ = ${exact(result.meanY)}. Any coefficients satisfying the displayed relation give zero excess.`;
}

const svgNS = 'http://www.w3.org/2000/svg';
function svgNode(tag, attributes = {}, content) {
  const node = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (content !== undefined) node.textContent = content;
  return node;
}
function clippedLine(a, b, bounds) {
  let lo = bounds.xMin, hi = bounds.xMax;
  if (b === 0) {
    if (a < bounds.yMin || a > bounds.yMax) return null;
  } else {
    const first = (bounds.yMin - a) / b, second = (bounds.yMax - a) / b;
    lo = Math.max(lo, Math.min(first, second)); hi = Math.min(hi, Math.max(first, second));
    if (lo > hi) return null;
  }
  return [lo, Math.max(bounds.yMin, Math.min(bounds.yMax, a + b * lo)),
    hi, Math.max(bounds.yMin, Math.min(bounds.yMax, a + b * hi))];
}
function drawPlot(result) {
  const width = Math.max(260, plotHost.clientWidth);
  const height = width < 430 ? 280 : 330;
  const left = 52, right = width - 16, top = 20, bottom = height - 42;
  const xSpan = result.range.maxX - result.range.minX;
  const xPadding = xSpan === 0 ? 3 : Math.max(0.5, xSpan * 0.12);
  const bounds = {xMin: result.range.minX - xPadding, xMax: result.range.maxX + xPadding};
  const yValues = result.points.map(point => point.y);
  const fitA = result.fit.kind === 'unique' ? rationalNumber(result.fit.intercept) : null;
  const fitB = result.fit.kind === 'unique' ? rationalNumber(result.fit.slope) : null;
  if (fitA !== null) yValues.push(fitA + fitB * bounds.xMin, fitA + fitB * bounds.xMax);
  const minY = Math.min(...yValues), maxY = Math.max(...yValues);
  const yPadding = maxY === minY ? 2 : Math.max(0.5, (maxY - minY) * 0.13);
  bounds.yMin = minY - yPadding; bounds.yMax = maxY + yPadding;
  const px = x => left + (x - bounds.xMin) / (bounds.xMax - bounds.xMin) * (right - left);
  const py = y => bottom - (y - bounds.yMin) / (bounds.yMax - bounds.yMin) * (bottom - top);
  const tick = number => Number(number.toFixed(2)).toString();
  const svg = svgNode('svg', {viewBox: `0 0 ${width} ${height}`, width, height, role: 'img', 'aria-labelledby': 'plot-title plot-description'});
  svg.append(svgNode('title', {id: 'plot-title'}, 'Entered points, trial line and least-squares fitted values'));
  svg.append(svgNode('desc', {id: 'plot-description'}, `${result.count} point rows. ${result.fit.kind === 'unique' ? 'A solid fitted line and dashed trial line.' : 'No unique fitted line exists; the mean diamond shows the common observed fit.'} Dotted vertical segments show ${residualModel.value === 'fit' ? 'fitted' : 'trial'} residuals. All exact values are in the table below.`));
  const definitions = svgNode('defs'), clip = svgNode('clipPath', {id: 'least-squares-plot-clip'});
  clip.append(svgNode('rect', {x: left, y: top, width: right - left, height: bottom - top}));
  definitions.append(clip); svg.append(definitions);
  svg.append(svgNode('rect', {x: left, y: top, width: right - left, height: bottom - top, fill: '#f8faf6', stroke: '#d6dfd8'}));
  for (let i = 0; i <= 4; i++) {
    const x = bounds.xMin + (bounds.xMax - bounds.xMin) * i / 4;
    const y = bounds.yMin + (bounds.yMax - bounds.yMin) * i / 4;
    svg.append(svgNode('line', {x1: px(x), x2: px(x), y1: top, y2: bottom, stroke: '#e0e8e1'}));
    svg.append(svgNode('line', {x1: left, x2: right, y1: py(y), y2: py(y), stroke: '#e0e8e1'}));
    svg.append(svgNode('text', {x: px(x), y: bottom + 20, 'text-anchor': 'middle', 'font-size': 12, fill: '#526b6e'}, tick(x)));
    svg.append(svgNode('text', {x: left - 9, y: py(y) + 4, 'text-anchor': 'end', 'font-size': 12, fill: '#526b6e'}, tick(y)));
  }
  svg.append(svgNode('text', {x: (left + right) / 2, y: height - 3, 'text-anchor': 'middle', 'font-size': 13, fill: '#162e32'}, 'x'));
  svg.append(svgNode('text', {x: 16, y: 14, 'font-size': 13, fill: '#162e32'}, 'y'));
  const marks = svgNode('g', {'clip-path': 'url(#least-squares-plot-clip)'});
  const chosenRows = residualModel.value === 'fit' ? result.fit.rows : result.trial.rows;
  for (const row of chosenRows) {
    marks.append(svgNode('line', {x1: px(row.x), x2: px(row.x), y1: py(row.y), y2: py(rationalNumber(row.predicted)),
      stroke: residualModel.value === 'fit' ? '#126761' : '#a24918', 'stroke-width': 2, 'stroke-dasharray': '2 3', 'data-kind': 'residual'}));
  }
  function addLine(a, b, kind, color, dashed) {
    const segment = clippedLine(a, b, bounds);
    if (!segment) return false;
    const attrs = {x1: px(segment[0]), y1: py(segment[1]), x2: px(segment[2]), y2: py(segment[3]), stroke: color,
      'stroke-width': 2.5, 'data-kind': kind};
    if (dashed) attrs['stroke-dasharray'] = '8 5';
    marks.append(svgNode('line', attrs)); return true;
  }
  if (fitA !== null) addLine(fitA, fitB, 'fit-line', '#126761', false);
  const trialVisible = addLine(rationalNumber(result.trial.intercept), rationalNumber(result.trial.slope), 'trial-line', '#a24918', true);
  for (const point of result.points) {
    const circle = svgNode('circle', {cx: px(point.x), cy: py(point.y), r: 4.5, fill: '#fff', stroke: '#162e32', 'stroke-width': 2, 'data-kind': 'point'});
    circle.append(svgNode('title', {}, `Point ${point.index}: (${point.x}, ${point.y})`)); marks.append(circle);
  }
  const mx = px(rationalNumber(result.meanX)), my = py(rationalNumber(result.meanY));
  const mean = svgNode('polygon', {points: `${mx},${my - 6} ${mx + 6},${my} ${mx},${my + 6} ${mx - 6},${my}`, fill: '#7854a0', stroke: '#fff', 'stroke-width': 1, 'data-kind': 'mean'});
  mean.append(svgNode('title', {}, `Mean point: (${exact(result.meanX)}, ${exact(result.meanY)})`)); marks.append(mean);
  svg.append(marks); plotHost.replaceChildren(svg);
  byId('plot-note').textContent = [
    'Approximate drawing; exact values are below. Dotted segments are vertical residuals.',
    result.fit.kind === 'underdetermined' ? 'All x are equal: the mean diamond is the shared fitted value, and no unique fitted line is drawn.' : '',
    trialVisible ? 'Lines and residual segments are clipped to the shown axes.' : 'The trial line is entirely off screen. Its exact predictions and errors remain in the table.'
  ].filter(Boolean).join(' ');
}

function prepareDownloads() {
  const status = byId('download-status');
  let course, guide;
  try {
    course = JSON.parse(byId('course-text').textContent); guide = JSON.parse(byId('guide-text').textContent);
    if (typeof course !== 'string' || typeof guide !== 'string' || !course || !guide) throw new Error('Missing embedded file.');
  } catch {
    status.textContent = 'The embedded files could not be read. Use the original course and guide files from the repository.'; return;
  }
  for (const [id, name, content, type] of [
    ['download-course', 'least-squares.json', course, 'application/json;charset=utf-8'],
    ['download-guide', 'least-squares.md', guide, 'text/markdown;charset=utf-8']
  ]) {
    const button = byId(id); button.disabled = false;
    button.addEventListener('click', () => {
      let url, anchor;
      try {
        url = URL.createObjectURL(new Blob([content], {type}));
        anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.hidden = true;
        document.body.append(anchor); anchor.click();
        status.textContent = `${name} was prepared for download. It contains the fixed authored ${id === 'download-course' ? 'course' : 'guide'}, not your edited lab data.`;
      } catch {
        status.textContent = 'The download could not be prepared. The embedded file is still available; try the button again.';
      } finally {
        if (anchor) anchor.remove();
        if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    });
  }
  status.textContent = 'Sixteen original questions · four concepts · worked transfer answers.';
}

for (const example of EXAMPLES) {
  const option = document.createElement('option'); option.value = example.id; option.textContent = example.name; chooseExample.append(option);
}
byId('load-example').addEventListener('click', () => loadExample(true));
addButton.addEventListener('click', () => {
  const n = pointRows.children.length;
  if (n >= LIMITS.maxPoints) return;
  const row = makeRow(0, 0, n); pointRows.append(row); updateRowButtons();
  dataEdited = true; showExampleNote(); update(); row.querySelector('input').focus();
});
for (const input of [trialA, trialB, queryInput]) input.addEventListener('input', update);
fitButton.addEventListener('click', () => {
  if (!current || current.fit.kind !== 'unique') return;
  trialA.value = exact(current.fit.intercept); trialB.value = exact(current.fit.slope); update();
});
residualModel.addEventListener('change', () => { if (current) drawPlot(current); });
if (typeof ResizeObserver === 'function') new ResizeObserver(() => { if (current) drawPlot(current); }).observe(plotHost);
else window.addEventListener('resize', () => { if (current) drawPlot(current); });
prepareDownloads(); loadExample();
