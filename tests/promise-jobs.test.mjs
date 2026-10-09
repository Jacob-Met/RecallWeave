import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SCENARIO_IDS, scenarioSources, runScenario } from '../tools/promise-jobs.mjs';
import { parseDeck, serializeDeck } from '../src/deck.mjs';

const expected = {
  "P01": [
    "start",
    "executor",
    "end",
    "value"
  ],
  "P02": [
    "sync",
    "A",
    "B"
  ],
  "P03": [
    "before",
    "caller",
    "after"
  ],
  "P04": [
    "sync",
    "then",
    "micro"
  ],
  "P05": [
    "A",
    "B",
    "C"
  ],
  "P06": [
    "releasedB",
    "releasedA",
    "A,B"
  ],
  "P07": [
    "released",
    "B"
  ],
  "P08": [
    "finally",
    "kept"
  ],
  "P09": [
    "then",
    "bad",
    "ok",
    "7"
  ],
  "P10": [
    "changed"
  ],
  "P11": [
    "draft"
  ],
  "P12": [
    "before:2"
  ]
};
const deckText = readFileSync(new URL('../courses/promise-jobs.json', import.meta.url), 'utf8');
const deck = parseDeck(deckText);
const tool = fileURLToPath(new URL('../tools/promise-jobs.mjs', import.meta.url));

for (const id of Object.keys(expected)) {
  test(id + ' executes the actual fixed example', async () => {
    assert.deepEqual(await runScenario(id), { id, lines: expected[id] });
  });
}

test('the complete course is admitted with exact question/code identities', () => {
  assert.equal(deck.items.length, 12);
  assert.deepEqual(deck.concepts, ['Synchronous start', 'Queued reactions',
    'Settlement and recovery', 'Values across suspension']);
  assert.deepEqual(deck.items.map(item => item.id), SCENARIO_IDS);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  const positions = [0, 0, 0, 0];
  for (const item of deck.items) {
    assert.equal(item.prompt, 'What exact log array is returned when this function is awaited?\n\n' + scenarioSources[item.id]);
    assert.deepEqual(JSON.parse(item.options[item.answer]), expected[item.id]);
    positions[item.answer] += 1;
  }
  assert.deepEqual(positions, [3, 3, 3, 3]);
  assert.ok(Buffer.byteLength(deckText, 'utf8') < 262144);
});

test('API rejects nonprimitive, aliased, absent and prototype IDs', async () => {
  for (const id of [undefined, null, 1, {}, [], new String('P01'), 'p01', ' P01', 'P01\n', 'P13', '__proto__', 'constructor']) {
    await assert.rejects(runScenario(id), RangeError);
  }
});

test('outputs are detached and repeated/concurrent calls have fresh local state', async () => {
  const first = await runScenario('P10');
  first.id = 'changed';
  first.lines[0] = 'changed';
  first.lines.push('extra');
  const observed = await Promise.all([runScenario('P10'), runScenario('P10'), runScenario('P11')]);
  assert.deepEqual(observed, [
    { id: 'P10', lines: expected.P10 }, { id: 'P10', lines: expected.P10 },
    { id: 'P11', lines: expected.P11 }
  ]);
  assert.notEqual(observed[0].lines, observed[1].lines);
});

test('public IDs and original function sources cannot be rewritten', () => {
  assert.ok(Object.isFrozen(SCENARIO_IDS));
  assert.ok(Object.isFrozen(scenarioSources));
  assert.throws(() => SCENARIO_IDS.push('P13'), TypeError);
  assert.throws(() => { scenarioSources.P01 = 'changed'; }, TypeError);
});

const cliObservations = [];
after(() => console.log('AUTHOR_CLI_CLOSURES ' + JSON.stringify(cliObservations)));

function child(args) {
  const result = spawnSync(process.execPath, [tool, ...args], {
    encoding: 'utf8', timeout: 5000, maxBuffer: 65536
  });
  cliObservations.push({ args, pid: result.pid, exit: result.status,
    signal: result.signal, error: result.error?.message || null,
    stdout: result.stdout, stderr: result.stderr });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  return result;
}

test('CLI emits exact complete list, one result and ordered all results', () => {
  for (const [args, value] of [
    [['--list'], SCENARIO_IDS],
    [['--scenario', 'P06'], { id: 'P06', lines: expected.P06 }],
    [['--all'], SCENARIO_IDS.map(id => ({ id, lines: expected[id] }))]
  ]) {
    const result = child(args);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
    assert.equal(result.stdout, JSON.stringify(value) + '\n');
  }
});

test('CLI help succeeds and invalid argument sets produce no partial stdout', () => {
  const help = child(['--help']);
  assert.equal(help.status, 0);
  assert.equal(help.stderr, '');
  assert.match(help.stdout, /--scenario P01/);
  for (const args of [[], ['--scenario'], ['--scenario', 'p01'],
    ['--scenario', 'P13'], ['--list', '--all'], ['--scenario', 'P01', '--scenario', 'P02'],
    ['--help', 'extra'], ['P01'], ['--all', '--all'], ['--scenario=P01']]) {
    const result = child(args);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /^Promise jobs: Use --list,/);
  }
});
