# Unfinished learner lessons: source receiving

This contribution adds explicit save, preview and resume controls for an unfinished
first lesson, coordinated in RecallWeave issue #21 and PR #37. The current runtime
composes those controls with the importer merged in PR #33 and the reflection
notebook merged in PR #36.

The accepted reflection composition is local receiving commit
`c7e296167813982978ecf01af2f66f2ebfbddc80`, using the exact notebook runtime from
native `3cdebd86e69506709bcaeaeff4026deb3d1fc208`. Its
[22-file source pins](reflections-join/source-pins.json),
[34 affected native tests](reflections-join/native-tests.json), and distinct
[three-group independent browser receipt](reflections-join/independent-browser/candidate/receipt.json)
bind the current runtime. Ten genuine downloads confirmed that current notebook
edits survive resume and later notes export; fresh Start and Reset retain the
notebook owner's clearing policy. Read the
[current composition and reproduction guide](reflections-join/README.md)
for the exact boundaries, controls and publication-only README addition.

The prior accepted importer composition was local
`6255bcb2e739c4c8e4e6821b63defce655a9771d`, published as native
`5caab405651dd9078a46d817d76a6a33c8d5c234`. Its full 67-file receiving
manifest, 134-test local closure, four distinct browser groups and eight genuine
downloads remain in [the importer join](importer-join/README.md). Native CI
[37791175943](https://github.com/Jacob-Met/RecallWeave/actions/runs/37791175943)
passed all 204 tests and standalone build parity on that exact published tree.
A normal expected-head merge was then refused with GitHub 405 because PR #36 had
concurrently merged. That refusal prompted the current reflection composition;
it is not recorded as a successful merge or a product test failure.

The earlier accepted static learner was local
`f52bf26f38461400781250dc6d9259dd38a3a322`, published in native
`9fd50141977d7127fd19c0d57fc5ac94a586e4e7`. Its 63-test closure,
eight browser groups, original chooser-cancel failure and correction remain
preserved below with their original source identities. Earlier receiving does
not claim to have exercised the later importer or notebook. Local receiving
closures are not asserted to be complete upstream Git ancestry.

## Delivered behavior

After starting a lesson, a learner can save before the first answer, on an
unanswered question, or while feedback is visible. The file preserves the exact
course identity, native model parameters, adaptive first-answer prefix, full
precision mastery, current presentation and every item's displayed option order.

Reading a file produces a preview. Only the explicit Resume button replaces the
active first-answer and practice state. Question restoration displays the next
unanswered native item. Feedback restoration displays the already-recorded answer
without submitting it or updating the model again. The following Next action
continues normally. Current question reflections and application writing remain
in their existing notebook during resume. The lesson file does not contain notes;
fresh Start and Reset clear them under the notebook owner's existing policy.

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
| `src/app.mjs` | `18521c1f4d3abdadf76790218616f09cee96d6c2` |
| `index.html` | `6036e40293deda29efe4be37ce00032d7aa6a17b` |
| `styles.css` | `bbe8021daa239faa3ad04281ecce94816d04cb15` |
| `tools/make_demo.py` | `3fe8ccbab37310cc126f898fb76a6df7a025c0ca` |
| `demo.html` | `cf7eea3792deacc3eb98a22aef539b920fb66746` |

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
The prior importer composition has its own [four-case receiver](importer-join/README.md).
The current reflection composition has a distinct [three-case receiver](reflections-join/README.md).
These optional receivers need an existing Playwright installation and Chromium
executable. The app and default native suite remain dependency-free. Use a new
output directory for each run.

## Importer and reflection composition, and native integration

PR #33 supplied the actual published importer. Root composed the bounded #21 hooks
over that source, preserving the native admission/preview/explicit-start flow,
literal imported content rendering, current course context, standalone builder
loader, and unchanged validator, model, picker and trace modules.

Both archive controls use the existing active identity contract: trusted raw
bundled source for old bundled files, normalized admitted source for imported
courses. The new transient revision participates only in pending-read and preview
validation; it is excluded from saved files. The distinct four-case receiver
qualified these changed boundaries against the actual app.

PR #36's notebook and study-note exporter remain exact native owner blobs.
Resume preserves their current writing, while the existing fresh-session reset
still clears it. The bounded app, builder and CSS composition was independently
received in both modular and generated standalone forms.

The full current native parent supplies unrelated course, authoring and receiving
work at publication. PR #37 records the exact complete tree, expected-head merge,
native CI and actual-parent preservation. Source acceptance does not transfer
other workers' importer, reflection or course ownership. Operational or hosted
behavior is reported only when native evidence supports it.
