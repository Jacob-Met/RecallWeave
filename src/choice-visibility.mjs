/**
 * Advisory on per-question choice visibility under RecallWeave's existing
 * .choice button (CSS white-space:normal). Does not change deck admission,
 * answer indices, text, or semantics. Caller supplies an already validated deck.
 */
export const AUDIT_FORMAT = 'recallweave.choice-visibility-report/1';

export function renderedChoiceKey(raw) {
  if (typeof raw !== 'string') throw new TypeError('Choice must be a string.');
  // CSS white-space:normal collapses ASCII spacing, tabs and segment breaks.
  // Keep nonbreaking/format characters intact: they are reported separately.
  return raw.replace(/[\t\n\f\r ]+/g, ' ').replace(/^ +| +$/g, '');
}

export function inspectChoices(deck) {
  if (!deck || !Array.isArray(deck.items) || typeof deck.title !== 'string')
    throw new TypeError('Supply a validated RecallWeave deck.');
  const collisions = [], invisible = [];
  for (const item of deck.items) {
    if (!item || typeof item.id !== 'string' || !Array.isArray(item.options))
      throw new TypeError('The deck must have validated questions.');
    const groups = new Map();
    item.options.forEach((option, index) => {
      const label = renderedChoiceKey(option);
      const prior = groups.get(label) ?? [];
      prior.push(index);
      groups.set(label, prior);
      if (/[\u00a0\u200b-\u200f\u2060-\u206f\ufeff]/u.test(option)) {
        invisible.push(Object.freeze({questionId:item.id, optionIndex:index, exactText:option,
          note:'Nonbreaking space or invisible formatting character; review its intended display and meaning.'}));
      }
    });
    for (const [renderedText, indices] of groups.entries()) {
      if (indices.length < 2) continue;
      collisions.push(Object.freeze({questionId:item.id, renderedText,
        optionIndexes:Object.freeze(indices),
        exactTexts:Object.freeze(indices.map(index => item.options[index]))}));
    }
  }
  return Object.freeze({format:AUDIT_FORMAT, title:deck.title, questionsScanned:deck.items.length,
    collisions:Object.freeze(collisions), invisible:Object.freeze(invisible),
    disclaimer:'Advisory only. No original question, answer, spacing, or course was modified. ' +
      'A collision is equality after ordinary CSS whitespace collapsing; semantic alternatives may still differ. ' +
      'Invisible-format observations are separately flagged for review.'});
}
