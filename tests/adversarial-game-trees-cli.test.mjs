import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const cli = join(repo, 'tools/adversarial-game-trees.mjs');
const fixtureRoot = mkdtempSync(join(process.env.RECALL_GAME_TREE_TEST_TMP || tmpdir(), 'recall-game-tree-cli-'));
const ordinary = join(repo, 'examples/adversarial-game-trees/worst-reply.json');
const before = readFileSync(ordinary);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const originalHash = hash(before);
function file(name, contents) {
  const path = join(fixtureRoot, name);
  writeFileSync(path, contents, { flag: 'wx' });
  return path;
}
function run(args, input = '') {
  const child = spawnSync(process.execPath, [cli, ...args], {
    cwd: repo, input, encoding: 'utf8', timeout: 5000, maxBuffer: 131072
  });
  assert.equal(child.error, undefined, child.error?.message);
  assert.equal(child.signal, null);
  assert.equal(hash(readFileSync(ordinary)), originalHash);
  return child;
}
function refused(args, input = '') {
  const child = run(args, input);
  assert.equal(child.status, 2);
  assert.equal(child.stdout, '');
  assert.match(child.stderr, /^Game tree refused: /);
  assert.ok(Buffer.byteLength(child.stderr) <= 1024);
}
const literal = JSON.stringify({ rootPlayer: 'MIN', tree: { id: 'Only', utility: -7 } });
const invalidJSON = file('invalid.json', '{"rootPlayer":');
const invalidUTF8 = file('invalid-utf8.json', Buffer.from([0xc3, 0x28]));
const bom = file('bom.json', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(literal)]));
const boundary = file('boundary.json', literal.padEnd(32768, ' '));
const oversized = file('oversized.json', literal.padEnd(32769, ' '));
const alias = join(fixtureRoot, 'symlink.json');
symlinkSync(ordinary, alias);

test('ordinary file JSON reports exact choice and a strict upper-bound cutoff', () => {
  const child = run(['--tree', ordinary, '--json']);
  assert.equal(child.status, 0);
  assert.equal(child.stderr, '');
  assert.ok(child.stdout.endsWith('\n'));
  const result = JSON.parse(child.stdout);
  assert.equal(result.minimax.value, 4);
  assert.equal(result.minimax.chosenChild, 'Oak');
  assert.deepEqual(result.minimax.principalVariation, ['R', 'Oak', 'O4']);
  assert.equal(result.minimax.nodes.find(node => node.id === 'Pine').value, -6);
  assert.equal(result.alphaBeta.visitedLeafCount, 3);
  assert.deepEqual(result.alphaBeta.cutoffs, [{
    nodeId: 'Pine', role: 'MIN', bound: 'upper', boundValue: 1,
    alpha: 4, beta: 1, skippedChildIds: ['Pm6']
  }]);
});

test('readable ordinary output explains reference/search separation and bound direction', () => {
  const child = run(['--tree', ordinary]);
  assert.equal(child.status, 0);
  assert.equal(child.stderr, '');
  assert.match(child.stdout, /Exact minimax value: 4/);
  assert.match(child.stdout, /Chosen root move: Oak/);
  assert.match(child.stdout, /upper bound 1/);
  assert.match(child.stdout, /not an exact-value claim/);
  assert.match(child.stdout, /exclude the full reference calculation/);
  assert.match(child.stdout, /not a timing measurement/);
});

test('stdin and exact byte-boundary file preserve terminal MIN utility', () => {
  for (const [args, input] of [[['--stdin', '--json'], literal], [['--tree', boundary, '--json'], '']]) {
    const child = run(args, input);
    assert.equal(child.status, 0);
    assert.equal(child.stderr, '');
    const result = JSON.parse(child.stdout);
    assert.equal(result.minimax.value, -7);
    assert.equal(result.minimax.chosenChild, null);
    assert.deepEqual(result.minimax.principalVariation, ['Only']);
    assert.equal(result.alphaBeta.visitedLeafCount, 1);
  }
});

test('help is explicit and requires no file or input', () => {
  const child = run(['--help']);
  assert.equal(child.status, 0);
  assert.equal(child.stderr, '');
  assert.match(child.stdout, /--tree PATH/);
  assert.match(child.stdout, /--stdin/);
  assert.match(child.stdout, /32768/);
});

test('ambiguous, duplicate, missing and unknown arguments refuse', () => {
  const cases = [
    [], ['--unknown'], ['--tree'], ['--help', '--json'],
    ['--tree', ordinary, '--stdin'], ['--stdin', '--stdin'],
    ['--tree', ordinary, '--tree', ordinary], ['--stdin', '--json', '--json'],
    ['--tree', '--json']
  ];
  for (const args of cases) refused(args, literal);
});

test('unsafe file kinds, missing files, malformed encodings and excessive bytes refuse', () => {
  for (const path of [fixtureRoot, alias, join(fixtureRoot, 'missing.json'), invalidJSON, invalidUTF8, bom, oversized]) {
    refused(['--tree', path, '--json']);
  }
  refused(['--stdin', '--json'], literal.padEnd(32769, ' '));
});

test('empty or unsupported model input never emits a successful analysis', () => {
  for (const input of ['', 'null', '{"rootPlayer":"MAX","tree":{"id":"R","utility":1.5}}',
    '{"rootPlayer":"MAX","tree":{"id":"R","utility":1},"probability":0.5}']) {
    refused(['--stdin', '--json'], input);
  }
});

// Fixtures are retained so a native receiving wrapper can bind their exact bytes.
// The caller can place them beneath its private cap with RECALL_GAME_TREE_TEST_TMP.
