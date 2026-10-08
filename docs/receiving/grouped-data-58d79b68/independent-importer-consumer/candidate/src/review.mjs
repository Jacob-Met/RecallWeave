/**
 * A local review snapshot and one bounded practice round.
 * Practice never updates the original answers or the knowledge model.
 */

function validChoice(item, choice) {
  if (!Number.isInteger(choice) || choice < 0 || choice >= item.options.length) {
    throw new RangeError('Choose one of this question’s answer options.');
  }
}

/** Keep the first-attempt order, chosen answer and explanation available for review. */
export function createReview(items, answers) {
  const byId = new Map(items.map(item => [item.id, item]));
  const seen = new Set();
  return Object.freeze(answers.map(answer => {
    const item = byId.get(answer.item);
    if (!item || seen.has(item.id)) throw new RangeError('Review needs one first answer per known question.');
    seen.add(item.id);
    validChoice(item, answer.choice);
    return Object.freeze({
      id: item.id,
      concept: item.concept,
      prompt: item.prompt,
      options: Object.freeze([...item.options]),
      answer: item.answer,
      choice: answer.choice,
      correct: answer.choice === item.answer,
      explanation: item.explanation,
      transfer: item.transfer
    });
  }));
}

/** Each initially missed question gets one retry, in its original session order. */
export function beginPractice(review) {
  return Object.freeze({
    items: Object.freeze(review.filter(item => !item.correct)),
    answers: Object.freeze([])
  });
}

export function currentPracticeItem(round) {
  return round.items[round.answers.length] ?? null;
}

/** Return new practice state; both the review and earlier round states stay intact. */
export function answerPractice(round, itemId, choice) {
  const item = currentPracticeItem(round);
  if (!item || item.id !== itemId) throw new RangeError('Only the current unanswered practice question can be answered.');
  validChoice(item, choice);
  return Object.freeze({
    items: round.items,
    answers: Object.freeze([...round.answers, Object.freeze({item: item.id, choice, correct: choice === item.answer})])
  });
}
