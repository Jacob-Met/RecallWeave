# Independent RecallWeave reflection receiving review

The original reflection candidate passed five independently authored browser
receiving checks and produced six actual downloaded notes files. No additional
implementation blocker was found in these controls.

The reviewed source is the author's frozen `main-qualified` composition on
RecallWeave main `3e3217959bdf277ae5ef61a7afe68142e2626486`. The app is pinned at
SHA-256 `825e7af9756a4738f228876ec08f79ed9c83aef18cea9248d64603096e72e380`, the
reflection module at
`92354bccb48deb7c3455d4f9d0e922f7b8b5d45d3d7bbf1968d23ad2818fe330`, and the exporter
at `1f266a8503a23b52809417fba251225d1805e4d214b61e40dcdfbfca4bb35c13`. All ten source
file sizes and SHA-256 hashes matched before and after execution. No project
source files were copied or modified by this reviewer.

## Receiving controls

The runner starts its own local static server and a disposable Chromium profile.
It operates the real app through keyboard events and native text insertion, then
reads bytes written by the browser's actual download flow. It does not replace
app globals, inject answer state, or substitute an export implementation. The
generic CDP transport follows the existing optional browser runner's approach;
the assertions and scenarios here were authored independently.

1. Two simultaneously open modular app documents receive different first answers
   and different notes for all six canonical question IDs. Editing the second
   document leaves the first document's answers, model readout, and notes intact.
2. A session with six initially missed questions pauses before any retry and
   again after two retries, then completes all six retries with three correct.
   Its downloaded file retains all six original answers, notes and exact retry
   choices in their own canonical question paragraphs. The original live model
   readout stays unchanged.
3. Editing after practice completion changes the intended note, while clearing
   another question note and the application field is represented as unwritten.
   The new download retains the original and practice answer records.
4. The other document is paused after one of three retries. Resetting the first
   document through the actual reset button creates a fresh session with empty
   fields. The second document's downloaded file remains byte-identical before
   and after that reset except for its save-time line.
5. The generated `demo.html` opens directly with HTTP and HTTPS blocked. It accepts
   all six canonical notes and downloads them after an unanswered practice pause,
   with no page exception or hosted request. The other documents remain intact.

The option receiver finds the requested canonical answer by its visible text,
without assuming its display index. Note edits deliberately run in reverse deck
order. Export verification checks complete structural question paragraphs rather
than searching for a note anywhere in the file; exact first choices, correct
answers, explanations, transfer text and available retry choices must agree.
Multiline Unicode notes include text resembling score labels, which must remain
inside the quoted, unscored reflection block.

The two initial answer patterns happened to produce the same adaptive question
order: `p1, r1, p2, a1, g1, x1`. This review does not claim that these two initial
sessions exercised different adaptive orders. Their notebook edit order was
different from the rendered review order.

## Evidence and reuse

`receiving/receiving-report.json` records the five checks, six downloaded file
hashes, canonical paragraph expectations, three pages' requests and errors, the
browser version, and source pins before and after execution. The downloaded text
files are preserved verbatim alongside it. `browser-receiving.log` preserves the
single successful run. The original author test suite was not broadly repeated.

```bash
node verify_reflections_receiving.mjs \
  --root /path/to/exact-recallweave-source \
  --pins /path/to/source-pins.json \
  --browser /path/to/chromium \
  --output /path/to/new-output-directory
```

The output directory must not already exist; its parent must exist. The runner
uses Node's built-in WebSocket support, so use Node 22 or newer. This run used
Node `v24.19.0` and `HeadlessChrome/153.0.8010.0`. It cleans up its private browser
profile. The source root remains unchanged.

This qualifies the tested local reflection/export/state behavior. It does not
establish learning efficacy, long-term persistence, every browser's behavior, or
the separately composed answer-order successor. That successor requires its own
explicit source pins and receiving receipt. No production data, GitHub writes,
publication, or deployment was involved.
