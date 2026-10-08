import { APPLICATION_PROMPT, reflectionSnapshot } from './reflections.mjs';

/** Build local, readable study notes from a completed first session and separate practice. */
export function createStudyNotes({ deck, review, mastery, practice = null, reflections = null, exportedAt = new Date(), conceptLabel = id => id }) {
  if (!Array.isArray(review) || review.length !== deck.items.length || review.length === 0) {
    throw new RangeError('Finish the learning session before saving study notes.');
  }
  const known = new Set(deck.items.map(item => item.id));
  const seen = new Set();
  for (const item of review) {
    if (!known.has(item.id) || seen.has(item.id)) throw new RangeError('Study notes need every first answer exactly once.');
    seen.add(item.id);
    for (const choice of [item.choice, item.answer]) {
      if (!Number.isInteger(choice) || choice < 0 || choice >= item.options.length) {
        throw new RangeError('Study notes need the recorded answer choice.');
      }
    }
  }
  const missed = review.filter(item => item.choice !== item.answer);
  const retries = practice?.answers ?? [];
  if (retries.length > missed.length) throw new RangeError('Practice must remain separate from the first session.');
  retries.forEach((retry, index) => {
    const item = missed[index];
    if (retry.item !== item.id || !Number.isInteger(retry.choice) || retry.choice < 0 || retry.choice >= item.options.length) {
      throw new RangeError('Study notes need the recorded practice order and choices.');
    }
  });
  const savedAt = new Date(exportedAt);
  if (!Number.isFinite(savedAt.getTime())) throw new RangeError('Study notes need a valid save time.');
  const notebook = reflections === null ? null : reflectionSnapshot(reflections, deck.items);
  const reflectionById = new Map(notebook?.notes.map(note => [note.item, note.text]));
  const lines = [
    'RecallWeave — study notes',
    deck.title,
    `Saved: ${savedAt.toISOString()}`,
    '',
    'FIRST SESSION',
    `${review.length - missed.length} of ${review.length} connections correct on the first try.`,
    'This count describes this session; it is not a measure of your ability.',
    '',
    'ESTIMATED MASTERY — MODEL STATE, NOT A GRADE',
    'These estimates come from the demo’s learning model. They are not a validated assessment.',
    'Practice does not change the first-session estimates.'
  ];
  for (const concept of deck.concepts) {
    const value = mastery[concept];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError('Study notes need the original model estimates.');
    }
    lines.push(`${conceptLabel(concept)}: ${Math.round(value * 100)}%`);
  }
  lines.push('', 'PRACTICE');
  if (!missed.length) lines.push('No missed connections in the first session.');
  else if (!practice) lines.push(`Not started. ${missed.length} missed ${missed.length === 1 ? 'connection is' : 'connections are'} available for practice.`);
  else {
    const correct = retries.filter((retry, index) => retry.choice === missed[index].answer).length;
    lines.push(`${retries.length === missed.length ? 'Complete' : 'Paused'}: ${retries.length} of ${missed.length} practice answers recorded; ${correct} correct on retry.`);
  }
  lines.push('Practice follows the explanations and is recorded separately from the first answers.', '', 'REVIEW THE CONNECTIONS');
  const retryById = new Map(retries.map(retry => [retry.item, retry]));
  review.forEach((item, index) => {
    const retry = retryById.get(item.id);
    lines.push(
      '',
      `${index + 1}. ${item.prompt}`,
      `Concept: ${conceptLabel(item.concept)}`,
      `Your first answer: ${item.options[item.choice]}`,
      `First try: ${item.choice === item.answer ? 'correct' : 'needs review'}`,
      `Correct answer: ${item.options[item.answer]}`,
      `Explanation: ${item.explanation}`,
      `Apply the idea: ${item.transfer}`
    );
    if (notebook) {
      const text = reflectionById.get(item.id);
      lines.push('Your explanation — reflection, not scored:');
      lines.push(...(text ? text.split('\n').map(line => `  > ${line}`) : ['  Not written.']));
    }
    if (retry) {
      lines.push(`Practice answer: ${item.options[retry.choice]}`, `Practice result: ${retry.choice === item.answer ? 'correct on retry' : 'keep reviewing'}`);
    } else if (item.choice !== item.answer) lines.push('Practice answer: not recorded.');
  });
  if (notebook) {
    lines.push('', 'YOUR APPLICATION REFLECTION — NOT SCORED');
    lines.push(`Prompt: ${APPLICATION_PROMPT}`);
    lines.push(...(notebook.application ? notebook.application.split('\n').map(line => `  > ${line}`) : ['Not written.']));
  }
  lines.push('', 'DECK ATTRIBUTION', deck.attribution, deck.license, '', 'Saved from this browser session. The download does not upload the session or restore it after a refresh.');
  return Object.freeze({
    filename: `recallweave-study-notes-${savedAt.toISOString().slice(0, 10)}.txt`,
    mediaType: 'text/plain;charset=utf-8',
    text: `${lines.join('\n')}\n`
  });
}
