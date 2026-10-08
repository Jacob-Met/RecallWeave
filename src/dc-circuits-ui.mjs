import { CIRCUIT_LIMITS, parseCircuitNumber, compareCircuits, comparisonCSV } from './dc-circuits.mjs';

const fields = [
  ['voltage', document.getElementById('source-voltage')],
  ['resistance1', document.getElementById('resistance-1')],
  ['resistance2', document.getElementById('resistance-2')],
];
const resultRegion = document.getElementById('results');
const invalidRegion = document.getElementById('invalid-results');
const status = document.getElementById('lab-status');
const diagram = document.getElementById('circuit-drawing');
const csvButton = document.getElementById('download-comparison');
const courseText = JSON.parse(document.getElementById('dc-course-data').textContent);
let lastComparison = null;

function displayNumber(value) {
  return value === 0 ? '0' : Number(value.toPrecision(6)).toString();
}

function setCell(cell, value) {
  cell.textContent = displayNumber(value);
  cell.dataset.value = String(value);
}

function fillRow(row, values) {
  for (const cell of row.querySelectorAll('[data-quantity]')) {
    setCell(cell, values[cell.dataset.quantity]);
  }
}

function drawCircuit(connection, energized) {
  const source = '<circle class="source-symbol" cx="60" cy="145" r="33"/>' +
    '<text x="60" y="139" class="polarity">+</text><text x="60" y="165" class="polarity">−</text>';
  const series = '<path class="wire" d="M60 112V72H175 M285 72H345 M455 72H540V225H60V178"/>' +
    '<rect class="resistor" x="175" y="54" width="110" height="36"/>' +
    '<rect class="resistor" x="345" y="54" width="110" height="36"/>' +
    '<text x="230" y="40">R1</text><text x="400" y="40">R2</text>';
  const parallel = '<path class="wire" d="M60 112V75H470 M60 178V225H470 M270 75V111 M270 189V225 M470 75V111 M470 189V225"/>' +
    '<rect class="resistor" x="251" y="111" width="38" height="78"/>' +
    '<rect class="resistor" x="451" y="111" width="38" height="78"/>' +
    '<text x="322" y="158">R1</text><text x="522" y="158">R2</text>' +
    '<circle class="node" cx="270" cy="75" r="5"/><circle class="node" cx="270" cy="225" r="5"/>' +
    '<circle class="node" cx="470" cy="75" r="5"/><circle class="node" cx="470" cy="225" r="5"/>';
  const current = connection === 'series'
    ? '<path class="current-arrow" d="M96 72H140"/><path class="current-arrow" d="M330 225H275"/><text class="current-label" x="118" y="53">I</text><text class="current-label" x="300" y="260">I</text>'
    : '<path class="current-arrow" d="M95 75H150"/><path class="current-arrow" d="M270 193V219"/><path class="current-arrow" d="M470 193V219"/><text class="current-label" x="120" y="53">I</text><text class="current-label" x="229" y="214">I1</text><text class="current-label" x="429" y="214">I2</text>';
  diagram.innerHTML = source + (connection === 'series' ? series : parallel) + (energized ? current : '');
  document.getElementById('circuit-title').textContent = connection === 'series' ? 'A series circuit' : 'A parallel circuit';
  document.getElementById('circuit-description').textContent = connection === 'series'
    ? 'An ideal source and two resistors form one unbranched loop. R1 and R2 carry the same steady current.'
    : 'Each resistor joins the same positive and negative source nodes. Source current splits into the R1 and R2 branches and rejoins.';
  document.getElementById('arrow-note').textContent = energized
    ? 'Arrows show conventional current from the positive source terminal through the resistors to the negative terminal.'
    : 'At zero source voltage no steady current flows, so current arrows are hidden.';
}

function clearResults(messages) {
  lastComparison = null;
  csvButton.disabled = true;
  resultRegion.hidden = true;
  invalidRegion.hidden = false;
  diagram.replaceChildren();
  for (const cell of resultRegion.querySelectorAll('[data-quantity]')) {
    cell.textContent = '—';
    delete cell.dataset.value;
  }
  for (const id of ['connection-summary', 'power-summary', 'comparison-note']) {
    document.getElementById(id).textContent = '';
  }
  status.textContent = messages.join(' ');
  status.classList.add('has-error');
}

