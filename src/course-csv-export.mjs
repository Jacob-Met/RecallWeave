import { parseDeck, serializeDeck } from './deck.mjs';
import { COURSE_CSV_COLUMNS, MAX_COURSE_CSV_BYTES, convertCourseCsv } from './course-csv.mjs';

const deckFields = new Set(['format', 'title', 'attribution', 'license', 'concepts', 'items']);
const questionFields = new Set([
  'id', 'concept', 'prerequisites', 'prompt', 'options', 'answer', 'explanation', 'transfer'
]);

function knownFields(value, fields, path) {
  for (const key of Object.keys(value)) {
    if (!fields.has(key)) throw new Error(path + ': unsupported field ' + JSON.stringify(key) +
      '. CSV export cannot preserve this data.');
  }
}

function wellFormedText(value, path) {
  if (typeof value === 'string') {
    for (let index = 0; index < value.length; index++) {
      const unit = value.charCodeAt(index);
      if (unit >= 0xD800 && unit <= 0xDBFF) {
        const next = value.charCodeAt(++index);
        if (!(next >= 0xDC00 && next <= 0xDFFF)) {
          throw new Error(path + ' contains an unpaired Unicode surrogate; UTF-8 CSV cannot preserve it.');
        }
      } else if (unit >= 0xDC00 && unit <= 0xDFFF) {
        throw new Error(path + ' contains an unpaired Unicode surrogate; UTF-8 CSV cannot preserve it.');
      }
    }
  } else if (Array.isArray(value)) {
    value.forEach((entry, index) => wellFormedText(entry, path + '[' + index + ']'));
  } else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) wellFormedText(entry, path + '.' + key);
  }
}

const quote = value => '"' + value.replaceAll('"', '""') + '"';

/**
 * Export one checked JSON lesson to the existing thirteen-column question bank.
 * Title, attribution and license are returned separately: the CSV schema has no
 * metadata columns. The actual importer must reproduce the checked source before
 * a caller receives bytes suitable for saving.
 */
export function exportCourseCsv(jsonText) {
  const deck = parseDeck(jsonText);
  const raw = JSON.parse(jsonText);
  knownFields(raw, deckFields, 'Deck');
  raw.items.forEach((question, index) => knownFields(question, questionFields, 'items[' + index + ']'));
  wellFormedText(deck, 'Deck');
  const firstSeen = [...new Set(deck.items.map(question => question.concept))];
  if (firstSeen.some((concept, index) => concept !== deck.concepts[index])) {
    throw new Error('The declared concept order differs from first question occurrence. ' +
      'The CSV importer cannot preserve this concept order; no export was produced.');
  }
  const metadata = Object.freeze({
    title: deck.title, attribution: deck.attribution, license: deck.license
  });
  const rows = [COURSE_CSV_COLUMNS, ...deck.items.map(question => [
    question.id, question.concept, question.prompt,
    ...Array.from({ length: 6 }, (_, index) => question.options[index] ?? ''),
    String(question.answer + 1), question.explanation, question.transfer,
    JSON.stringify(question.prerequisites)
  ])];
  const csv = rows.map(row => row.map(quote).join(',')).join('\r\n') + '\r\n';
  if (new TextEncoder().encode(csv).length > MAX_COURSE_CSV_BYTES) {
    throw new Error('The exported CSV would exceed the importer limit of 256 KiB.');
  }
  const roundTrip = convertCourseCsv(csv, metadata);
  if (roundTrip.json !== serializeDeck(deck)) {
    throw new Error('The existing CSV importer cannot preserve this checked lesson; no export was produced.');
  }
  return Object.freeze({
    csv, metadata, questionCount: deck.items.length, conceptCount: deck.concepts.length
  });
}
