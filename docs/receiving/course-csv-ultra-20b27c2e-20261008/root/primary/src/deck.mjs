/** Local lesson content. Imported data cannot replace the model or run code. */
export const DECK_FORMAT = 'recallweave-deck/1';
export const MAX_DECK_BYTES = 262144;

function deckRecord(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${path} must be an object.`);
  }
  return value;
}

function deckText(value, path, limit) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) {
    throw new Error(`${path} must be nonempty text of at most ${limit} characters.`);
  }
  return value;
}

function deckList(value, path, minimum, maximum) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new Error(`${path} must contain ${minimum}–${maximum} entries.`);
  }
  return value;
}

/** Validate and copy only the content fields used by the existing lesson runtime. */
export function validateDeck(value) {
  const input = deckRecord(value, 'Deck');
  if (input.format !== undefined && input.format !== DECK_FORMAT) {
    throw new Error(`Unsupported deck format. Use ${DECK_FORMAT}.`);
  }
  const title = deckText(input.title, 'title', 160);
  const attribution = deckText(input.attribution, 'attribution', 2000);
  const license = deckText(input.license, 'license', 2000);
  const concepts = deckList(input.concepts, 'concepts', 1, 32).map((concept, index) =>
    deckText(concept, `concepts[${index}]`, 80));
  if (new Set(concepts).size !== concepts.length) throw new Error('Concept names must be unique.');
  const knownConcepts = new Set(concepts);
  const ids = new Set();
  const coveredConcepts = new Set();
  const links = new Map(concepts.map(concept => [concept, new Set()]));
  const items = deckList(input.items, 'items', 1, 100).map((value, index) => {
    const path = `items[${index}]`;
    const item = deckRecord(value, path);
    const id = deckText(item.id, `${path}.id`, 80);
    if (ids.has(id)) throw new Error(`${path}.id duplicates another question ID.`);
    ids.add(id);
    const concept = deckText(item.concept, `${path}.concept`, 80);
    if (!knownConcepts.has(concept)) throw new Error(`${path}.concept is not in concepts.`);
    coveredConcepts.add(concept);
    const prerequisites = deckList(item.prerequisites, `${path}.prerequisites`, 0, 31).map((name, p) => {
      deckText(name, `${path}.prerequisites[${p}]`, 80);
      if (!knownConcepts.has(name)) throw new Error(`${path}.prerequisites contains an unknown concept.`);
      if (name === concept) throw new Error(`${path} cannot require its own concept.`);
      links.get(concept).add(name);
      return name;
    });
    if (new Set(prerequisites).size !== prerequisites.length) throw new Error(`${path}.prerequisites contains a duplicate.`);
    const options = deckList(item.options, `${path}.options`, 2, 6).map((option, o) =>
      deckText(option, `${path}.options[${o}]`, 1000));
    if (new Set(options).size !== options.length) throw new Error(`${path}.options must be distinct.`);
    if (!Number.isInteger(item.answer) || item.answer < 0 || item.answer >= options.length) {
      throw new Error(`${path}.answer must be a zero-based index of an option.`);
    }
    return Object.freeze({
      id, concept, prerequisites: Object.freeze(prerequisites),
      prompt: deckText(item.prompt, `${path}.prompt`, 2000),
      options: Object.freeze(options), answer: item.answer,
      explanation: deckText(item.explanation, `${path}.explanation`, 4000),
      transfer: deckText(item.transfer, `${path}.transfer`, 2000)
    });
  });
  if (coveredConcepts.size !== concepts.length) throw new Error('Every concept must have at least one question.');
  const visiting = new Set();
  const visited = new Set();
  const visit = concept => {
    if (visiting.has(concept)) throw new Error('Prerequisite links must not form a cycle.');
    if (visited.has(concept)) return;
    visiting.add(concept);
    for (const prerequisite of links.get(concept)) visit(prerequisite);
    visiting.delete(concept);
    visited.add(concept);
  };
  concepts.forEach(visit);
  return Object.freeze({
    format: DECK_FORMAT, title, attribution, license,
    concepts: Object.freeze(concepts), items: Object.freeze(items)
  });
}

/** The same size limit applies to a File and to programmatically supplied UTF-8 JSON. */
export function parseDeck(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_DECK_BYTES) {
    throw new Error('Choose a JSON deck no larger than 256 KiB.');
  }
  let value;
  try { value = JSON.parse(text); }
  catch { throw new Error('The file is not valid JSON. Check its commas, quotes and brackets.'); }
  return validateDeck(value);
}

/** Export the existing bundled lesson as an editable example of the same contract. */
export function serializeDeck(deck) {
  return JSON.stringify(validateDeck(deck), null, 2) + '\n';
}
