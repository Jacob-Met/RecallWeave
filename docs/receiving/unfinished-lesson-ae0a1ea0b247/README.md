# Unfinished learner lessons: source receiving

This contribution adds explicit save, preview and resume controls for an unfinished
first lesson, coordinated in RecallWeave issue #21 and PR #37. The current source
composes those controls with the importer already merged in PR #33.

The accepted joined application is local receiving commit
`6255bcb2e739c4c8e4e6821b63defce655a9771d`, based on the exact native importer
runtime at `9b69c9c1dcc578d45e58d9b7f78eecb0613d76f3`. The full 67-file receiving
manifest is in [the importer join](importer-join/joined-source-pins.json).
The current full native suite passed 134 tests. A distinct independent browser
receiver passed four new importer/session transition groups, produced eight real
downloads, and verified every source pin before and after. Its
[acceptance](importer-join/JOIN-REVIEW.json) and
[reproduction guide](importer-join/README.md) identify the exact source, cases,
review roles and observed font limitation.

The earlier accepted static learner was local `f52bf26f38461400781250dc6d9259dd38a3a322`,
published in native `9fd50141977d7127fd19c0d57fc5ac94a586e4e7`. Its 63-test closure,
eight browser groups, original chooser-cancel failure and correction remain
preserved below with their original source identities. They are historical
receiving, not a claim that the static app contained the later importer.
Local receiving closures are not asserted to be complete upstream Git ancestry.

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
The joined app also advances a transient session revision on every fresh Start or
Reset, so equal course data cannot keep an old pending restore alive.
The browser handles the explicit download. There is no new account, service,
provider call or automatic browser persistence.

## Exact accepted production source

| Path | Git blob |
|---|---|
| `src/lesson-archive.mjs` | `b55fc0dd514c105c69fdef4dd766c5dfc4cc2a84` |
| `src/lesson-archive-ui.mjs` | `21674525d078e633313503f91bcf89b72ed999df` |
| `src/app.mjs` | `19205aa09a2350e45b644420a9496f902065b118` |
| `index.html` | `6036e40293deda29efe4be37ce00032d7aa6a17b` |
| `styles.css` | `58c3f7d7a9ed45513f7078f323e89cdd93f378d6` |
| `tools/make_demo.py` | `ade2b05361468157d1ab69ad72d0a93c3a1f6624` |
| `demo.html` | `9d5ba00b14131ce72f3aa439fffd0b566b33c22a` |

The accepted browser manifest also binds the unchanged knowledge, review,
completed-trace, study-note and answer-order modules, and course blob
`8efc98fe278b436a47b245eadd419155ee7af2ad`. No model parameter or authored course
change belongs to this contribution.

## Earlier static receiving and review roles

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
For the earlier static composition, check out native `9fd50141977d7127fd19c0d57fc5ac94a586e4e7`
and use `--source` with that checkout and `independent-ui/pins-f52bf26f.json`.
The current joined source has its own [four-case receiver](importer-join/README.md).
Both optional receivers need an existing Playwright installation and Chromium
executable. The app and default native suite remain dependency-free. Use a new
output directory for each run.

## Importer composition and native integration

PR #33 supplied the actual published importer. Root composed the bounded #21 hooks
over that source, preserving the native admission/preview/explicit-start flow,
literal imported content rendering, current course context, standalone builder
loader, and unchanged validator, model, picker and trace modules.

Both archive controls use the existing active identity contract: trusted raw
bundled source for old bundled files, normalized admitted source for imported
courses. The new transient revision participates only in pending-read and preview
validation; it is excluded from saved files. The distinct four-case receiver
qualified these changed boundaries against the actual app.

The full current native parent supplies unrelated course, authoring and receiving
work at publication. PR #37 records the exact complete tree, expected-head merge,
native CI and actual-parent preservation. Source acceptance does not transfer
other workers' importer, reflection or course ownership. Operational or hosted
behavior is reported only when native evidence supports it.
