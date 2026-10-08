import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { DEFAULT_BKT } from '../src/knowledge.mjs';
import { parseDeck } from '../src/deck.mjs';
import {
  createExperiment, inspectExperiment, takeSyntheticStep,
  rewindExperiment, restartExperiment, serializeExperiment
} from '../src/selection-lab.mjs';
import { renderSelectionLab } from '../tools/build-selection-lab.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const bundled = parseDeck(await readFile(new URL('../data/deck.json', import.meta.url), 'utf8'));
function smallDeck() {
  return {
    format: 'recallweave-deck/1', title: 'A deliberately hypothetical lesson',
    attribution: 'Authored test fixture; no learner observations.', license: 'Original test fixture.',
    concepts: ['single'],
    items: ['a', 'b', 'c'].map(id => ({
      id, concept: 'single', prerequisites: [], prompt: 'Prompt ' + id,
      options: ['One', 'Two'], answer: 0, explanation: 'Fixture explanation.', transfer: 'Fixture transfer.'
    }))
  };
}
function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) <= 1e-12, String(actual) + ' != ' + String(expected));
}
function entropy(p) {
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
}

test('bundled native witness distinguishes two evidence continuations and a changed prior', () => {
  const initial = createExperiment(bundled);
  const view = inspectExperiment(initial);
  assert.equal(view.selectedQuestionId, 'p1');
  assert.deepEqual(view.branches.map(row => row.nextQuestionId), ['p2', 'r1']);
  close(view.branches[0].after, 0.6386440677966101);
  close(view.branches[1].after, 0.20792569659442725);
  const changed = createExperiment(bundled, { ...initial.starting, photosynthesis: 0.95 });
  assert.equal(inspectExperiment(changed).selectedQuestionId, 'r1');
  assert.equal(inspectExperiment(initial).selectedQuestionId, 'p1');
  assert.equal(initial.steps.length, 0);
});

test('one-half prior exposes hand-computed evidence, transition and information gain', () => {
  const state = createExperiment(smallDeck(), { single: 0.5 });
  const view = inspectExperiment(state);
  assert.equal(view.selectedQuestionId, 'a');
  const expectedCorrect = 9 / 11 + (2 / 11) * 0.18;
  const expectedWrong = 1 / 9 + (8 / 9) * 0.18;
  close(view.branches[0].after, expectedCorrect);
  close(view.branches[1].after, expectedWrong);
  const information = 1 - 0.55 * entropy(9 / 11) - 0.45 * entropy(1 / 9);
  for (const row of view.candidates) {
    close(row.informationGainBits, information);
    assert.equal(row.prerequisiteRepair, 0);
    assert.equal(row.totalScore, row.informationGainBits);
  }
  const moved = takeSyntheticStep(state, false);
  close(moved.mastery.single, expectedWrong);
  assert.equal(moved.steps[0].questionId, 'a');
  assert.equal(moved.steps[0].nextQuestionId, 'b');
  assert.equal(state.mastery.single, 0.5);
});

test('undo truncates the abandoned path; restart keeps applied assumptions', () => {
  const initial = createExperiment(smallDeck(), { single: 0.31 });
  const first = takeSyntheticStep(initial, true);
  const second = takeSyntheticStep(first, false);
  assert.equal(serializeExperiment(rewindExperiment(second)), serializeExperiment(first));
  const alternative = takeSyntheticStep(rewindExperiment(second), true);
  assert.deepEqual(alternative.syntheticResponses, [true, true]);
  assert.deepEqual(second.syntheticResponses, [true, false]);
  assert.notEqual(alternative.mastery.single, second.mastery.single);
  assert.equal(serializeExperiment(restartExperiment(alternative)), serializeExperiment(initial));
  const replaced = createExperiment(initial.deck, { single: 0.82 });
  assert.deepEqual(replaced.syntheticResponses, []);
  assert.equal(replaced.starting.single, 0.82);
  assert.equal(initial.starting.single, 0.31);
});

test('probability endpoints retain finite native outcomes and complete exhaustion', () => {
  for (const value of [0, 1]) {
    let state = createExperiment(smallDeck(), { single: value });
    const branches = inspectExperiment(state).branches;
    for (const row of branches) assert.equal(row.after, value === 0 ? DEFAULT_BKT.learn : 1);
    for (const correct of [false, true, false]) state = takeSyntheticStep(state, correct);
    const view = inspectExperiment(state);
    assert.equal(view.selectedQuestionId, null);
    assert.deepEqual(view.branches, []);
    assert.deepEqual(view.candidates, []);
    assert.equal(state.steps.at(-1).nextQuestionId, null);
    assert.deepEqual(state.asked, ['a', 'b', 'c']);
    const report = serializeExperiment(state);
    assert.throws(() => takeSyntheticStep(state, true), /already been used/);
    assert.equal(serializeExperiment(state), report);
    assert.equal(inspectExperiment(rewindExperiment(state)).selectedQuestionId, 'c');
  }
});

