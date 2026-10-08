import { parseConvolutionSequence, createConvolutionRecord, formatConvolutionValue } from './finite-convolution.mjs';

const byId = id => document.getElementById(id);
const xInput = byId('sequence-x');
const hInput = byId('sequence-h');
const indexInput = byId('output-index');
const status = byId('calculation-status');
const svgNS = 'http://www.w3.org/2000/svg';
const presets = {
  signed: { x: '2, -1, 3', h: '1, 2' },
  delay: { x: '2, -1, 3', h: '0, 1' },
  average: { x: '0, 4, 0', h: '0.5, 0.5' },
  difference: { x: '2, 2, 2', h: '1, -1' }
};
let current = null;

function node(name, attrs = {}, text = null) {
  const element = document.createElementNS(svgNS, name);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
  if (text !== null) element.textContent = text;
  return element;
}

function drawPlot(id, series, selected = null) {
  const host = byId(id);
  const count = series[0].values.length;
  const minimumWidth = Math.max(300, 76 + count * 32);
  const width = Math.max(minimumWidth, host.clientWidth);
  const height = 184;
  const left = 58, right = width - 24, top = 24, bottom = 148, zero = (top + bottom) / 2;
  const peak = Math.max(1, ...series.flatMap(item => item.values.map(Math.abs)));
  const x = index => count === 1 ? (left + right) / 2 : left + index * (right - left) / (count - 1);
  const y = value => zero - value / peak * (bottom - top) / 2;
  const svg = node('svg', { viewBox: '0 0 ' + width + ' ' + height, role: 'img', height });
  svg.style.width = '100%';
  svg.style.minWidth = minimumWidth + 'px';
  svg.append(node('title', {}, series.map(item => item.label + ': [' + item.values.map(formatConvolutionValue).join(', ') + ']').join('; ')));
  for (const value of [-peak, 0, peak]) {
    svg.append(node('line', { x1: left, y1: y(value), x2: right, y2: y(value), stroke: value === 0 ? '#727f77' : '#dce3dc', 'stroke-width': 1 }));
    svg.append(node('text', { x: left - 9, y: y(value) + 4, 'text-anchor': 'end', class: 'plot-tick' }, formatConvolutionValue(value)));
  }
  const labelEvery = Math.max(1, Math.ceil(count / 16));
  for (let k = 0; k < count; k++) {
    if (selected === k) svg.append(node('rect', { x: x(k) - 12, y: top - 7, width: 24, height: bottom - top + 15, rx: 5, fill: '#e7eafb' }));
    if (k % labelEvery === 0 || k === count - 1) {
      svg.append(node('text', { x: x(k), y: 171, 'text-anchor': 'middle', class: 'plot-tick' }, String(k)));
    }
    series.forEach((item, position) => {
      const offset = series.length > 1 ? (position === 0 ? -4 : 4) : 0;
      const cx = x(k) + offset;
      svg.append(node('line', { x1: cx, y1: zero, x2: cx, y2: y(item.values[k]), stroke: item.color, 'stroke-width': 2.5, ...(position ? { 'stroke-dasharray': '4 2' } : {}) }));
      svg.append(node('circle', { cx, cy: y(item.values[k]), r: 4, fill: item.color, stroke: 'white', 'stroke-width': 1 }));
    });
  }
  host.replaceChildren(svg);
}

function renderStep() {
  if (!current) return;
  const n = Number(indexInput.value);
  const step = current.steps[n];
  const formatted = formatConvolutionValue(step.value);
  byId('selected-output').textContent = 'y[' + n + '] = ' + formatted;
  byId('step-range').textContent = 'Index ' + n + ' of 0…' + (current.y.length - 1);
  indexInput.setAttribute('aria-valuetext', 'Output index ' + n + ', value ' + formatted);
  byId('previous-index').disabled = n === 0;
  byId('next-index').disabled = n === current.y.length - 1;
  const rows = step.terms.map(term => {
    const row = document.createElement('tr');
    if (!term.inKernel) row.className = 'outside-kernel';
    const entries = [term.k, formatConvolutionValue(term.input), term.kernelIndex,
      formatConvolutionValue(term.kernel), formatConvolutionValue(term.product)];
    entries.forEach((value, index) => {
      const cell = document.createElement(index === 0 ? 'th' : 'td');
      if (index === 0) cell.scope = 'row';
      cell.textContent = String(value);
      if (index === 3 && !term.inKernel) {
        const note = document.createElement('span');
        note.className = 'zero-note';
        note.textContent = 'outside h';
        cell.append(note);
      }
      row.append(cell);
    });
    return row;
  });
  byId('contribution-rows').replaceChildren(...rows);
  byId('sum-value').textContent = formatted;
  byId('sum-expression').textContent = 'y[' + n + '] = ' +
    step.terms.map(term => '(' + formatConvolutionValue(term.input) + ' × ' + formatConvolutionValue(term.kernel) + ')').join(' + ') +
    ' = ' + formatted;
  byId('contribution-caption').textContent = 'Contributions to y[' + n + ']: the kernel index is ' + n + ' − k.';
  drawPlot('overlap-plot', [
    { label: 'x[k]', values: current.x, color: '#236b57' },
    { label: 'h[' + n + '−k]', values: step.terms.map(term => term.kernel), color: '#b34b32' }
  ]);
  drawPlot('output-plot', [{ label: 'Output y[n]', values: current.y, color: '#465eac' }], n);
}

