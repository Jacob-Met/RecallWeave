import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_BKT, expectedInformationGain, selectNextItem } from '../src/knowledge.mjs';

// A separate formulation: I(K;R) = H(R) - H(R|K). No posterior divisions.
function binaryEntropy(p) {
  return p === 0 || p === 1 ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
}
function responseInformation(prior, guess, slip) {
  const response = prior * (1 - slip) + (1 - prior) * guess;
  return binaryEntropy(response) - prior * binaryEntropy(slip) - (1 - prior) * binaryEntropy(guess);
}
function model(guess, slip) { return { ...DEFAULT_BKT, guess, slip }; }

// The pre-repair expression is retained ONLY to protect ordinary arithmetic.
// It is not the endpoint oracle; it produces NaN on the reproduced defect.
function originalInteriorInformation(prior, { guess, slip } = DEFAULT_BKT) {
  const p = Math.min(1, Math.max(0, prior));
  const pCorrect = p * (1 - slip) + (1 - p) * guess;
  const correctPosterior = p * (1 - slip) / pCorrect;
  const wrongPosterior = p * slip / (p * slip + (1 - p) * (1 - guess));
  return Math.max(0, binaryEntropy(p) - pCorrect * binaryEntropy(correctPosterior)
    - (1 - pCorrect) * binaryEntropy(wrongPosterior));
}

test('perfect and perfectly inverted responses reveal prior entropy, including certainty', () => {
  for (const [guess, slip] of [[0, 0], [1, 1]]) {
    for (const prior of [0, 0.25, 0.5, 0.75, 1]) {
      assert.equal(expectedInformationGain(prior, model(guess, slip)), binaryEntropy(prior));
    }
  }
});

test('an always-correct or always-wrong response supplies zero information', () => {
  for (const [guess, slip] of [[1, 0], [0, 1]]) {
    for (const prior of [0, 0.25, 0.5, 0.75, 1]) {
      assert.equal(expectedInformationGain(prior, model(guess, slip)), 0);
    }
  }
});

test('finite gains match the response-entropy oracle on 9,261 bounded channel states', () => {
  for (let pi = 0; pi <= 20; pi++) {
    for (let gi = 0; gi <= 20; gi++) {
      for (let si = 0; si <= 20; si++) {
        const p = pi / 20, guess = gi / 20, slip = si / 20;
        const gain = expectedInformationGain(p, model(guess, slip));
        const expected = responseInformation(p, guess, slip);
        const label = `prior=${p}, guess=${guess}, slip=${slip}`;
        assert.ok(Number.isFinite(gain), label);
        assert.ok(gain >= 0 && gain <= binaryEntropy(p) + 2e-14, label);
        assert.ok(Math.abs(gain - expected) <= 2e-14, label);
      }
    }
  }
});

test('the actual selector prefers uncertain knowledge to a certain alphabetic tie fallback', () => {
  const certain = Object.freeze({ id: 'a', concept: 'certain', prerequisites: Object.freeze([]) });
  const uncertain = Object.freeze({ id: 'z', concept: 'uncertain', prerequisites: Object.freeze([]) });
  for (const prior of [0, 1]) {
    for (const items of [[certain, uncertain], [uncertain, certain]]) {
      const mastery = Object.freeze({ certain: prior, uncertain: 0.5 });
      assert.equal(selectNextItem(Object.freeze(items), new Set(), mastery, model(0, 0)), uncertain);
      assert.equal(selectNextItem(items, new Set(['z']), mastery, model(0, 0)), certain);
      assert.equal(selectNextItem(items, new Set(['a', 'z']), mastery, model(0, 0)), null);
    }
  }
});

test('10,001 ordinary default states retain the exact original floating-point result', () => {
  for (let i = 0; i <= 10000; i++) {
    const p = i / 10000;
    assert.equal(expectedInformationGain(p), originalInteriorInformation(p));
  }
  for (const prior of [-10, 10]) {
    assert.equal(expectedInformationGain(prior), originalInteriorInformation(prior));
  }
});

test('7,581 positive-response channel states retain exact arithmetic', () => {
  for (let pi = 0; pi <= 20; pi++) {
    for (let gi = 1; gi < 20; gi++) {
      for (let si = 1; si < 20; si++) {
        const p = pi / 20, parameters = model(gi / 20, si / 20);
        assert.equal(expectedInformationGain(p, parameters), originalInteriorInformation(p, parameters));
      }
    }
  }
});

test('zero-probability handling does not mask NaN inputs', () => {
  assert.ok(Number.isNaN(expectedInformationGain(NaN)));
  assert.ok(Number.isNaN(expectedInformationGain(0.5, model(NaN, 0))));
  assert.ok(Number.isNaN(expectedInformationGain(0.5, model(0, NaN))));
});
