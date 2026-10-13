import { BLOOM_KEYS, makeBloomState, bloomBits, queryBloom, fixedBloomExperiment, previewBloomDeletion, randomTwoBitExperiment } from './bloom-filters.mjs';

const byId = id => document.getElementById(id);
let state = makeBloomState(['A', 'B']);
const queryPicker = byId('query-key');
const removalPicker = byId('remove-key');

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function renderBits(destination, mask, highlighted = []) {
  destination.replaceChildren();
  bloomBits(mask).forEach((bit, index) => {
    const cell = node('li', undefined, 'bit' + (bit ? ' set' : ''));
    cell.dataset.index = String(index);
    cell.dataset.bit = String(bit);
    if (highlighted.includes(index)) cell.classList.add('probe');
    cell.setAttribute('aria-label', 'Position ' + index + ': ' + bit +
      (highlighted.includes(index) ? ', queried position' : ''));
    cell.append(node('span', String(index), 'index'), node('strong', String(bit)));
    destination.append(cell);
  });
}

function renderQuery() {
  const result = queryBloom(state.mask, state.members, queryPicker.value);
  renderBits(byId('live-bits'), state.mask, result.probes.map(probe => probe.position));
  byId('probe-detail').textContent = result.key + ' checks ' + result.probes.map(
    probe => 'position ' + probe.position + ' = ' + probe.bit).join(' and ') + '.';
  byId('filter-answer').textContent = result.maybe ? 'Maybe present' : 'Definitely absent';
  byId('exact-answer').textContent = result.present ? 'Present in the exact set' : 'Absent from the exact set';
  const classification = byId('classification');
  classification.dataset.kind = result.classification;
  classification.className = 'verdict ' + result.classification;
  const message = result.present
    ? 'True positive. This key was inserted; both of its positions are set.'
    : result.maybe
      ? 'False positive. Shared bits pass the filter, but this key was never inserted. An exact lookup resolves it.'
      : 'True negative. At least one required bit is zero. With this complete, consistent insertion-only state, the key is absent.';
  classification.textContent = message;
}

function renderFixedExperiment() {
  const result = fixedBloomExperiment(state.mask);
  byId('fixed-count').textContent = result.accepted + ' / ' + result.total;
  byId('fixed-count').dataset.accepted = String(result.accepted);
  byId('fixed-formula').textContent = result.setBits + ' set bits out of 8 → (' +
    result.setBits + '/8)² = ' + result.accepted + '/64.';
  const body = byId('fixed-body');
  body.replaceChildren();
  for (let first = 0; first < 8; first++) {
    const row = node('tr');
    const header = node('th', String(first));
    header.scope = 'row';
    row.append(header);
    for (const pair of result.pairs.filter(pair => pair.first === first)) {
      const cell = node('td', pair.accepted ? '✓' : '·', pair.accepted ? 'accepted' : 'rejected');
      cell.dataset.first = String(pair.first);
      cell.dataset.second = String(pair.second);
      cell.dataset.accepted = String(pair.accepted);
      cell.setAttribute('aria-label', 'First position ' + pair.first + ', second position ' +
        pair.second + ': ' + (pair.accepted ? 'both set, accepted' : 'a zero, rejected'));
      row.append(cell);
    }
    body.append(row);
  }
}

function renderDeletion() {
  const empty = state.members.length === 0;
  removalPicker.disabled = empty;
  byId('deletion-empty').hidden = !empty;
  byId('deletion-preview').hidden = empty;
  if (empty) {
    byId('unsafe-bits').replaceChildren();
    byId('rebuilt-bits').replaceChildren();
    byId('deletion-detail').textContent = '';
    return;
  }
  const preview = previewBloomDeletion(state.members, removalPicker.value);
  renderBits(byId('unsafe-bits'), preview.unsafeMask);
  renderBits(byId('rebuilt-bits'), preview.rebuilt.mask);
  byId('remaining-members').textContent = preview.remaining.join(', ') || 'Empty';
  byId('deletion-detail').textContent = preview.missed.length
    ? 'Unsafe clear loses ' + preview.missed.join(', ') + ': remaining inserted ' +
      (preview.missed.length === 1 ? 'key now has' : 'keys now have') +
      ' a required zero and would be falsely reported absent. Rebuilding preserves every remaining member.'
    : 'No remaining key is missed in this particular example. Clearing shared positions is still unsafe in general; rebuilding from the remaining exact set preserves its members.';
  byId('deletion-detail').dataset.missed = preview.missed.join(',');
  byId('deletion-detail').classList.toggle('warning', preview.missed.length > 0);
}

function renderState() {
  byId('exact-members').textContent = state.members.join(', ') || 'Empty';
  byId('member-count').textContent = state.members.length + (state.members.length === 1 ? ' distinct key' : ' distinct keys');
  byId('bit-count').textContent = bloomBits(state.mask).filter(Boolean).length + ' set bits';
  for (const button of byId('insert-buttons').querySelectorAll('button')) {
    const present = state.members.includes(button.dataset.key);
    button.classList.toggle('inserted', present);
    button.setAttribute('aria-label', 'Insert ' + button.dataset.key + (present ? ' again; already present' : ''));
  }
  const previous = removalPicker.value;
  removalPicker.replaceChildren(...state.members.map(key => new Option(key, key)));
  if (state.members.includes(previous)) removalPicker.value = previous;
  renderQuery();
  renderFixedExperiment();
  renderDeletion();
}

for (const record of BLOOM_KEYS) {
  const button = node('button', undefined, 'key-button');
  button.type = 'button';
  button.dataset.key = record.key;
  button.append(node('strong', record.key), node('span', record.positions.join(', ')));
  button.addEventListener('click', () => {
    const already = state.members.includes(record.key);
    state = makeBloomState([...state.members, record.key]);
    renderState();
    byId('operation-status').textContent = already
      ? record.key + ' is already present. Inserting it again changes neither the bits nor the exact set.'
      : 'Inserted ' + record.key + '. Its positions are ' + record.positions.join(' and ') + '. Set bits stay set.';
  });
  byId('insert-buttons').append(button);
  queryPicker.append(new Option(record.key + ' → (' + record.positions.join(', ') + ')', record.key));
}
queryPicker.value = 'X';
queryPicker.addEventListener('change', renderQuery);
removalPicker.addEventListener('change', renderDeletion);
byId('reset').addEventListener('click', () => {
  state = makeBloomState([]);
  renderState();
  byId('operation-status').textContent = 'Reset to an empty exact set and eight zero bits.';
});
byId('load-example').addEventListener('click', () => {
  state = makeBloomState(['A', 'B']);
  queryPicker.value = 'X';
  removalPicker.value = 'A';
  renderState();
  byId('operation-status').textContent = 'Loaded A and B. X passes their shared bits even though X is absent.';
});

const randomExperiment = randomTwoBitExperiment();
for (const result of randomExperiment.rows) {
  const row = node('tr');
  const head = node('th', '(' + result.insertion.join(', ') + ')');
  head.scope = 'row';
  row.append(head, node('td', String(result.setBits)), node('td', result.accepted + ' / 4'));
  byId('random-body').append(row);
}
byId('random-count').textContent = randomExperiment.accepted + ' / ' + randomExperiment.total + ' = 5 / 8';
byId('download-course').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([COURSE_TEXT], {type: 'application/json;charset=utf-8'}));
  const link = node('a');
  link.href = url;
  link.download = 'bloom-filters.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
renderState();
document.documentElement.classList.add('ready');
