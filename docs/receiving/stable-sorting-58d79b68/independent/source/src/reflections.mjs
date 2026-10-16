/** Learner-authored notes for this session, separate from answers and model state. */
export const APPLICATION_PROMPT = 'Trace energy from sunlight to a cell doing work. Where does the form of energy change, and what molecule transfers it to cellular processes?';

function freezeReflections(notes, application) {
  return Object.freeze({
    notes: Object.freeze(notes.map(note => Object.freeze({...note}))),
    application
  });
}

export function createReflections(items) {
  const ids = items.map(item => item.id);
  if (ids.some(id => typeof id !== 'string' || !id.trim()) || new Set(ids).size !== ids.length) {
    throw new RangeError('Reflections need a distinct identity for every question.');
  }
  return freezeReflections(ids.map(item => ({item, text: ''})), '');
}

export function itemReflection(reflections, itemId) {
  const note = reflections.notes.find(note => note.item === itemId);
  if (!note) throw new RangeError('Choose a question from this session.');
  return note.text;
}

export function updateReflection(reflections, itemId, text) {
  if (typeof text !== 'string') throw new TypeError('A reflection must be text.');
  itemReflection(reflections, itemId);
  return freezeReflections(reflections.notes.map(note =>
    note.item === itemId ? {item: itemId, text} : note), reflections.application);
}

export function updateApplicationReflection(reflections, text) {
  if (typeof text !== 'string') throw new TypeError('A reflection must be text.');
  return freezeReflections(reflections.notes, text);
}

/** Bind exported notes to question identities, regardless of the adaptive review order. */
export function reflectionSnapshot(reflections, items) {
  const expected = createReflections(items);
  if (!Array.isArray(reflections?.notes) || typeof reflections?.application !== 'string') {
    throw new RangeError('Study notes need the reflections from this session.');
  }
  const byId = new Map();
  for (const note of reflections.notes) {
    if (!note || typeof note.item !== 'string' || typeof note.text !== 'string' || byId.has(note.item)) {
      throw new RangeError('Study notes need one reflection field per question.');
    }
    byId.set(note.item, note.text);
  }
  if (byId.size !== expected.notes.length || expected.notes.some(note => !byId.has(note.item))) {
    throw new RangeError('Study notes need the reflections from this session’s questions.');
  }
  return freezeReflections(expected.notes.map(({item}) => ({item, text: byId.get(item)})), reflections.application);
}
