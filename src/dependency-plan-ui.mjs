import { parseGraph, analyzeGraph, completeJob, undoCompletion, resetCompletion, reachableFrom, enumerateCompletions } from './dependency-plan.mjs';

const byId = id => document.getElementById(id);
const jobsInput = byId('jobs-input');
const edgesInput = byId('edges-input');
const results = byId('plan-results');
const errorBox = byId('graph-error');
const graphStatus = byId('graph-status');
const courseText = JSON.parse(byId('dependency-course').textContent);
const examples = {
  shared: {
    title: 'Shared prerequisites',
    jobs: 'A\nB\nC\nD', edges: 'A -> C\nB -> C\nC -> D',
    note: 'From the course: C needs both A and B. Can you find two valid orders?',
  },
  cycle: {
    title: 'A cycle and its downstream job',
    jobs: 'A\nB\nC\nD\nE', edges: 'A -> B\nB -> A\nB -> C\nD -> E',
    note: 'From the course: A and B form a cycle. C is blocked downstream; D and E can still finish.',
  },
  changes: {
    title: 'Follow a change',
    jobs: 'Raw\nClean\nChart\nSummary\nGlossary', edges: 'Raw -> Clean\nClean -> Chart\nClean -> Summary',
    note: 'From the course: inspect Raw to follow its effects. Glossary has no dependency arrows.',
  },
};
let activeGraph = null;
let completed = Object.freeze([]);
let activeDraft = null;
let revision = 0;
let downloadBusy = false;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = '';
  jobsInput.removeAttribute('aria-invalid');
  edgesInput.removeAttribute('aria-invalid');
}

function invalidate() {
  revision += 1;
  activeGraph = null;
  activeDraft = null;
  completed = Object.freeze([]);
  results.hidden = true;
  byId('empty-plan').hidden = false;
  for (const id of ['ready-jobs', 'job-rows', 'graph-map', 'completion-history', 'orders-list', 'cycle-groups']) {
    byId(id).replaceChildren();
  }
  byId('undo-step').disabled = true;
  byId('reset-plan').disabled = true;
  byId('case-name').textContent = 'Your graph';
  byId('example-note').textContent = 'Editing clears the old plan. Preview these inputs to begin again.';
  clearError();
  graphStatus.textContent = 'Draft changed. Preview this graph before completing any job.';
}

function currentDraft() {
  if (!activeGraph) return false;
  if (jobsInput.value !== activeDraft.jobs || edgesInput.value !== activeDraft.edges) {
    invalidate();
    return false;
  }
  return true;
}

function showError(error) {
  errorBox.textContent = error instanceof Error ? error.message : 'The graph could not be previewed.';
  errorBox.hidden = false;
  jobsInput.setAttribute('aria-invalid', 'true');
  edgesInput.setAttribute('aria-invalid', 'true');
  errorBox.focus();
}

function focusReady(preferred) {
  const buttons = [...byId('ready-jobs').querySelectorAll('button')];
  const target = buttons.find(button => button.dataset.completeJob === preferred) || buttons[0] || byId('plan-heading');
  target.focus();
}

function previewGraph({ focus = true, title = 'Your graph', note = 'Use only the prerequisite arrows you entered. Job-list order breaks display ties; it is not another dependency.' } = {}) {
  invalidate();
  try {
    const graph = parseGraph(jobsInput.value, edgesInput.value);
    activeGraph = graph;
    activeDraft = { jobs: jobsInput.value, edges: edgesInput.value };
    completed = Object.freeze([]);
    revision += 1;
    byId('case-name').textContent = title;
    byId('example-note').textContent = note;
    byId('empty-plan').hidden = true;
    results.hidden = false;
    byId('inspect-job').replaceChildren(...graph.jobs.map(job => {
      const option = element('option', job);
      option.value = job;
      return option;
    }));
    renderPlan();
    graphStatus.textContent = `Preview ready: ${graph.jobs.length} jobs and ${graph.edges.length} arrows. No jobs have been completed.`;
    if (focus) byId('plan-heading').focus();
  } catch (error) {
    showError(error);
  }
}

function stateLabel(status) {
  return ({ complete: 'Completed', ready: 'Ready', cycle: 'Cycle member', blocked: 'Blocked by a cycle', waiting: 'Waiting' })[status];
}

