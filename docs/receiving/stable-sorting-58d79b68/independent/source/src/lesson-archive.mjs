import { DEFAULT_BKT, initialMastery, selectNextItem, updateMastery } from './knowledge.mjs';

export const LESSON_ARCHIVE_MAX_BYTES = 2 * 1024 * 1024;
const LESSON_ARCHIVE_FORMAT = 'recallweave.unfinished-lesson';
const LESSON_ARCHIVE_MODEL = Object.freeze({name: 'recallweave-bkt-v1', parameters: DEFAULT_BKT});

function lessonRecord(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

// Compare the already admitted source, including content and array order, without
// depending on JSON object key order. No archived content becomes a loaded deck.
function lessonCanonical(value, depth = 0) {
  if (depth > 16) throw new RangeError('This unfinished lesson has invalid course or model data.');
  if (Array.isArray(value)) return '[' + value.map(entry => lessonCanonical(entry, depth + 1)).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new RangeError('This unfinished lesson has invalid course or model data.');
    }
    return '{' + Object.keys(value).sort().map(key =>
      JSON.stringify(key) + ':' + lessonCanonical(value[key], depth + 1)).join(',') + '}';
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean'
      || (typeof value === 'number' && Number.isFinite(value))) return JSON.stringify(value);
  throw new RangeError('This unfinished lesson has invalid course or model data.');
}

function lessonReplay(document, deck) {
  if (!lessonRecord(document, ['format', 'version', 'savedAt', 'deck', 'model', 'firstAnswers', 'mastery', 'presentation'])
      || document.format !== LESSON_ARCHIVE_FORMAT || document.version !== 1) {
    throw new RangeError('This unfinished lesson format is not supported.');
  }
  if (typeof document.savedAt !== 'string' || document.savedAt.length !== 24
      || !Number.isFinite(Date.parse(document.savedAt))
      || new Date(document.savedAt).toISOString() !== document.savedAt) {
    throw new RangeError('This unfinished lesson has an invalid save time.');
  }
  if (lessonCanonical(document.deck) !== lessonCanonical(deck)) {
    throw new RangeError('This lesson belongs to a different course or course version. Load its course, then choose this file again.');
  }
  if (lessonCanonical(document.model) !== lessonCanonical(LESSON_ARCHIVE_MODEL)) {
    throw new RangeError('This lesson uses a different learning model.');
  }
  if (!Array.isArray(document.firstAnswers)) {
    throw new RangeError('This lesson has invalid first answers.');
  }
  if (document.firstAnswers.length >= deck.items.length) {
    throw new RangeError('This lesson is complete. Use a completed learning trace to save or restore it.');
  }

  const asked = new Set();
  const mastery = initialMastery(deck.concepts);
  const answers = [];
  for (const answer of document.firstAnswers) {
    const item = selectNextItem(deck.items, asked, mastery);
    if (!lessonRecord(answer, ['item', 'choice']) || !item || answer.item !== item.id
        || !Number.isInteger(answer.choice) || answer.choice < 0 || answer.choice >= item.options.length) {
      throw new RangeError('This lesson has invalid first answers or question order.');
    }
    const correct = answer.choice === item.answer;
    asked.add(item.id);
    mastery[item.concept] = updateMastery(mastery[item.concept], correct);
    answers.push(Object.freeze({item: item.id, concept: item.concept, choice: answer.choice, correct}));
  }
  if (!lessonRecord(document.mastery, deck.concepts)
      || deck.concepts.some(concept => !Number.isFinite(document.mastery[concept]) || document.mastery[concept] !== mastery[concept])) {
    throw new RangeError('This lesson does not preserve the original model estimates.');
  }

  const nextItem = selectNextItem(deck.items, asked, mastery);
  const presentation = document.presentation;
  if (!lessonRecord(presentation, ['phase', 'itemId', 'optionOrders'])
      || !['question', 'feedback'].includes(presentation.phase)
      || presentation.itemId !== (presentation.phase === 'question' ? nextItem?.id : answers.at(-1)?.item)
      || (presentation.phase === 'feedback' && answers.length === 0)
      || !lessonRecord(presentation.optionOrders, deck.items.map(item => item.id))) {
    throw new RangeError('This lesson has invalid question or feedback presentation.');
  }
  const optionOrders = Object.fromEntries(deck.items.map(item => {
    const order = presentation.optionOrders[item.id];
    if (!Array.isArray(order) || order.length !== item.options.length
        || new Set(order).size !== order.length
        || !order.every(index => Number.isInteger(index) && index >= 0 && index < item.options.length)) {
      throw new RangeError('This lesson has invalid answer display order.');
    }
    return [item.id, Object.freeze([...order])];
  }));

  return Object.freeze({
    savedAt: document.savedAt,
    title: deck.title,
    answers: Object.freeze(answers),
    mastery: Object.freeze(mastery),
    presentation: Object.freeze({
      phase: presentation.phase, itemId: presentation.itemId,
      optionOrders: Object.freeze(optionOrders)
    }),
    nextItemId: nextItem.id,
    summary: Object.freeze({
      answered: answers.length,
      total: deck.items.length,
      remaining: deck.items.length - answers.length,
      correctFirst: answers.filter(answer => answer.correct).length
    })
  });
}

/** Validate bounded JSON against the loaded deck; return immutable state without applying it. */
export function readLessonArchive(text, deck) {
  if (typeof text !== 'string' || text.length > LESSON_ARCHIVE_MAX_BYTES
      || new TextEncoder().encode(text).byteLength > LESSON_ARCHIVE_MAX_BYTES) {
    throw new RangeError('Choose an unfinished lesson file no larger than 2 MiB.');
  }
  let document;
  try { document = JSON.parse(text); }
  catch { throw new RangeError('This file is not valid unfinished lesson JSON.'); }
  return lessonReplay(document, deck);
}

/** Save a started, unfinished first session, including current presentation and every option order. */
export function createLessonArchive({deck, answers, mastery, presentation, savedAt = new Date()}) {
  if (!Array.isArray(answers) || answers.some(answer => answer === null || typeof answer !== 'object')) {
    throw new RangeError('This lesson has invalid first answers.');
  }
  const when = new Date(savedAt);
  if (!Number.isFinite(when.getTime())) throw new RangeError('An unfinished lesson needs a valid save time.');
  const document = {
    format: LESSON_ARCHIVE_FORMAT,
    version: 1,
    savedAt: when.toISOString(),
    deck,
    model: LESSON_ARCHIVE_MODEL,
    firstAnswers: answers.map(answer => ({item: answer.item, choice: answer.choice})),
    mastery,
    presentation
  };
  // Validate the original state before JSON can discard non-JSON values or extra keys.
  lessonReplay(document, deck);
  const text = JSON.stringify(document, null, 2) + '\n';
  readLessonArchive(text, deck);
  return Object.freeze({
    filename: 'recallweave-unfinished-lesson-' + when.toISOString().slice(0, 10) + '.json',
    mediaType: 'application/json;charset=utf-8',
    text
  });
}
