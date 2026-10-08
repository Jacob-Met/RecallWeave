import { DEFAULT_BKT, initialMastery, updateMastery } from './knowledge.mjs';
import { answerPractice, beginPractice, createReview } from './review.mjs';

export const TRACE_ARCHIVE_MAX_BYTES = 2 * 1024 * 1024;
const TRACE_ARCHIVE_FORMAT = 'recallweave.learning-trace';
const TRACE_ARCHIVE_MODEL = Object.freeze({name: 'recallweave-bkt-v1', parameters: DEFAULT_BKT});

function traceRecord(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function traceCanonical(value) {
  if (Array.isArray(value)) return '[' + value.map(traceCanonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + traceCanonical(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function traceReplay(document, deck) {
  if (!traceRecord(document, ['format', 'version', 'savedAt', 'deck', 'model', 'firstAnswers', 'mastery', 'practice'])
      || document.format !== TRACE_ARCHIVE_FORMAT || document.version !== 1) {
    throw new RangeError('This learning trace format is not supported.');
  }
  if (typeof document.savedAt !== 'string' || document.savedAt.length !== 24
      || !Number.isFinite(Date.parse(document.savedAt))
      || new Date(document.savedAt).toISOString() !== document.savedAt) {
    throw new RangeError('This learning trace has an invalid save time.');
  }
  // Archived course content is only compared; restoration always uses the already loaded deck.
  if (traceCanonical(document.deck) !== traceCanonical(deck)) {
    throw new RangeError('This trace belongs to a different course or course version. Load its course, then choose this file again.');
  }
  if (traceCanonical(document.model) !== traceCanonical(TRACE_ARCHIVE_MODEL)) {
    throw new RangeError('This trace uses a different learning model.');
  }
  if (!Array.isArray(document.firstAnswers) || document.firstAnswers.length === 0
      || document.firstAnswers.length !== deck.items.length) {
    throw new RangeError('This file does not contain a complete first session.');
  }
  if (!document.firstAnswers.every(answer => traceRecord(answer, ['item', 'choice']))) {
    throw new RangeError('This trace has invalid first answers.');
  }
  let review;
  try { review = createReview(deck.items, document.firstAnswers); }
  catch { throw new RangeError('This trace has invalid first answers.'); }
  const mastery = initialMastery(deck.concepts);
  const answers = Object.freeze(review.map(item => {
    mastery[item.concept] = updateMastery(mastery[item.concept], item.correct);
    return Object.freeze({item: item.id, concept: item.concept, choice: item.choice, correct: item.correct});
  }));
  if (!traceRecord(document.mastery, deck.concepts)
      || deck.concepts.some(concept => !Number.isFinite(document.mastery[concept]) || document.mastery[concept] !== mastery[concept])) {
    throw new RangeError('This trace does not preserve the original model estimates.');
  }
  let practice = null;
  if (document.practice !== null) {
    if (!traceRecord(document.practice, ['answers']) || !Array.isArray(document.practice.answers)) {
      throw new RangeError('This trace has invalid practice progress.');
    }
    practice = beginPractice(review);
    try {
      for (const answer of document.practice.answers) {
        if (!traceRecord(answer, ['item', 'choice'])) throw new RangeError();
        practice = answerPractice(practice, answer.item, answer.choice);
      }
    } catch { throw new RangeError('This trace has invalid practice progress.'); }
  }
  const missed = review.filter(item => !item.correct).length;
  return Object.freeze({
    savedAt: document.savedAt,
    title: deck.title,
    answers,
    mastery: Object.freeze(mastery),
    review,
    practice,
    summary: Object.freeze({
      firstAnswers: answers.length,
      correctFirst: answers.length - missed,
      practiceStarted: practice !== null,
      practiceAnswers: practice?.answers.length ?? 0,
      practiceTotal: missed
    })
  });
}

/** Read bounded JSON into immutable state without changing the current lesson. */
export function readTraceArchive(text, deck) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > TRACE_ARCHIVE_MAX_BYTES) {
    throw new RangeError('Choose a learning trace file no larger than 2 MiB.');
  }
  let document;
  try { document = JSON.parse(text); }
  catch { throw new RangeError('This file is not valid learning trace JSON.'); }
  return traceReplay(document, deck);
}

/** Save completed first answers and one separate practice round, including full precision estimates. */
export function createTraceArchive({deck, answers, mastery, practice = null, savedAt = new Date()}) {
  if (!Array.isArray(answers)) throw new RangeError('Finish the first session before saving a trace.');
  const when = new Date(savedAt);
  if (!Number.isFinite(when.getTime())) throw new RangeError('A learning trace needs a valid save time.');
  const document = {
    format: TRACE_ARCHIVE_FORMAT,
    version: 1,
    savedAt: when.toISOString(),
    deck,
    model: TRACE_ARCHIVE_MODEL,
    firstAnswers: answers.map(answer => ({item: answer.item, choice: answer.choice})),
    mastery,
    practice: practice === null ? null : {
      answers: practice.answers.map(answer => ({item: answer.item, choice: answer.choice}))
    }
  };
  const text = JSON.stringify(document, null, 2) + '\n';
  const restored = readTraceArchive(text, deck);
  if (practice !== null && traceCanonical(practice.items.map(item => item.id))
      !== traceCanonical(restored.practice.items.map(item => item.id))) {
    throw new RangeError('This trace has invalid practice progress.');
  }
  return Object.freeze({
    filename: 'recallweave-learning-trace-' + when.toISOString().slice(0, 10) + '.json',
    mediaType: 'application/json;charset=utf-8',
    text
  });
}
