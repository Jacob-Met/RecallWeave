import { parseGraph } from './dependency-plan.mjs';
import { analyzeTiming, MAX_JOB_DURATION } from './dependency-timing.mjs';

const byId = id => document.getElementById(id);
const jobsInput = byId('jobs-input');
const edgesInput = byId('edges-input');
const durationFields = new Map();
const assumptions = Object.freeze({
  edgeConvention: 'X -> Y means X must finish before Y can start',
  timeUnit: 'abstract time units',
  durationModel: 'deterministic nonnegative integers',
  durationRange: Object.freeze([0, MAX_JOB_DURATION]),
  parallelism: 'unlimited',
  dependencyLag: 0,
  startTime: 0,
  latestTimeReference: 'earliest project finish',
  calendars: false,
  resourceLimits: false,
});
const examples = Object.freeze({
  branches: {
    jobs: ['Outline', 'Design', 'Draft', 'Publish', 'Appendix'],
    edges: [['Outline', 'Design'], ['Outline', 'Draft'], ['Design', 'Publish'], ['Draft', 'Publish'], ['Outline', 'Publish']],
    durations: [2, 3, 3, 0, 1],
    note: 'Two equal branches reach Publish together. The direct Outline → Publish arrow is not tight. Appendix can run independently.',
  },
  milestones: {
    jobs: ['Start', 'Check', 'Finish'],
    edges: [['Start', 'Check'], ['Check', 'Finish']],
    durations: [0, 0, 0],
    note: 'Every job is a zero-duration milestone. The arrows still impose a prerequisite order.',
  },
  cycle: {
    jobs: ['A', 'B', 'Tail', 'Free'],
    edges: [['A', 'B'], ['B', 'A'], ['B', 'Tail']],
    durations: [2, 1, 3, 1],
    note: 'A and B form a cycle. Tail is downstream of it; Free is independent. The complete graph has no timing result.',
  },
});
let active = null;
let downloadBusy = false;

function element(tag, text = null, className = '') {
  const node = document.createElement(tag);
  if (text !== null) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}

function number(value) {
  return value.toLocaleString('en-US');
}

function clearError() {
  byId('timing-error').hidden = true;
  byId('timing-error').textContent = '';
  for (const input of document.querySelectorAll('[aria-invalid="true"]')) input.removeAttribute('aria-invalid');
}

function syncDownload() {
  byId('download-trace').disabled = downloadBusy || !active?.trace;
}

function clearCalculation(message = 'Inputs changed. Calculate again to see their timing.') {
  active = null;
  clearError();
  byId('timing-results').hidden = true;
  byId('timing-empty').hidden = false;
  byId('cycle-results').hidden = true;
  byId('acyclic-results').hidden = true;
  for (const id of ['timing-rows', 'timeline-rows', 'critical-jobs', 'critical-edges', 'dependency-rows', 'cycle-groups', 'blocked-jobs']) {
    byId(id).replaceChildren();
  }
  for (const id of ['project-duration', 'critical-count', 'job-count', 'result-summary', 'download-status']) {
    byId(id).textContent = '';
  }
  byId('timing-status').textContent = message;
  syncDownload();
}

function draftKey() {
  return JSON.stringify([
    jobsInput.value,
    edgesInput.value,
    [...durationFields].map(([job, input]) => [job, input.value]),
  ]);
}

function rebuildDurationFields(values = new Map([...durationFields].map(([job, input]) => [job, input.value]))) {
  const container = byId('duration-inputs');
  container.replaceChildren();
  durationFields.clear();
  let graph;
  try {
    graph = parseGraph(jobsInput.value, '');
  } catch (error) {
    byId('duration-draft-note').textContent = 'Enter valid job names to set their durations. ' + error.message;
    return;
  }
  byId('duration-draft-note').textContent = 'Each exact job name has its own duration. New names start with an empty field.';
  graph.jobs.forEach((job, index) => {
    const row = element('div', null, 'duration-row');
    const label = element('label', 'Duration for ' + job);
    const input = element('input');
    input.id = 'duration-' + index;
    input.type = 'text';
    input.inputMode = 'numeric';
    input.maxLength = 32;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.value = values.has(job) ? String(values.get(job)) : '';
    input.dataset.job = job;
    input.setAttribute('aria-describedby', 'duration-help');
    label.htmlFor = input.id;
    const unit = element('span', 'units', 'duration-unit');
    row.append(label, input, unit);
    container.append(row);
    durationFields.set(job, input);
    input.addEventListener('input', () => clearCalculation());
  });
}

function appendNames(container, names, emptyText = 'None') {
  if (!names.length) {
    container.append(element('span', emptyText, 'muted'));
    return;
  }
  const list = element('ul', null, 'name-list');
  for (const job of names) {
    const item = element('li', job);
    item.dataset.job = job;
    list.append(item);
  }
  container.append(list);
}

