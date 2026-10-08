import { REACTIONS, MODEL_NOTE, solveReaction, formatMoles, outcomeText, workedRecord } from './stoichiometry.mjs';

const element = id => document.getElementById(id);
const reactionSelect = element('reaction');
const predictionSelect = element('prediction');
let currentResult = null;
let currentPrediction = '';

function option(value, text) {
  const node = document.createElement('option');
  node.value = value;
  node.textContent = text;
  return node;
}

function invalidate(message = 'Inputs changed. Compare amounts again before saving a record.') {
  currentResult = null;
  currentPrediction = '';
  element('result').hidden = true;
  element('pending').hidden = false;
  element('download-record').disabled = true;
  element('calculation-error').textContent = '';
  element('record-status').textContent = message;
}

function loadReaction(id, values) {
  const reaction = REACTIONS.find(item => item.id === id);
  reactionSelect.value = id;
  element('equation').textContent = reaction.equation;
  for (const [index, suffix] of ['first', 'second'].entries()) {
    const item = reaction.reactants[index];
    element(`label-${suffix}`).textContent = `${item.name} · ${item.formula} (mol)`;
    element(`amount-${suffix}`).value = (values ?? reaction.example)[index];
  }
  predictionSelect.replaceChildren(
    option('', 'Make a prediction, or leave blank'),
    option('first', `${reaction.reactants[0].formula} alone limits (product forms)`),
    option('second', `${reaction.reactants[1].formula} alone limits (product forms)`),
    option('matched', 'Exact ratio (product forms)'),
    option('no-product', 'No product can form')
  );
  invalidate('Starting amounts loaded. Make a prediction, then compare.');
}

function drawResult(result, prediction) {
  element('outcome').textContent = outcomeText(result);
  element('prediction-feedback').textContent = !prediction ? 'No prediction recorded. Try changing one amount before checking again.'
    : prediction === result.classification ? 'Your prediction agrees with this ideal completion model.'
      : 'This result differs from your prediction. Compare each amount divided by its coefficient.';
  const capacities = element('capacities');
  capacities.replaceChildren();
  const maximum = Math.max(...result.reactants.map(item => item.capacity));
  for (const item of result.reactants) {
    const row = document.createElement('div');
    row.className = 'capacity-item';
    const label = document.createElement('div');
    label.className = 'capacity-label';
    const name = document.createElement('span');
    name.textContent = `${item.formula}: ${formatMoles(item.initial)} ÷ ${item.coefficient}`;
    const value = document.createElement('strong');
    value.textContent = `${formatMoles(item.capacity)} mol extent`;
    label.append(name, value);
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('span');
    fill.style.width = `${maximum ? 100 * item.capacity / maximum : 0}%`;
    bar.append(fill);
    row.append(label, bar);
    capacities.append(row);
  }
  element('reason').textContent = `Shared extent = min(${result.reactants.map(item => formatMoles(item.capacity)).join(', ')}) = ${formatMoles(result.extent)} mol. Both reactants must support the same extent.`;
  const product = result.products[0];
  element('product-label').textContent = `Theoretical ${product.formula}: ${product.coefficient} × ${formatMoles(result.extent)}`;
  element('product-amount').textContent = `${formatMoles(product.formed)} mol`;
  const body = element('balance');
  body.replaceChildren();
  for (const item of result.reactants) {
    const row = document.createElement('tr');
    const name = document.createElement('th');
    name.scope = 'row';
    name.textContent = item.formula;
    row.append(name);
    for (const quantity of [item.initial, item.consumed, item.remaining]) {
      const cell = document.createElement('td');
      cell.textContent = formatMoles(quantity);
      row.append(cell);
    }
    body.append(row);
  }
  element('result').hidden = false;
  element('pending').hidden = true;
  element('download-record').disabled = false;
  element('record-status').textContent = 'This record contains the displayed amounts and your prediction.';
}

function download(filename, contents, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement('a');
  try {
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

reactionSelect.replaceChildren(...REACTIONS.map(item => option(item.id, item.name)));
element('model-note').textContent = MODEL_NOTE;
reactionSelect.addEventListener('change', () => loadReaction(reactionSelect.value));
for (const id of ['amount-first', 'amount-second']) element(id).addEventListener('input', () => invalidate());
predictionSelect.addEventListener('change', () => invalidate());
element('example-equal').addEventListener('click', () => loadReaction('water', ['2', '2']));
element('example-ratio').addEventListener('click', () => loadReaction('water', ['4', '2']));
element('example-zero').addEventListener('click', () => loadReaction('water', ['0', '5']));
element('reaction-form').addEventListener('submit', event => {
  event.preventDefault();
  invalidate('');
  try {
    const result = solveReaction(reactionSelect.value, [element('amount-first').value, element('amount-second').value]);
    const prediction = predictionSelect.value;
    drawResult(result, prediction);
    currentResult = result;
    currentPrediction = prediction;
    element('outcome').focus();
  } catch (error) {
    invalidate('No worked record is available until the amounts are corrected.');
    element('calculation-error').textContent = error.message;
  }
});
element('download-record').addEventListener('click', () => {
  if (!currentResult) return;
  try {
    download('recallweave-stoichiometry.txt', workedRecord(currentResult, currentPrediction), 'text/plain;charset=utf-8');
    element('record-status').textContent = 'Download requested. If prompted, choose where to save the worked record.';
  } catch {
    element('record-status').textContent = 'The download could not start. Your displayed result is still available; try again.';
  }
});
element('download-course').addEventListener('click', () => {
  try {
    const text = JSON.stringify(JSON.parse(element('course-data').textContent), null, 2) + '\n';
    download('stoichiometry-foundations.json', text, 'application/json;charset=utf-8');
    element('course-status').textContent = 'Download requested. Keep this course for a lesson player with local deck import.';
  } catch {
    element('course-status').textContent = 'The course download could not start. Try again.';
  }
});
loadReaction('water');