function renderCalculation() {
  byId('input-length').textContent = String(current.x.length);
  byId('kernel-length').textContent = String(current.h.length);
  byId('output-length').textContent = String(current.y.length);
  byId('output-range').textContent = '0…' + (current.y.length - 1);
  byId('output-values').textContent = '[' + current.y.map(formatConvolutionValue).join(', ') + ']';
  drawPlot('input-plot', [{ label: 'Input x[k]', values: current.x, color: '#236b57' }]);
  drawPlot('kernel-plot', [{ label: 'Kernel h[j]', values: current.h, color: '#b34b32' }]);
  renderStep();
}

function calculate() {
  try {
    const x = parseConvolutionSequence(xInput.value, 'Input x');
    const h = parseConvolutionSequence(hInput.value, 'Kernel h');
    const selected = Number(indexInput.value);
    current = createConvolutionRecord(x, h);
    indexInput.max = String(current.y.length - 1);
    indexInput.value = String(Math.min(Number.isInteger(selected) && selected >= 0 ? selected : 0, current.y.length - 1));
    indexInput.disabled = false;
    byId('download-calculation').disabled = false;
    byId('calculation').hidden = false;
    xInput.removeAttribute('aria-invalid');
    hInput.removeAttribute('aria-invalid');
    status.classList.remove('error');
    status.setAttribute('role', 'status');
    status.textContent = 'Full result ready: ' + current.x.length + ' + ' + current.h.length + ' − 1 = ' + current.y.length + ' output entries. Outside each list, values are zero.';
    renderCalculation();
  } catch (error) {
    current = null;
    byId('calculation').hidden = true;
    indexInput.disabled = true;
    byId('previous-index').disabled = true;
    byId('next-index').disabled = true;
    byId('download-calculation').disabled = true;
    for (const id of ['input-plot', 'kernel-plot', 'output-plot', 'overlap-plot', 'contribution-rows']) byId(id).replaceChildren();
    for (const id of ['output-values', 'selected-output', 'sum-expression', 'sum-value', 'step-range']) byId(id).textContent = '';
    xInput.setAttribute('aria-invalid', 'true');
    hInput.setAttribute('aria-invalid', 'true');
    status.classList.add('error');
    status.setAttribute('role', 'alert');
    status.textContent = error.message + ' The previous calculation is cleared. Correct the input or choose an example.';
  }
}

function download(filename, text) {
  let url;
  try {
    url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    byId('download-status').textContent = 'Requested ' + filename + ' through the browser download flow.';
  } catch {
    byId('download-status').textContent = 'The download could not be started. Your inputs are unchanged; try again.';
  } finally {
    if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

xInput.addEventListener('input', calculate);
hInput.addEventListener('input', calculate);
byId('sequence-form').addEventListener('submit', event => { event.preventDefault(); calculate(); });
indexInput.addEventListener('input', renderStep);
for (const [id, change] of [['previous-index', -1], ['next-index', 1]]) {
  byId(id).addEventListener('click', () => {
    if (!current) return;
    indexInput.value = String(Math.max(0, Math.min(current.y.length - 1, Number(indexInput.value) + change)));
    renderStep();
  });
}
for (const button of document.querySelectorAll('[data-preset]')) {
  button.addEventListener('click', () => {
    const preset = presets[button.dataset.preset];
    xInput.value = preset.x;
    hInput.value = preset.h;
    indexInput.value = '0';
    calculate();
  });
}
byId('download-course').addEventListener('click', () => download('recallweave-finite-convolution.json', FINITE_CONVOLUTION_DECK_TEXT));
byId('download-calculation').addEventListener('click', () => {
  if (current) download('recallweave-finite-convolution-calculation.json', JSON.stringify(current, null, 2) + '\n');
});
const course = JSON.parse(FINITE_CONVOLUTION_DECK_TEXT);
byId('course-title').textContent = course.title;
byId('course-attribution').textContent = course.attribution;
byId('course-license').textContent = course.license;
window.addEventListener('resize', () => { if (current) renderCalculation(); });
calculate();