function renderInspection(analysis) {
  const selected = byId('inspect-job').value;
  const row = analysis.rows.find(item => item.job === selected);
  if (!row) return;
  const outgoing = activeGraph.jobs.filter(job => activeGraph.edges.some(([from, to]) => from === selected && to === job));
  const reached = reachableFrom(activeGraph, selected);
  byId('direct-prerequisites').textContent = row.prerequisites.length ? row.prerequisites.join(', ') : 'None';
  byId('direct-dependents').textContent = outgoing.length ? outgoing.join(', ') : 'None';
  byId('reachable-jobs').textContent = reached.length ? reached.join(', ') : 'None';
  byId('reach-origin-note').textContent = reached.includes(selected)
    ? 'This job also appears in reachability because a directed cycle returns to it.'
    : 'The starting job is excluded: no positive-length directed path returns to it.';
  renderMap(analysis, selected);
}

function svgElement(tag, attributes = {}, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderMap(analysis, inspected) {
  const graph = activeGraph;
  const svg = svgElement('svg', { viewBox: '0 0 840 540', role: 'img', 'aria-labelledby': 'map-title map-description' });
  svg.append(svgElement('title', { id: 'map-title' }, 'Directed prerequisite map'));
  svg.append(svgElement('desc', { id: 'map-description' }, graph.edges.length
    ? graph.edges.map(([from, to]) => `${from} must complete before ${to}`).join('; ')
    : 'No arrows. Every job is independent.'));
  const defs = svgElement('defs');
  const marker = svgElement('marker', { id: 'dependency-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
  marker.append(svgElement('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#526d65' }));
  defs.append(marker);
  svg.append(defs);
  const positions = new Map(graph.jobs.map((job, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / graph.jobs.length;
    return [job, graph.jobs.length === 1 ? { x: 420, y: 270 } : { x: 420 + 305 * Math.cos(angle), y: 270 + 174 * Math.sin(angle) }];
  }));
  for (const [from, to] of graph.edges) {
    const start = positions.get(from), end = positions.get(to);
    let d;
    if (from === to) {
      d = `M ${start.x + 44} ${start.y - 30} C ${start.x + 104} ${start.y - 104}, ${start.x - 104} ${start.y - 104}, ${start.x - 44} ${start.y - 31}`;
    } else {
      const dx = end.x - start.x, dy = end.y - start.y;
      const distance = Math.hypot(dx, dy);
      const offset = Math.min(0.44, 1 / Math.max(Math.abs(dx) / 77, Math.abs(dy) / 33));
      const x1 = start.x + dx * offset, y1 = start.y + dy * offset;
      const x2 = end.x - dx * offset, y2 = end.y - dy * offset;
      const reverse = graph.edges.some(([a, b]) => a === to && b === from);
      d = reverse
        ? `M ${x1} ${y1} Q ${(x1 + x2) / 2 - (dy / distance) * 46} ${(y1 + y2) / 2 + (dx / distance) * 46}, ${x2} ${y2}`
        : `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    const path = svgElement('path', { d, class: 'dependency-edge', 'marker-end': 'url(#dependency-arrow)' });
    path.append(svgElement('title', {}, `${from} → ${to}`));
    svg.append(path);
  }
  for (const row of analysis.rows) {
    const { x, y } = positions.get(row.job);
    const group = svgElement('g', { class: `graph-node node-${row.status}${row.job === inspected ? ' inspected' : ''}` });
    group.append(svgElement('title', {}, `${row.job}: ${stateLabel(row.status)}`));
    group.append(svgElement('rect', { x: x - 74, y: y - 29, width: 148, height: 58, rx: 10 }));
    const letters = [...row.job];
    const shortName = letters.length <= 10 ? row.job : `${letters.slice(0, 7).join('')}…${letters.slice(-2).join('')}`;
    group.append(svgElement('text', { x, y: y - 3, 'text-anchor': 'middle', class: 'map-job' }, shortName));
    group.append(svgElement('text', { x, y: y + 16, 'text-anchor': 'middle', class: 'map-state' }, stateLabel(row.status)));
    svg.append(group);
  }
  byId('graph-map').replaceChildren(svg);
}

function renderPlan() {
  const analysis = analyzeGraph(activeGraph, completed);
  const viewRevision = revision;
  byId('plan-progress').textContent = `${completed.length} of ${activeGraph.jobs.length} jobs completed`;
  byId('ready-summary').textContent = analysis.finished ? 'Every prerequisite was respected. This plan is complete.'
    : analysis.ready.length ? 'Choose any ready job. Readiness depends on all its prerequisites, not its position in the job list.'
      : 'No ready jobs remain. Cycles block the unfinished part of this graph.';
  byId('ready-jobs').replaceChildren(...analysis.ready.map(job => {
    const button = element('button', `Complete ${job}`, 'complete-job');
    button.type = 'button';
    button.dataset.completeJob = job;
    button.addEventListener('click', () => {
      if (!currentDraft() || revision !== viewRevision) return;
      button.disabled = true;
      try {
        completed = completeJob(activeGraph, completed, job);
        revision += 1;
        renderPlan();
        graphStatus.textContent = `Completed ${job}. ${completed.length} of ${activeGraph.jobs.length} jobs are complete.`;
        focusReady();
      } catch (error) {
        showError(error);
      }
    });
    return button;
  }));
  byId('job-rows').replaceChildren(...analysis.rows.map(row => {
    const tr = element('tr');
    tr.dataset.job = row.job;
    tr.dataset.status = row.status;
    const label = element('th', row.job);
    label.scope = 'row';
    const state = element('td');
    state.append(element('span', stateLabel(row.status), `state-chip state-${row.status}`));
    const prerequisites = element('td', row.prerequisites.length ? row.prerequisites.join(', ') : 'None');
    const missing = element('td', row.status === 'complete' ? '—' : row.unmet.length ? row.unmet.join(', ') : 'None');
    tr.append(label, state, prerequisites, missing);
    return tr;
  }));
  byId('history-empty').hidden = completed.length > 0;
  byId('completion-history').replaceChildren(...completed.map(job => element('li', job)));
  byId('undo-step').disabled = completed.length === 0;
  byId('reset-plan').disabled = completed.length === 0;
  byId('cycle-panel').hidden = analysis.cycleMembers.length === 0;
  byId('cycle-groups').replaceChildren(...analysis.cycleComponents.map((group, index) =>
    element('li', group.length === 1 ? `Group ${index + 1}: ${group[0]} has an arrow back to itself.`
      : `Group ${index + 1}: ${group.join(', ')}. These jobs can each reach every other job in their group.`)));
  byId('blocked-jobs').textContent = analysis.blockedByCycle.length ? analysis.blockedByCycle.join(', ') : 'None';
  const enumerated = enumerateCompletions(activeGraph, completed);
  byId('orders-note').textContent = enumerated.orders.length === 0
    ? 'No complete order exists for this graph. Independent ready jobs can still be completed.'
    : enumerated.truncated
      ? `First ${enumerated.limit} complete orders shown; more exist. Each starts with your completed history. This is not the total count.`
      : `All ${enumerated.orders.length} complete ${enumerated.orders.length === 1 ? 'order is' : 'orders are'} shown. Each starts with your completed history.`;
  byId('orders-list').replaceChildren(...enumerated.orders.map(order => element('li', order.join(' → '))));
  renderInspection(analysis);
}

jobsInput.addEventListener('input', invalidate);
edgesInput.addEventListener('input', invalidate);
byId('graph-form').addEventListener('submit', event => {
  event.preventDefault();
  previewGraph();
});
byId('undo-step').addEventListener('click', () => {
  if (!currentDraft() || !completed.length) return;
  const undone = completed.at(-1);
  completed = undoCompletion(activeGraph, completed);
  revision += 1;
  renderPlan();
  graphStatus.textContent = `Undid ${undone}. The earlier completion order is unchanged.`;
  focusReady(undone);
});
byId('reset-plan').addEventListener('click', () => {
  if (!currentDraft() || !completed.length) return;
  completed = resetCompletion(activeGraph, completed);
  revision += 1;
  renderPlan();
  graphStatus.textContent = 'Progress reset. This graph is unchanged and no jobs are complete.';
  focusReady();
});
byId('inspect-job').addEventListener('change', () => {
  if (currentDraft()) renderInspection(analyzeGraph(activeGraph, completed));
});
for (const button of document.querySelectorAll('[data-example]')) {
  button.addEventListener('click', () => useExample(button.dataset.example));
}

function useExample(key, focus = true) {
  const example = examples[key];
  if (!example) return;
  jobsInput.value = example.jobs;
  edgesInput.value = example.edges;
  previewGraph({ focus, title: example.title, note: example.note });
}

byId('download-course').addEventListener('click', () => {
  if (downloadBusy) return;
  downloadBusy = true;
  const button = byId('download-course');
  button.disabled = true;
  let url;
  let anchor;
  try {
    url = URL.createObjectURL(new Blob([courseText], { type: 'application/json;charset=utf-8' }));
    anchor = element('a');
    anchor.href = url;
    anchor.download = 'dependency-graphs.json';
    document.body.append(anchor);
    anchor.click();
    byId('download-status').textContent = 'Course download requested. Choose this file in the learner, inspect its preview, then select Start this deck.';
  } catch {
    byId('download-status').textContent = 'The course download could not be started. Try the button again.';
  } finally {
    anchor?.remove();
    setTimeout(() => {
      if (url) URL.revokeObjectURL(url);
      downloadBusy = false;
      button.disabled = false;
    }, 500);
  }
});

useExample('shared', false);
