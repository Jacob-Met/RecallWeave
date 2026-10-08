import { CELL_KEYS, PROBABILITIES, parseCount, parseEventLabel, analyzeTable } from './conditional-probability.mjs';

const byId = id => document.getElementById(id);
const countInputs = Object.fromEntries(CELL_KEYS.map(key => [key, byId('count-' + key)]));
const labelInputs = { a: byId('label-a'), b: byId('label-b') };
const selection = byId('probability-select');
const results = byId('results');
const status = byId('input-status');
const resultButton = byId('download-result');
const resultBody = byId('probability-results');
const presets = {
  rare: { cells: ['9', '1', '99', '891'], labels: ['Defective file', 'Flagged file'] },
  common: { cells: ['90', '10', '90', '810'], labels: ['Defective file', 'Flagged file'] },
  independent: { cells: ['20', '20', '30', '30'], labels: ['Event A', 'Event B'] },
  emptyB: { cells: ['0', '10', '0', '90'], labels: ['Event A', 'Event B'] },
  empty: { cells: ['0', '0', '0', '0'], labels: ['Event A', 'Event B'] },
  close: { cells: ['889', '890', '890', '891'], labels: ['Event A', 'Event B'] },
};
const phrases = {
  joint_ab: ['A and B'], joint_a_not_b: ['A and not B'],
  joint_not_a_b: ['not A and B'], joint_neither: ['neither A nor B'],
  marginal_a: ['A'], marginal_not_a: ['not A'], marginal_b: ['B'], marginal_not_b: ['not B'],
  a_given_b: ['A', 'B'], not_a_given_b: ['not A', 'B'],
  a_given_not_b: ['A', 'not B'], not_a_given_not_b: ['not A', 'not B'],
  b_given_a: ['B', 'A'], not_b_given_a: ['not B', 'A'],
  b_given_not_a: ['B', 'not A'], not_b_given_not_a: ['not B', 'not A'],
};
function named(token, labels) {
  return token.replace(/\b[AB]\b/g, letter => '“' + labels[letter.toLowerCase()] + '”');
}
function meaning(id, labels) {
  return phrases[id].map(part => named(part, labels)).join(', given ');
}
function countText(raw) { return BigInt(raw).toLocaleString('en-US'); }
function fraction(row) {
  return row.defined ? row.reducedNumerator + ' / ' + row.reducedDenominator : 'Undefined';
}
function percentage(row) {
  if (!row.defined) return { text: 'No conditioning outcomes', width: '0%' };
  const n = BigInt(row.numerator);
  const d = BigInt(row.denominator);
  const scaled = (n * 10000n + d / 2n) / d;
  const value = String(scaled / 100n) + '.' + String(scaled % 100n).padStart(2, '0') + '%';
  return { text: (n * 10000n % d === 0n ? '' : '≈ ') + value, width: value };
}
function text(id, value) { byId(id).textContent = value; }
function readInput() {
  const cells = Object.fromEntries(CELL_KEYS.map(key => [key, countInputs[key].value]));
  const labels = { a: labelInputs.a.value, b: labelInputs.b.value };
  const errors = [];
  for (const key of CELL_KEYS) {
    try {
      parseCount(cells[key]);
      countInputs[key].removeAttribute('aria-invalid');
    } catch (error) {
      countInputs[key].setAttribute('aria-invalid', 'true');
      errors.push(countInputs[key].getAttribute('aria-label') + ': ' + error.message);
    }
  }
  for (const key of ['a', 'b']) {
    try {
      parseEventLabel(labels[key]);
      labelInputs[key].removeAttribute('aria-invalid');
    } catch (error) {
      labelInputs[key].setAttribute('aria-invalid', 'true');
      errors.push('Event ' + key.toUpperCase() + ': ' + error.message);
    }
  }
  if (errors.length) throw new Error(errors.join(' '));
  if (!PROBABILITIES.some(row => row.id === selection.value)) throw new Error('Choose a probability to inspect.');
  return { cells, labels };
}
function retire(message) {
  results.hidden = true;
  resultButton.disabled = true;
  resultBody.replaceChildren();
  for (const element of results.querySelectorAll('[data-output]')) element.textContent = '';
  for (const cell of results.querySelectorAll('[data-cell]')) {
    cell.classList.remove('is-numerator', 'is-denominator');
    cell.removeAttribute('data-membership');
  }
  for (const id of ['forward-bar', 'reverse-bar']) byId(id).style.width = '0%';
  status.textContent = message;
  status.classList.add('has-error');
}
function renderTable(analysis, selected) {
  const rows = Object.fromEntries(analysis.probabilities.map(row => [row.id, row]));
  text('row-a', 'A: ' + analysis.labels.a);
  text('row-not-a', 'Not A');
  text('column-b', 'B: ' + analysis.labels.b);
  text('column-not-b', 'Not B');
  for (const key of CELL_KEYS) {
    const cell = results.querySelector('[data-cell="' + key + '"]');
    const n = selected.numeratorCells.includes(key);
    const d = selected.denominatorCells.includes(key);
    cell.classList.toggle('is-numerator', n);
    cell.classList.toggle('is-denominator', d);
    cell.dataset.membership = n ? 'numerator-and-denominator' : d ? 'denominator' : 'outside';
    cell.querySelector('[data-count]').textContent = countText(analysis.cells[key]);
    cell.querySelector('[data-badge]').textContent = n ? 'N + D' : d ? 'D' : 'Outside';
  }
  text('row-total-a', countText(rows.marginal_a.numerator));
  text('row-total-not-a', countText(rows.marginal_not_a.numerator));
  text('column-total-b', countText(rows.marginal_b.numerator));
  text('column-total-not-b', countText(rows.marginal_not_b.numerator));
  text('table-total', countText(analysis.total));
}
function render(analysis) {
  const selected = analysis.probabilities.find(row => row.id === selection.value);
  results.hidden = false;
  resultButton.disabled = false;
  status.classList.remove('has-error');
  status.textContent = BigInt(analysis.total) === 0n
    ? 'All four counts are zero. Probabilities and independence are undefined.'
    : 'Updated from all four counts. Select a probability to inspect its counting group.';
  text('focus-title', selected.symbol);
  text('focus-meaning', meaning(selected.id, analysis.labels));
  text('focus-numerator', countText(selected.numerator));
  text('focus-denominator', countText(selected.denominator));
  text('focus-fraction', fraction(selected));
  text('focus-percentage', selected.defined ? percentage(selected).text : 'No probability: denominator is zero.');
  text('focus-explanation', selected.defined
    ? 'Count the N outcomes, then divide by all D outcomes. The highlighted N cells also belong to the denominator.'
    : 'An empty denominator supplies no outcomes to condition on. Undefined is different from probability zero.');
  renderTable(analysis, selected);
  for (const [prefix, id] of [['forward', 'a_given_b'], ['reverse', 'b_given_a']]) {
    const row = analysis.probabilities.find(value => value.id === id);
    const percent = percentage(row);
    text(prefix + '-meaning', meaning(id, analysis.labels));
    text(prefix + '-fraction', fraction(row));
    text(prefix + '-counts', countText(row.numerator) + ' out of ' + countText(row.denominator));
    text(prefix + '-percentage', row.defined ? percent.text : 'Undefined: empty conditioning group');
    byId(prefix + '-bar').style.width = percent.width;
  }
  const independent = analysis.independence;
  text('independence-answer', !independent.defined ? 'Undefined: the table is empty'
    : independent.independent ? 'Independent in this finite table' : 'Dependent in this finite table');
  text('independence-left', independent.left === null ? 'Undefined' : countText(independent.left));
  text('independence-right', independent.right === null ? 'Undefined' : countText(independent.right));
  text('independence-sign', !independent.defined ? '—' : independent.independent ? '=' : '≠');
  resultBody.replaceChildren();
  for (const row of analysis.probabilities) {
    const tr = document.createElement('tr');
    tr.dataset.probabilityId = row.id;
    if (row.id === selected.id) tr.classList.add('selected-row');
    const name = document.createElement('th');
    name.scope = 'row';
    const symbol = document.createElement('strong');
    symbol.textContent = row.symbol;
    const description = document.createElement('small');
    description.textContent = meaning(row.id, analysis.labels);
    name.append(symbol, description);
    const ratio = document.createElement('td');
    ratio.dataset.role = 'fraction';
    ratio.textContent = fraction(row);
    const percent = document.createElement('td');
    percent.textContent = row.defined ? percentage(row).text : '—';
    tr.append(name, ratio, percent);
    resultBody.append(tr);
  }
}
function refresh() {
  try {
    const analysis = analyzeTable(readInput());
    render(analysis);
    return analysis;
  } catch (error) {
    retire(error.message);
    return null;
  }
}
function saveText(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
for (const definition of PROBABILITIES) {
  const option = document.createElement('option');
  option.value = definition.id;
  option.textContent = definition.symbol;
  selection.append(option);
}
selection.value = 'a_given_b';
for (const input of [...Object.values(countInputs), ...Object.values(labelInputs)]) {
  input.addEventListener('input', refresh);
  input.addEventListener('change', refresh);
}
selection.addEventListener('change', refresh);
byId('table-form').addEventListener('submit', event => { event.preventDefault(); refresh(); });
byId('apply-preset').addEventListener('click', () => {
  const preset = presets[byId('preset-select').value];
  if (!preset) return;
  CELL_KEYS.forEach((key, index) => { countInputs[key].value = preset.cells[index]; });
  labelInputs.a.value = preset.labels[0];
  labelInputs.b.value = preset.labels[1];
  refresh();
});
resultButton.addEventListener('click', () => {
  // Read actual live values even when a caller changed a field without an input event.
  const analysis = refresh();
  if (!analysis) return;
  saveText(JSON.stringify({ ...analysis, selectedProbability: selection.value }, null, 2) + '\n',
    'conditional-probability-table.json', 'application/json;charset=utf-8');
});
byId('download-course').disabled = false;
byId('download-course').addEventListener('click', () => {
  saveText(COURSE_TEXT, 'probability-foundations.json', 'application/json;charset=utf-8');
});
refresh();
