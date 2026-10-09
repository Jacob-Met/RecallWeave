import { BASIS_ORDER, MAX_GATES, simulateCircuit } from './quantum-states-core.mjs';

const modelLimits = 'Ideal two-qubit pure states; X/H/Z/S/CNOT only. No hardware, noise, random shots, collapse, speedup or learning-efficacy claim.';
const data = JSON.parse(document.querySelector('#original-files').textContent);
const decode = value => new TextDecoder('utf-8', {fatal: true}).decode(Uint8Array.from(atob(value), c => c.charCodeAt(0)));
const courseText = decode(data.course), guideText = decode(data.guide);
const states = new Map();
const gateName = op => op === null ? 'Initial' : op.gate === 'CNOT' ? 'CNOT q' + op.control + ' → q' + op.target : op.gate + ' on q' + op.target;
const number = n => Math.abs(n) < 0.0000005 ? '0.000000' : n.toFixed(6);
const complex = ([r, i]) => number(r) + (i < 0 ? ' − ' : ' + ') + number(Math.abs(i)) + 'i';
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function download(name, text, type) {
  const href = URL.createObjectURL(new Blob([text], {type}));
  const link = element('a'); link.href = href; link.download = name;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
function selected(letter) {
  const state = states.get(letter);
  return state.result.steps[state.selected];
}
function compare() {
  if (states.size !== 2 || !states.get('A').result || !states.get('B').result) return;
  const a = selected('A'), b = selected('B');
  const joint = Math.max(...a.probabilities.map((p, i) => Math.abs(p - b.probabilities[i])));
  const marginal = Math.max(...['q0', 'q1'].flatMap(q => a.marginals[q].map((p, i) => Math.abs(p - b.marginals[q][i]))));
  document.querySelector('#comparison-result').textContent =
    'Selected steps A:' + a.index + ' and B:' + b.index + '. ' +
    (marginal <= 1e-12 ? 'The individual-qubit marginals agree' : 'The individual-qubit marginals differ') + '; ' +
    (joint <= 1e-12 ? 'the joint probabilities agree.' : 'the joint probabilities differ.');
  document.querySelector('#comparison-detail').textContent =
    'Largest absolute difference: marginals ' + marginal.toExponential(2) + ', joint ' + joint.toExponential(2) +
    '. Agreement means within 10⁻¹² here; it does not establish equal state vectors or certify entanglement.';
}
function render(letter, selectFinal = false) {
  const s = states.get(letter), card = s.card;
  s.result = simulateCircuit(s.spec);
  if (selectFinal) s.selected = s.spec.gates.length;
  s.selected = Math.min(s.selected, s.spec.gates.length);
  const step = s.result.steps[s.selected];
  card.querySelector('.basis-select').value = s.spec.initial;
  const chooser = card.querySelector('.step-select');
  chooser.replaceChildren(...s.result.steps.map(row => {
    const option = element('option', row.index + ' · ' + gateName(row.gate));
    option.value = String(row.index); return option;
  }));
  chooser.value = String(s.selected);
  card.querySelector('.step-summary').textContent = 'Step ' + s.selected + ' of ' + s.spec.gates.length + ' · ' + gateName(step.gate);
  card.querySelector('.norm').textContent = 'Norm squared: ' + step.norm_squared.toPrecision(15);
  const body = card.querySelector('.amplitudes');
  body.replaceChildren(...BASIS_ORDER.map((label, index) => {
    const row = element('tr');
    const probability = element('td');
    const bar = element('span', undefined, 'bar'); bar.setAttribute('aria-hidden', 'true');
    bar.style.width = Math.max(0, Math.min(100, step.probabilities[index] * 100)) + '%';
    probability.append(element('span', number(step.probabilities[index]), 'probability-number'), bar);
    row.append(element('th', '|' + label + '⟩'), element('td', complex(step.amplitudes[index])), probability);
    return row;
  }));
  card.querySelector('.marginals').replaceChildren(...['q0', 'q1'].map(q => {
    const box = element('div', undefined, 'marginal');
    box.append(element('strong', q), element('span', 'P(0) ' + number(step.marginals[q][0])), element('span', 'P(1) ' + number(step.marginals[q][1])));
    return box;
  }));
  card.querySelector('.gate-list').replaceChildren(...s.spec.gates.map((op, i) => element('li', (i + 1) + '. ' + gateName(op))));
  card.querySelector('.empty-circuit').hidden = s.spec.gates.length !== 0;
  card.querySelector('.gate-count').textContent = s.spec.gates.length + ' / ' + MAX_GATES + ' gates';
  card.querySelector('.add-gate').disabled = s.spec.gates.length === MAX_GATES;
  card.querySelector('.undo-gate').disabled = s.spec.gates.length === 0;
  const trace = card.querySelector('.trace-body');
  trace.replaceChildren(...s.result.steps.map(row => {
    const tr = element('tr');
    if (row.index === s.selected) tr.className = 'selected-row';
    tr.append(element('th', String(row.index)), element('td', gateName(row.gate)));
    for (const pair of row.amplitudes) tr.append(element('td', complex(pair)));
    return tr;
  }));
  compare();
}
function makeCard(letter) {
  const card = document.querySelector('#circuit-template').content.firstElementChild.cloneNode(true);
  card.id = 'circuit-' + letter; card.querySelector('h2').textContent = 'Circuit ' + letter;
  for (const control of card.querySelectorAll('[data-control]')) {
    const id = letter + '-' + control.dataset.control;
    control.id = id; card.querySelector('[data-label="' + control.dataset.control + '"]').htmlFor = id;
  }
  const s = {card, spec: {initial: '00', gates: []}, result: null, selected: 0};
  states.set(letter, s); document.querySelector('#circuits').append(card);
  card.querySelector('.basis-select').addEventListener('change', e => {
    s.spec.initial = e.target.value; render(letter, true);
    card.querySelector('.editor-status').textContent = 'Applied the new basis to the retained gate sequence.';
  });
  card.querySelector('.gate-select').addEventListener('change', e => {
    card.querySelector('.control-field').hidden = e.target.value !== 'CNOT';
  });
  card.querySelector('.add-gate').addEventListener('click', () => {
    const gate = card.querySelector('.gate-select').value;
    const target = Number(card.querySelector('.target-select').value);
    const op = gate === 'CNOT' ? {gate, control: Number(card.querySelector('.control-select').value), target} : {gate, target};
    const next = {initial: s.spec.initial, gates: [...s.spec.gates, op]};
    try { simulateCircuit(next); s.spec = next; render(letter, true); card.querySelector('.editor-status').textContent = 'Added ' + gateName(op) + '.'; }
    catch (error) { card.querySelector('.editor-status').textContent = error.message; }
  });
  card.querySelector('.undo-gate').addEventListener('click', () => {
    s.spec.gates = s.spec.gates.slice(0, -1); render(letter, true);
    card.querySelector('.editor-status').textContent = 'Removed the last gate.';
  });
  card.querySelector('.clear-gates').addEventListener('click', () => {
    s.spec.gates = []; render(letter, true);
    card.querySelector('.editor-status').textContent = 'Cleared gates; retained the initial basis.';
  });
  card.querySelector('.step-select').addEventListener('change', e => { s.selected = Number(e.target.value); render(letter); });
}
const h = target => ({gate: 'H', target}), z = target => ({gate: 'Z', target}), x = target => ({gate: 'X', target});
const presets = {
  correlations: {title: 'Same marginals, different joint outcomes', note: 'A is the Bell state; B is the product state |++⟩. Predict the chance that the two labels agree.', A: [h(0), {gate: 'CNOT', control: 0, target: 1}], B: [h(0), h(1)]},
  phase: {title: 'Phase becomes visible', note: 'Select the step before the final H in each circuit. The intermediate probabilities agree; the final distributions differ.', A: [h(0), h(0)], B: [h(0), z(0), h(0)]},
  complex: {title: 'Complex phase', note: 'A has amplitudes 1/√2 and i/√2 on 00 and 01. The final H in B combines them into (1±i)/2.', A: [h(1), {gate: 'S', target: 1}], B: [h(1), {gate: 'S', target: 1}, h(1)]},
  global: {title: 'Global sign', note: 'The whole state differs by −1. Equal probabilities do not mean identical displayed amplitude vectors.', A: [], B: [x(0), z(0), x(0)]}
};
function preset(name) {
  const p = presets[name];
  document.querySelector('#experiment-title').textContent = p.title;
  document.querySelector('#experiment-note').textContent = p.note;
  for (const letter of ['A', 'B']) {
    const s = states.get(letter); s.spec = {initial: '00', gates: p[letter].map(op => ({...op}))};
    render(letter, true); s.card.querySelector('.editor-status').textContent = 'Applied preset; every step is retained.';
  }
}
makeCard('A'); makeCard('B'); preset('correlations');
for (const button of document.querySelectorAll('[data-preset]')) button.addEventListener('click', () => preset(button.dataset.preset));
document.querySelector('#download-course').addEventListener('click', () => download('quantum-states.json', courseText, 'application/json'));
document.querySelector('#download-guide').addEventListener('click', () => download('quantum-states.md', guideText, 'text/markdown;charset=utf-8'));
document.querySelector('#download-observation').addEventListener('click', () => {
  const observation = {
    schema: 'recallweave.quantum-observation/1', generated_at: new Date().toISOString(),
    basis_order: [...BASIS_ORDER], qubit_order: 'q0 leftmost, q1 rightmost', model_limits: modelLimits,
    selected_steps: {A: states.get('A').selected, B: states.get('B').selected},
    circuits: {A: states.get('A').result, B: states.get('B').result},
    display: {decimal_places: 6, comparison_absolute_tolerance: 1e-12, downloaded_values_rounded: false}
  };
  download('quantum-states-observation.json', JSON.stringify(observation, null, 2) + '\n', 'application/json');
});
document.documentElement.dataset.labReady = 'true';
