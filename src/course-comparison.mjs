import { parseDeck } from './deck.mjs';

const ITEM_FIELDS = Object.freeze([
  'concept', 'prerequisites', 'prompt', 'options', 'answer', 'explanation', 'transfer'
]);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function orderComparison(before, after) {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  return {
    beforeOrder: before,
    afterOrder: after,
    added: after.filter(value => !beforeSet.has(value)),
    removed: before.filter(value => !afterSet.has(value)),
    retainedOrderChanged: !same(
      before.filter(value => afterSet.has(value)),
      after.filter(value => beforeSet.has(value))
    )
  };
}

/**
 * Describe literal changes in the existing validator's admitted content.
 * Stable IDs pair records; this does not migrate learner answers or archives.
 */
export function compareCourses(beforeText, afterText) {
  const before = parseDeck(beforeText);
  const after = parseDeck(afterText);
  const beforeItems = new Map(before.items.map((item, index) => [item.id, { item, index }]));
  const afterItems = new Map(after.items.map((item, index) => [item.id, { item, index }]));
  const order = orderComparison(before.items.map(item => item.id), after.items.map(item => item.id));
  const retained = before.items.filter(item => afterItems.has(item.id)).map(item => {
    const prior = beforeItems.get(item.id);
    const next = afterItems.get(item.id);
    return {
      id: item.id,
      beforeIndex: prior.index,
      afterIndex: next.index,
      positionChanged: prior.index !== next.index,
      changedFields: ITEM_FIELDS.filter(field => !same(item[field], next.item[field])),
      answerIndexChanged: item.answer !== next.item.answer,
      answerTextChanged: item.options[item.answer] !== next.item.options[next.item.answer],
      before: item,
      after: next.item
    };
  });
  const added = order.added.map(id => afterItems.get(id).item);
  const removed = order.removed.map(id => beforeItems.get(id).item);
  const changed = retained.filter(row => row.changedFields.length > 0).length;
  return freeze({
    format: 'recallweave-course-comparison/1',
    sameContent: same(before, after),
    metadataChanges: ['title', 'attribution', 'license']
      .filter(field => before[field] !== after[field])
      .map(field => ({ field, before: before[field], after: after[field] })),
    concepts: orderComparison(before.concepts, after.concepts),
    questions: {
      beforeOrder: order.beforeOrder,
      afterOrder: order.afterOrder,
      added,
      removed,
      retained,
      retainedOrderChanged: order.retainedOrderChanged,
      summary: {
        beforeCount: before.items.length,
        afterCount: after.items.length,
        added: added.length,
        removed: removed.length,
        changed,
        unchanged: retained.length - changed,
        positionChanged: retained.filter(row => row.positionChanged).length
      }
    }
  });
}
