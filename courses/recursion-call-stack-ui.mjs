import {ALGORITHMS, COUNTER_DEFINITIONS, callLabel, createTrace, parseInput, snapshotAt, traceDocument} from './recursion-call-stack-core.mjs';

const element = id => document.getElementById(id);
const make = (tag, text = '', className = '') => {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
};
const courseDownload = JSON.stringify(JSON.parse(element('course-data').textContent), null, 2) + '\n';
let inspectedTrace = null;
let selectedStep = 0;
const algorithmCode = {
  factorial: [
    ['entry', 'begin factorial(n)'],
    ['base', '  if n = 0, value ← 1'],
    ['branch', '  otherwise:'],
    ['child', '    child ← factorial(n − 1)'],
    ['combine', '    value ← n × child'],
    ['return', '  return value']
  ],
  fibonacci: [
    ['entry', 'begin F(n)'],
    ['base', '  if n ≤ 1, value ← n'],
    ['branch', '  otherwise:'],
    ['left', '    left ← F(n − 1)'],
    ['right', '    right ← F(n − 2)'],
    ['combine', '    value ← left + right'],
    ['return', '  return value']
  ],
  'memo-fibonacci': [
    ['setup', 'new run: cache ← empty'],
    ['entry', 'begin F(n)'],
    ['cache', '  if n is cached, return cache[n]'],
    ['base', '  if n ≤ 1, value ← n'],
    ['branch', '  otherwise:'],
    ['left', '    left ← F(n − 1)'],
    ['right', '    right ← F(n − 2)'],
    ['combine', '    value ← left + right'],
    ['store', '  save cache[n] ← value'],
    ['return', '  return value']
  ]
};
function renderCode(algorithm, event = null) {
  const code = element('algorithm-code');
  code.replaceChildren();
  for (const [line, text] of algorithmCode[algorithm]) {
    const active = event && (event.line === line || (event.cacheWrite && line === 'store'));
    const row = make('li', text, active ? 'code-line code-active' : 'code-line');
    if (active) row.setAttribute('aria-current', 'step');
    code.append(row);
  }
}
function renderComparison() {
  const show = inspectedTrace && inspectedTrace.algorithm !== 'factorial';
  element('comparison').hidden = !show;
  if (!show) return;
  const rows = element('comparison-rows');
  rows.replaceChildren();
  for (const algorithm of ['fibonacci', 'memo-fibonacci']) {
    const run = inspectedTrace.algorithm === algorithm ? inspectedTrace : createTrace(algorithm, inspectedTrace.input);
    const row = document.createElement('tr');
    const heading = make('th', ALGORITHMS[algorithm]);
    heading.scope = 'row';
    row.append(heading);
    for (const value of [run.finalCounters.calls, run.finalCounters.computedCalls, run.finalCounters.cacheHits, run.finalCounters.maxDepth, run.result]) {
      row.append(make('td', String(value)));
    }
    rows.append(row);
  }
  element('comparison-input').textContent = 'Both complete runs use n = ' + inspectedTrace.input + '. Each memoized run starts with an empty cache. These totals are separate from the selected-step counters above.';
}
function frameHeading(frame, active) {
  const heading = make('div', '', 'frame-heading');
  heading.append(make('strong', '#' + frame.id + ' · ' + callLabel(inspectedTrace.algorithm, frame.input)));
  heading.append(make('span', active ? 'top of stack' : 'suspended caller', active ? 'tag tag-active' : 'tag'));
  return heading;
}
function renderStack(state) {
  const stack = element('stack');
  stack.replaceChildren();
  element('stack-count').textContent = state.stack.length + (state.stack.length === 1 ? ' active frame' : ' active frames');
  if (!state.stack.length) {
    stack.append(make('li', state.complete ? 'Every call has returned. The stack is empty.' : 'No call has entered yet. Select Next to create the root frame.', 'empty'));
    return;
  }
  for (const frame of [...state.stack].reverse()) {
    const active = frame.id === state.stack.at(-1).id;
    const card = make('li', '', 'frame' + (active ? ' frame-active' : '') + (frame.status === 'cache-hit' ? ' frame-hit' : ''));
    card.append(frameHeading(frame, active));
    card.append(make('p', frame.pending, 'pending-expression'));
    const facts = [];
    if (frame.left !== null) facts.push((inspectedTrace.algorithm === 'factorial' ? 'child' : 'left') + ' = ' + frame.left);
    if (frame.right !== null) facts.push('right = ' + frame.right);
    if (frame.result !== null) facts.push('value = ' + frame.result);
    card.append(make('p', 'n = ' + frame.input + (facts.length ? ' · ' + facts.join(' · ') : '') + (frame.parentId === null ? ' · root' : ' · returns to #' + frame.parentId), 'frame-locals'));
    stack.append(card);
  }
}
function renderCache(state) {
  const cache = element('cache-values');
  cache.replaceChildren();
  if (inspectedTrace.algorithm !== 'memo-fibonacci') {
    cache.append(make('li', inspectedTrace.algorithm === 'factorial'
      ? 'Factorial follows one chain of calls. This trace does not use a cache.'
      : 'This algorithm recomputes repeated calls. It does not use a cache.', 'muted'));
  } else if (!state.cache.length) {
    cache.append(make('li', 'Empty. Completed values will be saved here, including base cases.', 'muted'));
  } else {
    for (const entry of state.cache) {
      const item = make('li', 'F(' + entry.input + ') = ' + entry.value, 'cache-entry');
      if (state.event.cacheWrite?.input === entry.input) item.classList.add('cache-new');
      cache.append(item);
    }
  }
}
function renderReturns(state) {
  const returns = element('returned-values');
  returns.replaceChildren();
  const returned = inspectedTrace.steps.slice(0, selectedStep + 1).filter(step => step.event.kind === 'return');
  element('return-count').textContent = returned.length + ' returned';
  if (!returned.length) {
    returns.append(make('li', 'No value has returned yet.', 'muted'));
    return;
  }
  for (const step of returned) {
    const button = make('button', '#' + step.event.frameId + ' ' + callLabel(inspectedTrace.algorithm, step.event.input) + ' → ' + step.event.value, 'return-chip');
    button.type = 'button';
    button.title = 'Inspect return event ' + step.index;
    button.addEventListener('click', () => inspect(step.index));
    const item = document.createElement('li');
    item.append(button);
    returns.append(item);
  }
}
function renderRecentEvents() {
  const recent = element('recent-events');
  recent.replaceChildren();
  const first = Math.max(0, selectedStep - 5);
  element('history-note').textContent = first === 0 ? 'Events through the selected step.' : 'Showing the latest six events through this step. Use Jump to event for the entire trace.';
  for (let i = first; i <= selectedStep; i++) {
    const step = inspectedTrace.steps[i];
    const row = make('li', '', i === selectedStep ? 'event-row event-current' : 'event-row');
    const button = make('button', i + ' · ' + step.event.text, 'event-button');
    button.type = 'button';
    if (i === selectedStep) button.setAttribute('aria-current', 'step');
    button.addEventListener('click', () => inspect(i));
    row.append(button);
    recent.append(row);
  }
}
function inspect(index) {
  if (!inspectedTrace) return;
  const state = snapshotAt(inspectedTrace, index);
  selectedStep = index;
  element('step-slider').value = String(index);
  element('event-jump').value = String(index);
  element('step-position').textContent = 'Step ' + index + ' of ' + (inspectedTrace.steps.length - 1);
  element('step-slider').setAttribute('aria-valuetext', 'Step ' + index + ': ' + state.event.text);
  element('event-kind').textContent = state.event.kind.replace('-', ' ');
  element('event-message').textContent = state.event.text;
  element('run-label').textContent = ALGORITHMS[inspectedTrace.algorithm] + ' · n = ' + inspectedTrace.input;
  element('trace-state').textContent = state.complete ? 'Complete' : index === 0 ? 'Before first call' : 'Paused';
  element('result').textContent = state.result ?? 'pending';
  element('result-note').textContent = state.complete ? 'The root returned this exact value.' : 'A result appears when the root call returns.';
  for (const key of Object.keys(COUNTER_DEFINITIONS)) element('count-' + key).textContent = String(state.counters[key]);
  element('previous').disabled = index === 0;
  element('to-start').disabled = index === 0;
  element('next').disabled = state.complete;
  element('to-end').disabled = state.complete;
  element('download-trace').disabled = false;
  element('download-status').textContent = '';
  renderCode(inspectedTrace.algorithm, state.event);
  renderStack(state);
  renderCache(state);
  renderReturns(state);
  renderRecentEvents();
}
function clearTrace(message) {
  inspectedTrace = null;
  selectedStep = 0;
  for (const id of ['previous', 'next', 'to-start', 'to-end', 'step-slider', 'event-jump', 'download-trace']) element(id).disabled = true;
  element('event-jump').replaceChildren();
  element('step-slider').value = '0';
  element('step-slider').max = '0';
  element('step-slider').removeAttribute('aria-valuetext');
  element('step-position').textContent = 'No active trace';
  element('event-kind').textContent = 'setup';
  element('event-message').textContent = message;
  element('run-label').textContent = 'Start a new trace';
  element('trace-state').textContent = 'No active trace';
  element('result').textContent = 'pending';
  element('result-note').textContent = 'Choose a valid setup, then select Run trace.';
  element('stack-count').textContent = '0 active frames';
  element('stack').replaceChildren(make('li', message, 'empty'));
  element('cache-values').replaceChildren(make('li', 'No active run or retained cache.', 'muted'));
  element('returned-values').replaceChildren();
  element('return-count').textContent = '0 returned';
  element('recent-events').replaceChildren();
  element('history-note').textContent = 'No events to inspect.';
  element('download-status').textContent = '';
  element('comparison').hidden = true;
  for (const key of Object.keys(COUNTER_DEFINITIONS)) element('count-' + key).textContent = '—';
  renderCode(element('algorithm').value);
}
function buildTrace() {
  let input;
  try {
    input = parseInput(element('input-n').value);
  } catch (error) {
    clearTrace('The previous trace is cleared. Fix the input, then select Run trace.');
    element('input-error').textContent = error.message;
    element('input-n').setAttribute('aria-invalid', 'true');
    return;
  }
  element('input-error').textContent = '';
  element('input-n').setAttribute('aria-invalid', 'false');
  inspectedTrace = createTrace(element('algorithm').value, input);
  selectedStep = 0;
  const events = element('event-jump');
  events.replaceChildren();
  for (const step of inspectedTrace.steps) {
    const option = make('option', step.index + ' · ' + step.event.text);
    option.value = String(step.index);
    events.append(option);
  }
  element('event-jump').disabled = false;
  element('step-slider').disabled = false;
  element('step-slider').min = '0';
  element('step-slider').max = String(inspectedTrace.steps.length - 1);
  inspect(0);
  renderComparison();
}
function requestDownload(filename, content) {
  const url = URL.createObjectURL(new Blob([content], {type: 'application/json;charset=utf-8'}));
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    try { link.click(); } finally { link.remove(); }
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
element('setup').addEventListener('submit', event => {
  event.preventDefault();
  buildTrace();
});
for (const id of ['algorithm', 'input-n']) {
  element(id).addEventListener('input', () => {
    element('input-error').textContent = '';
    element('input-n').setAttribute('aria-invalid', 'false');
    clearTrace('Setup changed. Select Run trace to begin with fresh frames and an empty cache.');
  });
}
element('previous').addEventListener('click', () => inspect(selectedStep - 1));
element('next').addEventListener('click', () => inspect(selectedStep + 1));
element('to-start').addEventListener('click', () => inspect(0));
element('to-end').addEventListener('click', () => inspectedTrace && inspect(inspectedTrace.steps.length - 1));
element('step-slider').addEventListener('input', event => inspect(Number(event.target.value)));
element('event-jump').addEventListener('change', event => inspect(Number(event.target.value)));
element('download-trace').addEventListener('click', () => {
  if (!inspectedTrace) return;
  try {
    requestDownload('recallweave-' + inspectedTrace.algorithm + '-' + inspectedTrace.input + '-step-' + selectedStep + '.json',
      JSON.stringify(traceDocument(inspectedTrace, selectedStep), null, 2) + '\n');
    element('download-status').textContent = 'Requested the full exact trace, including selected step ' + selectedStep + ' and its displayed state. Saving is handled by your browser.';
  } catch (error) {
    element('download-status').textContent = 'The trace download could not be requested. Your current trace is still available.';
  }
});
element('download-course').addEventListener('click', () => {
  try {
    requestDownload('recallweave-recursion-call-stack-course.json', courseDownload);
    element('download-status').textContent = 'Requested the original 12-question course. Open it with Bring your own lesson in RecallWeave, preview it, then select Start this deck.';
  } catch (error) {
    element('download-status').textContent = 'The course download could not be requested. Your current trace is still available.';
  }
});
buildTrace();
