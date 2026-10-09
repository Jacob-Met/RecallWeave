import { parseDeck } from './deck.mjs';

function freezeReport(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeReport(child);
    Object.freeze(value);
  }
  return value;
}

/**
 * Inspect literal repetitions without editing questions or judging their facts.
 * Equal choice sets use exact strings; their displayed order remains the first
 * member's order. Authored answers are compared by selected text, not index.
 */
export function inspectCourseRepetition(text) {
  const deck = parseDeck(text);
  const byPrompt = new Map();
  for (const [index, item] of deck.items.entries()) {
    if (!byPrompt.has(item.prompt)) byPrompt.set(item.prompt, []);
    byPrompt.get(item.prompt).push({ index, item });
  }

  const prompts = [];
  for (const [prompt, members] of byPrompt) {
    if (members.length < 2) continue;
    const byChoices = new Map();
    for (const member of members) {
      // JSON encoding keeps arbitrary option strings distinct, including NUL.
      // Sorting a copy defines set identity without changing displayed choices.
      const key = JSON.stringify([...member.item.options].sort());
      if (!byChoices.has(key)) byChoices.set(key, []);
      byChoices.get(key).push(member);
    }

    const choiceGroups = [];
    for (const peers of byChoices.values()) {
      if (peers.length < 2) continue;
      const byAnswer = new Map();
      for (const { item } of peers) {
        const answerText = item.options[item.answer];
        if (!byAnswer.has(answerText)) byAnswer.set(answerText, []);
        byAnswer.get(answerText).push(item.id);
      }
      const authoredAnswers = [...byAnswer].map(([text, questionIds]) => ({
        text, questionIds
      }));
      choiceGroups.push({
        options: peers[0].item.options,
        questionIds: peers.map(({ item }) => item.id),
        authoredAnswers,
        answerDisagreement: authoredAnswers.length > 1
      });
    }
    prompts.push({ prompt, members, choiceGroups });
  }

  return freezeReport({
    format: 'recallweave-course-repetition/1',
    course: {
      title: deck.title, attribution: deck.attribution, license: deck.license
    },
    summary: {
      questionCount: deck.items.length,
      repeatedPromptGroups: prompts.length,
      repeatedQuestionCount: prompts.reduce((sum, group) => sum + group.members.length, 0),
      equivalentChoiceGroups: prompts.reduce((sum, group) => sum + group.choiceGroups.length, 0),
      answerDisagreementGroups: prompts.reduce((sum, group) =>
        sum + group.choiceGroups.filter(choice => choice.answerDisagreement).length, 0)
    },
    prompts
  });
}
