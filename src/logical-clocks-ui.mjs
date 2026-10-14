import { CLOCK_GRAPH, createClockTrace, compareClockEvents, clockTotalOrder } from './logical-clocks.mjs';

/** Browser view for the fixed lesson. All state changes go through admitted event-ID prefixes. */
const uiById = id => document.getElementById(id);
const uiEventById = new Map(CLOCK_GRAPH.events.map(event => [event.id, event]));
const uiSvgNS = 'http://www.w3.org/2000/svg';
const uiPositions = {
  A1: [90, 75], A2: [230, 75], A3: [370, 75], A4: [930, 75],
  B1: [90, 195], B2: [370, 195], B3: [510, 195],
  C1: [90, 315], C2: [650, 315], C3: [790, 315],
};
let uiTrace = createClockTrace();
let uiCursor = 0;
let uiLeft = '';
let uiRight = '';

function uiElement(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function uiSvgElement(tag, attributes, text) {
  const node = document.createElementNS(uiSvgNS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}

function uiVector(values) {
  return '[' + values.join(', ') + ']';
}

function uiAction(event) {
  return event.kind === 'local' ? 'local' : event.kind + ' ' + event.message;
}

function uiAnnounce(text) {
  uiById('clock-status').textContent = text;
}

function uiError(error) {
  const box = uiById('clock-error');
  box.textContent = error instanceof Error ? error.message : 'The requested event could not be recorded.';
  box.hidden = false;
}

function uiClearError() {
  uiById('clock-error').hidden = true;
  uiById('clock-error').textContent = '';
}

function uiRow(values) {
  const row = uiElement('tr');
  values.forEach((value, index) => {
    const cell = uiElement(index === 0 ? 'th' : 'td', String(value));
    if (index === 0) cell.scope = 'row';
    row.append(cell);
  });
  return row;
}

function uiClockRow(label, clock, explanation) {
  return uiRow([label, clock === null ? '—' : clock.lamport,
    clock === null ? '—' : uiVector(clock.vector), explanation]);
}

function uiRenderProcesses(snapshot) {
  const atTip = uiCursor === uiTrace.order.length;
  for (const process of snapshot.processes) {
    uiById('lamport-' + process.id).textContent = String(process.lamport);
    uiById('vector-' + process.id).textContent = uiVector(process.vector);
    const button = uiById('step-' + process.id);
    const waiting = uiById('waiting-' + process.id);
    const next = process.nextEvent === null ? null : uiEventById.get(process.nextEvent);
    const enabled = next !== null && snapshot.enabled.includes(next.id);
    button.disabled = !atTip || !enabled;
    button.textContent = next === null ? 'Process complete' : 'Record ' + next.id + ' · ' + uiAction(next);
    if (!atTip) {
      waiting.textContent = 'Viewing history. Return to latest to record another event.';
    } else if (next === null) {
      waiting.textContent = 'All events in this process are recorded.';
    } else if (enabled) {
      waiting.textContent = next.kind === 'receive'
        ? 'Its message is in flight; this receive is enabled.'
        : 'This is the next event in its process.';
    } else {
      const message = CLOCK_GRAPH.messages.find(item => item.id === next.message);
      waiting.textContent = 'Waiting for ' + message.send + ' to send ' + message.id + '.';
    }
  }
}

function uiRenderNavigation(snapshot) {
  const tip = uiTrace.order.length;
  uiById('snapshot-count').textContent = 'Snapshot ' + uiCursor + ' of ' + tip;
  uiById('snapshot-label').textContent = snapshot.event === null ? 'Before any event' : 'After ' + snapshot.event;
  uiById('snapshot-mode').textContent = uiCursor === tip ? 'Latest snapshot' : 'Inspecting saved history';
  uiById('previous-step').disabled = uiCursor === 0;
  uiById('next-step').disabled = uiCursor === tip;
  uiById('return-latest').hidden = uiCursor === tip;
  uiById('return-latest').disabled = uiCursor === tip;
  const slider = uiById('snapshot-slider');
  slider.max = String(tip);
  slider.value = String(uiCursor);
  slider.disabled = tip === 0;
  slider.setAttribute('aria-valuetext', 'Snapshot ' + uiCursor + ' of ' + tip +
    (snapshot.event === null ? ', initial clocks' : ', after ' + snapshot.event));
  uiById('progress-fill').style.width = String(tip * 10) + '%';
  uiById('progress-label').textContent = tip + ' of 10 events recorded';
  uiById('history-note').textContent = uiCursor === tip
    ? (tip === 10 ? 'The presentation is complete. Compare events, inspect earlier snapshots, or reset to choose another legal order.'
      : 'Choose any enabled event. The other process clocks do not advance with your click.')
    : 'Later snapshots remain saved. Inspection does not undo events or change their timestamps.';
  const history = uiById('presentation-history');
  history.replaceChildren();
  [null, ...uiTrace.order].forEach((id, index) => {
    const item = uiElement('li');
    const button = uiElement('button', id === null ? '0 · start' : index + ' · ' + id);
    button.type = 'button';
    button.dataset.snapshot = String(index);
    button.setAttribute('aria-label', 'Inspect snapshot ' + index + (id === null ? ', before any event' : ', after ' + id));
    if (index === uiCursor) button.setAttribute('aria-current', 'step');
    if (index > uiCursor) button.classList.add('ahead');
    button.addEventListener('click', () => uiInspect(index, true));
    item.append(button);
    history.append(item);
  });
}

function uiRenderUpdate(snapshot) {
  const update = snapshot.update;
  uiById('update-empty').hidden = update !== null;
  uiById('update-detail').hidden = update === null;
  const rows = uiById('update-rows');
  rows.replaceChildren();
  if (update === null) {
    uiById('update-title').textContent = 'The first increment is yours';
    uiById('scalar-equation').textContent = '';
    uiById('vector-equation').textContent = '';
    return;
  }
  const event = update.event;
  uiById('update-title').textContent = event.id + ' · ' + uiAction(event);
  rows.append(uiClockRow('Before', update.before, 'Local state of process ' + event.process + ' before this event.'));
  rows.append(uiClockRow('Incoming', update.incoming,
    update.incoming === null ? 'No incoming message for a local or send event.'
      : update.incoming.id + ' retains the clocks recorded at ' + update.incoming.send + '.'));
  rows.append(uiClockRow('Merged', update.merged,
    update.incoming === null ? 'Keep the local clock; no receive merge.'
      : 'Take the scalar maximum and each vector component maximum.'));
  rows.append(uiClockRow('After', update.after,
    'Increment the scalar and component ' + event.process + ' once; record these event clocks.'));
  uiById('scalar-equation').textContent = update.incoming === null
    ? update.before.lamport + ' + 1 = ' + update.after.lamport
    : 'max(' + update.before.lamport + ', ' + update.incoming.lamport + ') + 1 = ' + update.after.lamport;
  uiById('vector-equation').textContent = (update.incoming === null
    ? 'Start with ' + uiVector(update.before.vector)
    : 'max(' + uiVector(update.before.vector) + ', ' + uiVector(update.incoming.vector) + ') = ' + uiVector(update.merged.vector)) +
    '; increment ' + event.process + ' → ' + uiVector(update.after.vector) + '.';
}

function uiRenderTables(snapshot) {
  const messageRows = uiById('message-rows');
  messageRows.replaceChildren();
  for (const message of snapshot.messages) {
    messageRows.append(uiRow([message.id, message.send + ' → ' + message.receive,
      message.status === 'in-flight' ? 'in flight' : message.status,
      message.lamport === null ? '—' : message.lamport,
      message.vector === null ? '—' : uiVector(message.vector)]));
  }
  const eventRows = uiById('event-rows');
  eventRows.replaceChildren();
  uiById('events-empty').hidden = snapshot.recorded.length > 0;
  for (const [index, event] of snapshot.recorded.entries()) {
    const row = uiRow([event.id, uiAction(event), event.lamport, uiVector(event.vector), index + 1]);
    if (event.id === snapshot.event) row.classList.add('current-row');
    eventRows.append(row);
  }
}

function uiFillSelect(select, ids, selected) {
  select.replaceChildren();
  if (ids.length === 0) {
    const option = uiElement('option', 'Record an event first');
    option.value = '';
    select.append(option);
  }
  for (const id of ids) {
    const option = uiElement('option', id);
    option.value = id;
    select.append(option);
  }
  select.disabled = ids.length === 0;
  select.value = selected;
}

function uiRenderComparison(snapshot, prefix) {
  const ids = snapshot.recorded.map(event => event.id);
  uiLeft = ids.includes(uiLeft) ? uiLeft : (ids[0] ?? '');
  uiRight = ids.includes(uiRight) ? uiRight : (ids[ids.length - 1] ?? '');
  uiFillSelect(uiById('compare-left'), ids, uiLeft);
  uiFillSelect(uiById('compare-right'), ids, uiRight);
  uiById('compare-empty').hidden = ids.length > 0;
  uiById('compare-detail').hidden = ids.length === 0;
  uiById('example-unequal').disabled = !ids.includes('A3') || !ids.includes('C3');
  uiById('example-tie').disabled = !ids.includes('A3') || !ids.includes('B2');
  const componentRows = uiById('component-rows');
  componentRows.replaceChildren();
  if (ids.length === 0) return null;
  const result = compareClockEvents(prefix, uiLeft, uiRight);
  const relation = uiById('relation-result');
  relation.className = 'relation ' + result.relation;
  if (result.relation === 'same') {
    relation.textContent = uiLeft + ' is the same event';
    uiById('path-result').textContent = 'An event is not strictly before itself. Equal clocks here describe one event, not a concurrent pair.';
  } else if (result.relation === 'concurrent') {
    relation.textContent = uiLeft + ' ∥ ' + uiRight + ' · concurrent';
    uiById('path-result').textContent = 'There is no directed path in either direction in this complete, fixed graph.';
  } else {
    const earlier = result.relation === 'before' ? uiLeft : uiRight;
    const later = result.relation === 'before' ? uiRight : uiLeft;
    relation.textContent = earlier + ' → ' + later + ' · happens before';
    uiById('path-result').textContent = 'One valid causal path: ' + result.path.join(' → ') + '. Every segment is a program-order or message edge.';
  }
  uiById('scalar-comparison').textContent = 'L(' + uiLeft + ') = ' + result.scalar.left + ' ' +
    result.scalar.comparison + ' ' + result.scalar.right + ' = L(' + uiRight + ').';
  uiById('scalar-meaning').textContent = result.relation === 'same'
    ? 'The same event has the same label.'
    : result.scalar.comparison === '='
      ? 'Distinct events with equal Lamport labels cannot be causally ordered in this model. A tie convention only chooses their display order.'
      : result.relation === 'concurrent'
        ? 'Unequal scalar labels do not establish causality. This pair has no causal path in either direction.'
        : 'The path establishes causality; the increasing Lamport labels are consistent with it. Scalar inequality alone would not establish the path.';
  uiById('vector-left-label').textContent = uiLeft;
  uiById('vector-right-label').textContent = uiRight;
  for (const component of result.vector.components) {
    componentRows.append(uiRow([component.process, component.left, component.comparison, component.right]));
  }
  uiById('vector-meaning').textContent =
    'V(' + uiLeft + ') ≤ V(' + uiRight + ') in every component: ' + (result.vector.leftLeqRight ? 'yes' : 'no') +
    '. Strictly before (also at least one smaller component): ' + (result.vector.leftStrictlyBefore ? 'yes' : 'no') +
    '. Reverse componentwise ≤: ' + (result.vector.rightLeqLeft ? 'yes' : 'no') +
    '; reverse strict order: ' + (result.vector.rightStrictlyBefore ? 'yes' : 'no') + '.';
  return result;
}

function uiRenderOrder(prefix, snapshot) {
  const tieOrder = uiById('tie-order').value;
  const ordered = clockTotalOrder(prefix, tieOrder);
  const other = clockTotalOrder(prefix, tieOrder === 'ABC' ? 'CBA' : 'ABC');
  const events = new Map(snapshot.recorded.map(event => [event.id, event]));
  const list = uiById('scalar-order');
  list.replaceChildren();
  for (const id of ordered) {
    list.append(uiElement('li', id + ' · L=' + events.get(id).lamport));
  }
  uiById('order-empty').hidden = ordered.length > 0;
  uiById('tie-effect').textContent = ordered.join(',') === other.join(',')
    ? 'The two conventions currently give the same list. Record A3 and B2 to expose their scalar tie.'
    : 'Switching the convention changes tied entries in this list. Timestamps, edges and causal relations stay the same.';
}

function uiRenderGraph(snapshot, comparison) {
  const host = uiById('clock-graph');
  const svg = uiSvgElement('svg', { viewBox: '0 0 1020 405', role: 'img', 'aria-labelledby': 'graph-svg-title graph-svg-description' });
  svg.append(uiSvgElement('title', { id: 'graph-svg-title' }, 'Fixed event graph at snapshot ' + uiCursor));
  svg.append(uiSvgElement('desc', { id: 'graph-svg-description' },
    'Three process lanes A, B and C. Solid arrows are program order; dashed arrows carry messages. ' +
    'Recorded events have clock labels. Highlighted blue edges show the selected causal witness. ' +
    'Exact edges, event clocks and comparison text appear in the adjacent tables.'));
  const defs = uiSvgElement('defs', {});
  for (const [id, fill] of [['graph-arrow', '#657b76'], ['graph-witness-arrow', '#1d568d']]) {
    const marker = uiSvgElement('marker', { id, markerWidth: 9, markerHeight: 9, refX: 8, refY: 4, orient: 'auto', markerUnits: 'userSpaceOnUse' });
    marker.append(uiSvgElement('path', { d: 'M0,0 L8,4 L0,8 Z', fill }));
    defs.append(marker);
  }
  svg.append(defs);
  for (const [process, y] of [['A', 75], ['B', 195], ['C', 315]]) {
    svg.append(uiSvgElement('rect', { x: 18, y: y - 40, width: 984, height: 95, rx: 12, class: 'process-lane' }));
    svg.append(uiSvgElement('text', { x: 30, y: y - 17, class: 'lane-label' }, process));
  }
  const witness = new Set();
  if (comparison !== null) {
    for (let index = 1; index < comparison.path.length; index += 1) {
      witness.add(comparison.path[index - 1] + ':' + comparison.path[index]);
    }
  }
  for (const edge of CLOCK_GRAPH.edges) {
    const [x1, y1] = uiPositions[edge.from];
    const [x2, y2] = uiPositions[edge.to];
    const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy);
    const isWitness = witness.has(edge.from + ':' + edge.to);
    const line = uiSvgElement('line', {
      x1: x1 + dx / length * 21, y1: y1 + dy / length * 21,
      x2: x2 - dx / length * 25, y2: y2 - dy / length * 25,
      class: 'graph-edge ' + edge.kind + (isWitness ? ' witness' : ''),
      'marker-end': 'url(#' + (isWitness ? 'graph-witness-arrow' : 'graph-arrow') + ')',
    });
    line.append(uiSvgElement('title', {}, edge.from + ' → ' + edge.to + ': ' +
      (edge.kind === 'message' ? edge.message : 'program order')));
    svg.append(line);
    if (edge.kind === 'message') {
      const label = uiSvgElement('text', { x: (x1 + x2) / 2 + 10, y: (y1 + y2) / 2 - 8, class: 'message-label' }, edge.message);
      svg.append(label);
    }
  }
  const records = new Map(snapshot.recorded.map(event => [event.id, event]));
  for (const event of CLOCK_GRAPH.events) {
    const [x, y] = uiPositions[event.id];
    const recorded = records.get(event.id);
    const state = recorded ? 'recorded' : snapshot.enabled.includes(event.id) ? 'enabled' : 'pending';
    const group = uiSvgElement('g', { class: 'graph-event ' + state + (snapshot.event === event.id ? ' inspected' : '') });
    group.append(uiSvgElement('title', {}, event.id + ', ' + uiAction(event) + ', ' + state +
      (recorded ? ', Lamport ' + recorded.lamport + ', vector ' + uiVector(recorded.vector) : '')));
    group.append(uiSvgElement('circle', { cx: x, cy: y, r: 20 }));
    group.append(uiSvgElement('text', { x, y: y + 5, 'text-anchor': 'middle', class: 'event-id' }, event.id));
    if (recorded) group.append(uiSvgElement('text', { x, y: y + 39, 'text-anchor': 'middle', class: 'event-clock' },
      'L' + recorded.lamport + ' · ' + uiVector(recorded.vector)));
    svg.append(group);
  }
  host.replaceChildren(svg);
}

function uiRender() {
  const snapshot = uiTrace.snapshots[uiCursor];
  const prefix = uiTrace.order.slice(0, uiCursor);
  uiRenderProcesses(snapshot);
  uiRenderNavigation(snapshot);
  uiRenderUpdate(snapshot);
  uiRenderTables(snapshot);
  const comparison = uiRenderComparison(snapshot, prefix);
  uiRenderOrder(prefix, snapshot);
  uiRenderGraph(snapshot, comparison);
}

function uiInspect(index, restoreHistoryFocus = false) {
  if (!Number.isInteger(index) || index < 0 || index > uiTrace.order.length) return;
  uiClearError();
  uiCursor = index;
  uiRender();
  if (restoreHistoryFocus) {
    uiById('presentation-history').querySelector('[data-snapshot="' + index + '"]').focus();
  }
  uiAnnounce('Inspecting snapshot ' + index + (uiTrace.snapshots[index].event === null
    ? ', before any event.' : ', after ' + uiTrace.snapshots[index].event + '.') +
    (index < uiTrace.order.length ? ' Later snapshots remain saved; return to latest to record an event.' : ' This is the latest saved snapshot.'));
}

for (const process of CLOCK_GRAPH.processes) {
  uiById('step-' + process).addEventListener('click', () => {
    if (uiCursor !== uiTrace.order.length) return;
    const snapshot = uiTrace.snapshots[uiCursor];
    const next = snapshot.processes.find(item => item.id === process).nextEvent;
    if (next === null || !snapshot.enabled.includes(next)) return;
    try {
      const nextTrace = createClockTrace([...uiTrace.order, next]);
      uiTrace = nextTrace;
      uiCursor = nextTrace.order.length;
      uiClearError();
      uiRender();
      uiAnnounce('Recorded ' + next + '. Snapshot ' + uiCursor + ' of 10; ' +
        (uiCursor === 10 ? 'presentation complete.' : 'choose another enabled event.'));
    } catch (error) {
      uiError(error);
    }
  });
}

uiById('previous-step').addEventListener('click', () => uiInspect(uiCursor - 1));
uiById('next-step').addEventListener('click', () => uiInspect(uiCursor + 1));
uiById('return-latest').addEventListener('click', () => uiInspect(uiTrace.order.length));
uiById('snapshot-slider').addEventListener('input', event => uiInspect(Number(event.target.value)));
uiById('reset-presentation').addEventListener('click', () => {
  uiTrace = createClockTrace();
  uiCursor = 0;
  uiLeft = '';
  uiRight = '';
  uiById('tie-order').value = 'ABC';
  uiClearError();
  uiRender();
  uiAnnounce('Presentation reset. All process clocks are zero and all three messages are unsent.');
});

for (const id of ['compare-left', 'compare-right']) {
  uiById(id).addEventListener('change', () => {
    uiLeft = uiById('compare-left').value;
    uiRight = uiById('compare-right').value;
    uiRender();
    uiAnnounce('Comparison updated: ' + uiLeft + ' and ' + uiRight + '.');
  });
}

uiById('tie-order').addEventListener('change', () => {
  const snapshot = uiTrace.snapshots[uiCursor];
  uiRenderOrder(uiTrace.order.slice(0, uiCursor), snapshot);
  uiAnnounce('Scalar tie convention changed. Event clocks and causal relations are unchanged.');
});

for (const [id, left, right] of [['example-unequal', 'A3', 'C3'], ['example-tie', 'A3', 'B2']]) {
  uiById(id).addEventListener('click', () => {
    const ids = uiTrace.snapshots[uiCursor].recorded.map(event => event.id);
    if (!ids.includes(left) || !ids.includes(right)) return;
    uiLeft = left;
    uiRight = right;
    uiRender();
    uiAnnounce('Comparing ' + left + ' and ' + right + '. Read the path, scalar and vector evidence below.');
  });
}

function uiDownload(text, filename, type, buttonId) {
  const button = uiById(buttonId);
  let url = null;
  let anchor = null;
  button.disabled = true;
  try {
    url = URL.createObjectURL(new Blob([text], { type }));
    anchor = uiElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    uiById('download-status').textContent = 'Download requested: ' + filename + '. The complete original text, including attribution and licensing, is preserved.';
  } catch {
    uiById('download-status').textContent = 'The download could not be started. Try again in a browser that supports file downloads.';
  } finally {
    if (anchor !== null) anchor.remove();
    if (url !== null) setTimeout(() => URL.revokeObjectURL(url), 1000);
    button.disabled = false;
  }
}

uiById('download-course').addEventListener('click', () =>
  uiDownload(embeddedCourse, 'logical-clocks.json', 'application/json;charset=utf-8', 'download-course'));
uiById('download-guide').addEventListener('click', () =>
  uiDownload(embeddedGuide, 'logical-clocks.md', 'text/markdown;charset=utf-8', 'download-guide'));

uiRender();
