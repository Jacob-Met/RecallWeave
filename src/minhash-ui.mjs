import { analyzeMinHash, parseSetText } from './minhash.mjs';
const $ = id => document.getElementById(id);
const quote = label => JSON.stringify(label);
let applied = null;
let selected = 1;
function node(tag, value, className) {
  const el = document.createElement(tag);
  if (value !== undefined) el.textContent = value;
  if (className) el.className = className;
  return el;
}
function retire() {
  applied = null;
  $('results').hidden = true;
  $('download-observation').disabled = true;
  $('error').textContent = '';
  $('status').textContent = 'Inputs changed. Choose Compare all permutations to calculate this draft.';
}
function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = node('a'); a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function showRow() {
  if (!applied) return;
  const a = applied.analysis, row = a.rows[selected - 1];
  $('permutation').value = String(selected);
  $('previous').disabled = selected === 1;
  $('next').disabled = selected === a.permutations;
  $('row-status').textContent = 'Permutation ' + selected + ' of ' + a.permutations + ': ' +
    (row.collision ? 'same minimum label' : 'different minimum labels') + '.';
  $('ranked-labels').replaceChildren(...row.order.map((label, i) => {
    const inA = a.setA.includes(label), inB = a.setB.includes(label);
    const tile = node('li', undefined, inA && inB ? 'shared' : inA ? 'only-a' : 'only-b');
    tile.append(node('span', 'RANK ' + (i + 1), 'rank'), node('code', quote(label)),
      node('span', inA && inB ? 'A and B' : inA ? 'A only' : 'B only', 'membership'));
    return tile;
  }));
  $('min-a').textContent = quote(row.minA) + ' · rank ' + row.rankA;
  $('min-b').textContent = quote(row.minB) + ' · rank ' + row.rankB;
  $('row-collision').textContent = row.collision ? '1 · MATCH' : '0 · DIFFER';
  $('row-explanation').textContent = row.collision
    ? 'The first union label ' + quote(row.first) + ' belongs to both sets. It is the first member of A and of B, so their minimum ranks match.'
    : 'The first union label ' + quote(row.first) + ' belongs to just one set. The other set first appears later, so their minimum ranks differ.';
  for (const button of $('permutation-rows').querySelectorAll('button')) {
    const active = Number(button.dataset.index) === selected;
    button.setAttribute('aria-pressed', String(active));
    button.closest('tr').classList.toggle('selected', active);
  }
}
function render() {
  const a = applied.analysis;
  $('set-a-result').textContent = JSON.stringify(a.setA);
  $('set-b-result').textContent = JSON.stringify(a.setB);
  $('union-result').textContent = JSON.stringify(a.union);
  $('intersection-result').textContent = JSON.stringify(a.intersection);
  $('jaccard').textContent = a.intersection.length + ' / ' + a.union.length;
  $('frequency').textContent = a.collisions + ' / ' + a.permutations;
  $('reduced').textContent = a.fraction.numerator + ' / ' + a.fraction.denominator;
  $('duplicates').textContent = 'Exact repeated labels removed: A ' + (a.inputA.length - a.setA.length) +
    ', B ' + (a.inputB.length - a.setB.length) + '. Case, spaces and Unicode forms remain distinct.';
  $('permutation').replaceChildren(...a.rows.map(row => {
    const opt = node('option', String(row.index) + (row.collision ? ' · match' : ' · differ'));
    opt.value = String(row.index); return opt;
  }));
  $('first-rows').replaceChildren(...a.byFirst.map(group => {
    const tr = node('tr');
    [quote(group.label), group.inA && group.inB ? 'A and B' : group.inA ? 'A only' : 'B only',
      String(group.permutations), String(group.collisions)].forEach(value => tr.append(node('td', value)));
    return tr;
  }));
  $('permutation-rows').replaceChildren(...a.rows.map(row => {
    const tr = node('tr'), cell = node('td'), button = node('button', String(row.index), 'row-select');
    button.type = 'button'; button.dataset.index = String(row.index);
    button.setAttribute('aria-label', 'Inspect permutation ' + row.index);
    button.addEventListener('click', () => { selected = row.index; showRow(); });
    cell.append(button); tr.append(cell);
    [row.order.map(quote).join(' → '), quote(row.minA), quote(row.minB), row.collision ? '1 · match' : '0 · differ']
      .forEach(value => tr.append(node('td', value)));
    return tr;
  }));
  $('results').hidden = false;
  $('download-observation').disabled = false;
  $('error').textContent = '';
  $('status').textContent = 'Calculated all ' + a.permutations + ' permutations. This is a complete finite enumeration.';
  showRow();
}
$('compare-form').addEventListener('submit', event => {
  event.preventDefault();
  const textA = $('set-a').value, textB = $('set-b').value;
  retire();
  try {
    const analysis = analyzeMinHash(parseSetText(textA, 'Set A'), parseSetText(textB, 'Set B'));
    applied = { textA, textB, analysis }; selected = 1; render();
  } catch (error) {
    $('status').textContent = 'No current result. Correct the inputs and compare again.';
    $('error').textContent = error.message;
  }
});
for (const id of ['set-a', 'set-b']) $(id).addEventListener('input', retire);
const examples = {
  overlap: [['a', 'b'], ['b', 'c']],
  identical: [['a', 'b'], ['a', 'b']],
  disjoint: [['a'], ['b', 'c']],
  subset: [['b'], ['a', 'b', 'c']],
  boundary: [['a', 'b', 'c'], ['b', 'd', 'e']],
  literal: [['a', ' a', 'é'], ['a', 'A', 'é']]
};
for (const button of document.querySelectorAll('[data-example]')) button.addEventListener('click', () => {
  const [a, b] = examples[button.dataset.example];
  $('set-a').value = JSON.stringify(a); $('set-b').value = JSON.stringify(b); retire();
  $('status').textContent = 'Example loaded. Choose Compare all permutations.';
});
$('permutation').addEventListener('change', () => { selected = Number($('permutation').value); showRow(); });
$('previous').addEventListener('click', () => { if (applied && selected > 1) { selected--; showRow(); } });
$('next').addEventListener('click', () => { if (applied && selected < applied.analysis.permutations) { selected++; showRow(); } });
$('download-observation').addEventListener('click', () => {
  if (!applied) return;
  const observation = { format: 'recallweave.minhash-observation/1',
    assumptions: { both_sets_nonempty: true, uniform_permutation_for_probability: true,
      complete_enumeration: true, sampled_randomness: false, exact_literal_set_membership: true,
      indices_and_ranks: 'one-based', union_order: 'first-seen Set A, then Set B' },
    entered: { a: applied.textA, b: applied.textB }, selected_permutation: selected, analysis: applied.analysis };
  download('minhash-observation.json', JSON.stringify(observation, null, 2) + '\n', 'application/json;charset=utf-8');
});
$('download-course').addEventListener('click', () => download('probability-foundations.json',
  JSON.parse($('course-data').textContent), 'application/json;charset=utf-8'));
$('download-guide').addEventListener('click', () => download('minhash.md',
  JSON.parse($('guide-data').textContent), 'text/markdown;charset=utf-8'));
