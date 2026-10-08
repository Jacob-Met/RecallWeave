import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
import {analyze, EXAMPLES, LIMITS, parseCoordinate, parseScalar, rationalText, rationalNumber} from '../courses/least-squares-core.mjs';
import {parseDeck, serializeDeck} from '../src/deck.mjs';

const show = rationalText;
const pts = rows => rows.map(([x, y]) => ({x, y}));
const noisy = pts([[-2, -1], [0, 0], [2, 3]]);
const checkFit = (result, a, b, sse) => {
  assert.equal(result.fit.kind, 'unique');
  assert.equal(show(result.fit.intercept), a);
  assert.equal(show(result.fit.slope), b);
  assert.equal(show(result.fit.sse), sse);
};

test('written scalars retain exact decimal/fraction intent and bounded admission', () => {
  for (const [input, expected] of [['0.125', '1/8'], ['-0.125', '-1/8'], ['2/3', '2/3'],
    ['-4/-6', '2/3'], ['+000', '0'], ['999999999/999999999', '1'], ['1000', '1000']]) {
    assert.equal(show(parseScalar(input)), expected);
  }
  assert.equal(parseCoordinate(' -020 '), -20);
  assert.equal(Object.is(parseCoordinate('-0'), -0), false);
  for (const bad of ['', '.5', '1e2', 'Infinity', 'NaN', '1/0', '1.0001', '1001', '1/1000000000', '2 / 3', '2/3/4']) {
    assert.throws(() => parseScalar(bad), undefined, bad);
  }
  for (const bad of ['', '0.5', '21', '-21', '1e1', '0x10', null]) assert.throws(() => parseCoordinate(bad));
  assert.throws(() => parseScalar('41', {limit: LIMITS.query}));
  assert.throws(() => parseScalar(1));
});

test('noisy example has exact coefficients, each residual, and the minimum identity', () => {
  const r = analyze(noisy);
  checkFit(r, '2/3', '1', '2/3');
  assert.deepEqual(r.fit.rows.map(x => show(x.residual)), ['1/3', '-2/3', '1/3']);
  assert.deepEqual(r.fit.rows.map(x => show(x.squared)), ['1/9', '4/9', '1/9']);
  assert.equal(show(r.trial.sse), '2');
  assert.equal(show(r.excessSSE), '4/3');
  assert.equal(show(r.decomposition.meanTerm), '4/3');
  assert.equal(show(r.decomposition.slopeTerm), '0');
  assert.equal(show(r.fit.residualSum), '0');
  assert.equal(show(r.fit.xResidualSum), '0');
  assert.equal(show(r.prediction.value), '5/3');
  assert.equal(r.prediction.kind, 'in_range');
});

test('changing the middle point changes the intercept and flips residuals without inventing zero SSE', () => {
  const r = analyze(pts([[-2, -1], [0, 2], [2, 3]]));
  checkFit(r, '4/3', '1', '2/3');
  assert.deepEqual(r.fit.rows.map(x => show(x.residual)), ['-1/3', '2/3', '-1/3']);
});

test('all authored examples have independently worked exact outcomes', () => {
  const expected = {
    noisy: ['2/3', '1', '2/3'], perfect: ['1', '2', '0'], curved: ['2', '0', '14'],
    repeated: ['1', '1/2', '2'], influential: ['500/251', '-289/251', '2400/251']
  };
  for (const example of EXAMPLES) {
    const r = analyze(example.points, example);
    if (example.id !== 'equal-x') checkFit(r, ...expected[example.id]);
    else assert.equal(r.fit.kind, 'underdetermined');
  }
});

