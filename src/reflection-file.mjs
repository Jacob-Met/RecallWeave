import { reflectionSnapshot } from './reflections.mjs';

export const REFLECTION_FILE_MAX_BYTES = 2 * 1024 * 1024;
const FORMAT = 'recallweave.written-explanations';

function exactFields(value, fields) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
}
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

/** Read writing for the exact already-loaded course; never load a course or answers. */
export function readReflectionFile(text, deck) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > REFLECTION_FILE_MAX_BYTES) {
    throw new RangeError('Choose a written-explanations file no larger than 2 MiB.');
  }
  let document;
  try { document = JSON.parse(text); }
  catch { throw new RangeError('This file is not valid written-explanations JSON.'); }
  if (!exactFields(document, ['format', 'version', 'savedAt', 'deck', 'notes', 'application'])
      || document.format !== FORMAT || document.version !== 1) {
    throw new RangeError('This written-explanations format is not supported.');
  }
  if (typeof document.savedAt !== 'string' || !Number.isFinite(Date.parse(document.savedAt))
      || new Date(document.savedAt).toISOString() !== document.savedAt) {
    throw new RangeError('This file has an invalid save time.');
  }
  if (canonical(document.deck) !== canonical(deck)) {
    throw new RangeError('These explanations belong to a different course or course version. Open their exact course first.');
  }
  if (!Array.isArray(document.notes) || document.notes.some(note => !exactFields(note, ['item', 'text']))) {
    throw new RangeError('This file needs exactly one writing field for every question.');
  }
  let reflections;
  try { reflections = reflectionSnapshot(document, deck.items); }
  catch { throw new RangeError('This file needs one text field for every question and a text application response.'); }
  return Object.freeze({
    savedAt: document.savedAt, title: deck.title, reflections,
    writtenQuestions: reflections.notes.filter(note => note.text.length > 0).length
  });
}

/** Preserve literal writing, including empty fields, independently of answer archives. */
export function createReflectionFile({deck, reflections, savedAt = new Date()}) {
  const snapshot = reflectionSnapshot(reflections, deck.items);
  const when = new Date(savedAt);
  if (!Number.isFinite(when.getTime())) throw new RangeError('Written explanations need a valid save time.');
  const document = {format: FORMAT, version: 1, savedAt: when.toISOString(), deck,
    notes: snapshot.notes, application: snapshot.application};
  const text = JSON.stringify(document, null, 2) + '\n';
  readReflectionFile(text, deck);
  return Object.freeze({text, mediaType: 'application/json;charset=utf-8',
    filename: 'recallweave-written-explanations-' + when.toISOString().slice(0, 10) + '.json'});
}
