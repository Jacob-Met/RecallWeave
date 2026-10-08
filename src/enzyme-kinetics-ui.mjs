import { KINETICS_BASELINE, KINETICS_LIMITS, KINETICS_MODES, parseKineticsNumber, compareKinetics, kineticsCurve, kineticsCSV } from './enzyme-kinetics.mjs';

const byId = id => document.getElementById(id);
const fields = [
  ['substrate', byId('substrate'), byId('substrate-slider')],
  ['inhibitorRatio', byId('inhibitor-ratio'), byId('inhibitor-slider')],
];
const results = byId('results');
const invalid = byId('invalid-results');
const status = byId('lab-status');
const csvButton = byId('download-comparison');
const plot = byId('kinetics-plot');
const courseText = JSON.parse(byId('enzyme-course-data').textContent);
let lastComparison = null;

function shown(value) {
  return value === 0 ? '0' : Number(value.toPrecision(5)).toString();
}
function chosenMode() {
  return document.querySelector('input[name="explain-model"]:checked').value;
}
function setNumber(node, value, suffix = '') {
  node.textContent = shown(value) + suffix;
  node.dataset.value = String(value);
}

function drawPlot() {
  if (!lastComparison) return;
  const width = Math.max(260, Math.round(byId('plot-wrap').clientWidth));
  const height = 300;
  const left = 46, right = width - 18, top = 30, bottom = 254;
  const x = value => left + value / KINETICS_LIMITS.substrate.max * (right - left);
  const y = value => bottom - value / KINETICS_BASELINE.vmax * (bottom - top);
  const position = value => Number(value.toFixed(3));
  const selected = chosenMode();
  plot.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  let axes = '';
  for (const value of [0, 2.5, 5, 7.5, 10]) {
    axes += '<path class="grid-line" d="M' + left + ' ' + y(value) + 'H' + right + '"/>' +
      '<text x="' + (left - 9) + '" y="' + (y(value) + 4) + '" text-anchor="end">' + value + '</text>';
  }
  for (const value of [0, 8, 16, 24, 32]) {
    axes += '<path class="axis-tick" d="M' + x(value) + ' ' + bottom + 'v5"/>' +
      '<text x="' + x(value) + '" y="' + (bottom + 20) + '" text-anchor="middle">' + value + '</text>';
  }
  axes += '<text x="' + left + '" y="16">Initial rate · product units/min</text>' +
    '<text x="' + ((left + right) / 2) + '" y="295" text-anchor="middle">Substrate · concentration units</text>';
  byId('plot-axes').innerHTML = axes;
  const samples = kineticsCurve(lastComparison.input.inhibitorRatio);
  const paths = KINETICS_MODES.map(mode => {
    const d = samples.map((sample, index) =>
      (index ? 'L' : 'M') + position(x(sample.input.substrate)) + ' ' + position(y(sample.cases[mode.id].rate))).join(' ');
    return '<path class="curve ' + mode.id + (selected === mode.id ? ' selected' : '') + '" data-model="' +
      mode.id + '" d="' + d + '"/>';
  }).join('');
  const sx = x(lastComparison.input.substrate);
  let marks = '<path class="probe-line" d="M' + sx + ' ' + top + 'V' + bottom + '"/>';
  for (const mode of KINETICS_MODES) {
    const sy = y(lastComparison.cases[mode.id].rate);
    const attrs = ' class="probe ' + mode.id + '" data-model="' + mode.id + '"';
    if (mode.id === 'uninhibited') marks += '<circle' + attrs + ' cx="' + sx + '" cy="' + sy + '" r="5"/>';
    else if (mode.id === 'competitive') marks += '<rect' + attrs + ' x="' + (sx - 5) + '" y="' + (sy - 5) + '" width="10" height="10"/>';
    else marks += '<path' + attrs + ' d="M' + sx + ' ' + (sy - 6) + 'l6 11h-12Z"/>';
  }
  byId('plot-curves').innerHTML = paths;
  byId('plot-probes').innerHTML = marks;
  byId('plot-description').textContent = 'Three initial-rate curves over substrate concentrations 0 to 32, with inhibitor ratio ' +
    shown(lastComparison.input.inhibitorRatio) + '. The current substrate concentration is ' +
    shown(lastComparison.input.substrate) + '. Exact current values and apparent parameters follow in the table.';
}

