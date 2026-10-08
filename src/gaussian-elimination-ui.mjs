import { LIMITS, PRESETS, parseMatrix, applyOperation, replayOperation, analyze, formatOperation } from './gaussian-elimination.mjs';

const byId = id => document.getElementById(id);
let original, current, history = [], report, originalReport;
function element(tag, text) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; }
function guarded(fn) {
  try { fn(); byId('error').textContent = ''; }
  catch (error) { byId('error').textContent = error.message; }
}
function equations(matrix) {
  return matrix.map(row => row.slice(0, -1).map((value, i) => '(' + value + ')x' + (i + 1)).join(' + ') + ' = ' + row.at(-1)).join('\n');
}
function matrixTable(matrix) {
  const table = element('table'), caption = element('caption', 'Current augmented matrix');
  table.append(caption);
  const head = element('tr');
  matrix[0].forEach((_, c) => { const th = element('th', c === matrix[0].length - 1 ? 'Right side' : 'x' + (c + 1)); th.scope = 'col'; head.append(th); });
  const thead = element('thead'); thead.append(head); table.append(thead);
  const body = element('tbody');
  matrix.forEach(row => {
    const tr = element('tr'); row.forEach((value, c) => { const td = element('td', value); if (c === row.length - 1) td.className = 'rhs'; tr.append(td); }); body.append(tr);
  }); table.append(body); return table;
}
function populateRows() {
  for (const id of ['target', 'source']) {
    const select = byId(id); select.replaceChildren();
    current.forEach((_, i) => { const option = element('option', 'Row ' + (i + 1)); option.value = i; select.append(option); });
  }
  byId('source').value = 1;
}
function explain(result) {
  if (result.kind === 'none') {
    return 'No solution. A row becomes 0 = 1. Combining the original equations with weights [' +
      result.witness.join(', ') + '] gives this contradiction.';
  }
  const vector = '(' + result.particular.join(', ') + ')';
  if (result.kind === 'unique') return 'One solution: (x1, x2' + (result.particular.length === 3 ? ', x3' : '') + ') = ' + vector + '. Substituting into every original equation verifies it.';
  return 'Infinitely many solutions: x = ' + vector + result.basis.map((v, i) => ' + t' + (i + 1) + '(' + v.join(', ') + ')').join('') +
    '. Each t is any real number. The first vector satisfies the original equations; each direction vector gives zero on their left sides.';
}
function render() {
  byId('original').textContent = equations(original);
  byId('matrix').replaceChildren(matrixTable(current));
  byId('operation-log').replaceChildren(...history.map((entry, i) => element('li', (i + 1) + '. ' + entry.label)));
  byId('count').textContent = history.length + ' / ' + LIMITS.operations + ' operations';
  byId('undo').disabled = history.length === 0;
  byId('next').disabled = report.steps.length === 0 || history.length >= LIMITS.operations;
  byId('apply').disabled = history.length >= LIMITS.operations;
  byId('next-hint').textContent = report.steps.length ? 'Next guided operation: ' + report.steps[0].label :
    'The augmented matrix is in reduced row-echelon form.';
  byId('status').textContent = report.steps.length ? 'Row reduction in progress.' : 'Row reduction complete.';
  byId('result').hidden = report.steps.length !== 0;
  byId('result').textContent = explain(originalReport);
  byId('rank').textContent = 'Coefficient rank: ' + report.rank + '; augmented rank: ' + report.augmentedRank +
    '. Free variables: ' + (report.free.length ? report.free.map(c => 'x' + (c + 1)).join(', ') : 'none') + '.';
  operationFields();
}
function operationFields() {
  const kind = byId('kind').value;
  byId('source-field').hidden = kind === 'scale';
  byId('factor-field').hidden = kind === 'swap';
}
function loadAttempt(text) {
  const next = parseMatrix(text), nextReport = analyze(next);
  original = next.map(row => row.slice()); current = next; report = nextReport; originalReport = nextReport; history = [];
  populateRows(); render();
}
function commit(op, replay = false) {
  if (history.length >= LIMITS.operations) throw new Error('This attempt has reached 80 operations. Undo or reset to continue.');
  const next = replay ? replayOperation(current, op) : applyOperation(current, op);
  const nextReport = analyze(next);
  history.push({ matrix: current, label: formatOperation(op) + (JSON.stringify(next) === JSON.stringify(current) ? ' (unchanged)' : '') });
  current = next; report = nextReport; render();
}
for (const preset of PRESETS) {
  const option = element('option', preset.label); option.value = preset.id; byId('preset').append(option);
}
byId('preset').addEventListener('change', () => guarded(() => {
  byId('input').value = PRESETS.find(p => p.id === byId('preset').value).text; loadAttempt(byId('input').value);
}));
byId('load').addEventListener('click', () => guarded(() => loadAttempt(byId('input').value)));
byId('kind').addEventListener('change', operationFields);
byId('apply').addEventListener('click', () => guarded(() => commit({
  kind: byId('kind').value, target: Number(byId('target').value),
  source: Number(byId('source').value), factor: byId('factor').value.trim(),
})));
byId('next').addEventListener('click', () => guarded(() => { if (report.steps.length) commit(report.steps[0].operation, true); }));
byId('undo').addEventListener('click', () => guarded(() => {
  if (!history.length) return; const previous = history.at(-1), previousReport = analyze(previous.matrix);
  history.pop(); current = previous.matrix; report = previousReport; render();
}));
byId('reset').addEventListener('click', () => guarded(() => {
  current = original.map(row => row.slice()); history = []; report = analyze(current); render();
}));
function download(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], { type })), anchor = element('a');
  anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
byId('download-deck').addEventListener('click', () => download(DECK_TEXT, 'gaussian-elimination.json', 'application/json'));
byId('download-guide').addEventListener('click', () => download(GUIDE_TEXT, 'gaussian-elimination.md', 'text/markdown;charset=utf-8'));
byId('input').value = PRESETS[0].text; guarded(() => loadAttempt(byId('input').value));
