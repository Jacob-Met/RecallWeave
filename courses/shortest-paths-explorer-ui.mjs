/** Browser adapter for the self-contained explorer. The builder places this after
 * shortest-paths-core.mjs in one inline module; no import, fetch or storage is used.
 */
const byId = id => document.getElementById(id);
const course = JSON.parse(byId('course-data').textContent);
const courseDownload = JSON.stringify(course, null, 2) + '\n';
const svgNS = 'http://www.w3.org/2000/svg';
let preset = PRESETS[0];
let state = null;

function textElement(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}
function svgElement(tag, attributes = {}, text = null) {
  const node = document.createElementNS(svgNS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  if (text !== null) node.textContent = text;
  return node;
}
function choices(select, values, selected, placeholder = null) {
  select.replaceChildren();
  if (placeholder !== null) {
    const option = textElement('option', placeholder);
    option.value = '';
    select.append(option);
  }
  for (const value of values) {
    const option = textElement('option', value);
    option.value = value;
    select.append(option);
  }
  select.value = selected;
}
const costText = value => value === null ? '∞' : String(value);
const nodeStatus = (current, id) => {
  if (!current) return 'cleared';
  if (current.settled.includes(id)) return 'final';
  if (current.distances[id] !== null) return 'tentative';
  return current.done ? 'unreachable' : 'unreached';
};

function drawGraph() {
  const graph = byId('graph');
  graph.replaceChildren();
  const currentRoute = state ? routeTo(state, byId('target').value) : null;
  const routeEdges = new Set((currentRoute?.path ?? []).slice(1).map((id, index) => currentRoute.path[index] + ':' + id));
  graph.append(svgElement('title', {id: 'graph-title'}, 'Directed graph: ' + preset.graph.nodes.join(', ')));
  const description = state
    ? preset.graph.nodes.map(id => id + ': ' + costText(state.distances[id]) + ', ' + nodeStatus(state, id)).join('; ')
    : 'Run cleared. Fix the edge weights to compute new distances.';
  graph.append(svgElement('desc', {id: 'graph-desc'}, description + '. Every edge points in its arrow direction. The distance table gives the same state in text.'));
  const defs = svgElement('defs');
  for (const [id, fill] of [['arrow', '#758b8f'], ['route-arrow', '#116958']]) {
    const marker = svgElement('marker', {id, viewBox: '0 0 12 12', refX: 10, refY: 6, markerWidth: 14, markerHeight: 14, markerUnits: 'userSpaceOnUse', orient: 'auto'});
    marker.append(svgElement('path', {d: 'M 1 1 L 11 6 L 1 11 Z', fill}));
    defs.append(marker);
  }
  graph.append(defs);
  const edgeLayer = svgElement('g'), weightLayer = svgElement('g'), vertexLayer = svgElement('g');
  preset.graph.edges.forEach((edge, index) => {
    const [x1, y1] = preset.positions[edge.from], [x2, y2] = preset.positions[edge.to];
    const length = Math.hypot(x2 - x1, y2 - y1), dx = (x2 - x1) / length, dy = (y2 - y1) / length;
    const isRoute = routeEdges.has(edge.from + ':' + edge.to);
    edgeLayer.append(svgElement('line', {
      x1: x1 + dx * 32, y1: y1 + dy * 32, x2: x2 - dx * 37, y2: y2 - dy * 37,
      class: 'edge' + (isRoute ? ' route' : ''), 'marker-end': 'url(#' + (isRoute ? 'route-arrow' : 'arrow') + ')'
    }));
    const input = byId('weight-' + index), raw = input?.value.trim() ?? String(edge.weight);
    const label = input?.getAttribute('aria-invalid') === 'true' ? '?' : String(Number(raw));
    const x = (x1 + x2) / 2, y = (y1 + y2) / 2;
    weightLayer.append(svgElement('rect', {x: x - 22, y: y - 19, width: 44, height: 38, class: 'edge-weight-box'}));
    weightLayer.append(svgElement('text', {x, y, class: 'edge-weight'}, label));
  });
  for (const id of preset.graph.nodes) {
    const [x, y] = preset.positions[id], status = nodeStatus(state, id);
    const group = svgElement('g', {
      class: 'vertex' + (status === 'final' ? ' settled' : status === 'tentative' ? ' frontier' : '') +
        (state?.settled.at(-1) === id ? ' last' : ''),
      'data-vertex': id, 'data-status': status
    });
    group.append(svgElement('circle', {cx: x, cy: y, r: 28}));
    group.append(svgElement('text', {x, y: y + 1, class: 'vertex-name'}, id));
    // Keep a cost label off an edge shaft that extends vertically below the vertex.
    const edgeBelow = preset.graph.edges.some(edge => {
      const other = edge.from === id ? edge.to : edge.to === id ? edge.from : null;
      return other !== null && preset.positions[other][0] === x && preset.positions[other][1] > y;
    });
    group.append(svgElement('text', {x, y: edgeBelow ? y - 43 : y + 53, class: 'vertex-distance'}, state ? costText(state.distances[id]) : '—'));
    vertexLayer.append(group);
  }
  graph.append(edgeLayer, weightLayer, vertexLayer);
}
function renderTable() {
  const body = byId('distances');
  body.replaceChildren();
  for (const id of preset.graph.nodes) {
    const row = document.createElement('tr');
    const status = nodeStatus(state, id);
    row.dataset.vertex = id;
    row.dataset.status = status;
    const values = [id, state ? costText(state.distances[id]) : '—', state?.previous[id] ?? '—', status];
    for (const value of values) row.append(textElement('td', value));
    body.append(row);
  }
}
function renderRoute() {
  const box = byId('route-summary'), heading = byId('route-heading'), detail = byId('route-detail');
  if (!state) {
    box.dataset.status = 'invalid';
    heading.textContent = 'Run cleared';
    detail.textContent = 'Fix the edge weights. The old route and decisions no longer describe this graph.';
    return;
  }
  const target = byId('target').value, route = routeTo(state, target);
  box.dataset.status = route.status;
  if (route.status === 'unreached') {
    heading.textContent = target + ': no route discovered yet';
    detail.textContent = 'Continue settling the frontier. This is not yet a claim that the target is unreachable.';
  } else if (route.status === 'unreachable') {
    heading.textContent = target + ': unreachable from ' + state.source;
    detail.textContent = 'The discovered frontier is empty. No directed path from this source reaches the target.';
  } else {
    heading.textContent = target + ': ' + route.status + ' distance ' + route.distance;
    detail.textContent = route.path.join(' → ') + (route.status === 'tentative'
      ? ' · A later relaxation may still lower this cost.'
      : ' · The target has been settled; this distance is final.');
  }
}
function describeUpdate(update) {
  const route = update.from + ' → ' + update.to;
  const calculation = costText(state.distances[update.from]) + ' + ' + update.weight + ' = ' + update.candidate;
  const intro = route + ': ' + calculation + '. ';
  if (update.reason === 'first-route') return intro + 'First route found; recorded distance ' + update.newDistance + ' via ' + update.from + '.';
  if (update.reason === 'shorter-route') return intro + 'Improved ' + update.oldDistance + ' to ' + update.newDistance + '; predecessor is now ' + update.from + '.';
  if (update.reason === 'equal-keeps-first') return intro + 'Equal to ' + update.oldDistance + '; kept the existing predecessor.';
  if (update.reason === 'already-settled') return intro + 'Already settled; kept its final distance ' + update.newDistance + '.';
  return intro + 'Not below ' + update.oldDistance + '; kept the current distance and predecessor.';
}
function renderDecisions() {
  const updates = byId('step-updates'), history = byId('history');
  updates.replaceChildren();
  history.replaceChildren();
  const steps = state?.history ?? [], latest = steps.at(-1);
  byId('step-count').textContent = steps.length + ' settled';
  byId('settled-order').textContent = 'Settled order: ' + (state?.settled.length ? state.settled.join(' → ') : 'none yet');
  byId('step-title').textContent = !state ? 'Waiting for valid weights.' : latest
    ? 'Step ' + latest.number + ': settled ' + latest.vertex + ' at distance ' + latest.finalDistance
    : 'Start with source ' + state.source + ' at 0. No edge has been relaxed yet.';
  if (latest) {
    if (latest.updates.length) for (const update of latest.updates) updates.append(textElement('li', describeUpdate(update)));
    else updates.append(textElement('li', 'This vertex has no outgoing edges to relax.'));
  }
  for (const step of steps.slice(0, -1)) {
    history.append(textElement('li', 'Step ' + step.number + ': settled ' + step.vertex + ' at ' + step.finalDistance +
      '; ' + step.updates.filter(update => update.changed).length + ' distance update(s).'));
  }
  byId('history-heading').textContent = 'Earlier decisions (' + Math.max(0, steps.length - 1) + ')';
}
function render(message) {
  drawGraph();
  renderTable();
  renderRoute();
  renderDecisions();
  const canStep = Boolean(state && !state.done);
  byId('step').disabled = !canStep;
  byId('finish').disabled = !canStep;
  byId('prediction').disabled = !canStep;
  byId('check-prediction').disabled = !canStep;
  byId('download-run').disabled = !state;
  byId('run-status').textContent = message;
}
function resetFromInputs(reason) {
  byId('prediction').value = '';
  byId('prediction-feedback').textContent = '';
  byId('download-status').textContent = '';
  const edges = [];
  let invalid = null;
  for (let index = 0; index < preset.graph.edges.length; index++) {
    const edge = preset.graph.edges[index], input = byId('weight-' + index), raw = input.value.trim();
    const weight = raw === '' ? NaN : Number(raw);
    const okay = raw !== '' && Number.isInteger(weight) && weight >= 0 && weight <= 50;
    input.setAttribute('aria-invalid', String(!okay));
    if (!okay && !invalid) invalid = edge.from + ' → ' + edge.to;
    edges.push({...edge, weight});
  }
  const original = !invalid && byId('source').value === preset.source && byId('target').value === preset.target &&
    edges.every((edge, index) => edge.weight === preset.graph.edges[index].weight);
  byId('setup-kind').textContent = original ? 'Original example.' : 'Edited setup.';
  byId('setup-description').textContent = original ? preset.description
    : 'The trace uses your current source, target and weights. The downloadable course keeps its fixed examples.';
  const error = byId('weight-error');
  error.hidden = !invalid;
  error.textContent = invalid ? 'Enter a whole-number weight from 0 to 50 for ' + invalid + '. The previous run has been cleared.' : '';
  if (invalid) {
    state = null;
    render('Run cleared. Fix the indicated weight before starting again.');
  } else {
    state = startRun({nodes: preset.graph.nodes, edges}, byId('source').value);
    render(reason + ' Source ' + state.source + ' starts at 0; no vertices have been settled.');
  }
}
function choosePreset(id) {
  preset = PRESETS.find(value => value.id === id);
  choices(byId('source'), preset.graph.nodes, preset.source);
  choices(byId('target'), preset.graph.nodes, preset.target);
  choices(byId('prediction'), preset.graph.nodes, '', 'Choose…');
  const weights = byId('weights');
  weights.replaceChildren();
  preset.graph.edges.forEach((edge, index) => {
    const label = textElement('label', '', 'weight-field');
    label.append(textElement('span', edge.from + ' → ' + edge.to));
    const input = document.createElement('input');
    input.type = 'number';
    input.id = 'weight-' + index;
    input.min = '0';
    input.max = '50';
    input.step = '1';
    input.inputMode = 'numeric';
    input.value = String(edge.weight);
    input.setAttribute('aria-label', 'Weight ' + edge.from + ' to ' + edge.to);
    input.setAttribute('aria-describedby', 'weight-error');
    label.append(input);
    weights.append(label);
  });
  resetFromInputs('New example.');
}
function stepRun(finish = false) {
  if (!state || state.done) return;
  byId('prediction').value = '';
  byId('prediction-feedback').textContent = '';
  byId('download-status').textContent = '';
  do { state = advanceRun(state); } while (finish && !state.done);
  const last = state.history.at(-1);
  render(state.done
    ? 'Complete. Settled ' + state.settled.length + ' reachable vertices; the discovered frontier is empty.'
    : 'Settled ' + last.vertex + ' at ' + last.finalDistance + '. Relaxed its outgoing edges; unsettled discovered distances remain tentative.');
}
function requestDownload(filename, text) {
  const url = URL.createObjectURL(new Blob([text], {type: 'application/json;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
for (const example of PRESETS) {
  const option = textElement('option', example.title);
  option.value = example.id;
  byId('preset').append(option);
}
byId('preset').addEventListener('change', event => choosePreset(event.target.value));
byId('source').addEventListener('change', () => resetFromInputs('Source changed. New run.'));
byId('target').addEventListener('change', () => resetFromInputs('Target changed. New run.'));
byId('weights').addEventListener('input', () => resetFromInputs('Weights changed. New run.'));
byId('reset').addEventListener('click', () => resetFromInputs('Run reset with the displayed weights.'));
byId('step').addEventListener('click', () => stepRun());
byId('finish').addEventListener('click', () => stepRun(true));
byId('check-prediction').addEventListener('click', () => {
  if (!state || state.done) return;
  const selected = byId('prediction').value, next = nextVertex(state);
  byId('prediction-feedback').textContent = !selected ? 'Choose a vertex first.'
    : selected === next
      ? 'Yes. ' + next + ' has the minimum frontier distance ' + state.distances[next] + '. Equal distances are resolved alphabetically.'
      : 'The next vertex is ' + next + ' at ' + state.distances[next] + '. Compare total source distances, then use alphabetical order for a tie.';
});
byId('download-course').addEventListener('click', () => {
  requestDownload('recallweave-shortest-paths-course.json', courseDownload);
  byId('download-status').textContent = 'Requested the 12-question course through your browser’s download flow.';
});
byId('download-run').addEventListener('click', () => {
  if (!state) return;
  const target = byId('target').value, trace = traceDocument(state, target);
  requestDownload('recallweave-shortest-paths-' + state.source + '-to-' + target + '-step-' + state.history.length + '.json',
    JSON.stringify(trace, null, 2) + '\n');
  byId('download-status').textContent = 'Requested the run for ' + state.source + ' → ' + target + ', after ' + state.history.length +
    ' settled vertices. Its recorded target status is ' + trace.route.status + '.';
});
choosePreset(preset.id);
