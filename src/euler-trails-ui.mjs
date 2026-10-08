import { analyzeEuler, parseEdgeText } from './euler-trails.mjs';

const byId = id => document.getElementById(id);
const ui = Object.fromEntries([
  'graph-form','vertex-count','edge-input','start-vertex','input-status',
  'analysis','draft-state','classification','analysis-reason','graph-size',
  'degree-body','component-summary','graph-svg','route-status','route-sequence',
  'edge-body','replay-step','step-back','step-next','download-analysis',
  'example-select','load-example','download-course','download-guide','download-status'
].map(id => [id, byId(id)]));
let applied = null;
let step = 0;
const examples = {
  open: { vertexCount: 4, edges: 'A B\nB C\nC A\nA D', start: 'auto' },
  circuit: { vertexCount: 4, edges: 'A B\nB C\nC A', start: 'auto' },
  parallel: { vertexCount: 3, edges: 'A B\nA B\nA A', start: 'B' },
  disconnected: { vertexCount: 6, edges: 'A B\nB C\nC A\nD E\nE F\nF D', start: 'auto' },
  greedy: { vertexCount: 4, edges: 'A D\nA B\nB C\nC A', start: 'A' },
  empty: { vertexCount: 3, edges: '', start: 'C' }
};

function retire() {
  applied = null; step = 0;
  ui.analysis.hidden = true;
  ui['draft-state'].hidden = false;
  ui['graph-svg'].replaceChildren();
  ui['download-analysis'].disabled = true;
  ui['replay-step'].disabled = true;
  ui['step-back'].disabled = true;
  ui['step-next'].disabled = true;
  ui['input-status'].dataset.error = 'false';
  ui['input-status'].textContent = 'Unapplied edits. Apply graph to compute fresh evidence.';
}

function row(parent, values, className = '') {
  const tr = document.createElement('tr');
  tr.className = className;
  for (const value of values) {
    const td = document.createElement('td');
    td.textContent = String(value); tr.append(td);
  }
  parent.append(tr);
}

function svgElement(name, attributes = {}, text = null) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  if (text !== null) element.textContent = text;
  return element;
}