test('all-equal x determines the shared fitted value and minimum, not arbitrary coefficients', () => {
  const data = pts([[3, 1], [3, 3], [3, 5]]);
  for (const [intercept, slope] of [['0', '1'], ['3', '0'], ['-3', '2'], ['7/3', '2/9']]) {
    const r = analyze(data, {intercept, slope, query: '3'});
    assert.equal(r.fit.kind, 'underdetermined');
    assert.equal(r.fit.intercept, null); assert.equal(r.fit.slope, null);
    assert.equal(show(r.fit.sse), '8'); assert.equal(show(r.trial.sse), '8');
    assert.equal(show(r.excessSSE), '0');
    assert.equal(r.prediction.kind, 'shared_x_only'); assert.equal(show(r.prediction.value), '3');
    assert.deepEqual(r.fit.rows.map(x => show(x.predicted)), ['3', '3', '3']);
  }
  const outside = analyze(data, {query: '4'});
  assert.equal(outside.prediction.kind, 'underdetermined'); assert.equal(outside.prediction.value, null);
  const poor = analyze(data, {intercept: '0', slope: '0', query: '3'});
  assert.equal(show(poor.trial.sse), '35'); assert.equal(show(poor.excessSSE), '27');
  assert.equal(show(poor.decomposition.meanTerm), '27'); assert.equal(show(poor.decomposition.slopeTerm), '0');
});

test('ordinary repeated x and duplicate points count as rows; constant y is a valid unique horizontal fit', () => {
  checkFit(analyze(pts([[0, 0], [0, 2], [2, 2]])), '1', '1/2', '2');
  const doubled = analyze([...noisy, ...noisy]);
  checkFit(doubled, '2/3', '1', '4/3'); assert.equal(doubled.count, 6);
  checkFit(analyze(pts([[-2, 4], [0, 4], [0, 4], [2, 4]])), '4', '0', '0');
  const two = analyze(pts([[0, 0], [0, 2]]), {query: '0'});
  assert.equal(two.fit.kind, 'underdetermined'); assert.equal(show(two.fit.sse), '2');
});

test('translation, x-unit change and row permutation preserve the appropriate exact quantities', () => {
  checkFit(analyze(noisy.map(p => ({x: p.x, y: p.y + 7}))), '23/3', '1', '2/3');
  checkFit(analyze(noisy.map(p => ({x: 2 * p.x, y: p.y}))), '2/3', '1/2', '2/3');
  checkFit(analyze(noisy.map(p => ({x: 2 * p.x + 1, y: 3 * p.y - 2}))), '-3/2', '3/2', '6');
  checkFit(analyze([...noisy].reverse()), '2/3', '1', '2/3');
});

test('extreme admitted geometry produces copyable exact coefficients without display rounding', () => {
  const r = analyze(pts([[19, -20], [20, 20]]), {query: '40'});
  checkFit(r, '-780', '40', '0');
  assert.equal(show(r.prediction.value), '820'); assert.equal(r.prediction.kind, 'extrapolation');
  const copy = analyze(r.points, {intercept: show(r.fit.intercept), slope: show(r.fit.slope), query: '40'});
  assert.equal(show(copy.excessSSE), '0');
  const exactCopy = analyze(noisy, {intercept: '2/3', slope: '1'});
  assert.equal(show(exactCopy.excessSSE), '0');
  assert.notEqual(show(analyze(noisy, {intercept: '0.667', slope: '1'}).excessSSE), '0');
});

test('prediction location uses exact rational comparison at both endpoints', () => {
  assert.equal(analyze(noisy, {query: '-2'}).prediction.kind, 'in_range');
  assert.equal(analyze(noisy, {query: '2'}).prediction.kind, 'in_range');
  assert.equal(analyze(noisy, {query: '2001/1000'}).prediction.kind, 'extrapolation');
  assert.equal(analyze(noisy, {query: '-2001/1000'}).prediction.kind, 'extrapolation');
  assert.equal(show(analyze(noisy, {query: '3'}).prediction.value), '11/3');
});

test('zero signed error alone does not minimize the squared criterion', () => {
  const r = analyze(pts([[-1, 1], [1, -1]]), {intercept: '0', slope: '0'});
  assert.equal(show(r.trial.residualSum), '0'); assert.equal(show(r.trial.sse), '2');
  checkFit(r, '0', '-1', '0'); assert.equal(show(r.decomposition.slopeTerm), '2');
});

