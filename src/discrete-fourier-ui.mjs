import { parseFourierSamples, analyzeFourier, serializeFourierRecord } from './discrete-fourier.mjs';

const fourierById = id => document.getElementById(id);
const fourierSamplesInput = fourierById('samples');
const fourierResults = fourierById('results');
const fourierStatus = fourierById('status');
const fourierPreset = fourierById('preset');
let fourierRecord = null;
const fourierPresets = {
  mixture: Array.from({ length: 8 }, (_, n) => Number((0.5 + Math.cos(2 * Math.PI * n / 8) + 0.5 * Math.sin(4 * Math.PI * n / 8)).toPrecision(12))),
  impulse: [1, 0, 0, 0, 0, 0, 0, 0],
  constant: [3, 3, 3, 3],
  alternating: [1, -1, 1, -1, 1, -1, 1, -1],
  zero: [0, 0, 0, 0]
};

function fourierDisplay(value) {
  if (value === 0) return '0';
  return Math.abs(value) < 0.001 || Math.abs(value) >= 10000
    ? value.toExponential(3) : String(Number(value.toPrecision(6)));
}

function fourierAnnounce(message, error = false) {
  fourierStatus.textContent = message;
  fourierStatus.classList.toggle('error', error);
}

function fourierSvgNode(name, attrs = {}, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}

function fourierChartText(svg, x, y, value, extra = {}) {
  svg.append(fourierSvgNode('text', { x, y, fill: '#496171', 'font-size': 12, 'text-anchor': 'middle', ...extra }, value));
}

function drawFourierSamples(record) {
  const svg = fourierById('sample-chart');
  svg.replaceChildren(
    fourierSvgNode('title', { id: 'sample-chart-title' }, 'Entered and reconstructed sample values'),
    fourierSvgNode('desc', { id: 'sample-chart-desc' }, 'Circles show entered values; square outlines show reconstruction at the same sample indices. Numerical values follow in the sample table.')
  );
  const values = record.samples.concat(record.reconstruction.map(point => point.real));
  let low = Math.min(0, ...values), high = Math.max(0, ...values);
  if (low === high) { low = -1; high = 1; }
  const pad = (high - low) * 0.12;
  low -= pad; high += pad;
  const x = n => 68 + n / (record.N - 1) * 620;
  const y = value => 232 - (value - low) / (high - low) * 200;
  for (let tick = 0; tick <= 4; tick++) {
    const value = low + (high - low) * tick / 4;
    svg.append(fourierSvgNode('line', { x1: 60, x2: 698, y1: y(value), y2: y(value), stroke: '#e0e7e5' }));
    fourierChartText(svg, 54, y(value) + 4, fourierDisplay(value), { 'text-anchor': 'end', 'font-size': 10 });
  }
  svg.append(fourierSvgNode('line', { x1: 60, x2: 698, y1: y(0), y2: y(0), stroke: '#81979e' }));
  record.samples.forEach((value, n) => {
    svg.append(fourierSvgNode('line', { x1: x(n), x2: x(n), y1: y(0), y2: y(value), stroke: '#8cc4b9', 'stroke-width': 2 }));
    svg.append(fourierSvgNode('circle', { cx: x(n), cy: y(value), r: 5, fill: '#006e67' }));
    svg.append(fourierSvgNode('rect', { x: x(n) - 5, y: y(record.reconstruction[n].real) - 5, width: 10, height: 10, fill: 'none', stroke: '#ab410c', 'stroke-width': 2 }));
    fourierChartText(svg, x(n), 252, n);
  });
  fourierChartText(svg, 380, 274, 'Sample index n');
}

function drawFourierSpectrum(record) {
  const svg = fourierById('spectrum-chart');
  svg.replaceChildren(
    fourierSvgNode('title', { id: 'spectrum-title' }, 'DFT coefficient magnitudes by bin'),
    fourierSvgNode('desc', { id: 'spectrum-desc' }, 'Green bars mark retained bins and gray bars mark omitted bins. Exact coefficients follow in the coefficient table.')
  );
  const max = Math.max(...record.bins.map(bin => bin.magnitude)) || 1;
  const width = 620 / record.N;
  const selected = new Set(record.selectedPairs);
  for (let tick = 0; tick <= 2; tick++) {
    const value = max * tick / 2;
    const y = 175 - tick * 65;
    svg.append(fourierSvgNode('line', { x1: 60, x2: 698, y1: y, y2: y, stroke: '#e0e7e5' }));
    fourierChartText(svg, 54, y + 4, fourierDisplay(value), { 'text-anchor': 'end', 'font-size': 10 });
  }
  record.bins.forEach(bin => {
    const x = 68 + (bin.k + 0.5) * width;
    const height = bin.magnitude / max * 130;
    svg.append(fourierSvgNode('rect', { x: x - width * 0.3, y: 175 - height, width: width * 0.6, height, rx: 2, fill: selected.has(bin.pair) ? '#006e67' : '#a9b7bc' }));
    fourierChartText(svg, x, 194, bin.k);
  });
  fourierChartText(svg, 380, 216, 'Bin k (raw |X[k]|)');
}

function fourierTableRow(values, selected) {
  const row = document.createElement('tr');
  if (selected !== undefined) row.dataset.selected = String(selected);
  values.forEach((value, index) => {
    const cell = document.createElement(index === 0 ? 'th' : 'td');
    if (index === 0) cell.scope = 'row';
    cell.textContent = String(value);
    row.append(cell);
  });
  return row;
}

