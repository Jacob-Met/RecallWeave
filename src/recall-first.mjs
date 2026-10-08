import { validateDeck } from './deck.mjs';

export const MAX_RECALL_TEXT = 4000;
const freeze = Object.freeze;

function state(fields) {
  return freeze({ ...fields, queue: freeze([...fields.queue]), first: freeze([...fields.first]), revisit: freeze([...fields.revisit]) });
}

export function createRecall(deck) {
  const checked = validateDeck(deck);
  return state({ deck: checked, pass: 'first', queue: checked.items.map((_, i) => i),
    index: 0, revealed: false, draft: '', first: [], revisit: [] });
}

export function currentRecall(session) {
  return session.index < session.queue.length ? session.deck.items[session.queue[session.index]] : null;
}

export function writeRecall(session, text) {
  if (!currentRecall(session) || session.revealed) throw new Error('Write before revealing this prompt.');
  if (typeof text !== 'string' || text.length > MAX_RECALL_TEXT) throw new Error('Keep your answer within 4,000 characters.');
  return state({ ...session, draft: text });
}

export function revealRecall(session) {
  if (!currentRecall(session) || session.revealed) throw new Error('This prompt cannot be revealed again.');
  return state({ ...session, revealed: true });
}

export function judgeRecall(session, judgment) {
  const item = currentRecall(session);
  if (!item || !session.revealed) throw new Error('Reveal and compare before your self-check.');
  if (!['ready', 'revisit'].includes(judgment)) throw new Error('Choose Ready for now or Revisit.');
  const record = freeze({ item: item.id, text: session.draft, judgment });
  return state({ ...session, [session.pass]: [...session[session.pass], record],
    index: session.index + 1, revealed: false, draft: '' });
}

export function beginRevisit(session) {
  if (currentRecall(session) || session.pass !== 'first') throw new Error('Finish the first pass before the one revisit pass.');
  const marked = new Set(session.first.filter(x => x.judgment === 'revisit').map(x => x.item));
  if (!marked.size) throw new Error('No items were marked for revisiting.');
  return state({ ...session, pass: 'revisit', queue: session.deck.items
    .map((item, index) => marked.has(item.id) ? index : -1).filter(index => index >= 0),
    index: 0, revealed: false, draft: '' });
}

export function recallSummary(session) {
  const completed = currentRecall(session) === null;
  const latest = new Map(session.first.map(x => [x.item, x]));
  for (const record of session.revisit) latest.set(record.item, record);
  return freeze({ completed, pass: session.pass, total: session.deck.items.length,
    firstChecked: session.first.length, revisitChecked: session.revisit.length,
    markedFirst: session.first.filter(x => x.judgment === 'revisit').length,
    revisitRemaining: [...latest.values()].filter(x => x.judgment === 'revisit').length });
}
