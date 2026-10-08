# Unfinished learner lesson file, version 1

The unfinished-lesson codec saves a started first session before all its questions
have answers. A learner can return to the same course, inspect the file, and resume
from the saved question or feedback. The native source contribution is tracked in
[issue #21](https://github.com/Jacob-Met/RecallWeave/issues/21).

The codec is a pure module. It neither reads browser storage nor applies restored
state to a page. File controls, preview, explicit restore, stale-read protection,
and the direct-file demo composition belong to the learning-page integration.

## Stable API

`src/lesson-archive.mjs` exports exactly:

- `LESSON_ARCHIVE_MAX_BYTES`, equal to 2 MiB of UTF-8 JSON.
- `createLessonArchive({deck, answers, mastery, presentation, savedAt?})`.
- `readLessonArchive(text, deck)`.

The caller supplies the **already admitted, currently loaded deck**. The archive
does not provide a new path around the existing course importer.

The presentation supplied to the writer is:

~~~js
{
  phase: 'question', // or 'feedback'
  itemId: currentItem.id,
  optionOrders: Object.fromEntries(optionOrders)
}
~~~

`optionOrders` contains exactly one entry for every deck item. Each value is a
permutation of that item's canonical option indices. Keeping all permutations
preserves answer letters for both the current question and subsequent questions.
The current app stores these permutations in a `Map`; convert it to a plain
record at this boundary. No mutable `Map` or `Set` is returned by the reader.

The writer returns a frozen object containing `filename`, `mediaType`, and `text`.
The filename is `recallweave-unfinished-lesson-YYYY-MM-DD.json`; the media type is
`application/json;charset=utf-8`. `savedAt` defaults to the current time. Explicit
valid save times are normalized to canonical UTC. The writer checks the original
state and round-trips the serialized file through the same reader before returning.

The reader returns deeply frozen state:

~~~js
{
  savedAt, title,
  answers: [{item, concept, choice, correct}, /* ... */],
  mastery: {/* concept: full-precision probability */},
  presentation: {
    phase: 'question', // or 'feedback'
    itemId,
    optionOrders: {/* item ID: immutable permutation */}
  },
  nextItemId,
  summary: {answered, total, remaining, correctFirst}
}
~~~

`answers` contains only first answers, in their actual adaptive order. `choice`
is the canonical option index, independent of the displayed answer letter.
Concept and correctness are derived from the loaded deck; the file does not
supply authority for them. `mastery` is recomputed with the existing native model
and must exactly match the saved estimates.

`nextItemId` always identifies the next **unanswered** native question. In a
question phase it equals `presentation.itemId`. In a feedback phase the
presentation item is the last answered question, so the two IDs differ.

## Admission and continuation

The version 1 JSON envelope has exactly these fields:

~~~text
format, version, savedAt, deck, model, firstAnswers, mastery, presentation
~~~

The format is `recallweave.unfinished-lesson`; the model is
`recallweave-bkt-v1` with the unchanged `DEFAULT_BKT` parameters. Source and model
comparison ignore JSON object key order and preserve array order. Course title,
content, options, canonical answers, prerequisites, attribution and all other
loaded source fields must agree. Formatting the JSON differently is harmless;
changing the loaded course content is not.

The reader admits at most 2 MiB of UTF-8 input before parsing. It checks the
version and canonical timestamp, compares the source and model, and then:

1. Starts from native `initialMastery`.
2. Selects the next unseen item with native `selectNextItem`.
3. Requires the next saved answer to name that item and a valid canonical choice.
4. Applies native `updateMastery` exactly once and proceeds to the next answer.
5. Requires the complete saved mastery record to equal the replay result without
   rounding or a numerical tolerance.
6. Verifies the question or feedback cursor and every answer permutation.

Unknown or duplicate items, a non-adaptive answer prefix, invalid choices, altered
model estimates, mismatched source, malformed presentation, and unsupported or
oversized JSON throw a `RangeError`. The current session is never mutated by the
codec. Deep source/model values beyond the admitted native deck's shallow
structure are rejected instead of recursively traversing an unbounded structure.

A started lesson with zero first answers is supported: it must show the first
native question with initial mastery and valid option permutations. A welcome
screen has no active question and should leave the save control disabled.

Once every item has a first answer, the new writer directs the caller to the
existing completed learning-trace format. This includes the final question's
feedback screen. `src/trace-archive.mjs`, its v1 format, review/practice state,
the BKT formulas and the adaptive selection function are unchanged.

This format checks **internal consistency and the loaded source/model
relationship**. It is a local learner file, not an authenticated record of learner
effort. A person can author a different internally consistent answer history.
It contains no reflection state, account data or automatic storage instructions.

## Learning-page integration

The active course importer is coordinated in
[issue #7](https://github.com/Jacob-Met/RecallWeave/issues/7). Integrate against that
owner's current frozen app composition. The codec contribution changes no app,
course-admission, author-draft, completed-trace, model or builder source.

The current app adds an item to `asked` when it **displays** the question, before
the answer exists. Do not serialize or blindly reuse that set on restore.
Reconstruct answered IDs from `state.answers`:

~~~js
const answeredIds = new Set(state.answers.map(answer => answer.item));
~~~

For a question restore, replace the first answers, mastery and option orders,
set `asked` to answered IDs, then render the native next question. The ordinary
question renderer selects `state.nextItemId` and marks it asked. Adding the saved
pending question before that selection would skip it.

For a feedback restore, reconstruct the last answered question from
`state.presentation.itemId` and its last canonical answer. Render its existing
feedback without calling the answer-submission function and without another BKT
update. `asked` already contains that answered item. The subsequent Next action
selects `state.nextItemId`.

The page should preview a selected file without changing the current session,
then apply its entire restored state in one explicit resume action. A restore
into an unfinished first session returns review/practice controls to their normal
inactive state. Existing reflections stay as they are. The confirmation copy must
make replacement of the current first-answer progress clear.

Invalidate a pending file read or preview when the selected file, loaded course,
current lesson, phase or answer permutation state changes. Use a monotonically
changing generation for course/reset lifetimes, including an A-to-B-to-A course
switch; a source equality check alone does not establish that lifetime.
Recheck the captured current state immediately before the explicit resume.
Use ordinary text rendering for the archived title, timestamp and preview text.

Refresh existing completed-trace controls when the first-answer state changes,
and invalidate their own pending previews through their existing refresh path.

The current `tools/make_demo.py` strips ES module imports/exports and concatenates
modules for the direct-file demo. An isolated IIFE can expose the three named API
exports while keeping codec helpers private. Both modular-page and direct-file
demo receiving are required for the later app integration; native module tests
alone do not establish either browser result.

## Focused native receiving

Run:

~~~sh
node --test tests/lesson-archive.test.mjs
~~~

The authored cases cover a mixed two-answer shipped-course prefix, continuation
equivalence with an uninterrupted native session, started-empty state, feedback,
the existing completed archive with separate practice progress, source/model
tampering, incorrect adaptive prefixes and choice indices, exact mastery,
presentation permutations, immutable results and refusal preservation, UTF-8
limits, timestamps and ordinary identifiers such as `__proto__`.

The exact received baseline, the native demonstration of the completed-only
boundary, and the new test receipt are retained under
`docs/receiving/unfinished-lesson-ae0a1ea0b247/`. Baseline rejection demonstrates
an intentionally absent unfinished-session capability, not a regression in the
completed-trace format. Pure module acceptance and eventual app integration or
deployment are separate states.
