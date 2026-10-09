# Review repeated questions in a checked course

A course assembled from several question banks can contain different IDs for the same prompt. Those questions may be intentional practice, or their authored answer keys may disagree. `inspectCourseRepetition` produces a read-only report for that review. It does not remove questions, select a preferred answer, or decide whether the course is factually correct.

This is a developer-facing module for course-author checks. It does not add a screen to Deck studio or change the learner, parser, course format, catalog, model or saved work.

## Use the native module

Import `inspectCourseRepetition` from `src/course-repetition.mjs` and pass a JSON string. The same unchanged `parseDeck` used by the learner admits the complete course first, including the 256 KiB UTF-8 limit, unique IDs, answer bounds, concept coverage and prerequisite rules. Invalid input throws before a report is returned.

For example, from a Node module at the repository root:

```js
import { inspectCourseRepetition } from './src/course-repetition.mjs';

const question = (id, options, answer) => ({
  id, concept: 'Parity', prerequisites: [],
  prompt: 'Which number is even?', options, answer,
  explanation: 'Check which value is divisible by two.',
  transfer: 'Explain the selected option in your own words.'
});
const text = JSON.stringify({
  title: 'Review example', attribution: 'Original example', license: 'CC0-1.0',
  concepts: ['Parity'],
  items: [
    question('first', ['2', '3'], 0),
    question('moved', ['3', '2'], 1)
  ]
});
const report = inspectCourseRepetition(text);
console.log(JSON.stringify(report, null, 2));
```

This example has two repeated questions, one equivalent choice group and no answer disagreement: both IDs select the literal text `2`. The first question's choices retain their original order in the report. Changing the second question's answer to `0` would select `3` and produce two authored-answer groups.

Any file reading or output writing belongs to the calling program. This helper has no filesystem, stream, network, account, browser or storage behavior. It does not export or overwrite a checked course.

## Read the result

The report format is `recallweave-course-repetition/1`. `course` retains the exact admitted title, attribution and license. `summary` contains:

| Field | Meaning |
| --- | --- |
| `questionCount` | Every admitted question, including unique prompts. |
| `repeatedPromptGroups` | Number of literal prompts occurring at least twice. |
| `repeatedQuestionCount` | Number of questions in those repeated-prompt groups. |
| `equivalentChoiceGroups` | Number of repeated option sets within the repeated prompts. |
| `answerDisagreementGroups` | Equivalent choice groups containing more than one authored selected text. |

`prompts` contains only repeated prompts, in first occurrence order. Each group has the literal `prompt`, complete `members`, and `choiceGroups`.

Each member is `{index, item}`. `index` is the question's **zero-based position in the original course**. `item` is the complete validated question: ID, concept, prerequisites, prompt, options, answer, explanation and transfer. This keeps any differences in context available for human inspection. Ignored raw JSON properties do not enter the report.

A choice group contains at least two questions under that same prompt with the same set of exact option strings. Reordering the options does not change this membership. Adding, removing or changing an option creates a different set; singleton sets produce no choice group.

Each choice group provides:

- `options`: the first member's exact original option array, in its original order.
- `questionIds`: all IDs in the group, in source order.
- `authoredAnswers`: `{text, questionIds}` records, grouped by the exact selected option text. Groups appear when that selected text first occurs; their IDs retain source order.
- `answerDisagreement`: whether there is more than one selected text.

The numeric answer index alone is insufficient. Moving options can change the index while preserving the selected text. Conversely, retaining an index can select different text after an option moves.

## Literal comparison and limits

No text is trimmed, case folded or Unicode-normalized. A trailing space, letter case, composed versus decomposed accent, or embedded character can distinguish prompts or options. Reserved object-property names such as `__proto__` are ordinary strings. Option-set identity does not use a delimiter that could collide with authored option content.

All returned arrays and records are deeply frozen. Complete admitted question content remains unchanged. The helper creates no learner answers, model updates, course edits or automatic decisions.

A disagreement is a review cue. Identical wording may still have different intended contexts, and a course may deliberately repeat a question. Neither matching answer keys nor a report with zero groups certifies factual accuracy, good distractors, balanced assessment or learning effectiveness. The report does not measure semantic similarity.

## Qualification boundary

The bounded source depends only on the unchanged `src/deck.mjs`. Maintained module tests live in `tests/course-repetition.test.mjs`; the ordinary repository command is:

```sh
node --test tests/course-repetition.test.mjs
```

The source-only receiving environment has no allocated repository files. Its primary-runtime qualification executes these exact module bytes through an explicit in-memory module loader in the existing Node process; the frozen receiving record identifies source hashes, command, raw output and scope. It does not qualify an on-disk checkout, command-line file reader, browser surface or whole-repository integration.

The helper's source and receiving evidence are preserved as immutable Git objects for issue #190. A prepared source tree does not establish integration or deployment. Source refs, commits, PRs, workflow changes and Actions runs remain outside this contribution's publication boundary. Any ordinary-file consumer, browser surface or whole-repository integration retains its own owner and native receiving gates.