function showFourierRecord(record, rebuildPairs = false) {
  fourierRecord = record;
  fourierResults.hidden = false;
  fourierById('download-analysis').disabled = false;
  const selected = new Set(record.selectedPairs);
  if (rebuildPairs) {
    const choices = Array.from({ length: record.N / 2 + 1 }, (_, pair) => {
      const label = document.createElement('label');
      label.className = 'pair-choice';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = String(pair);
      input.checked = selected.has(pair);
      input.dataset.pair = String(pair);
      input.addEventListener('change', updateFourierSelection);
      label.append(input, document.createTextNode(pair === 0 ? '0 · DC' : pair === record.N / 2
        ? pair + ' · Nyquist' : pair + ' + ' + (record.N - pair) + ' · Pair ' + pair));
      return label;
    });
    fourierById('pairs').replaceChildren(...choices);
  } else {
    fourierById('pairs').querySelectorAll('input').forEach(input => { input.checked = selected.has(Number(input.value)); });
  }
  fourierById('rms').textContent = fourierDisplay(record.rmsResidual);
  fourierById('max-error').textContent = fourierDisplay(record.maxResidual);
  fourierById('input-energy').textContent = fourierDisplay(record.inputEnergy);
  fourierById('coefficient-energy').textContent = fourierDisplay(record.coefficientEnergy);
  fourierById('selected-energy').textContent = fourierDisplay(record.reconstructionEnergy);
  fourierById('imaginary-error').textContent = fourierDisplay(record.maxImaginaryResidual);
  fourierById('selection-summary').textContent = record.selectedPairs.length === record.N / 2 + 1
    ? 'All frequency pairs retained. The reconstruction compares the entered finite grid with its full inverse DFT. Small remaining residuals reflect floating-point arithmetic.'
    : record.selectedPairs.length === 0
      ? 'No bins retained: the reconstruction is zero. The residual measures the difference from your entered samples.'
      : 'Some frequency pairs are omitted. The residual measures the difference on this sample grid. It may remain near zero when the omitted coefficients are negligible.';
  fourierById('phase-note').textContent = 'Phase is unresolved when magnitude is not above ' + fourierDisplay(record.phaseResolution)
    + ', a scale-aware numerical resolution threshold. This does not assert a mathematically zero coefficient. Raw real and imaginary values are retained in the download.';
  fourierById('bin-rows').replaceChildren(...record.bins.map(bin => fourierTableRow([
    bin.k, selected.has(bin.pair) ? 'Yes' : 'No', fourierDisplay(bin.real), fourierDisplay(bin.imaginary),
    fourierDisplay(bin.magnitude), bin.phaseResolved ? fourierDisplay(bin.phaseRadians) : 'Unresolved'
  ], selected.has(bin.pair))));
  fourierById('sample-rows').replaceChildren(...record.reconstruction.map(point => fourierTableRow([
    point.n, fourierDisplay(record.samples[point.n]), fourierDisplay(point.real), fourierDisplay(point.error), fourierDisplay(point.imaginary)
  ])));
  drawFourierSamples(record);
  drawFourierSpectrum(record);
  fourierAnnounce(record.N + ' samples analyzed. ' + record.selectedPairs.length + ' of ' + (record.N / 2 + 1)
    + ' pairs retained. RMS residual: ' + fourierDisplay(record.rmsResidual) + '.');
}

function analyzeFourierInput() {
  try {
    const samples = parseFourierSamples(fourierSamplesInput.value);
    fourierSamplesInput.setAttribute('aria-invalid', 'false');
    showFourierRecord(analyzeFourier(samples), true);
  } catch (error) {
    fourierRecord = null;
    fourierResults.hidden = true;
    fourierById('download-analysis').disabled = true;
    fourierSamplesInput.setAttribute('aria-invalid', 'true');
    fourierAnnounce(error.message, true);
  }
}

function updateFourierSelection() {
  if (!fourierRecord) return;
  const selectedPairs = Array.from(fourierById('pairs').querySelectorAll('input:checked'), input => Number(input.value));
  showFourierRecord(analyzeFourier(fourierRecord.samples, { selectedPairs }));
}

function loadFourierPreset() {
  fourierSamplesInput.value = fourierPresets[fourierPreset.value].join(', ');
  analyzeFourierInput();
}

function downloadFourierText(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

fourierById('sample-form').addEventListener('submit', event => { event.preventDefault(); analyzeFourierInput(); });
fourierPreset.addEventListener('change', loadFourierPreset);
fourierSamplesInput.addEventListener('input', () => {
  fourierRecord = null;
  fourierResults.hidden = true;
  fourierById('download-analysis').disabled = true;
  fourierSamplesInput.setAttribute('aria-invalid', 'false');
  fourierAnnounce('Samples edited. Choose Analyze samples to update the reconstruction.');
});
fourierById('reset').addEventListener('click', () => { fourierPreset.value = 'mixture'; loadFourierPreset(); });
fourierById('all-pairs').addEventListener('click', () => {
  if (fourierRecord) showFourierRecord(analyzeFourier(fourierRecord.samples));
});
fourierById('no-pairs').addEventListener('click', () => {
  if (fourierRecord) showFourierRecord(analyzeFourier(fourierRecord.samples, { selectedPairs: [] }));
});
fourierById('download-analysis').addEventListener('click', () => {
  if (fourierRecord) downloadFourierText(serializeFourierRecord(fourierRecord), 'recallweave-discrete-fourier-analysis.json');
});
fourierById('download-deck').addEventListener('click', () => {
  downloadFourierText(fourierDeckText, 'discrete-fourier.json');
});
loadFourierPreset();
