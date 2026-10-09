import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync, openSync, closeSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.RECALLWEAVE_SOURCE_ROOT
  ? resolve(process.env.RECALLWEAVE_SOURCE_ROOT) : resolve(here, '..');
const fixture = JSON.parse(readFileSync(join(here, 'fixtures/polynomial-interpolation-receiving.json'), 'utf8'));
const load = name => import(pathToFileURL(join(root, 'src', name)).href);
const model = async () => (await load('polynomial-interpolation.mjs')).interpolatePolynomial;
const command = join(root, 'tools/interpolate-polynomial.mjs');
const interpretation = 'Exact interpolation reproduces the supplied nodes. It is not an error bound or a guarantee about a function between or outside those nodes.';
const limits = { maxPoints: 8, maxQueries: 16, maxTokenCharacters: 32, maxNumerator: 1000000000, maxDenominator: 1000000, maxDecimalPlaces: 6 };
const sha = value => createHash('sha256').update(value).digest('hex');
const copy = value => structuredClone(value);
function freeze(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return Object.freeze(value);
}
function run(args, options = {}) {
  const result = spawnSync(process.execPath, [command, ...args], { encoding: 'utf8', timeout: 10000, ...options });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.signal, null);
  return result;
}
function baseShape(result, input) {
  assert.equal(result.format, 'recallweave-polynomial-interpolation/1');
  assert.deepEqual(result.input, input);
  assert.notStrictEqual(result.input, input);
  assert.notStrictEqual(result.input.points, input.points);
  assert.deepEqual(result.limits, limits);
  assert.equal(result.interpretation, interpretation);
}
function withDirectory(callback) {
  const directory = mkdtempSync(join(tmpdir(), 'recall-polynomial-peer-'));
  try { return callback(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('original deck serialization and bounded missed-item review remain actual native consumers', async () => {
  const { parseDeck, serializeDeck } = await load('deck.mjs');
  const { createReview, beginPractice, currentPracticeItem, answerPractice } = await load('review.mjs');
  const raw = readFileSync(join(root, 'courses/least-squares.json'), 'utf8');
  const deck = parseDeck(raw);
  assert.equal(deck.items.length, 16);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  const [first, second] = deck.items;
  const answers = [{ item: first.id, choice: (first.answer + 1) % first.options.length }, { item: second.id, choice: second.answer }];
  const review = createReview(deck.items, answers);
  const before = JSON.stringify({ deck, answers, review });
  const practice = beginPractice(review);
  assert.equal(currentPracticeItem(practice).id, first.id);
  const done = answerPractice(practice, first.id, first.answer);
  assert.equal(done.answers[0].correct, true);
  assert.equal(currentPracticeItem(done), null);
  assert.equal(JSON.stringify({ deck, answers, review }), before);
});

test('an unsorted rational cubic has the independently derived triangle, forms and exact location evidence', async () => {
  const interpolate = await model();
  const expected = fixture.cubic;
  const input = freeze(copy(expected.input));
  const before = JSON.stringify(input);
  const result = interpolate(input);
  baseShape(result, input);
  assert.deepEqual(result.nodes, expected.nodes.map((x, index) => ({ index, x, y: expected.ys[index] })));
  assert.deepEqual(result.dividedDifferences, expected.triangle);
  assert.deepEqual(result.newtonCoefficients, expected.newton);
  assert.deepEqual(result.monomialCoefficients, expected.monomial);
  assert.equal(result.degree, 3);
  assert.deepEqual(result.sampleRange, expected.range);
  assert.deepEqual(result.nodeChecks, expected.nodes.map((x, index) => ({ index, x, expected: expected.ys[index], actual: expected.ys[index], ok: true })));
  assert.deepEqual(result.evaluations, input.at.map((value, index) => ({ index, input: value, x: expected.query_x[index], value: expected.values[index], relation: expected.relations[index] })));
  assert.equal(JSON.stringify(input), before);
  assert.notStrictEqual(result.input.points[0], input.points[0]);
});

test('permuting eight samples preserves a lower-degree polynomial while zero and constant degrees differ', async () => {
  const interpolate = await model();
  const expected = fixture.quadratic;
  const input = freeze(copy(expected.input));
  const reordered = freeze({ points: expected.permutation.map(i => copy(input.points[i])), at: copy(input.at) });
  const a = interpolate(input), b = interpolate(reordered);
  for (const [result, source] of [[a, input], [b, reordered]]) {
    baseShape(result, source);
    assert.deepEqual(result.monomialCoefficients, expected.monomial);
    assert.equal(result.degree, 2);
    assert.equal(result.newtonCoefficients.length, 8);
    assert.deepEqual(result.newtonCoefficients.slice(3), ['0', '0', '0', '0', '0']);
    assert.deepEqual(result.dividedDifferences.map(row => row.length), [8, 7, 6, 5, 4, 3, 2, 1]);
    assert.deepEqual(result.evaluations.map(x => x.value), expected.values);
    assert.deepEqual(result.evaluations.map(x => x.relation), expected.relations);
    assert.deepEqual(result.sampleRange, { min: '-3', max: '4' });
    assert.deepEqual(result.nodeChecks.map(x => [x.index, x.actual, x.expected, x.ok]), source.points.map((point, index) => [index, point.y, point.y, true]));
  }
  assert.notDeepEqual(a.newtonCoefficients, b.newtonCoefficients);
  const zero = interpolate({ points: [{ x: ' 2/4 ', y: '-0.000000' }], at: ['+0.5', '-0', '1'] });
  assert.equal(zero.degree, null);
  assert.deepEqual(zero.monomialCoefficients, ['0']);
  assert.deepEqual(zero.evaluations.map(x => [x.value, x.relation]), [['0', 'node'], ['0', 'outside'], ['0', 'outside']]);
  const constant = interpolate({ points: [{ x: '-1000000000', y: '1000000000/1000000' }, { x: '1000000000', y: '1000.000000' }], at: ['0'] });
  assert.equal(constant.degree, 0);
  assert.deepEqual(constant.monomialCoefficients, ['1000']);
  assert.equal(constant.evaluations[0].value, '1000');
  assert.equal(constant.evaluations[0].relation, 'inside');
});

test('duplicate rational nodes, typed coordinates and admission bounds refuse without touching caller evidence', async () => {
  const interpolate = await model();
  const valid = () => ({ points: [{ x: '0', y: '1' }], at: [] });
  const cases = [
    { points: [{ x: '1/2', y: '3' }, { x: '+0.500000', y: '3' }], at: [] },
    { points: [{ x: '-0', y: '3' }, { x: '+000.000000', y: '4' }], at: [] },
    { points: [], at: [] },
    { points: Array.from({ length: 9 }, (_, x) => ({ x: String(x), y: '1' })), at: [] },
    { points: [{ x: '0', y: '1' }], at: Array(17).fill('0') },
    { points: [{ x: '0', y: '1' }], at: [], confidence: 'not evidenced' },
    { points: [{ x: '0', y: '1', weight: '2' }], at: [] },
    { points: [{ x: '0', y: '1' }] }
  ];
  for (const bad of [0, false, null, '1e2', 'NaN', '1/0', '1/-2', '1000000001/2', '2/2000000', '.5', '1.', '0.0000001', ' '.repeat(32) + '0']) {
    const input = valid(); input.points[0].x = bad; cases.push(input);
  }
  for (const input of cases) {
    const before = JSON.stringify(input);
    assert.throws(() => interpolate(freeze(input)));
    assert.equal(JSON.stringify(input), before);
  }
  let reads = 0;
  const point = { y: '1' };
  Object.defineProperty(point, 'x', { enumerable: true, get() { reads++; return '0'; } });
  assert.throws(() => interpolate({ points: [point], at: [] }));
  assert.equal(reads, 0);
});

test('the actual file, stdin and literal dash-file CLI emit one identical complete exact JSON without writes', async () => {
  const interpolate = await model();
  const input = copy(fixture.cubic.input);
  const expected = JSON.stringify(interpolate(input), null, 2) + '\n';
  const source = Buffer.from(JSON.stringify(input, null, 2) + '\n');
  withDirectory(directory => {
    const filename = join(directory, 'authored polynomial.json');
    writeFileSync(filename, source);
    writeFileSync(join(directory, '-'), source);
    const before = readdirSync(directory).sort();
    const file = run([filename]);
    const stdin = run(['-'], { input: source });
    const literal = run(['./-', '--format', 'json'], { cwd: directory });
    const boundary = run(['-'], { input: Buffer.concat([source, Buffer.alloc(65536 - source.length, 32)]) });
    for (const result of [file, stdin, literal, boundary]) {
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stderr, '');
      assert.equal(result.stdout, expected);
    }
    assert.deepEqual(readFileSync(filename), source);
    assert.deepEqual(readFileSync(join(directory, '-')), source);
    assert.deepEqual(readdirSync(directory).sort(), before);
    const help = run(['--help']);
    assert.equal(help.status, 0);
    assert.ok(help.stdout.length > 0);
    assert.equal(help.stderr, '');
  });
});

test('real CLI malformed input and I/O boundaries refuse with no partial-success stdout or input changes', async () => {
  await model();
  const source = Buffer.from(JSON.stringify(fixture.cubic.input));
  withDirectory(directory => {
    const filename = join(directory, 'source.json'); writeFileSync(filename, source);
    const before = sha(readFileSync(filename));
    const duplicate = Buffer.from(JSON.stringify({ points: [{ x: '1/2', y: '1' }, { x: '0.5', y: '2' }], at: [] }));
    const refused = [
      run([]), run([filename, '--unknown']), run([filename, '--format', 'csv']),
      run(['-'], { input: '{' }), run(['-'], { input: Buffer.from([0xc3, 0x28]) }),
      run(['-'], { input: duplicate }), run(['-'], { input: Buffer.alloc(65537, 32) })
    ];
    for (const result of refused) {
      assert.equal(result.status, 2, result.stderr);
      assert.equal(result.stdout, '');
      assert.ok(result.stderr.length > 0);
    }
    const missing = run([join(directory, 'absent.json')]);
    assert.equal(missing.status, 1);
    assert.equal(missing.stdout, '');
    assert.ok(missing.stderr.length > 0);
    if (existsSync('/dev/full')) {
      const fd = openSync('/dev/full', 'w');
      try {
        const failedOutput = run([filename], { stdio: ['ignore', fd, 'pipe'] });
        assert.equal(failedOutput.status, 1, failedOutput.stderr);
        assert.ok(failedOutput.stderr.length > 0);
      } finally { closeSync(fd); }
    }
    assert.equal(sha(readFileSync(filename)), before);
    assert.deepEqual(readdirSync(directory), ['source.json']);
  });
});
