import { AUTHOR_LIMITS } from './deck-author.mjs';

/** Editable drafts are distinct from checked lesson decks. */
export const DRAFT_FORMAT = 'recallweave-author-draft/1';
export const MAX_DRAFT_BYTES = 2 * 1024 * 1024;

const encoder = new TextEncoder();

function invalid(message = 'This draft has invalid editing data. Choose an original file saved by Deck Studio.') {
  throw new Error(message);
}

function record(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  return value;
}

function field(value, name) {
  if (!Object.hasOwn(value, name)) invalid();
  return value[name];
}

function text(value, maximum, required = false) {
  if (typeof value !== 'string' || value.length > maximum || (required && !value.trim())) invalid();
  return value;
}

function list(value, minimum, maximum) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) invalid();
  // Array.from also visits holes in a programmatically supplied draft.
  return Array.from(value);
}

function withinFileLimit(value) {
  if (typeof value !== 'string' || encoder.encode(value).length > MAX_DRAFT_BYTES) {
    invalid('Choose a draft file no larger than 2 MiB.');
  }
  return value;
}

/** Copy only bounded editor state; lesson correctness is intentionally not checked. */
function copyEditorState(input) {
  const draft = record(input);
  const usedKeys = new Set();
  let largestKey = 0;
  const editingKey = (value, prefix) => {
    if (typeof value !== 'string' || value.length > 32) invalid();
    const match = /^(concept|question|option)-([1-9][0-9]*)$/.exec(value);
    if (!match || match[1] !== prefix) invalid();
    const number = Number(match[2]);
    if (!Number.isSafeInteger(number) || usedKeys.has(value)) invalid();
    usedKeys.add(value);
    largestKey = Math.max(largestKey, number);
    return value;
  };

  const title = text(field(draft, 'title'), 160);
  const attribution = text(field(draft, 'attribution'), 2000);
  const license = text(field(draft, 'license'), 2000);
  const concepts = list(field(draft, 'concepts'), 0, AUTHOR_LIMITS.concepts).map(value => {
    const concept = record(value);
    return { key: editingKey(field(concept, 'key'), 'concept'), name: text(field(concept, 'name'), 80) };
  });
  const conceptKeys = new Set(concepts.map(concept => concept.key));
  const questionIds = new Set();
  const questions = list(field(draft, 'questions'), 0, AUTHOR_LIMITS.questions).map(value => {
    const question = record(value);
    const key = editingKey(field(question, 'key'), 'question');
    const id = text(field(question, 'id'), 80, true);
    if (questionIds.has(id)) invalid();
    questionIds.add(id);
    const conceptKey = field(question, 'conceptKey');
    if (conceptKey !== null && !conceptKeys.has(conceptKey)) {
      invalid('This draft refers to a concept that is missing from the saved file.');
    }
    const prerequisiteKeys = list(field(question, 'prerequisiteKeys'), 0, AUTHOR_LIMITS.concepts);
    if (new Set(prerequisiteKeys).size !== prerequisiteKeys.length
        || prerequisiteKeys.some(key => !conceptKeys.has(key))) {
      invalid('This draft has inconsistent saved prerequisite links.');
    }
    // The editor always keeps at least two option controls, even when both are blank.
    const options = list(field(question, 'options'), 2, AUTHOR_LIMITS.options).map(value => {
      const option = record(value);
      return { key: editingKey(field(option, 'key'), 'option'), text: text(field(option, 'text'), 1000) };
    });
    const answerKey = field(question, 'answerKey');
    if (answerKey !== null && !options.some(option => option.key === answerKey)) {
      invalid('This draft refers to an answer option that is missing from the saved file.');
    }
    return {
      key, id, conceptKey, prerequisiteKeys,
      prompt: text(field(question, 'prompt'), 2000), options, answerKey,
      explanation: text(field(question, 'explanation'), 4000),
      transfer: text(field(question, 'transfer'), 2000),
    };
  });
  const nextKey = field(draft, 'nextKey');
  if (!Number.isSafeInteger(nextKey) || nextKey <= largestKey || nextKey < 1) invalid();
  return { nextKey, title, attribution, license, concepts, questions };
}

/** Rebuild private identities without changing content, public IDs, or relationships. */
function canonicalState(input) {
  const draft = copyEditorState(input);
  let nextKey = 1;
  const conceptKeys = new Map();
  const concepts = draft.concepts.map(concept => {
    const key = `concept-${nextKey++}`;
    conceptKeys.set(concept.key, key);
    return { key, name: concept.name };
  });
  const questions = draft.questions.map(question => {
    const key = `question-${nextKey++}`;
    const optionKeys = new Map();
    const options = question.options.map(option => {
      const key = `option-${nextKey++}`;
      optionKeys.set(option.key, key);
      return { key, text: option.text };
    });
    return {
      key, id: question.id,
      conceptKey: question.conceptKey === null ? null : conceptKeys.get(question.conceptKey),
      prerequisiteKeys: question.prerequisiteKeys.map(key => conceptKeys.get(key)),
      prompt: question.prompt, options,
      answerKey: question.answerKey === null ? null : optionKeys.get(question.answerKey),
      explanation: question.explanation, transfer: question.transfer,
    };
  });
  return { nextKey, title: draft.title, attribution: draft.attribution, license: draft.license, concepts, questions };
}

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** Saving never changes the live editor or promotes an unfinished draft to a lesson. */
export function serializeAuthorDraft(draft) {
  return withinFileLimit(JSON.stringify({ format: DRAFT_FORMAT, draft: canonicalState(draft) }, null, 2) + '\n');
}

/** Stage a frozen copy; the caller explicitly replaces the editor with a mutable clone. */
export function parseAuthorDraft(source) {
  withinFileLimit(source);
  let value;
  try { value = JSON.parse(source); }
  catch { invalid('This draft is not valid JSON. Choose the original saved file.'); }
  const envelope = record(value);
  if (!Object.hasOwn(envelope, 'format') || envelope.format !== DRAFT_FORMAT) {
    invalid('This file is not a supported Deck Studio draft.');
  }
  return freeze(canonicalState(field(envelope, 'draft')));
}
