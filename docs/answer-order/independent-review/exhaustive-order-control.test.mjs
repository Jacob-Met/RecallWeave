/** Independent control of the complete four-option permutation/mapping space. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const source = process.env.RECALLWEAVE_REVIEW_SOURCE;
if (!source) throw new Error('Set RECALLWEAVE_REVIEW_SOURCE to the exact source checkout being received.');
const {orderOptions} = await import(pathToFileURL(resolve(source, 'src/answer-order.mjs')));
const {createReview, beginPractice, currentPracticeItem, answerPractice} =
  await import(pathToFileURL(resolve(source, 'src/review.mjs')));

test('all bounded draw paths yield unique permutations with stable canonical choices on repeat practice reads', () => {
  const seen = new Set();
  for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 2; c++) {
    const draws = [(a + 0.5) / 4, (b + 0.5) / 3, (c + 0.5) / 2];
    let consumed = 0;
    const order = orderOptions(4, () => draws[consumed++]);
    assert.equal(consumed, 3);
    assert.deepEqual([...order].sort(), [0, 1, 2, 3]);
    assert.ok(Object.isFrozen(order));
    assert.ok(!seen.has(order.join(',')), 'different bounded draw paths must not collapse a permutation');
    seen.add(order.join(','));
    const before = [...order];
    for (let answer = 0; answer < 4; answer++) {
      const item = {id: 'synthetic', concept: 'energy', prompt: 'Mapping control',
        options: ['canonical zero', 'canonical one', 'canonical two', 'canonical three'],
        answer, explanation: 'Synthetic explanation', transfer: 'Synthetic transfer'};
      const first = order[0];
      const review = createReview([item], [{item: item.id, choice: first}]);
      assert.equal(review[0].options[review[0].choice], item.options[first]);
      assert.equal(review[0].correct, first === answer);
      const practice = beginPractice(review);
      if (first !== answer) {
        const current = currentPracticeItem(practice);
        for (let repeat = 0; repeat < 3; repeat++) assert.equal(currentPracticeItem(practice), current);
        const correctPosition = order.indexOf(answer);
        const complete = answerPractice(practice, item.id, order[correctPosition]);
        assert.equal(complete.answers[0].choice, answer);
        assert.equal(complete.answers[0].correct, true);
        assert.equal(review[0].choice, first);
        assert.equal(review[0].correct, false);
        assert.equal(practice.answers.length, 0);
      } else assert.equal(currentPracticeItem(practice), null);
      assert.deepEqual(order, before);
    }
  }
  assert.equal(seen.size, 24);
});
