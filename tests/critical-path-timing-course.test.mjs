import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDeck, serializeDeck } from '../src/deck.mjs';
import { analyzeTiming } from '../src/dependency-timing.mjs';

const courseText = readFileSync(new URL('../courses/critical-path-timing.json', import.meta.url), 'utf8');
const deck = parseDeck(courseText);
const guide = readFileSync(new URL('../courses/critical-path-timing.md', import.meta.url), 'utf8');
const concepts = ['earliest-finish', 'latest-times-and-slack', 'critical-branches', 'scope-and-changes'];

function scenarioFromPrompt(prompt) {
  const entries = [...prompt.matchAll(/\b([A-Z][A-Za-z]*)=(\d+)\b/g)]
    .map(match => [match[1], Number(match[2])]);
  assert.ok(entries.length > 0, 'the literal prompt supplies job durations');
  assert.equal(new Set(entries.map(([job]) => job)).size, entries.length);
  const edgeText = prompt.match(/\bonly edges:? ([^.]+)\./i)?.[1] ?? '';
  const edges = [...edgeText.matchAll(/([A-Z][A-Za-z]*) → ([A-Z][A-Za-z]*)/g)]
    .map(match => [match[1], match[2]]);
  return { graph: { jobs: entries.map(([job]) => job), edges }, durations: new Map(entries) };
}

// Independent small-instance reference: enumerate complete source-to-sink paths.
// No earliest/latest topological passes from the native timing model are copied.
function pathsReference({ graph, durations }) {
  const next = new Map(graph.jobs.map(job => [job, []]));
  const before = new Map(graph.jobs.map(job => [job, []]));
  for (const [from, to] of graph.edges) {
    assert.ok(next.has(from) && next.has(to));
    next.get(from).push(to);
    before.get(to).push(from);
  }
  const reach = new Map(graph.jobs.map(job => [job, new Set()]));
  for (const start of graph.jobs) {
    const work = [...next.get(start)];
    while (work.length) {
      const job = work.pop();
      if (reach.get(start).has(job)) continue;
      reach.get(start).add(job);
      work.push(...next.get(job));
    }
  }
  const cycleMembers = graph.jobs.filter(job => reach.get(job).has(job));
  if (cycleMembers.length) {
    return {
      timing: null,
      cycleMembers,
      blockedByCycle: graph.jobs.filter(job => !cycleMembers.includes(job) &&
        cycleMembers.some(member => reach.get(member).has(job))),
      ready: graph.jobs.filter(job => before.get(job).length === 0),
    };
  }
  const paths = [];
  const walk = path => {
    const children = next.get(path.at(-1));
    if (!children.length) paths.push(path);
    else for (const child of children) walk([...path, child]);
  };
  for (const source of graph.jobs.filter(job => before.get(job).length === 0)) walk([source]);
  const weight = path => path.reduce((sum, job) => sum + durations.get(job), 0);
  const projectDuration = Math.max(...paths.map(weight));
  const rows = graph.jobs.map(job => {
    const through = paths.filter(path => path.includes(job));
    assert.ok(through.length > 0);
    const earliestStart = Math.max(...through.map(path => weight(path.slice(0, path.indexOf(job)))));
    const latestStart = projectDuration -
      Math.max(...through.map(path => weight(path.slice(path.indexOf(job)))));
    const duration = durations.get(job);
    return {
      job, duration, earliestStart, earliestFinish: earliestStart + duration,
      latestStart, latestFinish: latestStart + duration,
      totalSlack: latestStart - earliestStart, critical: latestStart === earliestStart,
    };
  });
  const byJob = new Map(rows.map(row => [row.job, row]));
  const criticalJobs = rows.filter(row => row.critical).map(row => row.job);
  const criticalEdges = graph.edges.filter(([from, to]) =>
    byJob.get(from).critical && byJob.get(to).critical &&
    byJob.get(from).earliestFinish === byJob.get(to).earliestStart)
    .sort(([af, at], [bf, bt]) =>
      graph.jobs.indexOf(af) - graph.jobs.indexOf(bf) ||
      graph.jobs.indexOf(at) - graph.jobs.indexOf(bt));
  return { timing: { projectDuration, rows, criticalJobs, criticalEdges } };
}