function timingCell(row, field) {
  const cell = element('td', number(row[field]), 'numeric');
  cell.dataset.field = field;
  return cell;
}

function renderTimingTable(analysis) {
  const prerequisites = new Map(analysis.graphAnalysis.rows.map(row => [row.job, row.prerequisites]));
  for (const row of analysis.timing.rows) {
    const tr = element('tr');
    tr.dataset.job = row.job;
    tr.dataset.critical = String(row.critical);
    const name = element('th');
    name.scope = 'row';
    name.append(element('span', row.job, 'job-name'));
    if (row.duration === 0) name.append(element('span', 'Milestone · duration 0', 'milestone-label'));
    const needs = element('td');
    appendNames(needs, prerequisites.get(row.job));
    tr.append(name, needs);
    for (const field of ['duration', 'earliestStart', 'earliestFinish', 'latestStart', 'latestFinish', 'totalSlack']) {
      tr.append(timingCell(row, field));
    }
    const status = element('td');
    status.dataset.field = 'critical';
    status.append(element('span', row.critical ? 'Critical · zero slack' : 'Has slack', row.critical ? 'chip critical-chip' : 'chip'));
    tr.append(status);
    byId('timing-rows').append(tr);
  }
}

function renderTimeline(analysis) {
  const duration = analysis.timing.projectDuration;
  const scale = Math.max(1, duration);
  byId('timeline-end').textContent = number(duration);
  byId('zero-duration-note').hidden = duration !== 0;
  for (const row of analysis.timing.rows) {
    const item = element('li', null, 'timeline-row' + (row.critical ? ' is-critical' : ''));
    item.dataset.job = row.job;
    const heading = element('div', null, 'timeline-heading');
    heading.append(element('strong', row.job));
    heading.append(element('span', row.critical ? 'Critical' : 'Slack ' + number(row.totalSlack), 'timeline-state'));
    const detail = element('p', 'Earliest ' + number(row.earliestStart) + '–' + number(row.earliestFinish) +
      ' · Latest ' + number(row.latestStart) + '–' + number(row.latestFinish) +
      (row.duration === 0 ? ' · zero-duration milestone' : ''), 'timeline-detail');
    const track = element('div', null, 'timeline-track');
    track.setAttribute('aria-hidden', 'true');
    const latest = element('span', null, row.duration === 0 ? 'milestone latest-milestone' : 'timing-bar latest-bar');
    const earliest = element('span', null, row.duration === 0 ? 'milestone earliest-milestone' : 'timing-bar earliest-bar');
    latest.style.left = (100 * row.latestStart / scale) + '%';
    earliest.style.left = (100 * row.earliestStart / scale) + '%';
    if (row.duration !== 0) {
      latest.style.width = earliest.style.width = (100 * row.duration / scale) + '%';
    }
    track.append(latest, earliest);
    item.append(heading, detail, track);
    byId('timeline-rows').append(item);
  }
}

function arrowLabel(from, to) {
  const label = element('span', null, 'arrow-label');
  label.append(element('span', from), element('span', ' → ', 'arrow-symbol'), element('span', to));
  return label;
}

function renderBranches(analysis) {
  const timing = analysis.timing;
  for (const job of timing.criticalJobs) {
    const item = element('li', job);
    item.dataset.job = job;
    byId('critical-jobs').append(item);
  }
  byId('no-critical-edges').hidden = timing.criticalEdges.length !== 0;
  for (const [from, to] of timing.criticalEdges) {
    const item = element('li');
    item.dataset.from = from;
    item.dataset.to = to;
    item.append(arrowLabel(from, to));
    byId('critical-edges').append(item);
  }
  const rows = new Map(timing.rows.map(row => [row.job, row]));
  const critical = new Set(timing.criticalEdges.map(edge => JSON.stringify(edge)));
  for (const [from, to] of analysis.graph.edges) {
    const row = element('tr');
    row.dataset.from = from;
    row.dataset.to = to;
    const arrow = element('th');
    arrow.scope = 'row';
    arrow.append(arrowLabel(from, to));
    row.append(arrow, element('td', number(rows.get(from).earliestFinish)), element('td', number(rows.get(to).earliestStart)));
    row.append(element('td', critical.has(JSON.stringify([from, to])) ? 'Critical link' : 'Not a critical link'));
    byId('dependency-rows').append(row);
  }
  byId('no-dependencies').hidden = analysis.graph.edges.length !== 0;
  byId('dependency-table-wrap').hidden = analysis.graph.edges.length === 0;
}

function renderCycles(analysis) {
  analysis.graphAnalysis.cycleComponents.forEach((component, index) => {
    const item = element('li');
    item.append(element('strong', 'Cycle group ' + (index + 1) + ': '));
    appendNames(item, component);
    byId('cycle-groups').append(item);
  });
  appendNames(byId('blocked-jobs'), analysis.graphAnalysis.blockedByCycle, 'No other jobs are downstream of a cycle.');
}

