import { DECK_FORMAT, parseDeck, serializeDeck, validateDeck } from './deck.mjs';

/** Editable state uses stable keys; only checked snapshots become lesson decks. */
export const AUTHOR_LIMITS = Object.freeze({ concepts: 32, questions: 100, options: 6 });

function key(draft, prefix) { return `${prefix}-${draft.nextKey++}`; }
function question(draft, id) {
  const found = draft.questions.find(item => item.key === id);
  if (!found) throw new Error('Choose an existing question.');
  return found;
}

export function createDraft() {
  const draft = { nextKey: 1, title: '', attribution: '', license: '', concepts: [], questions: [] };
  addConcept(draft);
  addQuestion(draft);
  return draft;
}

export function addConcept(draft) {
  if (draft.concepts.length >= AUTHOR_LIMITS.concepts) throw new Error('A deck can contain at most 32 concepts.');
  const concept = { key: key(draft, 'concept'), name: '' };
  draft.concepts.push(concept);
  return concept;
}

export function removeConcept(draft, conceptKey) {
  const index = draft.concepts.findIndex(concept => concept.key === conceptKey);
  if (index < 0) throw new Error('Choose an existing concept.');
  if (draft.questions.some(item => item.conceptKey === conceptKey || item.prerequisiteKeys.includes(conceptKey))) {
    throw new Error('This concept is used by a question or a prerequisite. Change those question choices before removing it.');
  }
  return draft.concepts.splice(index, 1)[0];
}

export function addQuestion(draft) {
  if (draft.questions.length >= AUTHOR_LIMITS.questions) throw new Error('A deck can contain at most 100 questions.');
  let id;
  do { id = key(draft, 'question'); } while (draft.questions.some(item => item.id === id));
  const item = { key: id, id, conceptKey: draft.concepts[0]?.key ?? null, prerequisiteKeys: [],
    prompt: '', options: [], answerKey: null, explanation: '', transfer: '' };
  draft.questions.push(item);
  addOption(draft, item.key);
  addOption(draft, item.key);
  return item;
}

export function removeQuestion(draft, questionKey) {
  const item = question(draft, questionKey);
  const index = draft.questions.indexOf(item);
  draft.questions.splice(index, 1);
  return { index, item };
}

export function moveQuestion(draft, questionKey, offset) {
  const item = question(draft, questionKey);
  const index = draft.questions.indexOf(item);
  if (![-1, 1].includes(offset)) throw new Error('Choose an adjacent question position.');
  const target = index + offset;
  if (target < 0 || target >= draft.questions.length) return false;
  [draft.questions[index], draft.questions[target]] = [draft.questions[target], draft.questions[index]];
  return true;
}

export function restoreQuestion(draft, removal) {
  if (draft.questions.length >= AUTHOR_LIMITS.questions) throw new Error('Remove another question before restoring this one.');
  if (draft.questions.some(item => item.key === removal.item.key || item.id === removal.item.id)) {
    throw new Error('That question is already present.');
  }
  const knownConcepts = new Set(draft.concepts.map(concept => concept.key));
  if (!knownConcepts.has(removal.item.conceptKey)) removal.item.conceptKey = null;
  removal.item.prerequisiteKeys = removal.item.prerequisiteKeys.filter(key => knownConcepts.has(key));
  draft.questions.splice(Math.min(removal.index, draft.questions.length), 0, removal.item);
  return removal.item;
}

export function addOption(draft, questionKey) {
  const item = question(draft, questionKey);
  if (item.options.length >= AUTHOR_LIMITS.options) throw new Error('A question can contain at most six options.');
  const option = { key: key(draft, 'option'), text: '' };
  item.options.push(option);
  return option;
}

export function removeOption(draft, questionKey, optionKey) {
  const item = question(draft, questionKey);
  if (item.options.length <= 2) throw new Error('Keep at least two answer options.');
  const index = item.options.findIndex(option => option.key === optionKey);
  if (index < 0) throw new Error('Choose an existing answer option.');
  const removedCorrectAnswer = item.answerKey === optionKey;
  const [option] = item.options.splice(index, 1);
  if (removedCorrectAnswer) item.answerKey = null;
  return { option, removedCorrectAnswer };
}

export function moveOption(draft, questionKey, optionKey, offset) {
  const item = question(draft, questionKey);
  const index = item.options.findIndex(option => option.key === optionKey);
  if (index < 0 || ![-1, 1].includes(offset)) throw new Error('Choose an adjacent answer position.');
  const target = index + offset;
  if (target < 0 || target >= item.options.length) return false;
  [item.options[index], item.options[target]] = [item.options[target], item.options[index]];
  return true;
}

export function setQuestionConcept(draft, questionKey, conceptKey) {
  const item = question(draft, questionKey);
  if (!draft.concepts.some(concept => concept.key === conceptKey)) throw new Error('Choose an existing concept.');
  item.conceptKey = conceptKey;
  const removedSelfLink = item.prerequisiteKeys.includes(conceptKey);
  item.prerequisiteKeys = item.prerequisiteKeys.filter(id => id !== conceptKey);
  return removedSelfLink;
}

