// Fresh native processes select their actual ICU locale from LANG/LC_ALL.
import { readFileSync } from 'node:fs';
import { validateDeck } from '../../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../../src/knowledge.mjs';
import { createLessonArchive, readLessonArchive } from '../../src/lesson-archive.mjs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const runtime = {
  node: process.version, icu: process.versions.icu,
  locale: Intl.Collator().resolvedOptions().locale
};
try {
  const deck = validateDeck(input.deck ?? JSON.parse(input.text).deck);
  if (input.action === 'restore') {
    const state = readLessonArchive(input.text, deck);
    const saved = createLessonArchive({
      deck, answers: state.answers, mastery: state.mastery,
      presentation: state.presentation, savedAt: state.savedAt
    });
    process.stdout.write(JSON.stringify({runtime, ok: true, state, text: saved.text}) + '\n');
  } else if (input.action === 'produce') {
    const asked = new Set();
    const mastery = initialMastery(deck.concepts);
    const answers = [];
    const freshItemId = selectNextItem(deck.items, asked, mastery).id;
    for (let index = 0; index < input.count; index++) {
      const item = selectNextItem(deck.items, asked, mastery);
      const choice = input.correct === false ? (item.answer + 1) % item.options.length : item.answer;
      asked.add(item.id);
      mastery[item.concept] = updateMastery(mastery[item.concept], choice === item.answer);
      answers.push({item: item.id, choice});
    }
    const phase = input.phase ?? 'question';
    const itemId = phase === 'feedback' ? answers.at(-1).item : selectNextItem(deck.items, asked, mastery).id;
    const presentation = {
      phase, itemId,
      optionOrders: Object.fromEntries(deck.items.map(item =>
        [item.id, item.options.map((_, index) => index).reverse()]))
    };
    const saved = createLessonArchive({
      deck, answers, mastery, presentation, savedAt: '2026-10-08T15:00:00.000Z'
    });
    const state = readLessonArchive(saved.text, deck);
    process.stdout.write(JSON.stringify({runtime, ok: true, freshItemId, state, text: saved.text}) + '\n');
  } else {
    throw new Error('Unknown locale test operation.');
  }
} catch (error) {
  process.stdout.write(JSON.stringify({
    runtime, ok: false, error: {name: error.name, message: error.message}
  }) + '\n');
}