function nativeResult(scenario) {
  return analyzeTiming(scenario.graph, [...scenario.durations].map(([job, duration]) => ({ job, duration })));
}
function applyStatedDurationChange(scenario, prompt) {
  const match = prompt.match(/(?:Change|Increase) only ([A-Za-z]+)'s duration from (\d+) to (\d+)/);
  assert.ok(match, 'a change question must state its old and new duration');
  assert.equal(scenario.durations.get(match[1]), Number(match[2]));
  scenario.durations.set(match[1], Number(match[3]));
  return scenario;
}
function timingRow(result, name) {
  return result.timing.rows.find(row => row.job === name);
}
function referenceFor(item) {
  const scenario = scenarioFromPrompt(item.prompt);
  if (['ct-critical-2', 'ct-change-1', 'ct-change-2'].includes(item.id)) {
    applyStatedDurationChange(scenario, item.prompt);
  }
  return { scenario, reference: pathsReference(scenario) };
}

function expectedChoice(item) {
  const { scenario, reference } = referenceFor(item);
  const row = name => timingRow(reference, name);
  switch (item.id) {
    case 'ct-early-1':
    case 'ct-early-2':
    case 'ct-early-4':
    case 'ct-critical-2':
      return reference.timing.projectDuration + ' units';
    case 'ct-early-3':
      return 'Time ' + row('Pack').earliestStart;
    case 'ct-slack-1':
      return 'Time ' + row('Draft').latestStart;
    case 'ct-slack-2': {
      const slack = row('Draft').totalSlack;
      return slack + (slack === 1 ? ' unit' : ' units');
    }
    case 'ct-slack-3':
      return '(' + row('First').latestStart + ', ' + row('Second').latestStart + ')';
    case 'ct-slack-4': {
      // This question adds waits absent from the native duration-only model.
      // Calculate the stated event timeline separately, with two distinct waits.
      assert.match(item.prompt, /Long starts at time 0/);
      assert.match(item.prompt, /three-unit wait before First, so First starts at time 3/);
      assert.match(item.prompt, /After First finishes, add a separate three-unit wait before Second starts/);
      const firstEnd = 3 + scenario.durations.get('First');
      const secondEnd = firstEnd + 3 + scenario.durations.get('Second');
      const joinStart = Math.max(scenario.durations.get('Long'), secondEnd);
      return (joinStart + scenario.durations.get('Join')) + ' units';
    }
    case 'ct-critical-1':
      return '{' + reference.timing.criticalJobs.join(', ') + '}';
    case 'ct-critical-3': {
      assert.ok(row('Start').critical && row('Done').critical);
      assert.notEqual(row('Start').earliestFinish, row('Done').earliestStart);
      return 'It is not tight critical: Start finishes at ' + row('Start').earliestFinish +
        ', while Done starts at ' + row('Done').earliestStart + '.';
    }
    case 'ct-critical-4': {
      assert.equal(row('Start').totalSlack, 0);
      const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
      return 'Start has zero slack; disconnected Note has ' + words[row('Note').totalSlack] +
        ' units of slack.';
    }
    case 'ct-change-1':
      assert.equal(row('Draft').totalSlack, 0);
      assert.equal(row('Review').totalSlack, 0);
      return 'Finish remains ' + reference.timing.projectDuration +
        '; Draft and Review now both have zero slack.';
    case 'ct-change-2':
      assert.equal(row('Draft').totalSlack, 0);
      assert.equal(row('Review').totalSlack, 1);
      return 'Finish ' + reference.timing.projectDuration +
        '; Draft has zero slack and Review has one unit.';
    case 'ct-change-3':
      assert.equal(reference.timing, null);
      assert.deepEqual(reference.cycleMembers, ['X', 'Y']);
      assert.deepEqual(reference.blockedByCycle, ['Z']);
      assert.deepEqual(reference.ready, ['Free']);
      return 'Refuse whole-plan timing: X and Y are cycle members, Z is blocked downstream, ' +
        'and Free is independently ready.';
    case 'ct-change-4':
      assert.equal(reference.timing.projectDuration, 7);
      assert.match(item.prompt, /limited workers, calendar closures and uncertain durations/);
      return 'Seven is the earliest finish under the stated model; the omitted constraints need separate analysis.';
    default:
      assert.fail('No mathematical/content check for ' + item.id);
  }
}
function checkChoices(candidate) {
  for (const item of candidate.items) {
    assert.equal(item.options.filter(option => option === expectedChoice(item)).length, 1, item.id);
    assert.equal(item.options[item.answer], expectedChoice(item), item.id);
  }
}

test('the literal sixteen-question course fits the existing importer and concept graph', () => {
  assert.equal(deck.format, 'recallweave-deck/1');
  assert.equal(deck.items.length, 16);
  assert.deepEqual(deck.concepts, concepts);
  assert.equal(new Set(deck.items.map(item => item.id)).size, 16);
  for (const [index, concept] of concepts.entries()) {
    const items = deck.items.filter(item => item.concept === concept);
    assert.equal(items.length, 4);
    for (const item of items) {
      assert.equal(item.options.length, 4);
      assert.equal(new Set(item.options).size, 4);
      assert.deepEqual(item.prerequisites, index ? [concepts[index - 1]] : []);
      assert.match(item.prompt, /abstract time units/);
      assert.match(item.prompt, /unlimited parallelism/);
      assert.match(item.prompt, /X → Y means X must finish before Y starts/);
      assert.ok(item.explanation.trim() && item.transfer.trim());
    }
  }
  assert.deepEqual([0, 1, 2, 3].map(answer => deck.items.filter(item => item.answer === answer).length),
    [4, 4, 4, 4]);
  assert.match(deck.attribution, /Original/);
  assert.match(deck.license, /CC BY 4\.0/);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.ok(Object.isFrozen(deck) && deck.items.every(Object.isFrozen));
});

test('each chosen answer is derived from its literal prompt, with a distinct explicit-wait calculation', () => {
  checkChoices(deck);
});

test('independent complete-path calculations match the unchanged native consumer for every prompt graph', () => {
  for (const item of deck.items) {
    const { scenario, reference } = referenceFor(item);
    const native = nativeResult(scenario);
    assert.deepEqual(native.timing, reference.timing, item.id);
    if (reference.timing === null) {
      assert.deepEqual(native.graphAnalysis.cycleMembers, reference.cycleMembers);
      assert.deepEqual(native.graphAnalysis.blockedByCycle, reference.blockedByCycle);
      assert.deepEqual(native.graphAnalysis.ready, reference.ready);
    }
  }
});

test('the two tied-branch and all-zero transfer variants keep their stated meanings', () => {
  const tied = scenarioFromPrompt(deck.items.find(item => item.id === 'ct-critical-1').prompt);
  tied.durations.set('Draft', 3);
  tied.durations.set('Review', 3);
  assert.equal(pathsReference(tied).timing.projectDuration, 6);
  assert.deepEqual(nativeResult(tied).timing, pathsReference(tied).timing);
  const zero = scenarioFromPrompt(deck.items.find(item => item.id === 'ct-critical-4').prompt);
  for (const job of zero.graph.jobs) zero.durations.set(job, 0);
  const result = pathsReference(zero).timing;
  assert.equal(result.projectDuration, 0);
  assert.deepEqual(result.criticalJobs, zero.graph.jobs);
  assert.ok(result.rows.every(row => row.totalSlack === 0));
  assert.deepEqual(nativeResult(zero).timing, result);
});

test('one shifted branch and two separate waits are not conflated', () => {
  const scenario = scenarioFromPrompt(deck.items.find(item => item.id === 'ct-slack-4').prompt);
  const firstEnd = 3 + scenario.durations.get('First');
  const oneWaitSecondEnd = firstEnd + scenario.durations.get('Second');
  const oneWaitFinish = Math.max(scenario.durations.get('Long'), oneWaitSecondEnd) +
    scenario.durations.get('Join');
  assert.equal(oneWaitFinish, 6);
  const twoWaitSecondEnd = firstEnd + 3 + scenario.durations.get('Second');
  assert.equal(twoWaitSecondEnd, 8);
  assert.equal(Math.max(scenario.durations.get('Long'), twoWaitSecondEnd) +
    scenario.durations.get('Join'), 9);
  assert.match(guide, /companion has no arbitrary/);
  assert.match(guide, /another three-unit wait after First finishes and before Second/);
});

test('schema-valid wrong finish and false tight-shortcut keys are rejected', () => {
  for (const id of ['ct-early-2', 'ct-critical-3']) {
    const wrong = JSON.parse(courseText);
    wrong.items.find(item => item.id === id).answer = 0;
    const admitted = parseDeck(JSON.stringify(wrong));
    assert.equal(admitted.items.length, 16);
    assert.throws(() => checkChoices(admitted), { name: 'AssertionError' });
  }
});

test('a changed duration cannot silently reuse the old key', () => {
  const wrong = JSON.parse(courseText);
  const item = wrong.items.find(candidate => candidate.id === 'ct-early-2');
  item.prompt = item.prompt.replace('Prep=2', 'Prep=3');
  const admitted = parseDeck(JSON.stringify(wrong));
  assert.equal(expectedChoice(admitted.items.find(candidate => candidate.id === item.id)), '8 units');
  assert.throws(() => checkChoices(admitted), { name: 'AssertionError' });
});

test('the worked guide covers every question and names the existing learner and model limits', () => {
  for (const item of deck.items) assert.ok(guide.includes(item.id), item.id);
  for (const token of [
    'critical-path-timing.json', 'dependency-timing.html', 'Bring your own lesson',
    'Start this deck', 'Download study notes (.txt)', 'CC BY 4.0',
    'independent', 'calendar', 'worker', 'uncertain', 'ESD.36',
  ]) assert.ok(guide.includes(token), token);
});