function explain(comparison) {
  const { substrate, inhibitorRatio } = comparison.input;
  const selected = comparison.cases[chosenMode()];
  byId('explanation-title').textContent = selected.label;
  const text = byId('explanation-text');
  if (substrate === 0) {
    text.textContent = 'With no substrate, all three initial rates are zero. A fraction of the uninhibited rate would divide zero by zero, so it is undefined here. The limiting rates and apparent Km values still describe the curves at other substrate concentrations.';
  } else if (inhibitorRatio === 0) {
    text.textContent = 'The inhibitor ratio is zero. All three cases coincide: the same rate, the same Km of 1 concentration unit and the same limiting rate of 10 product units/min. Add inhibitor to compare their different responses.';
  } else if (selected.id === 'competitive') {
    text.textContent = 'At this substrate concentration, the competitive case retains ' + shown(selected.relativeRate * 100) +
      '% of the uninhibited rate. More substrate reduces the fractional loss in this model. Its apparent Km is ' +
      shown(selected.apparentKm) + ', while its limiting rate stays 10. A finite substrate concentration approaches that limit without reaching it.';
  } else if (selected.id === 'pure_noncompetitive') {
    text.textContent = 'The pure noncompetitive case retains ' + shown(selected.relativeRate * 100) +
      '% of the uninhibited rate at every positive substrate concentration. Its apparent Km stays 1; its limiting rate falls to ' +
      shown(selected.limitingRate) + '. More substrate raises the rate but does not restore the uninhibited limiting rate.';
  } else {
    text.textContent = 'The uninhibited rate is ' + shown(selected.rate) +
      ' product units/min. At substrate 1, the rate is half of its limiting value of 10. As substrate increases, each additional unit gives a smaller gain. The enzyme amount and the baseline parameters stay fixed.';
  }
  byId('coincident-note').hidden = inhibitorRatio !== 0;
  byId('zero-note').hidden = substrate !== 0;
}

function clearResults(errors) {
  lastComparison = null;
  csvButton.disabled = true;
  results.hidden = true;
  invalid.hidden = false;
  for (const id of ['plot-curves', 'plot-probes', 'plot-axes']) byId(id).replaceChildren();
  for (const cell of results.querySelectorAll('[data-quantity]')) {
    cell.textContent = '—';
    delete cell.dataset.value;
  }
  for (const id of ['explanation-title', 'explanation-text', 'current-point', 'plot-description']) byId(id).textContent = '';
  status.textContent = errors.join(' ');
  status.classList.add('has-error');
}

function updateResults() {
  const parameters = {};
  const errors = [];
  for (const [key, field, slider] of fields) {
    try {
      parameters[key] = parseKineticsNumber(field.value, key);
      field.removeAttribute('aria-invalid');
      slider.value = String(parameters[key]);
      slider.disabled = false;
    } catch (error) {
      field.setAttribute('aria-invalid', 'true');
      errors.push(error.message);
    }
  }
  if (errors.length) {
    clearResults(errors);
    return null;
  }
  lastComparison = compareKinetics(parameters);
  results.hidden = false;
  invalid.hidden = true;
  for (const mode of KINETICS_MODES) {
    const row = byId('comparison-table').querySelector('[data-model="' + mode.id + '"]');
    const data = lastComparison.cases[mode.id];
    row.classList.toggle('selected', mode.id === chosenMode());
    for (const cell of row.querySelectorAll('[data-quantity]')) {
      const value = data[cell.dataset.quantity];
      if (value === null) {
        cell.textContent = 'Undefined';
        delete cell.dataset.value;
      } else setNumber(cell, cell.dataset.quantity === 'relativeRate' ? value * 100 : value,
        cell.dataset.quantity === 'relativeRate' ? '%' : '');
    }
  }
  byId('current-point').textContent = 'At substrate ' + shown(parameters.substrate) + ' · inhibitor ratio ' + shown(parameters.inhibitorRatio);
  explain(lastComparison);
  drawPlot();
  csvButton.disabled = false;
  status.classList.remove('has-error');
  status.textContent = 'Comparison updated at substrate ' + shown(parameters.substrate) +
    ' and inhibitor ratio ' + shown(parameters.inhibitorRatio) + '.';
  return lastComparison;
}

function setValues(values) {
  for (const [key, field] of fields) {
    if (Object.hasOwn(values, key)) field.value = String(values[key]);
  }
  updateResults();
}
function downloadText(name, mime, text) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

byId('kinetics-controls').addEventListener('submit', event => event.preventDefault());
for (const [key, field, slider] of fields) {
  field.addEventListener('input', updateResults);
  slider.addEventListener('input', () => {
    // A drag can yield many decimals; retain eight significant figures in both controls.
    setValues({ [key]: Number(Number(slider.value).toPrecision(8)) });
  });
}
for (const radio of document.querySelectorAll('input[name="explain-model"]')) radio.addEventListener('change', updateResults);
for (const button of document.querySelectorAll('[data-substrate-preset]')) {
  button.addEventListener('click', () => setValues({ substrate: Number(button.dataset.substratePreset) }));
}
byId('no-inhibitor').addEventListener('click', () => setValues({ inhibitorRatio: 0 }));
byId('reset-example').addEventListener('click', () => {
  byId('explain-competitive').checked = true;
  setValues({ substrate: 1, inhibitorRatio: 3 });
});
byId('download-course').addEventListener('click', () =>
  downloadText('enzymes-energy-and-control.json', 'application/json;charset=utf-8', courseText));
csvButton.addEventListener('click', () => {
  // Revalidate even if a field was changed without an input event.
  const current = updateResults();
  if (current) downloadText('enzyme-kinetics-comparison.csv', 'text/csv;charset=utf-8', kineticsCSV(current.input));
});
new ResizeObserver(drawPlot).observe(byId('plot-wrap'));
updateResults();