test('bounded changed-input corpus satisfies normal equations and direct numerical score comparison', () => {
  let cases = 0;
  for (let n = 2; n <= 12; n++) {
    for (let seed = 0; seed < 13; seed++) {
      const data = Array.from({length: n}, (_, i) => ({x: (i * 7 + seed * 3) % 17 - 8, y: (i * i + seed * 5) % 19 - 9}));
      const r = analyze(data, {intercept: String(seed - 6), slope: `${seed - 4}/3`});
      assert.equal(show(r.fit.residualSum), '0'); assert.equal(show(r.fit.xResidualSum), '0');
      if (r.fit.kind === 'unique') {
        const a = rationalNumber(r.fit.intercept), b = rationalNumber(r.fit.slope);
        const direct = data.reduce((total, p) => total + (p.y - a - b * p.x) ** 2, 0);
        assert.ok(Math.abs(direct - rationalNumber(r.fit.sse)) <= 1e-9, `${n}/${seed}`);
        for (const [da, db] of [[1, 0], [0, 1], [-2, 3], [0.5, -0.5]]) {
          const score = data.reduce((total, p) => total + (p.y - (a + da) - (b + db) * p.x) ** 2, 0);
          assert.ok(score + 1e-9 >= direct, `${n}/${seed} perturbed score`);
        }
      }
      cases++;
    }
  }
  assert.equal(cases, 143);
});

test('invalid inputs refuse without mutating caller rows or leaving a writable result', () => {
  const input = pts([[-2, -1], [0, 0], [2, 3]]);
  const before = structuredClone(input); const r = analyze(input);
  assert.deepEqual(input, before);
  assert.ok(Object.isFrozen(r) && Object.isFrozen(r.points) && Object.isFrozen(r.fit.rows[0]));
  assert.throws(() => { r.points[0].x = 20; });
  input[0].x = 20; assert.equal(r.points[0].x, -2);
  for (const invalid of [[], [{x: 0, y: 0}], Array(13).fill({x: 0, y: 0}), [{x: 0.1, y: 0}, {x: 1, y: 2}],
    [{x: NaN, y: 0}, {x: 1, y: 2}], [{x: 0, y: Infinity}, {x: 1, y: 2}], [{x: 21, y: 0}, {x: 1, y: 2}]]) {
    assert.throws(() => analyze(invalid));
  }
  assert.throws(() => analyze(noisy, {intercept: 'broken'}));
  assert.throws(() => analyze(noisy, {query: '100'}));
});

test('the emitted course uses the real learner format and retains all original worked items', async () => {
  const text = await readFile(new URL('../courses/least-squares.json', import.meta.url), 'utf8');
  const deck = parseDeck(text);
  assert.equal(serializeDeck(deck), text);
  assert.equal(deck.items.length, 16); assert.equal(deck.concepts.length, 4);
  assert.deepEqual(deck.concepts.map(c => deck.items.filter(i => i.concept === c).length), [4, 4, 4, 4]);
  assert.deepEqual([0, 1, 2, 3].map(answer => deck.items.filter(i => i.answer === answer).length), [4, 4, 4, 4]);
  assert.ok(deck.items.every(i => i.id.startsWith('ls-') && i.explanation.length > 80 && i.transfer.length > 40));
  assert.match(deck.attribution, /NIST/); assert.match(deck.attribution, /OpenStax/);
  assert.equal(deck.items.find(i => i.id === 'ls-equal-x').answer, 0);
  assert.equal(deck.items.find(i => i.id === 'ls-repeated-x').answer, 3);
});

test('the standalone artifact embeds exact course and guide bytes with no unresolved module dependency', async () => {
  const [html, course, guide] = await Promise.all(['least-squares-lab.html', 'least-squares.json', 'least-squares.md']
    .map(name => readFile(new URL(`../courses/${name}`, import.meta.url), 'utf8')));
  const embedded = id => {
    const pattern = new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)<\\/script>`);
    const match = pattern.exec(html); assert.ok(match, id); return JSON.parse(match[1]);
  };
  assert.equal(embedded('course-text'), course);
  assert.equal(embedded('guide-text'), guide);
  assert.equal(parseDeck(embedded('course-text')).items.length, 16);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1); assert.doesNotThrow(() => new Script(scripts[0][1]));
  assert.doesNotMatch(scripts[0][1], /^\s*(?:import|export)\s/m);
  assert.doesNotMatch(html, /@@LEAST_SQUARES_|<script[^>]+src=|<link[^>]+(?:stylesheet|preload)/i);
  assert.match(html, /connect-src 'none'/);
});
