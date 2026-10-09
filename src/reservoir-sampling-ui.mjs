import {traceReservoir, distributionReservoir} from './reservoir-sampling.mjs';
const byId = id => document.getElementById(id);
let applied = null, selectedStep = 0;
const stepButtons = ['first', 'previous', 'next', 'last'];
function node(tag, text, className) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (className) e.className = className;
  return e;
}
function probability(p) { return p.numerator + '/' + p.denominator; }
function positions(ids) { return ids.map(id => '#' + id).join(', '); }
function tableRow(values) {
  const row = node('tr');
  values.forEach(value => row.append(node('td', String(value))));
  return row;
}
function save(text, type, name) {
  const url = URL.createObjectURL(new Blob([text], {type}));
  const a = node('a'); a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function controls() {
  byId('first').disabled = !applied || selectedStep === 0;
  byId('previous').disabled = !applied || selectedStep === 0;
  byId('next').disabled = !applied || selectedStep === applied.trace.steps.length - 1;
  byId('last').disabled = !applied || selectedStep === applied.trace.steps.length - 1;
  byId('download-observation').disabled = !applied;
}
function retire(message) {
  applied = null; selectedStep = 0; controls();
  byId('results').hidden = true;
  byId('reservoir').replaceChildren();
  for (const id of ['step-table', 'subset-table', 'marginal-table']) byId(id).tBodies[0].replaceChildren();
  byId('step-label').textContent = '';
  byId('distribution-summary').textContent = '';
  byId('status').textContent = message;
}
function renderStep() {
  if (!applied) return;
  const t = applied.trace, step = t.steps[selectedStep];
  byId('step-label').textContent = 'Step ' + selectedStep + ' of ' + (t.steps.length - 1) +
    ' · ' + step.seen + ' seen · ' + (step.action === 'initial' ? 'Initial fill' :
      step.action === 'replace' ? 'Replace slot ' + step.slot + ' (was #' + step.removed + ')' :
      'Skip incoming #' + step.incoming.position);
  const list = byId('reservoir'); list.replaceChildren();
  step.after.forEach((position, index) => {
    const li = node('li'); li.dataset.position = String(position); li.dataset.slot = String(index + 1);
    li.append(node('small', 'Slot ' + (index + 1), 'slot'), node('strong', '#' + position, 'position'),
      node('span', t.items[position - 1].label, 'label')); list.append(li);
  });
  for (const row of byId('step-table').tBodies[0].rows) {
    if (Number(row.dataset.step) === selectedStep) row.setAttribute('aria-current', 'step');
    else row.removeAttribute('aria-current');
  }
  controls();
}
function render() {
  const {trace: t, distribution: d} = applied;
  byId('results').hidden = false;
  const steps = byId('step-table').tBodies[0]; steps.replaceChildren();
  t.steps.forEach((s, index) => {
    const action = s.action === 'initial' ? 'Initial fill' :
      s.action === 'replace' ? 'Replace slot ' + s.slot + ' (was #' + s.removed + ')' :
      'Skip incoming #' + s.incoming.position;
    const row = tableRow([s.seen, s.incoming ? '#' + s.incoming.position : '—',
      s.draw === null ? '—' : s.draw, action, positions(s.after)]);
    row.dataset.step = String(index); steps.append(row);
  });
  const subsets = byId('subset-table').tBodies[0]; subsets.replaceChildren();
  d.subsets.forEach(s => subsets.append(tableRow([positions(s.positions), s.count, probability(s.probability)])));
  const marginals = byId('marginal-table').tBodies[0]; marginals.replaceChildren();
  d.marginals.forEach(m => {
    const row = tableRow(['#' + m.position, t.items[m.position - 1].label, m.count, probability(m.probability)]);
    row.cells[1].className = 'literal'; marginals.append(row);
  });
  byId('distribution-summary').textContent = d.histories + ' equally likely draw histories · ' +
    d.subsets.length + ' unordered positional subsets · ' +
    (d.uniformSubsets ? d.subsets[0].count + ' histories per subset.' : 'Subset counts differ.');
  byId('distribution-heading').textContent = 'After all ' + d.itemCount + ' arrivals: every possible history';
  renderStep();
}
function decimal(text, name) {
  if (!/^[1-9][0-9]*$/.test(text)) throw new TypeError(name + ' needs a positive decimal integer without leading zeroes.');
  const value = Number(text);
  if (!Number.isSafeInteger(value)) throw new TypeError(name + ' is outside the exact integer range.');
  return value;
}
for (const id of ['labels', 'capacity', 'draws']) byId(id).addEventListener('input', () =>
  retire('Draft changed. Apply the complete input to create a new trace.'));
byId('apply').addEventListener('click', () => {
  retire('');
  try {
    const raw = {labelsText: byId('labels').value, capacityText: byId('capacity').value, drawsText: byId('draws').value};
    const items = raw.labelsText.replace(/\r\n?/g, '\n').split('\n');
    const capacity = decimal(raw.capacityText, 'Capacity');
    const draws = raw.drawsText === '' ? [] : raw.drawsText.split(',').map((token, index) =>
      decimal(token.replace(/^[ \t]+|[ \t]+$/g, ''), 'Draw ' + (index + 1)));
    const trace = traceReservoir({items, capacity, draws});
    const distribution = distributionReservoir({itemCount: items.length, capacity});
    applied = Object.freeze({raw: Object.freeze(raw), trace, distribution}); selectedStep = 0;
    render();
    byId('status').textContent = 'Applied ' + items.length + ' literal records with capacity ' + capacity +
      '. This chosen history is deterministic; the tables separately assume independent uniform draws.';
  } catch (error) { retire(error.message); }
});
for (const id of stepButtons) byId(id).addEventListener('click', () => {
  if (!applied) return;
  selectedStep = id === 'first' ? 0 : id === 'last' ? applied.trace.steps.length - 1 :
    id === 'previous' ? Math.max(0, selectedStep - 1) : Math.min(applied.trace.steps.length - 1, selectedStep + 1);
  renderStep();
});
byId('download-observation').addEventListener('click', () => {
  if (!applied) return;
  const observation = {schema: 'recallweave-reservoir-observation/1', raw: applied.raw,
    selectedStep, trace: applied.trace, distribution: applied.distribution};
  save(JSON.stringify(observation, null, 2) + '\n', 'application/json;charset=utf-8', 'reservoir-observation.json');
});
byId('download-course').addEventListener('click', () => save(COURSE_TEXT, 'application/json;charset=utf-8', 'reservoir-sampling.json'));
byId('download-guide').addEventListener('click', () => save(GUIDE_TEXT, 'text/markdown;charset=utf-8', 'reservoir-sampling.md'));
controls();