function updateResults() {
  const parameters = {};
  const errors = [];
  for (const [key, field] of fields) {
    const { label, min, max } = CIRCUIT_LIMITS[key];
    try {
      parameters[key] = parseCircuitNumber(field.value, label, min, max);
      field.removeAttribute('aria-invalid');
    } catch (error) {
      field.setAttribute('aria-invalid', 'true');
      errors.push(error.message);
    }
  }
  if (errors.length) {
    clearResults(errors);
    return;
  }
  lastComparison = compareCircuits(parameters);
  const connection = document.querySelector('input[name="connection"]:checked').value;
  const selected = lastComparison[connection];
  for (const row of document.querySelectorAll('#comparison-table tbody tr')) {
    fillRow(row, lastComparison[row.dataset.connection]);
  }
  for (const row of document.querySelectorAll('#resistor-table tbody tr')) {
    fillRow(row, selected.resistors.find(part => part.id === row.dataset.part));
  }
  const [first, second] = selected.resistors;
  const shown = value => displayNumber(value);
  document.getElementById('selected-connection').textContent = connection === 'series' ? 'Series connection' : 'Parallel connection';
  document.getElementById('resistor-caption').textContent = 'Each resistor in the ' + connection + ' connection';
  document.getElementById('relationship-title').textContent = connection === 'series'
    ? 'One loop, shared current' : 'Two branches, shared voltage';
  document.getElementById('connection-summary').textContent = connection === 'series'
    ? 'Each resistor carries ' + shown(selected.sourceCurrent) + ' A. The voltage drops, ' + shown(first.voltage) + ' V + ' + shown(second.voltage) + ' V, add to the source voltage of ' + shown(parameters.voltage) + ' V.'
    : 'Each resistor has ' + shown(parameters.voltage) + ' V across it. The branch currents, ' + shown(first.current) + ' A + ' + shown(second.current) + ' A, add to the source current of ' + shown(selected.sourceCurrent) + ' A.';
  document.getElementById('power-summary').textContent =
    'The source supplies ' + shown(selected.sourcePower) + ' W. R1 transfers ' + shown(first.power) + ' W and R2 transfers ' + shown(second.power) + ' W to thermal energy.';
  document.getElementById('comparison-note').textContent = parameters.voltage === 0
    ? 'At zero voltage, current and power are zero in both connections. Their equivalent resistances still differ.'
    : 'With these same resistors and source voltage, the parallel connection draws ' +
      shown(lastComparison.parallel.sourceCurrent / lastComparison.series.sourceCurrent) +
      ' times the source current and uses the same factor more total power.';
  drawCircuit(connection, parameters.voltage !== 0);
  resultRegion.hidden = false;
  invalidRegion.hidden = true;
  csvButton.disabled = false;
  status.classList.remove('has-error');
  status.textContent = 'Results updated. ' + (connection === 'series' ? 'Series' : 'Parallel') + ' circuit shown.';
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

document.getElementById('circuit-controls').addEventListener('submit', event => event.preventDefault());
for (const [, field] of fields) field.addEventListener('input', updateResults);
for (const radio of document.querySelectorAll('input[name="connection"]')) {
  radio.addEventListener('change', updateResults);
}
function preset(voltage, resistance1, resistance2) {
  fields[0][1].value = String(voltage);
  fields[1][1].value = String(resistance1);
  fields[2][1].value = String(resistance2);
  updateResults();
}
document.getElementById('preset-unequal').addEventListener('click', () => preset(12, 4, 8));
document.getElementById('preset-equal').addEventListener('click', () => preset(12, 6, 6));
document.getElementById('preset-zero').addEventListener('click', () => {
  fields[0][1].value = '0';
  updateResults();
});
document.getElementById('download-course').addEventListener('click', () =>
  downloadText('dc-circuits.json', 'application/json;charset=utf-8', courseText));
csvButton.addEventListener('click', () => {
  if (lastComparison) downloadText('dc-circuits-comparison.csv', 'text/csv;charset=utf-8', comparisonCSV(lastComparison));
});
updateResults();
