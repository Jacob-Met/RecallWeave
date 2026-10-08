/** A bounded teaching model. X -> Y means X must complete before Y. */
export const MAX_JOBS = 8;
export const MAX_NAME_CHARACTERS = 32;
export const MAX_EDGES = 64;
export const MAX_DRAFT_BYTES = 8192;
export const DEFAULT_ORDER_LIMIT = 12;
export const MAX_ORDER_LIMIT = 24;

const frozenList = values => Object.freeze([...values]);

function checkedName(value) {
  if (typeof value !== 'string' || !value || value.trim() !== value ||
      [...value].length > MAX_NAME_CHARACTERS || /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(value) ||
      value.includes('->') || value.includes('→') ||
      [...value].some(character => {
        const point = character.codePointAt(0);
        return point >= 0xd800 && point <= 0xdfff;
      })) {
    throw new Error('Use 1–32 characters per job name, without outer spaces, control characters or arrows.');
  }
  return value;
}

/** Copy and freeze the exact graph; prototype-like names are ordinary Map keys. */
export function validateGraph(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !Array.isArray(input.jobs) || input.jobs.length < 1 || input.jobs.length > MAX_JOBS) {
    throw new Error('Enter 1–8 jobs.');
  }
  const jobs = input.jobs.map(checkedName);
  if (new Set(jobs).size !== jobs.length) throw new Error('Job names must be unique and are case-sensitive.');
  if (!Array.isArray(input.edges) || input.edges.length > MAX_EDGES) {
    throw new Error('Enter at most 64 distinct dependency arrows.');
  }
  const known = new Set(jobs);
  const seen = new Set();
  const edges = input.edges.map(edge => {
    if (!Array.isArray(edge) || edge.length !== 2 || !known.has(edge[0]) || !known.has(edge[1])) {
      throw new Error('Every arrow needs two exact names from the job list.');
    }
    const key = JSON.stringify(edge);
    if (seen.has(key)) throw new Error('List each dependency arrow only once.');
    seen.add(key);
    return frozenList(edge);
  });
  return Object.freeze({ jobs: frozenList(jobs), edges: frozenList(edges) });
}

/** Plain text only: one name or directed arrow per nonempty line. */
export function parseGraph(jobsText, edgesText) {
  if (typeof jobsText !== 'string' || typeof edgesText !== 'string') {
    throw new Error('Enter job names and arrows as text.');
  }
  if (new TextEncoder().encode(jobsText + '\n' + edgesText).length > MAX_DRAFT_BYTES) {
    throw new Error('Keep the graph draft within 8 KiB of UTF-8 text.');
  }
  if (/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(jobsText + edgesText)) {
    throw new Error('Use ordinary text and line breaks; tabs and control characters are not allowed.');
  }
  const lines = text => text.split(/\r\n?|\n/u).map(line => line.trim()).filter(Boolean);
  const jobs = lines(jobsText);
  const edges = lines(edgesText).map((line, index) => {
    const names = line.split(/->|→/u).map(name => name.trim());
    if (names.length !== 2 || names.some(name => !name)) {
      throw new Error(`Arrow ${index + 1}: use exactly one arrow, for example A -> B.`);
    }
    return names;
  });
  return validateGraph({ jobs, edges });
}

function neighbors(graph) {
  const outgoing = new Map(graph.jobs.map(job => [job, []]));
  const incoming = new Map(graph.jobs.map(job => [job, []]));
  for (const [from, to] of graph.edges) {
    outgoing.get(from).push(to);
    incoming.get(to).push(from);
  }
  return { outgoing, incoming };
}

function historyFor(graph, completed) {
  if (!Array.isArray(completed) || completed.length > graph.jobs.length) {
    throw new Error('Completion history must be a valid ordered list of jobs.');
  }
  const { incoming } = neighbors(graph);
  const done = new Set();
  for (const job of completed) {
    if (!incoming.has(job) || done.has(job)) throw new Error('Completion history contains an unknown or repeated job.');
    if (incoming.get(job).some(prerequisite => !done.has(prerequisite))) {
      throw new Error('Completion history cannot finish a job before its prerequisites.');
    }
    done.add(job);
  }
  return frozenList(completed);
}

function reachedFrom(outgoing, origin) {
  const reached = new Set();
  const pending = [...outgoing.get(origin)];
  while (pending.length) {
    const job = pending.pop();
    if (reached.has(job)) continue;
    reached.add(job);
    pending.push(...outgoing.get(job));
  }
  return reached;
}

