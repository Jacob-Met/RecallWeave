import { MACHINE_FORMAT, PRESETS, analyze } from './nondeterministic-automata.mjs';

function standaloneHTML(bundle) {
  const safe = value => JSON.stringify(value).replace(/</g, '\\u003c');
  const program = bundle.model.replace(/^export /gm, '') + '\n'
    + bundle.ui.replace(/^import \{ MACHINE_FORMAT, PRESETS, analyze \} from '\.\/nondeterministic-automata\.mjs';\r?\n/, '');
  const parts = {
    LESSON: safe(bundle.courseText), GUIDE: safe(bundle.guideText), BUNDLE: safe(bundle),
    PROGRAM: program.replace(/<\/script/gi, '<\\/script')
  };
  return bundle.template.replace(/@@(LESSON|GUIDE|BUNDLE|PROGRAM)@@/g, (_, name) => parts[name]);
}

const byId = id => document.getElementById(id);
const lessonText = JSON.parse(byId('lesson-data').textContent);
const guideText = JSON.parse(byId('guide-data').textContent);
const sourceBundle = JSON.parse(byId('source-bundle').textContent);
let currentCount = 0;
let currentResult = null;
function say(text, error = false) {
  byId('status').textContent = text;
  byId('status').classList.toggle('error', error);
}
function invalidate() {
  currentResult = null;
  byId('download-result').disabled = true;
  byId('result').hidden = true;
  byId('trace-body').replaceChildren();
  byId('subset-body').replaceChildren();
  say('Edited. Analyze again to inspect or download these inputs.');
}
function cell(row, text, header = false) {
  const node = document.createElement(header ? 'th' : 'td');
  node.textContent = text;
  if (header) node.scope = 'row';
  row.append(node);
  return node;
}
function setText(members) {
  return members.length ? '{' + members.map(index => 'q' + index).join(', ') + '}' : '∅';
}
function replaceTable(machine, word) {
  currentCount = machine.states;
  byId('current-count').textContent = String(currentCount);
  byId('state-count').value = String(currentCount);
  const start = byId('start-state');
  start.replaceChildren();
  const table = byId('machine-body');
  table.replaceChildren();
  machine.transitions.forEach((transition, index) => {
    const option = document.createElement('option');
    option.value = String(index); option.textContent = 'q' + index; start.append(option);
    const row = document.createElement('tr');
    cell(row, 'q' + index, true);
    const accepting = document.createElement('input');
    accepting.type = 'checkbox'; accepting.id = 'accept-' + index;
    accepting.checked = machine.accepting.includes(index);
    accepting.setAttribute('aria-label', 'q' + index + ' is accepting');
    accepting.addEventListener('change', invalidate);
    cell(row, '').append(accepting);
    for (const [field, label] of [['zero', '0'], ['one', '1'], ['epsilon', 'epsilon']]) {
      const input = document.createElement('input');
      input.type = 'text'; input.id = field + '-' + index; input.value = transition[field].join(',');
      input.autocomplete = 'off'; input.spellcheck = false;
      input.setAttribute('aria-label', 'Destinations from q' + index + ' on ' + label);
      input.addEventListener('input', invalidate);
      cell(row, '').append(input);
    }
    table.append(row);
  });
  start.value = String(machine.start);
  byId('word').value = word;
  invalidate();
  say('Table loaded. Inspect or edit it, then choose Analyze.');
}
function parseDestinations(text, label) {
  const value = text.trim();
  if (value === '') return [];
  if (!/^[0-9]+(?:\s*,\s*[0-9]+)*$/.test(value)) {
    throw new Error(label + ': use comma-separated state indices, or leave blank for no destinations.');
  }
  return value.split(',').map(part => Number(part.trim()));
}
function readMachine() {
  return {
    format: MACHINE_FORMAT, states: currentCount, start: Number(byId('start-state').value),
    accepting: Array.from({ length: currentCount }, (_, i) => i).filter(i => byId('accept-' + i).checked),
    transitions: Array.from({ length: currentCount }, (_, i) => ({
      zero: parseDestinations(byId('zero-' + i).value, 'q' + i + ' on 0'),
      one: parseDestinations(byId('one-' + i).value, 'q' + i + ' on 1'),
      epsilon: parseDestinations(byId('epsilon-' + i).value, 'q' + i + ' on epsilon')
    }))
  };
}
function showResult(result) {
  byId('decision').textContent = result.accepted ? 'Accepted' : 'Rejected';
  byId('decision-detail').textContent = 'After all ' + result.word.length
    + ' symbols: ' + setText(result.nfa.steps.at(-1).active)
    + (result.accepted ? ' contains an accepting state.' : ' contains no accepting state.');
  byId('subset-count').textContent = result.dfa.states.length + ' reachable subsets (at most '
    + 2 ** result.machine.states + ' possible subsets); complete for every finite binary word.';
  result.nfa.steps.forEach(step => {
    const row = document.createElement('tr');
    cell(row, String(step.index), true);
    cell(row, step.prefix || 'ε');
    cell(row, step.symbol === null ? 'Start seed' : 'Read ' + step.symbol);
    cell(row, setText(step.moved));
    cell(row, setText(step.active));
    cell(row, result.dfaPath[step.index]);
    cell(row, step.accepting ? 'Accepting' : 'Not accepting');
    byId('trace-body').append(row);
  });
  const visited = new Set(result.dfaPath);
  result.dfa.states.forEach(state => {
    const row = document.createElement('tr');
    if (visited.has(state.id)) row.classList.add('visited');
    cell(row, state.id + (state.id === result.dfa.start ? ' — start' : ''), true);
    cell(row, setText(state.members));
    cell(row, state.accepting ? 'Yes' : 'No');
    cell(row, state.zero); cell(row, state.one);
    cell(row, state.witness || 'ε');
    cell(row, visited.has(state.id) ? 'In this trace' : 'Other reachable state');
    byId('subset-body').append(row);
  });
  byId('result').hidden = false;
  byId('download-result').disabled = false;
  say('Analysis complete. The exact input, trace and reachable subset table are ready to download.');
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
PRESETS.forEach(preset => {
  const option = document.createElement('option');
  option.value = preset.id; option.textContent = preset.title;
  byId('preset').append(option);
});
byId('load-preset').addEventListener('click', () => {
  const preset = PRESETS.find(value => value.id === byId('preset').value);
  replaceTable(preset.machine, preset.word);
});
byId('replace-blank').addEventListener('click', () => {
  const states = Number(byId('state-count').value);
  replaceTable({
    format: MACHINE_FORMAT, states, start: 0, accepting: [],
    transitions: Array.from({ length: states }, () => ({ zero: [], one: [], epsilon: [] }))
  }, '');
});
byId('start-state').addEventListener('change', invalidate);
byId('word').addEventListener('input', invalidate);
byId('analyze').addEventListener('click', () => {
  invalidate();
  try {
    currentResult = analyze(readMachine(), byId('word').value);
    showResult(currentResult);
  } catch (error) {
    currentResult = null;
    say(error.message, true);
  }
});
byId('download-result').addEventListener('click', () => {
  if (currentResult) download('nondeterministic-automata-analysis.json',
    JSON.stringify(currentResult, null, 2) + '\n', 'application/json');
});
byId('download-course').addEventListener('click', () => download(
  'nondeterministic-automata.json', lessonText, 'application/json'));
byId('download-guide').addEventListener('click', () => download(
  'nondeterministic-automata.md', guideText, 'text/markdown'));
byId('download-html').addEventListener('click', () => download(
  'nondeterministic-automata-explorer.html', standaloneHTML(sourceBundle), 'text/html'));
replaceTable(PRESETS[0].machine, PRESETS[0].word);
