import { traceMinimumSpanningForest, parseForestInput } from './minimum-spanning-forest.mjs';

const get = id => document.getElementById(id);
const name = vertex => String.fromCharCode(65 + vertex);
const groupsText = groups => groups.map(group => '{' + group.map(name).join(', ') + '}').join(' · ');
const edgeText = edge => name(edge.from) + '–' + name(edge.to);
const examples = [
  ['Connected graph with two cycle rejections', '4', 'A B 4\nA C 1\nB C 2\nB D 5\nC D 3'],
  ['Equal weights: input order breaks the tie', '3', 'A C 1\nA B 1\nB C 1'],
  ['Negative weights still use the cycle rule', '4', 'A B -4\nB C -2\nA C 1\nC D 3\nA D 9'],
  ['Two groups and an isolated vertex', '6', 'A B 1\nB C 2\nA C 4\nD E -2'],
  ['One vertex, no edges', '1', '']
];
let active = null;
let frame = 0;
function node(tag, text, className) {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = text;
  if (className) item.className = className;
  return item;
}
function svg(tag, attrs = {}, text) {
  const item = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, String(value));
  if (text !== undefined) item.textContent = text;
  return item;
}
function retire(message) {
  active = null;
  frame = 0;
  get('trace-view').hidden = true;
  get('empty-view').hidden = false;
  get('empty-message').textContent = message;
  get('input-error').hidden = true;
  get('input-error').textContent = '';
  get('edges-input').removeAttribute('aria-invalid');
  for (const id of ['first-step', 'previous-step', 'next-step', 'last-step', 'download-trace']) get(id).disabled = true;
  get('step-announcement').textContent = message;
}
function state(id, next, accepted, rejected) {
  if (accepted.has(id)) return ['accepted', 'Accepted'];
  if (rejected.has(id)) return ['rejected', 'Cycle rejected'];
  if (id === next?.edgeId) return ['candidate', 'Next'];
  return ['undecided', 'Not decided'];
}
function draw(trace, snapshot, next, accepted, rejected) {
  const graph = get('graph');
  graph.replaceChildren(
    svg('title', { id: 'graph-title' }, 'Graph after ' + frame + ' of ' + trace.decisions + ' edge decisions'),
    svg('desc', { id: 'graph-description' }, 'Accepted components: ' + groupsText(snapshot.components) +
      '. Check-marked solid links are accepted. Cross-marked dashed links are cycle rejections. The next edge is outlined. The table gives every exact weight and state. Crossings between lines are not vertices.'));
  const points = Array.from({ length: trace.vertexCount }, (_, vertex) => {
    const angle = -Math.PI / 2 + vertex * 2 * Math.PI / trace.vertexCount;
    return trace.vertexCount === 1 ? { x: 210, y: 180 }
      : { x: 210 + 143 * Math.cos(angle), y: 180 + 143 * Math.sin(angle) };
  });
  const dense = trace.edges.length > 12;
  const labels = [], layer = svg('g', { 'aria-hidden': 'true' });
  for (const edge of trace.edges) {
    const a = points[edge.from], b = points[edge.to];
    const [kind] = state(edge.id, next, accepted, rejected);
    const coords = { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    if (kind === 'candidate') graph.append(svg('line', { ...coords, class: 'candidate-halo' }));
    graph.append(svg('line', { ...coords, class: 'graph-edge ' + kind }));
    if (dense) continue;
    const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy), candidates = [];
    for (const fraction of [.5, .35, .65, .23, .77]) {
      for (const shift of [14, -14, 34, -34, 54, -54]) {
        candidates.push({ x: a.x + dx * fraction - dy / length * shift, y: a.y + dy * fraction + dx / length * shift });
      }
    }
    const clear = p => p.x >= 44 && p.x <= 376 && p.y >= 18 && p.y <= 342
      && points.every(v => Math.abs(v.x - p.x) > 57 || Math.abs(v.y - p.y) > 34)
      && labels.every(v => Math.abs(v.x - p.x) > 83 || Math.abs(v.y - p.y) > 27);
    const point = candidates.find(clear) || candidates[0];
    labels.push(point);
    const label = (kind === 'accepted' ? '✓ ' : kind === 'rejected' ? '× ' : kind === 'candidate' ? '→ ' : '') +
      'E' + (edge.id + 1) + ' · ' + edge.weight;
    const group = svg('g', { class: 'edge-label ' + kind });
    group.append(svg('rect', { x: point.x - 40, y: point.y - 12, width: 80, height: 24, rx: 5 }),
      svg('text', { x: point.x, y: point.y + 5, 'text-anchor': 'middle' }, label));
    layer.append(group);
  }
  graph.append(layer);
  points.forEach((p, vertex) => {
    const group = svg('g', { class: 'graph-vertex', 'aria-hidden': 'true' });
    group.append(svg('circle', { cx: p.x, cy: p.y, r: 19 }),
      svg('text', { x: p.x, y: p.y + 6, 'text-anchor': 'middle' }, name(vertex)));
    graph.append(group);
  });
  get('dense-note').hidden = !dense;
}
function render() {
  const trace = active.trace, last = trace.steps[frame - 1], next = trace.steps[frame];
  const snapshot = last ? { components: last.afterComponents, accepted: last.acceptedEdgeIds, total: last.totalWeight }
    : { components: Array.from({ length: trace.vertexCount }, (_, vertex) => [vertex]), accepted: [], total: 0 };
  const accepted = new Set(snapshot.accepted);
  const rejected = new Set(trace.steps.slice(0, frame).filter(step => !step.accepted).map(step => step.edgeId));
  get('trace-view').hidden = false;
  get('empty-view').hidden = true;
  get('trace-heading').textContent = 'Your forest, after ' + frame + ' edge decisions';
  get('step-count').textContent = frame + ' / ' + trace.decisions;
  get('accepted-count').textContent = snapshot.accepted.length;
  get('component-count').textContent = snapshot.components.length;
  get('total-weight').textContent = snapshot.total;
  get('components').replaceChildren(...snapshot.components.map(group => node('li', '{' + group.map(name).join(', ') + '}', 'component')));
  get('last-decision').textContent = last
    ? (last.accepted ? 'Accept ' : 'Reject ') + 'E' + (last.edgeId + 1) + ' (' + edgeText(last) + ', weight ' + last.weight + '): ' +
      (last.accepted ? 'its endpoints were in different components. Components decrease from ' + last.beforeComponents.length + ' to ' + last.afterComponents.length + '.'
        : 'its endpoints were already connected, so it would create a cycle. The forest and total stay unchanged.')
    : 'None yet. Every vertex starts in its own component, including isolated vertices.';
  get('next-decision').textContent = next
    ? 'Next is E' + (next.edgeId + 1) + ' (' + edgeText(next) + ', weight ' + next.weight + '). Predict: does it join two components, or close a cycle?'
    : 'Every input edge has been decided. Previous and First revisit the exact earlier snapshots.';
  const complete = frame === trace.decisions;
  get('result').hidden = !complete;
  if (complete) {
    get('result-heading').textContent = trace.connected ? 'A connected minimum spanning tree' : 'A minimum spanning forest';
    get('result-summary').textContent = trace.forestEdgeIds.length + ' accepted edges · total weight ' + trace.totalWeight + ' · ' +
      trace.components.length + (trace.connected ? ' component.' : ' components.');
    get('result-explanation').textContent = trace.connected
      ? (trace.vertexCount === 1 ? 'A one-vertex graph is connected. Its empty tree needs zero edges and zero decisions.'
        : 'Every vertex is connected without a cycle. The chosen edges minimize their total weight.')
      : 'The input is disconnected. Each original connected component has its own minimum tree; isolated vertices remain visible. No missing connection is invented.';
  }
  get('edge-body').replaceChildren(...trace.orderedEdgeIds.map((id, index) => {
    const edge = trace.edges[id], [kind, label] = state(id, next, accepted, rejected);
    const row = node('tr', undefined, 'edge-row ' + kind);
    row.dataset.edge = String(id);
    if (kind === 'candidate') row.setAttribute('aria-current', 'step');
    for (const text of [index + 1, 'E' + (id + 1) + ' · ' + edgeText(edge), edge.weight, label]) row.append(node('td', String(text)));
    return row;
  }));
  get('edge-table').hidden = trace.edges.length === 0;
  get('no-edges').hidden = trace.edges.length !== 0;
  get('history-body').replaceChildren(...trace.steps.slice(0, frame).map(step => {
    const row = node('tr');
    for (const text of [step.number, 'E' + (step.edgeId + 1) + ' · ' + edgeText(step), step.weight,
      step.accepted ? 'Accept: join components' : 'Reject: cycle', groupsText(step.afterComponents), step.totalWeight]) row.append(node('td', String(text)));
    return row;
  }));
  get('history-table').hidden = frame === 0;
  get('no-history').hidden = frame !== 0;
  get('first-step').disabled = get('previous-step').disabled = frame === 0;
  get('next-step').disabled = get('last-step').disabled = complete;
  get('download-trace').disabled = false;
  draw(trace, snapshot, next, accepted, rejected);
  get('step-announcement').textContent = 'Decision ' + frame + ' of ' + trace.decisions + '. ' + get('last-decision').textContent +
    ' ' + snapshot.components.length + ' components; total weight ' + snapshot.total + '.' +
    (complete ? ' Complete. ' + get('result-heading').textContent + '.' : '');
}
get('search-form').addEventListener('submit', event => {
  event.preventDefault();
  const entered = { vertexCount: get('vertex-count').value, edges: get('edges-input').value };
  retire('Build a trace to inspect this graph.');
  try {
    const graph = parseForestInput(entered.vertexCount, entered.edges);
    active = { entered, trace: traceMinimumSpanningForest(graph.vertexCount, graph.edges) };
    render();
    get('trace-heading').focus();
  } catch (error) {
    retire('Correct the input, then build a new trace.');
    get('input-error').textContent = error.message;
    get('input-error').hidden = false;
    get('edges-input').setAttribute('aria-invalid', 'true');
    get('edges-input').focus();
  }
});
for (const id of ['vertex-count', 'edges-input']) get(id).addEventListener('input', () => retire('Inputs changed. Build a new trace to inspect these edges.'));
for (const [id, choose] of [['first-step', () => 0], ['previous-step', () => frame - 1], ['next-step', () => frame + 1], ['last-step', () => active.trace.steps.length]]) {
  get(id).addEventListener('click', () => {
    if (!active) return;
    frame = Math.max(0, Math.min(active.trace.steps.length, choose()));
    render();
  });
}
examples.forEach((example, index) => get('example').append(new Option(example[0], String(index))));
get('apply-example').addEventListener('click', () => {
  const selected = get('example').value;
  if (selected === '') { get('file-status').textContent = 'Choose an example, then select Use example.'; return; }
  const example = examples[Number(selected)];
  get('vertex-count').value = example[1];
  get('edges-input').value = example[2];
  retire('Example loaded. Build its trace when you are ready.');
  get('edges-input').focus();
});
function download(filename, text, type) {
  let url, link;
  try {
    url = URL.createObjectURL(new Blob([text], { type }));
    link = node('a');
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    get('file-status').textContent = 'Download requested: ' + filename + '.';
  } catch {
    get('file-status').textContent = 'The browser could not start the download. Your inputs and trace remain here.';
  } finally {
    link?.remove();
    if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
get('download-trace').addEventListener('click', () => {
  if (!active) return;
  download('minimum-spanning-forest-trace.json', JSON.stringify({
    format: 'recallweave.minimum-spanning-forest-export/1',
    entered: active.entered,
    selectedDecision: frame,
    trace: active.trace
  }, null, 2) + '\n', 'application/json;charset=utf-8');
});
get('download-course').addEventListener('click', () => download('minimum-spanning-forest.json', SOURCE_DECK, 'application/json;charset=utf-8'));
get('download-guide').addEventListener('click', () => download('minimum-spanning-forest.md', SOURCE_GUIDE, 'text/markdown;charset=utf-8'));