function drawGraph(used, current) {
  const svg = ui['graph-svg']; svg.replaceChildren();
  svg.append(svgElement('title', { id: 'graph-title' }, 'Applied undirected graph'));
  svg.append(svgElement('desc', { id: 'graph-description' },
    `${applied.vertices.length} vertices and ${applied.edges.length} distinct edges. ${current ? 'Current vertex ' + current + '. ' : ''}Exact endpoints and replay state follow in the edge table.`));
  const positions = Object.fromEntries(applied.vertices.map((vertex, index) => {
    const angle = -Math.PI / 2 + 2 * Math.PI * index / applied.vertices.length;
    return [vertex, { x: 320 + (applied.vertices.length === 1 ? 0 : 135 * Math.cos(angle)),
      y: 260 + (applied.vertices.length === 1 ? 0 : 135 * Math.sin(angle)), angle }];
  }));
  const groups = new Map();
  for (const edge of applied.edges) {
    const key = [edge.from, edge.to].sort().join('');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(edge);
  }
  for (const edges of groups.values()) {
    edges.forEach((edge, index) => {
      const sorted = [edge.from, edge.to].sort();
      const a = positions[sorted[0]], b = positions[sorted[1]];
      let d, lx, ly;
      if (edge.from === edge.to) {
        const radius = 24 + index * 3;
        const ux = Math.cos(a.angle), uy = Math.sin(a.angle);
        const tx = -uy, ty = ux;
        const sx = a.x + tx * 15, sy = a.y + ty * 15;
        const ex = a.x - tx * 15, ey = a.y - ty * 15;
        d = `M ${sx} ${sy} C ${a.x + ux * radius * 1.5 + tx * radius} ${a.y + uy * radius * 1.5 + ty * radius}, ${a.x + ux * radius * 1.5 - tx * radius} ${a.y + uy * radius * 1.5 - ty * radius}, ${ex} ${ey}`;
        lx = a.x + ux * radius * 1.13; ly = a.y + uy * radius * 1.13;
      } else {
        const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
        const bend = (index - (edges.length - 1) / 2) * 28;
        const cx = (a.x + b.x) / 2 - dy / length * bend;
        const cy = (a.y + b.y) / 2 + dx / length * bend;
        d = `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
        lx = (a.x + 2 * cx + b.x) / 4; ly = (a.y + 2 * cy + b.y) / 4;
      }
      const color = used.has(edge.id) ? '#29664e' : '#8c9d92';
      svg.append(svgElement('path', { d, fill: 'none', stroke: color,
        'stroke-width': used.has(edge.id) ? 5 : 2.5, 'data-edge-id': edge.id }));
      svg.append(svgElement('text', { x: lx, y: ly - 6, fill: '#233b32',
        'font-size': 15, 'text-anchor': 'middle', 'font-family': 'ui-monospace, monospace',
        stroke: '#fffef9', 'stroke-width': 5, 'paint-order': 'stroke', 'aria-hidden': 'true' }, edge.id));
    });
  }
  for (const vertex of applied.vertices) {
    const point = positions[vertex], active = vertex === current;
    svg.append(svgElement('circle', { cx: point.x, cy: point.y, r: active ? 24 : 21,
      fill: active ? '#a54e2a' : '#fffef9', stroke: active ? '#7e3b1f' : '#29664e', 'stroke-width': 2.5 }));
    svg.append(svgElement('text', { x: point.x, y: point.y + 6, fill: active ? '#ffffff' : '#233b32',
      'font-size': 20, 'font-weight': 700, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif' }, vertex));
  }
}

function renderReplay() {
  if (!applied) return;
  const route = applied.route;
  const used = new Set(route ? route.edgeIds.slice(0, step) : []);
  const current = route ? route.vertices[step] : null;
  ui['replay-step'].max = String(applied.edges.length);
  ui['replay-step'].value = String(step);
  ui['replay-step'].disabled = !route || !applied.edges.length;
  ui['step-back'].disabled = !route || step === 0;
  ui['step-next'].disabled = !route || step === applied.edges.length;
  ui['route-status'].textContent = route
    ? `${step} of ${applied.edges.length} edges used · Current vertex ${current}${step === applied.edges.length ? ' · Complete' : ''}`
    : (applied.routeStatus === 'start-ineligible' ? 'No route from the requested start.' : 'No single edge-covering route.');
  ui['route-sequence'].replaceChildren();
  if (route) {
    const first = document.createElement('span'); first.textContent = route.vertices[0]; ui['route-sequence'].append(first);
    route.edgeIds.forEach((id, index) => {
      const token = document.createElement('span');
      token.textContent = `—${id}→ ${route.vertices[index + 1]}`;
      ui['route-sequence'].append(token);
    });
  } else ui['route-sequence'].textContent = 'A route is only shown after all existence and starting-vertex checks pass.';
  ui['edge-body'].replaceChildren();
  for (const edge of applied.edges) {
    row(ui['edge-body'], [edge.id, `${edge.from}–${edge.to}`, used.has(edge.id) ? 'Used' : 'Remaining'],
      used.has(edge.id) ? ('used' + (route.edgeIds[step - 1] === edge.id ? ' latest' : '')) : '');
  }
  if (!applied.edges.length) row(ui['edge-body'], ['—', 'No edges', 'None to cover']);
  drawGraph(used, current);
}

function apply() {
  retire();
  try {
    const countText = ui['vertex-count'].value.trim();
    if (!/^\d+$/.test(countText)) throw new Error('Choose a whole number of vertices from 1 to 8.');
    applied = analyzeEuler({
      vertexCount: Number(countText), edges: parseEdgeText(ui['edge-input'].value),
      start: ui['start-vertex'].value
    });
    ui.analysis.hidden = false;
    ui['draft-state'].hidden = true;
    ui['download-analysis'].disabled = false;
    const labels = { empty: 'Zero-edge walk', circuit: 'Euler circuit', trail: 'Open Euler trail', none: 'No Euler trail' };
    ui.classification.textContent = labels[applied.graphKind] +
      (applied.routeStatus === 'start-ineligible' ? ' · Start ineligible' : '');
    ui['analysis-reason'].textContent = applied.reason;
    ui['graph-size'].textContent = `${applied.vertexCount} VERTICES / ${applied.edges.length} EDGES`;
    ui['degree-body'].replaceChildren();
    for (const entry of applied.degrees) row(ui['degree-body'], [entry.vertex, entry.degree, entry.degree % 2 ? 'Odd' : 'Even']);
    ui['component-summary'].textContent =
      `Edge-bearing components: ${applied.components.length ? applied.components.map(part => '{' + part.join(', ') + '}').join(' · ') : 'none'}. Isolated vertices: ${applied.isolatedVertices.join(', ') || 'none'}. Odd vertices: ${applied.oddVertices.join(', ') || 'none'}.`;
    ui['input-status'].textContent = 'Applied. Edge IDs follow the nonblank input row order.';
    renderReplay();
  } catch (error) {
    retire();
    ui['input-status'].dataset.error = 'true';
    ui['input-status'].textContent = error.message;
  }
}

function download(filename, text, type) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a');
    link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ui['download-status'].textContent = `Download requested: ${filename}. Check your browser’s downloads.`;
  } catch {
    ui['download-status'].textContent = 'The download could not be prepared. Your applied graph remains available; try again.';
  }
}

ui['graph-form'].addEventListener('submit', event => { event.preventDefault(); apply(); });
for (const id of ['vertex-count', 'edge-input', 'start-vertex']) {
  ui[id].addEventListener('input', retire);
  ui[id].addEventListener('change', retire);
}
ui['step-back'].addEventListener('click', () => { if (applied?.route && step > 0) { step -= 1; renderReplay(); } });
ui['step-next'].addEventListener('click', () => { if (applied?.route && step < applied.edges.length) { step += 1; renderReplay(); } });
ui['replay-step'].addEventListener('input', () => {
  if (!applied?.route) return;
  step = Math.max(0, Math.min(applied.edges.length, Number(ui['replay-step'].value)));
  renderReplay();
});
ui['load-example'].addEventListener('click', () => {
  const example = examples[ui['example-select'].value];
  ui['vertex-count'].value = String(example.vertexCount);
  ui['edge-input'].value = example.edges; ui['start-vertex'].value = example.start; apply();
});
ui['download-analysis'].addEventListener('click', () => {
  if (applied) download('euler-trails-analysis.json',
    JSON.stringify({ format: 'recallweave-euler-analysis/1', analysis: applied }, null, 2) + '\n', 'application/json;charset=utf-8');
});
ui['download-course'].addEventListener('click', () => download('euler-trails.json', COURSE_TEXT, 'application/json;charset=utf-8'));
ui['download-guide'].addEventListener('click', () => download('euler-trails.md', GUIDE_TEXT, 'text/markdown;charset=utf-8'));
apply();