test('strict starting inputs and synthetic evidence refuse before changing an experiment', () => {
  const state = createExperiment(smallDeck());
  const before = serializeExperiment(state);
  for (const value of [-0.1, 1.1, NaN, Infinity, '0.5', null, undefined]) {
    assert.throws(() => createExperiment(smallDeck(), { single: value }), /finite number/);
  }
  for (const value of [{}, [], null, { single: 0.2, unexpected: 0.3 }]) {
    assert.throws(() => createExperiment(smallDeck(), value), /probabilities/);
  }
  for (const value of [0, 1, 'correct', null, undefined]) {
    assert.throws(() => takeSyntheticStep(state, value), /correct or incorrect/);
  }
  assert.equal(serializeExperiment(state), before);
  assert.throws(() => takeSyntheticStep(JSON.parse(before), true), /created by this lab/);
});

test('checked content and frozen state cannot be altered by their original inputs', () => {
  const source = smallDeck();
  const starting = { single: 0.25 };
  const state = createExperiment(source, starting);
  const before = serializeExperiment(state);
  source.items[0].prompt = 'Changed source after intake';
  source.items[0].options.reverse();
  starting.single = 0.99;
  assert.equal(serializeExperiment(state), before);
  assert.throws(() => { state.mastery.single = 0.99; }, TypeError);
  assert.throws(() => { state.deck.items[0].options.push('Extra'); }, TypeError);
  const invalid = smallDeck();
  invalid.items[1].id = invalid.items[0].id;
  assert.throws(() => createExperiment(invalid), /duplicates/);
});

test('inspect-only export retains complete course, fixed parameters and full native state', () => {
  const source = smallDeck();
  source.title = 'Literal </script><script>never()</script> & Ω';
  let state = createExperiment(source, { single: 0.12345678901234568 });
  state = takeSyntheticStep(state, false);
  const report = JSON.parse(serializeExperiment(state));
  assert.equal(report.format, 'recallweave-selection-experiment/1');
  assert.equal(report.kind, 'synthetic');
  assert.deepEqual(report.model.parameters, DEFAULT_BKT);
  assert.deepEqual(report.deck, state.deck);
  assert.deepEqual(report.starting, state.starting);
  assert.deepEqual(report.steps, state.steps);
  assert.deepEqual(report.current, inspectExperiment(state));
  assert.equal(report.steps[0].after, state.mastery.single);
  assert.throws(() => parseDeck(JSON.stringify(report)), /Unsupported deck format/);
});

test('standalone is reproducible and all original model/deck inputs stay exact', async () => {
  const html = await renderSelectionLab();
  assert.equal(html, await readFile(join(root, 'selection-lab.html'), 'utf8'));
  for (const [path, expected] of [
    ['src/knowledge.mjs', '909dd4f171ed55ae7c65493f445b85a4df0f602bc354eca78a09bc4046e471c0'],
    ['src/deck.mjs', '621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b']
  ]) {
    assert.equal(createHash('sha256').update(await readFile(join(root, path))).digest('hex'), expected);
  }
  assert.match(html, /selectionUI\.mountSelectionLab/);
  assert.equal(html.includes("from './knowledge.mjs'"), false);
});

test('standalone embeds supplied course text inertly while retaining its actual JSON values', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'recall-selection-build-'));
  try {
    for (const folder of ['src', 'data']) await mkdir(join(temp, folder));
    for (const path of ['src/knowledge.mjs', 'src/deck.mjs', 'src/selection-lab.mjs', 'src/selection-lab-ui.mjs', 'selection-lab.template.html']) {
      await copyFile(join(root, path), join(temp, path));
    }
    const source = smallDeck();
    source.title = '</script><script>globalThis.bad=1</script> & \u2028 Ω';
    await writeFile(join(temp, 'data/deck.json'), JSON.stringify(source));
    const html = await renderSelectionLab(temp);
    const embedded = html.match(/<script id="bundled-deck" type="application\/json">\n([\s\S]*?)\n<\/script>/)[1];
    assert.deepEqual(JSON.parse(embedded), source);
    assert.equal(embedded.includes('<'), false);
    assert.equal(embedded.includes('&'), false);
    assert.equal((html.match(/<\/script>/g) ?? []).length, 2);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

