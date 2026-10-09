import { computeDistanceTrace, serializeTrace, MAX_SEQUENCE_LENGTH } from './edit-distance.mjs';

const $ = id => document.getElementById(id);
const source = $('source'), target = $('target'), view = $('trace-view');
let trace = null, inspectedStep = 0;
const label = token => token === null ? '∅' : JSON.stringify(token);
const node = (tag, text, className) => {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  if (className) result.className = className;
  return result;
};
const presets = {
  classic: ['kitten', 'sitting'],
  empty: ['', 'cat'],
  ties: ['ab', 'ba'],
  unicode: ['café', 'cafe\u0301'],
  spaces: ['a b', 'ab'],
  emoji: ['🐈a', '🐈b']
};

function setControls() {
  const ready = trace !== null;
  $('first').disabled = !ready || inspectedStep === 0;
  $('previous').disabled = !ready || inspectedStep === 0;
  $('next').disabled = !ready || inspectedStep === trace.steps.length;
  $('finish').disabled = !ready || inspectedStep === trace.steps.length;
  $('step').disabled = !ready || trace.steps.length === 0;
  $('download-trace').disabled = !ready;
}
function retire() {
  trace = null;
  view.hidden = true;
  $('error').textContent = '';
  $('status').textContent = 'Inputs changed. Build a trace to use these values.';
  setControls();
}
function renderMatrix() {
  const table = node('table');
  const caption = node('caption', 'D[i, j]: minimum cost for source prefix i and target prefix j. Rows are source prefixes; columns are target prefixes.');
  table.append(caption);
  const head = node('thead'), header = node('tr');
  header.append(node('th', 'i \\ j'));
  [null, ...trace.targetTokens].forEach((token, j) => {
    const th = node('th', j + ': ' + label(token)); th.scope = 'col'; header.append(th);
  });
  head.append(header); table.append(head);
  const body = node('tbody');
  for (let i = 0; i < trace.matrix.length; i++) {
    const row = node('tr');
    const th = node('th', i + ': ' + label(i === 0 ? null : trace.sourceTokens[i - 1]));
    th.scope = 'row'; row.append(th);
    for (let j = 0; j < trace.matrix[i].length; j++) {
      const eventNumber = (i - 1) * trace.targetTokens.length + j;
      const known = i === 0 || j === 0 || eventNumber <= inspectedStep;
      const current = i > 0 && j > 0 && eventNumber === inspectedStep;
      const td = node('td', known ? String(trace.matrix[i][j]) : '·', current ? 'current' : (i === 0 || j === 0 ? 'boundary' : ''));
      td.dataset.cell = i + ',' + j;
      td.setAttribute('aria-label', 'D[' + i + ', ' + j + ']: ' + (known ? trace.matrix[i][j] : 'not computed yet'));
      if (current) td.setAttribute('aria-current', 'step');
      row.append(td);
    }
    body.append(row);
  }
  table.append(body); $('matrix').replaceChildren(table);
}
function render() {
  view.hidden = false;
  const done = inspectedStep === trace.steps.length;
  $('step').max = String(trace.steps.length); $('step').value = String(inspectedStep);
  $('step-count').textContent = 'Step ' + inspectedStep + ' of ' + trace.steps.length;
  $('distance').textContent = done ? String(trace.distance) : '…';
  $('distance-label').textContent = done ? 'Minimum edit cost' : 'Finish the trace to reveal the distance';
  $('status').textContent = done ? 'Trace complete. Minimum cost ' + trace.distance + '.' : 'Inspecting step ' + inspectedStep + ' of ' + trace.steps.length + '.';
  const candidates = $('candidates'); candidates.replaceChildren();
  if (inspectedStep === 0) {
    $('explanation').textContent = 'Start with D[i, 0] = i deletions and D[0, j] = j insertions. ' +
      (done ? 'One sequence is empty, so the boundary already gives the answer.' : 'Each interior cell compares three ways to extend a smaller prefix solution.');
  } else {
    const event = trace.steps[inspectedStep - 1];
    $('explanation').textContent = 'D[' + event.i + ', ' + event.j + '] compares ' +
      label(trace.sourceTokens[event.i - 1]) + ' with ' + label(trace.targetTokens[event.j - 1]) +
      '. The smallest candidate cost is ' + event.value + '.';
    for (const candidate of event.candidates) {
      candidates.append(node('li', candidate.operation + ': D[' + candidate.from.join(', ') + '] = ' + candidate.previous +
        ', plus ' + candidate.cost + ' → ' + candidate.total +
        (candidate.total === event.value ? ' (minimum)' : '')));
    }
  }
  renderMatrix();
  $('alignment-section').hidden = !done;
  const alignment = $('alignment-body'); alignment.replaceChildren();
  if (done) {
    for (const item of trace.alignment) {
      const row = node('tr');
      [label(item.sourceToken), label(item.targetToken), item.operation, String(item.cost)].forEach(text => row.append(node('td', text)));
      alignment.append(row);
    }
    if (!trace.alignment.length) {
      const row = node('tr'), cell = node('td', 'Both sequences are empty. No operations are needed.');
      cell.colSpan = 4; row.append(cell); alignment.append(row);
    }
  }
  setControls();
}
function build(event) {
  if (event) event.preventDefault();
  try {
    trace = computeDistanceTrace(source.value, target.value);
    inspectedStep = 0;
    $('error').textContent = '';
    render();
  } catch (error) {
    trace = null; view.hidden = true; setControls();
    $('error').textContent = error.message;
    $('status').textContent = 'Trace could not be built.';
  }
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = node('a'); link.href = url; link.download = name;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('inputs').addEventListener('submit', build);
[source, target].forEach(input => input.addEventListener('input', retire));
$('load-example').addEventListener('click', () => {
  [source.value, target.value] = presets[$('preset').value]; build();
});
for (const [id, move] of [['first', () => 0], ['previous', () => inspectedStep - 1], ['next', () => inspectedStep + 1], ['finish', () => trace.steps.length]]) {
  $(id).addEventListener('click', () => { inspectedStep = move(); render(); });
}
$('step').addEventListener('input', () => { inspectedStep = Number($('step').value); render(); });
$('download-trace').addEventListener('click', () => download('edit-distance-trace.json', serializeTrace(trace, inspectedStep), 'application/json'));
const resources = JSON.parse($('course-resources').textContent);
$('download-course').addEventListener('click', () => download('edit-distance.json', resources.course, 'application/json'));
$('download-guide').addEventListener('click', () => download('edit-distance.md', resources.guide, 'text/markdown;charset=utf-8'));
$('input-limit').textContent = String(MAX_SEQUENCE_LENGTH);
build();