/** Positive-length reachability: origin appears only when an arrow path returns. */
export function reachableFrom(input, origin) {
  const graph = validateGraph(input);
  const { outgoing } = neighbors(graph);
  if (!outgoing.has(origin)) throw new Error('Choose a job in this graph.');
  const reached = reachedFrom(outgoing, origin);
  return frozenList(graph.jobs.filter(job => reached.has(job)));
}

function strongComponents(graph, outgoing) {
  const index = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const components = [];
  let nextIndex = 0;
  const visit = job => {
    index.set(job, nextIndex);
    low.set(job, nextIndex++);
    stack.push(job);
    onStack.add(job);
    for (const neighbor of outgoing.get(job)) {
      if (!index.has(neighbor)) {
        visit(neighbor);
        low.set(job, Math.min(low.get(job), low.get(neighbor)));
      } else if (onStack.has(neighbor)) {
        low.set(job, Math.min(low.get(job), index.get(neighbor)));
      }
    }
    if (low.get(job) === index.get(job)) {
      const component = new Set();
      let member;
      do {
        member = stack.pop();
        onStack.delete(member);
        component.add(member);
      } while (member !== job);
      components.push(frozenList(graph.jobs.filter(name => component.has(name))));
    }
  };
  for (const job of graph.jobs) if (!index.has(job)) visit(job);
  return components.sort((left, right) => graph.jobs.indexOf(left[0]) - graph.jobs.indexOf(right[0]));
}

/** Cycle membership and downstream blockage are separate graph properties. */
export function analyzeGraph(input, completed = []) {
  const graph = validateGraph(input);
  const history = historyFor(graph, completed);
  const done = new Set(history);
  const { outgoing, incoming } = neighbors(graph);
  const cycleComponents = strongComponents(graph, outgoing).filter(component =>
    component.length > 1 || outgoing.get(component[0]).includes(component[0]));
  const cycles = new Set(cycleComponents.flat());
  const downstream = new Set();
  for (const job of cycles) for (const reached of reachedFrom(outgoing, job)) downstream.add(reached);
  const rows = graph.jobs.map(job => {
    const prerequisites = graph.jobs.filter(name => incoming.get(job).includes(name));
    const unmet = prerequisites.filter(name => !done.has(name));
    const status = done.has(job) ? 'complete' : cycles.has(job) ? 'cycle' :
      downstream.has(job) ? 'blocked' : unmet.length ? 'waiting' : 'ready';
    return Object.freeze({ job, prerequisites: frozenList(prerequisites), unmet: frozenList(unmet), status });
  });
  return Object.freeze({
    completed: history,
    ready: frozenList(rows.filter(row => row.status === 'ready').map(row => row.job)),
    cycleComponents: frozenList(cycleComponents),
    cycleMembers: frozenList(graph.jobs.filter(job => cycles.has(job))),
    blockedByCycle: frozenList(graph.jobs.filter(job => downstream.has(job) && !cycles.has(job))),
    rows: frozenList(rows),
    remaining: frozenList(graph.jobs.filter(job => !done.has(job))),
    finished: history.length === graph.jobs.length,
  });
}

export function completeJob(input, completed, job) {
  const graph = validateGraph(input);
  const analysis = analyzeGraph(graph, completed);
  if (!analysis.ready.includes(job)) throw new Error('Choose a ready job. Its prerequisites must already be complete.');
  return frozenList([...analysis.completed, job]);
}

export function undoCompletion(input, completed) {
  const graph = validateGraph(input);
  return frozenList(historyFor(graph, completed).slice(0, -1));
}

export function resetCompletion(input, completed = []) {
  const graph = validateGraph(input);
  historyFor(graph, completed);
  return frozenList([]);
}

/** Full orders extending this prefix. Look one result past the cap before flagging it. */
export function enumerateCompletions(input, completed = [], limit = DEFAULT_ORDER_LIMIT) {
  const graph = validateGraph(input);
  const history = historyFor(graph, completed);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_ORDER_LIMIT) {
    throw new Error('The order display limit must be a whole number from 1 to 24.');
  }
  const { incoming } = neighbors(graph);
  const done = new Set(history);
  const orders = [];
  const visit = order => {
    if (order.length === graph.jobs.length) {
      orders.push(frozenList(order));
      return orders.length > limit;
    }
    for (const job of graph.jobs) {
      if (done.has(job) || incoming.get(job).some(prerequisite => !done.has(prerequisite))) continue;
      done.add(job);
      const enough = visit([...order, job]);
      done.delete(job);
      if (enough) return true;
    }
    return false;
  };
  visit([...history]);
  return Object.freeze({ orders: frozenList(orders.slice(0, limit)), truncated: orders.length > limit, limit });
}