function renderResult(analysis) {
  byId('timing-empty').hidden = true;
  byId('timing-results').hidden = false;
  byId('acyclic-results').hidden = !analysis.timing;
  byId('cycle-results').hidden = Boolean(analysis.timing);
  if (!analysis.timing) {
    byId('result-summary').textContent = 'A cycle prevents a timing result for this complete graph.';
    renderCycles(analysis);
    return;
  }
  const timing = analysis.timing;
  byId('result-summary').textContent = 'Calculated from this graph and its stated durations, with unlimited parallelism.';
  byId('project-duration').textContent = number(timing.projectDuration);
  byId('critical-count').textContent = String(timing.criticalJobs.length);
  byId('job-count').textContent = String(analysis.graph.jobs.length);
  renderTimingTable(analysis);
  renderTimeline(analysis);
  renderBranches(analysis);
}

function calculate(event) {
  event?.preventDefault();
  clearCalculation('');
  let invalidField = null;
  try {
    const graph = parseGraph(jobsInput.value, edgesInput.value);
    if (JSON.stringify(graph.jobs) !== JSON.stringify([...durationFields.keys()])) rebuildDurationFields();
    const durations = graph.jobs.map(job => {
      const input = durationFields.get(job);
      const raw = input?.value.trim() ?? '';
      if (!/^[0-9]+$/u.test(raw) || !Number.isInteger(Number(raw)) || Number(raw) > MAX_JOB_DURATION) {
        invalidField = input;
        throw new Error('Duration for ' + job + ': enter digits for a whole number from 0 to 1000000. Fractions, signs and exponents are not accepted.');
      }
      return { job, duration: Number(raw) };
    });
    const analysis = analyzeTiming(graph, durations);
    const trace = analysis.timing ? {
      schema: 'recallweave-dependency-timing/1',
      assumptions,
      input: { graph: analysis.graph, durations: analysis.durations },
      result: { graphAnalysis: analysis.graphAnalysis, timing: analysis.timing },
    } : null;
    active = { analysis, trace, key: draftKey() };
    renderResult(analysis);
    byId('timing-status').textContent = analysis.timing ?
      'Timing calculated. Editing any input clears this result and its download.' :
      'No timing calculated. Fix the cycle, then calculate again.';
    syncDownload();
    byId('results-heading').focus();
  } catch (error) {
    const box = byId('timing-error');
    box.textContent = error.message;
    box.hidden = false;
    if (invalidField) {
      invalidField.setAttribute('aria-invalid', 'true');
      invalidField.focus();
    } else {
      jobsInput.setAttribute('aria-invalid', 'true');
      edgesInput.setAttribute('aria-invalid', 'true');
      box.focus();
    }
    byId('timing-status').textContent = 'No calculation was kept. Check the highlighted input.';
  }
}

function useExample(key) {
  const example = examples[key];
  if (!example) return;
  jobsInput.value = example.jobs.join('\n');
  edgesInput.value = example.edges.map(edge => edge.join(' -> ')).join('\n');
  rebuildDurationFields(new Map(example.jobs.map((job, index) => [job, String(example.durations[index])])));
  clearCalculation('Example loaded as a draft. Choose Calculate timing when you are ready.');
  byId('example-note').textContent = example.note;
}

jobsInput.addEventListener('input', () => {
  clearCalculation();
  rebuildDurationFields();
  byId('example-note').textContent = '';
});
edgesInput.addEventListener('input', () => {
  clearCalculation();
  byId('example-note').textContent = '';
});
byId('timing-form').addEventListener('submit', calculate);
for (const button of document.querySelectorAll('[data-example]')) {
  button.addEventListener('click', () => useExample(button.dataset.example));
}
byId('reset-example').addEventListener('click', () => useExample('branches'));

byId('download-trace').addEventListener('click', () => {
  if (downloadBusy || !active?.trace) return;
  if (active.key !== draftKey()) {
    clearCalculation('Inputs changed. Calculate again before downloading a timing trace.');
    return;
  }
  downloadBusy = true;
  syncDownload();
  let url;
  let anchor;
  try {
    const bytes = JSON.stringify(active.trace, null, 2) + '\n';
    url = URL.createObjectURL(new Blob([bytes], { type: 'application/json;charset=utf-8' }));
    anchor = element('a');
    anchor.href = url;
    anchor.download = 'recallweave-dependency-timing.json';
    document.body.append(anchor);
    anchor.click();
    byId('download-status').textContent = 'Timing trace download requested. It contains these inputs, assumptions and calculated results.';
  } catch {
    byId('download-status').textContent = 'The timing trace download could not be started. Try again.';
  } finally {
    anchor?.remove();
    setTimeout(() => {
      if (url) URL.revokeObjectURL(url);
      downloadBusy = false;
      syncDownload();
    }, 500);
  }
});

useExample('branches');
