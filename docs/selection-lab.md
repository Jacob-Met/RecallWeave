# Question selection lab

Open [selection-lab.html](../selection-lab.html) directly in a browser. This separate
offline page lets a course author inspect and rehearse RecallWeave's existing
question selector on the bundled course or a checked local deck.

## Start with a course and explicit assumptions

The bundled course opens immediately. To use another course, choose its JSON,
inspect the title, question/concept counts and original attribution, then choose
**Use this deck**. The same published deck validator checks the file, including
its 256 KiB limit. A preview leaves the active experiment in place. Cancellation,
invalid files and superseded reads preserve that experiment.

Enter a hypothetical starting probability from 0 through 1 for every concept.
**Apply & start a new path** uses those assumptions and clears the old synthetic
responses. **Discard starting edits** returns to the existing experiment and its
path. Stepping and downloading pause while starting inputs have unapplied edits.

The model's published parameters stay fixed: initial 0.22, learning transition
0.18, guess 0.2 and slip 0.1. **Start from defaults** explicitly replaces the
starting values with 0.22 and begins a fresh path. Imported courses with different
option counts still use those same model assumptions.

These values are illustrative assumptions about a model. The lab does not fit
parameters or establish what a person knows.

## Inspect the actual next choice

The next-question card comes from the unchanged
[selectNextItem](../src/knowledge.mjs) function. The two continuation cards show
what the original model would do after a hypothetical correct or incorrect
response to that selected question.

The candidate table keeps the original course order. Its chosen row identifies
the native result. Each row shows:

- The current hypothetical probability for that question's concept.
- Expected information gain in bits, from the native
  `expectedInformationGain` function.
- How many unanswered questions directly name that concept as a prerequisite.
- The existing repair preference:
  `(1 - probability) * min(3, direct dependents) * 0.12`.
- The sum used by the existing selector.

The repair term is a heuristic preference. Its sum with information gain is a
selection score, not a probability, grade or validated learning outcome.
Prerequisites do not make a question ineligible. Multiple remaining questions
can contribute to the same concept's count, while the preference caps that count
at three. Already used questions no longer contribute. Equal totals retain the
native `localeCompare` ID tie behavior.

The lab checks that its explanatory total identifies the actual native choice.
A disagreement stops the explanation so a future model change cannot silently
leave an old scoring description attached to a new selector.

## Rehearse a synthetic path

**Simulate correct** or **Simulate incorrect** supplies explicit hypothetical
evidence for the selected question. Only its concept's state is updated, through
the original `updateMastery`; the question becomes used and the native selector
chooses again. Every question can occur once in the current path.

The update has two stages: response evidence changes the conditional
probability, then the fixed learning transition is applied. Expected information
gain uses the response posteriors before that learning transition. Consequently,
an assumed incorrect response can still increase a sufficiently low starting
probability. The lab preserves that original model behavior.

**Back one step** restores the prior probabilities, used-question identities and
native next choice. Choosing a different response from there replaces the
abandoned continuation. **Restart same assumptions** clears synthetic responses
while keeping the applied starting values and checked course.

At exhaustion there is no next question or additional synthetic step.
Back, restart and the report remain available. The answer-key disclosure retains
the course's original options, correct-option identity, explanation and transfer
prompt for author inspection.

A course selection still being read or previewed is cancelled if a rehearsal
action or starting-input edit makes it stale. A late file read cannot replace
newer work.

## Keep the experiment report

**Download current synthetic experiment** saves inspect-only JSON with format
`recallweave-selection-experiment/1` and `kind: "synthetic"`. It contains:

- The validator's checked course field set, including the answer key, original
  text, array order, attribution and permission.
- Fixed model parameters and the applied hypothetical starting values.
- Each retained synthetic response and question ID, with before/after probability
  and the native next ID.
- The current concept state, used IDs, native next choice, explanatory candidate
  rows and both possible continuations.

The report records the active experiment, even while another course has only a
pending preview. Compact readouts show six significant digits; expanded values
and the JSON preserve full native Number precision. The report is separate from
RecallWeave's learner and lesson archives. It has no lab re-open operation and
cannot restore learner progress.

All work stays in this page's memory. Refreshing opens the bundled course with
default assumptions again. An open learner or Deck studio tab remains independent.
There is no account, upload, model request, automatic persistence or external
resource required by the standalone lab.

## Native sources and maintenance

The production model and validator remain unchanged. New lab functions wrap
their existing APIs; they do not replace question selection or probability
updates. The separate generator embeds the same native source and bundled deck
into one directly openable file.

From the repository root:

```bash
node tools/build-selection-lab.mjs
node tools/build-selection-lab.mjs --check
node --test tests/selection-lab.test.mjs
```

The maintained native controls cover the existing bundled witness, hand-computed
evidence/learning arithmetic, undo/branch replacement, endpoints/exhaustion,
refusals, immutable checked content, exact report state and standalone parity.
Their native-source hash checks deliberately require review of the explanation
and receiving results when the underlying model or validator changes.

An optional actual-browser gate uses Node and an already available Playwright
installation and Chromium:

```bash
node tools/check_selection_lab_browser.mjs \
  --browser /path/to/chromium \
  --playwright /path/to/playwright/package \
  --output /your/owned/receiving-directory
```

The runner uses a separate temporary browser profile and its own output paths.
It exercises this lab only. Existing learner/importer/author/review/archive,
course, catalog, dependency and workflow files remain with their existing owners.
