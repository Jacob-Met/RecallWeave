# Unfinished learner lessons: source receiving

This contribution adds an explicit file download and preview/resume flow for an
unfinished first lesson. It is coordinated in RecallWeave issue #21. The existing
course importer and shared app composition remain with issue #7's owner.

The source is implemented and independently received. The qualified static-main
composition is local commit `f52bf26f38461400781250dc6d9259dd38a3a322`, tree
`e48943a6a0480de19a15207146644326256b5cd0`. Its learner source incorporates main
`a1ecbb83e71abe013c02d92ec3ba5fdf5b9ffbc4`, including the current course wording,
provenance and completion attribution. Later publication inherits the complete
actual parent tree; these local dependency closures are not upstream ancestry.

## Delivered behavior

After starting a lesson, a learner can save before the first answer, on an
unanswered question, or while feedback is visible. The file preserves the exact
course identity, native model parameters, adaptive first-answer prefix, full
precision mastery, current presentation and every item's displayed option order.

Reading a file produces a preview. Only the explicit Resume button replaces the
active first-answer and practice state. Question restoration displays the next
unanswered native item. Feedback restoration displays the already-recorded answer
without submitting it or updating the model again. The following Next action
continues normally. Reflections remain with the existing application owner.

The new codec reconstructs the first-answer prefix through the unchanged selector
and model before accepting it. It refuses altered source/model/presentation,
invalid adaptive order, rounded or changed estimates, malformed files and files
over 2 MiB. Completed sessions continue to use the existing trace format.

The UI invalidates pending reads and staged previews when the learner continues,
selects another file, opens a new file chooser, or cancels the chooser or preview.
The browser handles the explicit download. There is no new account, service,
provider call or automatic browser persistence.

## Exact accepted production source

| Path | Git blob |
|---|---|
| `src/lesson-archive.mjs` | `b55fc0dd514c105c69fdef4dd766c5dfc4cc2a84` |
| `src/lesson-archive-ui.mjs` | `39763b08dfeda55896aa4cf09ba92cb5db9398d5` |
| `src/app.mjs` | `0e33fc52803ce689cac6901fb27dc41e86defe95` |
| `index.html` | `469854a94b86a7511249f4beb1e63a049a680b90` |
| `styles.css` | `f4673b0af52f62aecbf2cfe4c553a60a40aeef01` |
| `tools/make_demo.py` | `974f005cb2b32f660106c04fce863ebbce704978` |
| `demo.html` | `ad12a354dcc153ae0cd75d82b6effd6c461649f6` |

The accepted browser manifest also binds the unchanged knowledge, review,
completed-trace, study-note and answer-order modules, and course blob
`8efc98fe278b436a47b245eadd419155ee7af2ad`. No model parameter or authored course
change belongs to this contribution.

## Verification and review roles

The codec author ran 13 focused native cases. Root's received source closure ran
63 Node tests with no failures or skips after the current course composition. The
63-test count describes that pinned closure; later unrelated repository additions
are inherited and checked by the complete-parent pull request's native CI.
[Native output](current-main-native-tests.log) and
[current source composition](current-main-composition.json) preserve this scope.

A separate reviewer accepted the codec using an independently authored nine-item
prerequisite deck admitted by the real validator. Six cohesive groups included
17 question/feedback restorations; every prefix continued to exactly the native
uninterrupted answer sequence and full-precision mastery. Started-empty and
last-unfinished-feedback states, option permutations, integer-like/prototype-named
identifiers, coherent alternate source/model refusal, UTF-8 limits and unchanged
inputs were checked. The [independent codec receipt](independent-codec/independent-lesson-receipt.json)
and [executable driver](independent-codec/independent_lesson_review.mjs) are exact
copies of that review.

The codec author separately reviewed root's UI/app/builder contribution. That is
independent frontend receiving, not independent acceptance of their own codec.
The unchanged driver passed all eight groups in actual Chromium 153.0.8010.0:

- Modular question and standalone phone feedback saves traveled through actual
  downloads, real disk files, fresh browser contexts, preview and explicit resume.
