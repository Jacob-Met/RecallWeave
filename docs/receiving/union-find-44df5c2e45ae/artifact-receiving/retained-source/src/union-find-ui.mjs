import { UNION_FIND_PRESETS, parseUnionFindInput, traceUnionFind } from './union-find.mjs';

const byId = id => document.getElementById(id);
const label = node => String.fromCharCode(65 + node);
const commandName = op => op.type === 'union' ? 'join ' + label(op.a) + ' ' + label(op.b) : 'find ' + label(op.a);
const palette = ['#17675f', '#8051a5', '#a55b23', '#24648f', '#8d3f61', '#586c25', '#53626e', '#734e32'];
let trace = null;
let alternate = null;
let step = 0;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function svgElement(tag, attributes, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}
function download(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], {type}));
  const anchor = element('a');
  anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function invalidate() {
  trace = null; alternate = null;
  byId('result-area').hidden = true;
  byId('download-trace').disabled = true;
  byId('input-error').textContent = '';
  byId('input-status').textContent = 'Inputs changed. Apply the commands to create a new trace.';
}
function loadPreset(preset) {
  byId('element-count').value = String(preset.count);
  byId('commands').value = preset.text;
  invalidate();
}
function drawGraphs(snapshot) {
  const graph = byId('connections-graph');
  const forest = byId('parent-graph');
  graph.replaceChildren(); forest.replaceChildren();
  const rootOf = node => snapshot.groups.find(group => group.members.includes(node)).root;
  const color = node => palette[rootOf(node)];
  const points = Array.from({length: trace.count}, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / trace.count;
    return trace.count === 1 ? {x: 190, y: 160} : {x: 190 + 118 * Math.cos(angle), y: 160 + 118 * Math.sin(angle)};
  });
  const used = new Set();
  for (const op of trace.operations.slice(0, step)) {
    if (op.type !== 'union') continue;
    const key = [op.a, op.b].sort((a, b) => a - b).join(':');
    if (used.has(key)) continue;
    used.add(key);
    const a = points[op.a], b = points[op.b];
    if (op.a === op.b) {
      graph.append(svgElement('path', {d: 'M ' + (a.x + 9) + ' ' + (a.y - 9) + ' C ' + (a.x + 60) + ' ' + (a.y - 35) + ', ' + (a.x + 60) + ' ' + (a.y + 35) + ', ' + (a.x + 15) + ' ' + (a.y + 9), fill: 'none', stroke: color(op.a), 'stroke-width': 3}));
    } else {
      graph.append(svgElement('line', {x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: color(op.a), 'stroke-width': 3}));
    }
  }
  points.forEach((point, node) => {
    graph.append(svgElement('circle', {cx: point.x, cy: point.y, r: 21, fill: '#fffefa', stroke: color(node), 'stroke-width': 3}));
    graph.append(svgElement('text', {x: point.x, y: point.y + 6, 'text-anchor': 'middle', fill: '#19363d'}, label(node)));
  });
  const defs = svgElement('defs', {});
  const marker = svgElement('marker', {id: 'parent-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse'});
  marker.append(svgElement('path', {d: 'M 0 0 L 10 5 L 0 10 z', fill: '#667b80'}));
  defs.append(marker); forest.append(defs);
  const children = Array.from({length: trace.count}, () => []);
  snapshot.parent.forEach((parent, node) => { if (parent !== node) children[parent].push(node); });
  const leaves = node => children[node].length ? children[node].reduce((sum, child) => sum + leaves(child), 0) : 1;
  const roots = snapshot.groups.map(group => group.root);
  const width = 336 / roots.reduce((sum, root) => sum + leaves(root), 0);
  const locations = [];
  let cursor = 22;
  function place(node, depth) {
    const start = cursor;
    if (!children[node].length) cursor += width;
    else children[node].forEach(child => place(child, depth + 1));
    locations[node] = {x: (start + cursor) / 2, y: 46 + 72 * depth};
  }
  roots.forEach(root => place(root, 0));
  snapshot.parent.forEach((parent, node) => {
    if (parent === node) return;
    const from = locations[node], to = locations[parent], distance = Math.hypot(to.x - from.x, to.y - from.y);
    const dx = (to.x - from.x) / distance, dy = (to.y - from.y) / distance;
    forest.append(svgElement('line', {x1: from.x + dx * 21, y1: from.y + dy * 21, x2: to.x - dx * 24, y2: to.y - dy * 24, stroke: '#667b80', 'stroke-width': 2, 'marker-end': 'url(#parent-arrow)'}));
  });
  locations.forEach((point, node) => {
    forest.append(svgElement('circle', {cx: point.x, cy: point.y, r: 18, fill: '#fffefa', stroke: color(node), 'stroke-width': 3}));
    if (snapshot.parent[node] === node) forest.append(svgElement('circle', {cx: point.x, cy: point.y, r: 23, fill: 'none', stroke: color(node), 'stroke-width': 1.5}));
    forest.append(svgElement('text', {x: point.x, y: point.y + 6, 'text-anchor': 'middle', fill: '#19363d'}, label(node)));
  });
  byId('graph-description').textContent = snapshot.groups.map(group => '{' + group.members.map(label).join(', ') + '}').join('  ');
  byId('parent-description').textContent = snapshot.parent.map((parent, node) => label(node) + ' points to ' + label(parent)).join('; ') + '. A double ring marks a root.';
}
function render() {
  if (!trace) return;
  const snapshot = trace.snapshots[step], other = alternate.snapshots[step];
  byId('result-area').hidden = false;
  byId('step-position').textContent = 'State ' + step + ' of ' + trace.operations.length;
  byId('step-slider').max = String(trace.operations.length);
  byId('step-slider').value = String(step);
  byId('step-slider').disabled = trace.operations.length === 0;
  byId('previous-step').disabled = step === 0;
  byId('next-step').disabled = step === trace.operations.length;
  byId('initial-step').disabled = step === 0;
  byId('final-step').disabled = step === trace.operations.length;
  byId('component-count').textContent = String(snapshot.components);
  byId('link-count').textContent = String(snapshot.linksFollowed);
  byId('tree-depth').textContent = String(snapshot.maxDepth);
  const withCompression = trace.compress ? snapshot.totalLinks : other.totalLinks;
  const withoutCompression = trace.compress ? other.totalLinks : snapshot.totalLinks;
  byId('comparison').textContent = 'Through this state: ' + withCompression + ' parent links followed with compression; ' + withoutCompression + ' without compression. Both encode the same ' + snapshot.components + ' components.';
  let description = 'Initial state: every element represents its own one-element component.';
  if (snapshot.operation) {
    description = commandName(snapshot.operation) + ': ';
    if (snapshot.operation.type === 'find') description += 'the representative is ' + label(snapshot.paths[0].root) + '. Component membership is unchanged.';
    else if (snapshot.joined) description += label(snapshot.joined.child) + ' attaches to ' + label(snapshot.joined.parent) + '; two components become one.';
    else description += 'both elements were already in the same component. No merge occurs.';
  }
  byId('step-description').textContent = description;
  const pathList = byId('find-paths'); pathList.replaceChildren();
  for (const path of snapshot.paths) {
    const changes = path.changes.length ? path.changes.map(change => label(change.node) + ': ' + label(change.from) + ' → ' + label(change.to)).join('; ') : 'none';
    const item = element('li');
    item.append(element('strong', 'find ' + label(path.start) + ': '));
    item.append(document.createTextNode(path.path.map(label).join(' → ') + '. Compression changes: ' + changes + '.'));
    pathList.append(item);
  }
  if (!snapshot.paths.length) pathList.append(element('li', 'No find has run yet.'));
  byId('mode-label').textContent = trace.compress ? 'Full compression enabled' : 'Compression disabled';
  const rows = byId('parent-rows'); rows.replaceChildren();
  for (let node = 0; node < trace.count; node++) {
    const row = element('tr');
    const root = snapshot.groups.find(group => group.members.includes(node)).root;
    [label(node), label(snapshot.parent[node]), label(root), snapshot.size[node] ? String(snapshot.size[node]) : '—'].forEach(text => row.append(element('td', text)));
    rows.append(row);
  }
  byId('processed-commands').textContent = step ? trace.operations.slice(0, step).map(commandName).join('\n') : 'No commands applied.';
  byId('download-trace').disabled = false;
  drawGraphs(snapshot);
}
function apply() {
  invalidate();
  try {
    const count = Number(byId('element-count').value);
    const operations = parseUnionFindInput(count, byId('commands').value);
    const compress = byId('compression').checked;
    trace = traceUnionFind(count, operations, {compress});
    alternate = traceUnionFind(count, operations, {compress: !compress});
    step = 0;
    byId('input-status').textContent = 'Applied ' + operations.length + ' commands to ' + count + ' elements. Step through the accepted trace.';
    render();
  } catch (error) {
    byId('input-status').textContent = 'The edited commands have not been applied.';
    byId('input-error').textContent = error.message;
  }
}
UNION_FIND_PRESETS.forEach(preset => {
  const option = element('option', preset.name); option.value = preset.id; byId('preset').append(option);
});
byId('use-example').addEventListener('click', () => loadPreset(UNION_FIND_PRESETS.find(preset => preset.id === byId('preset').value)));
byId('trace-form').addEventListener('submit', event => { event.preventDefault(); apply(); });
for (const id of ['element-count', 'commands', 'compression']) byId(id).addEventListener('input', invalidate);
byId('previous-step').addEventListener('click', () => { if (trace && step > 0) { step--; render(); } });
byId('next-step').addEventListener('click', () => { if (trace && step < trace.operations.length) { step++; render(); } });
byId('initial-step').addEventListener('click', () => { if (trace) { step = 0; render(); } });
byId('final-step').addEventListener('click', () => { if (trace) { step = trace.operations.length; render(); } });
byId('step-slider').addEventListener('input', event => { if (trace) { step = Number(event.target.value); render(); } });
byId('download-course').addEventListener('click', () => download(COURSE_TEXT, 'union-find.json', 'application/json;charset=utf-8'));
byId('download-guide').addEventListener('click', () => download(GUIDE_TEXT, 'union-find.md', 'text/markdown;charset=utf-8'));
byId('download-trace').addEventListener('click', () => {
  if (!trace) return;
  const output = {
    format: 'recallweave-union-find-observation/1',
    assumptions: ['Undirected connectivity; no edge deletions.', 'Union by component size; lower-index root breaks equal-size ties.', 'Find(a) runs before find(b) in a join; optional full compression visits only those paths.', 'Nonroot sizes are zero; roots retain exact component cardinalities.', 'Parent pointers represent sets and need not be original graph edges.', 'Link counts are algorithm observations, not elapsed-time measurements.'],
    selectedState: step, trace, comparisonWithoutChosenCompression: alternate
  };
  download(JSON.stringify(output, null, 2) + '\n', 'union-find-trace.json', 'application/json;charset=utf-8');
});
loadPreset(UNION_FIND_PRESETS[0]);
apply();