export function draftFromDeck(input) {
  const deck = validateDeck(input);
  const draft = { nextKey: 1, title: deck.title, attribution: deck.attribution, license: deck.license,
    concepts: [], questions: [] };
  const conceptKeys = new Map();
  for (const name of deck.concepts) {
    const concept = { key: key(draft, 'concept'), name };
    draft.concepts.push(concept);
    conceptKeys.set(name, concept.key);
  }
  for (const original of deck.items) {
    const options = original.options.map(text => ({ key: key(draft, 'option'), text }));
    draft.questions.push({ key: key(draft, 'question'), id: original.id,
      conceptKey: conceptKeys.get(original.concept),
      prerequisiteKeys: original.prerequisites.map(name => conceptKeys.get(name)),
      prompt: original.prompt, options, answerKey: options[original.answer].key,
      explanation: original.explanation, transfer: original.transfer });
  }
  return draft;
}

function asDeck(draft) {
  const names = new Map(draft.concepts.map(concept => [concept.key, concept.name]));
  return { format: DECK_FORMAT, title: draft.title, attribution: draft.attribution, license: draft.license,
    concepts: draft.concepts.map(concept => concept.name),
    items: draft.questions.map(item => ({ id: item.id, concept: names.get(item.conceptKey),
      prerequisites: item.prerequisiteKeys.map(id => names.get(id)), prompt: item.prompt,
      options: item.options.map(option => option.text),
      answer: item.options.findIndex(option => option.key === item.answerKey),
      explanation: item.explanation, transfer: item.transfer })) };
}

function issueFor(error, draft) {
  const text = error.message;
  const match = /^items\[(\d+)\](?:\.(\w+))?(?:\[(\d+)\])?/.exec(text);
  if (match) {
    const index = Number(match[1]);
    const item = draft.questions[index];
    const field = match[2] || 'prerequisites';
    const target = { questionKey: item?.key, field };
    let message;
    if (field === 'answer') message = 'Choose the correct answer.';
    else if (field === 'concept') message = 'Choose one of the deck concepts.';
    else if (field === 'options' && match[3] !== undefined) {
      target.optionKey = item?.options[Number(match[3])]?.key;
      message = `Option ${Number(match[3]) + 1} needs text of at most 1,000 characters.`;
    } else if (field === 'options') message = text.includes('distinct')
      ? 'Give each answer option different text.' : 'Include two to six answer options.';
    else if (field === 'prompt') message = 'Enter a question of at most 2,000 characters.';
    else if (field === 'explanation') message = 'Enter an explanation of at most 4,000 characters.';
    else if (field === 'transfer') message = 'Enter a transfer prompt of at most 2,000 characters.';
    else message = 'Review the prerequisite choices; they must refer to other deck concepts.';
    return { message: `Question ${index + 1}: ${message}`, target };
  }
  const conceptMatch = /^concepts\[(\d+)\]/.exec(text);
  if (conceptMatch) return { message: `Concept ${Number(conceptMatch[1]) + 1} needs a name of at most 80 characters.`,
    target: { field: 'concepts', conceptKey: draft.concepts[Number(conceptMatch[1])]?.key } };
  for (const [field, message] of Object.entries({
    title: 'Enter a deck title of at most 160 characters.',
    attribution: 'Name the author or source in at most 2,000 characters.',
    license: 'Describe the permission to use this deck in at most 2,000 characters.'
  })) if (text.startsWith(`${field} `)) return { message, target: { field } };
  if (text.startsWith('items ')) return { message: 'Add at least one question, up to 100 in a deck.', target: { field: 'questions' } };
  if (text.includes('Every concept')) {
    const uncovered = draft.concepts.find(concept => !draft.questions.some(item => item.conceptKey === concept.key));
    return { message: `Add a question for the concept “${uncovered?.name || 'unnamed concept'}”, or remove that unused concept.`,
      target: { field: 'concepts', conceptKey: uncovered?.key } };
  }
  if (text.includes('cycle')) return { message: 'The prerequisite choices form a loop. Remove a link so each concept can lead forward.', target: { field: 'questions' } };
  if (text.includes('Concept names')) return { message: 'Give each concept a different name.', target: { field: 'concepts' } };
  if (text.startsWith('concepts ')) return { message: 'Include one to 32 concepts.', target: { field: 'concepts' } };
  if (text.includes('256 KiB')) return { message: 'This file is larger than the 256 KiB import limit. Shorten the content or split it into smaller decks.', target: { field: 'questions' } };
  return { message: 'This draft cannot be used as a lesson yet. Review its question and concept choices.', target: { field: 'questions' } };
}

/** Validate the exact UTF-8 download, including the importer's byte limit. */
export function checkDraft(draft) {
  try {
    const json = serializeDeck(asDeck(draft));
    const deck = parseDeck(json);
    return { ok: true, deck, json };
  } catch (error) {
    return { ok: false, ...issueFor(error, draft) };
  }
}

export function downloadName(title) {
  const name = title.normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `${name || 'recallweave-deck'}.json`;
}