- Both resumed sessions produced actual completed-trace downloads matching the
  uninterrupted native first answers and unrounded mastery, with every remaining
  displayed option permutation retained.
- A started-empty file crossed from standalone to modular without skipping the
  first question. Cancel/refusal, newer-file selection, answering during a pending
  read and Next during a preview preserved the current lesson.
- Trusted native chooser cancellation cleared both a staged preview and a pending
  read whose completed text was delivered after cancellation.

The retained run produced ten native downloads, no browser errors and unchanged
before/after hashes for all 14 source files. The 390 by 844 phone preview was
visually inspected and measured without horizontal overflow. This establishes
the scoped software behavior and presentation, not learning effectiveness or
general browser/accessibility compatibility. See the
[independent frontend review](independent-ui/candidate-f52bf26f/REVIEW.md) and
[complete receipt](independent-ui/candidate-f52bf26f/independent-ui-receipt.json).

## Preserved failures and explicit controls

The original complete-only archive boundary has its own
[driver](baseline-boundary.mjs) and [result](baseline-boundary.json). It rejected
a valid unfinished prefix while its completed-session positive control passed.
This was a missing capability, not a regression in the completed archive.

Root's first UI composition passed seven browser groups and failed the native
chooser-cancel boundary: cancellation left a staged preview available. Its
[failure receipt](independent-ui/candidate-fc104055/independent-ui-receipt.json),
[review](independent-ui/candidate-fc104055/REVIEW.md), actual files and full original
14-file source closure remain unchanged. The correction adds input click/cancel
invalidation. The same driver then passed all eight groups.

The delay fixtures hold delivery of already-completed native `File.text()` reads
from real selected files. They do not replace the source bytes, codec or app
state. Chooser cancellation uses the installed Chromium protocol followed by a
real input click; both observed cancel events have `isTrusted: true`. No synthetic
DOM cancel event or human-operated OS dialog is claimed.

Both ordinary shared filesystems repeatedly filled during receiving. A separate
per-command temporary filesystem allowed the first corrected browser pass, but
its output did not survive that command. The exact unchanged run was repeated
once to capture the packet before exit; it was then transferred and each file
hash verified. That evidence-retention repair is recorded in
[durable-transfer.json](independent-ui/candidate-f52bf26f/durable-transfer.json).

## Reproduction

From the repository root, run the normal native command and rebuild the direct
file with the existing builder:

```sh
node --test tests/*.test.mjs
python3 tools/make_demo.py
```

The optional independent codec driver accepts explicit source locations:

```sh
RECALLWEAVE_LESSON_SOURCE="$PWD" \
RECALLWEAVE_ADMISSION_SOURCE="$PWD/src/deck.mjs" \
node docs/receiving/unfinished-lesson-ae0a1ea0b247/independent-codec/independent_lesson_review.mjs
```

The [frontend receiver's README](independent-ui/README.md) documents its browser,
source-pin and output arguments, controls, and original failure reproduction.
For the corrected composition use `--source` with the repository root and
`independent-ui/pins-f52bf26f.json`. It needs an existing Playwright installation
and Chromium executable; these are optional receiving dependencies, not app or
default native-suite dependencies. Use a new output directory for each run.

## Importer handoff and promotion boundary

Issue #7's current owner has a newer native importer composition under receiving;
the tested static-main hooks do not establish adoption into that source. Reuse
its active archive identity getter: bundled lessons retain the trusted raw deck
identity, while imported lessons use the normalized admitted identity. Do not
silently normalize a bundled identity when saving or restoring an archive.

The owner should compose these exact reviewed hooks with its frozen importer,
retain its admission/preview/session-start flow, refresh the lesson controls on
every course or lesson transition, and qualify the resulting shared source.
The source-bound PR is an integration offer. It does not transfer importer
ownership, declare native adoption, authorize a provider action or claim a
deployed result. No further browser repetition is needed for the unchanged
accepted static-main source; a meaningful importer composition should qualify
its actual changed seams.
