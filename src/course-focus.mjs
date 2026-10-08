import { MAX_DECK_BYTES, parseDeck, serializeDeck, validateDeck } from './deck.mjs';

/** Select complete concepts, including dependencies declared by any of their questions. */
function planAdmittedDeck(deck, targetConcepts) {
  if (!Array.isArray(targetConcepts) || targetConcepts.length > deck.concepts.length) {
    throw new Error('Choose a list of target concepts from this deck.');
  }
  const known = new Set(deck.concepts);
  const requested = new Set();
  for (const concept of targetConcepts) {
    if (typeof concept !== 'string' || !known.has(concept)) {
      throw new Error('Every target concept must belong to this deck.');
    }
    if (requested.has(concept)) throw new Error('Choose each target concept only once.');
    requested.add(concept);
  }

  const dependencies = new Map(deck.concepts.map(concept => [concept, new Set()]));
  const counts = new Map(deck.concepts.map(concept => [concept, 0]));
  for (const item of deck.items) {
    counts.set(item.concept, counts.get(item.concept) + 1);
    for (const prerequisite of item.prerequisites) dependencies.get(item.concept).add(prerequisite);
  }

  const included = new Set(requested);
  const pending = [...requested];
  while (pending.length) {
    for (const prerequisite of dependencies.get(pending.pop())) {
      if (!included.has(prerequisite)) {
        included.add(prerequisite);
        pending.push(prerequisite);
      }
    }
  }

  const concepts = deck.concepts.filter(concept => included.has(concept));
  const inclusions = concepts.map(concept => Object.freeze({
    concept,
    requested: requested.has(concept),
    questionCount: counts.get(concept),
    requiredBy: Object.freeze(concepts.filter(other => dependencies.get(other).has(concept)))
  }));
  return Object.freeze({
    requested: Object.freeze(deck.concepts.filter(concept => requested.has(concept))),
    required: Object.freeze(concepts.filter(concept => !requested.has(concept))),
    concepts: Object.freeze(concepts),
    items: Object.freeze(deck.items.filter(item => included.has(item.concept))),
    inclusions: Object.freeze(inclusions)
  });
}

/** Empty selections are useful while editing, but do not produce a checked lesson. */
export function planCourseFocus(sourceDeck, targetConcepts) {
  return planAdmittedDeck(validateDeck(sourceDeck), targetConcepts);
}

/** Produce the exact downloadable checked file without changing the source deck. */
export function createFocusedLesson(sourceDeck, targetConcepts, title) {
  const source = validateDeck(sourceDeck);
  const plan = planAdmittedDeck(source, targetConcepts);
  if (!plan.requested.length) throw new Error('Choose at least one target concept before downloading.');
  const candidate = validateDeck({
    format: source.format,
    title,
    attribution: source.attribution,
    license: source.license,
    concepts: plan.concepts,
    items: plan.items
  });
  const utf8 = new TextEncoder();
  let json = serializeDeck(candidate);
  if (utf8.encode(json).length > MAX_DECK_BYTES) json = JSON.stringify(candidate);
  const deck = parseDeck(json);
  return Object.freeze({ ...plan, deck, json, bytes: utf8.encode(json).length });
}
