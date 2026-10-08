/** Fixed durations and unlimited parallelism; X -> Y means finish X before Y. */
import { validateGraph, analyzeGraph } from './dependency-plan.mjs';

export const MAX_JOB_DURATION = 1_000_000;

const frozenList = values => Object.freeze([...values]);

function checkedDurations(graph, entries) {
  if (!Array.isArray(entries) || entries.length !== graph.jobs.length) {
    throw new Error('Give every job exactly one duration.');
  }
  const known = new Set(graph.jobs);
  const durations = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
        Reflect.ownKeys(entry).length !== 2 ||
        !Object.hasOwn(entry, 'job') || !Object.hasOwn(entry, 'duration')) {
      throw new Error('Each duration entry must contain only its own job and duration fields.');
    }
    const jobField = Object.getOwnPropertyDescriptor(entry, 'job');
    const durationField = Object.getOwnPropertyDescriptor(entry, 'duration');
    if (!Object.hasOwn(jobField, 'value') || !Object.hasOwn(durationField, 'value')) {
      throw new Error('Job and duration fields must be ordinary values.');
    }
    const job = jobField.value;
    const duration = durationField.value;
    if (!known.has(job) || durations.has(job)) {
      throw new Error('Use each exact job name once, without unknown or repeated names.');
    }
    if (!Number.isInteger(duration) || duration < 0 || duration > MAX_JOB_DURATION) {
      throw new Error('Use a whole number of time units from 0 to 1,000,000 for every duration.');
    }
    durations.set(job, duration === 0 ? 0 : duration);
  }
  return frozenList(graph.jobs.map(job => Object.freeze({ job, duration: durations.get(job) })));
}

/**
 * Total slack is measured against the earliest finish of the entire graph.
 * A critical edge belongs to a longest source-to-sink path. Zero-duration
 * milestones and multiple equally long branches are retained explicitly.
 * Cycles have no timing result, even if every job in a cycle has duration zero.
 */
export function analyzeTiming(graphInput, durationEntries) {
  const graph = validateGraph(graphInput);
  const durations = checkedDurations(graph, durationEntries);
  const graphAnalysis = analyzeGraph(graph);
  if (graphAnalysis.cycleComponents.length) {
    return Object.freeze({ graph, durations, graphAnalysis, timing: null });
  }

  const durationByJob = new Map(durations.map(entry => [entry.job, entry.duration]));
  const incoming = new Map(graph.jobs.map(job => [job, []]));
  const outgoing = new Map(graph.jobs.map(job => [job, []]));
  for (const [from, to] of graph.edges) {
    outgoing.get(from).push(to);
    incoming.get(to).push(from);
  }

  // Stable topological traversal; the public rows keep the original job order.
  const remaining = new Map(graph.jobs.map(job => [job, incoming.get(job).length]));
  const visited = new Set();
  const order = [];
  while (order.length < graph.jobs.length) {
    const job = graph.jobs.find(name => !visited.has(name) && remaining.get(name) === 0);
    if (job === undefined) throw new Error('Timing requires an acyclic dependency graph.');
    visited.add(job);
    order.push(job);
    for (const dependent of outgoing.get(job)) {
      remaining.set(dependent, remaining.get(dependent) - 1);
    }
  }

  const earliestStart = new Map();
  const earliestFinish = new Map();
  for (const job of order) {
    const start = Math.max(0, ...incoming.get(job).map(name => earliestFinish.get(name)));
    earliestStart.set(job, start);
    earliestFinish.set(job, start + durationByJob.get(job));
  }
  const projectDuration = Math.max(...earliestFinish.values());

  const latestStart = new Map();
  const latestFinish = new Map();
  for (const job of [...order].reverse()) {
    const successors = outgoing.get(job);
    const finish = successors.length
      ? Math.min(...successors.map(name => latestStart.get(name)))
      : projectDuration;
    latestFinish.set(job, finish);
    latestStart.set(job, finish - durationByJob.get(job));
  }

  const rows = frozenList(graph.jobs.map(job => {
    const totalSlack = latestStart.get(job) - earliestStart.get(job);
    return Object.freeze({
      job,
      duration: durationByJob.get(job),
      earliestStart: earliestStart.get(job),
      earliestFinish: earliestFinish.get(job),
      latestStart: latestStart.get(job),
      latestFinish: latestFinish.get(job),
      totalSlack,
      critical: totalSlack === 0,
    });
  }));
  const criticalJobs = frozenList(rows.filter(row => row.critical).map(row => row.job));
  const critical = new Set(criticalJobs);
  const inputIndex = new Map(graph.jobs.map((job, index) => [job, index]));
  const criticalEdges = frozenList(graph.edges
    .filter(([from, to]) => critical.has(from) && critical.has(to) &&
      earliestFinish.get(from) === earliestStart.get(to))
    .map(edge => frozenList(edge))
    .sort(([leftFrom, leftTo], [rightFrom, rightTo]) =>
      inputIndex.get(leftFrom) - inputIndex.get(rightFrom) ||
      inputIndex.get(leftTo) - inputIndex.get(rightTo)));

  const timing = Object.freeze({ projectDuration, rows, criticalJobs, criticalEdges });
  return Object.freeze({ graph, durations, graphAnalysis, timing });
}
