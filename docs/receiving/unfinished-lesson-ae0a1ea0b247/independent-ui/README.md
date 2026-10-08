# Independent receiving of RecallWeave's unfinished-lesson UI

This driver reviews the root-authored learning-page controls, app hooks and
standalone builder composition. Its author also authored the pure codec, so this
work is **not independent codec acceptance**. Production owns that separate review.

## Execution

The browser is serial across the estate session. Obtain the root's frozen
composition pins and wait until its browser slot and temporary capacity are free.

~~~sh
TMPDIR=/dev/shm/ae0a1ea0b247-recallweave-ui-review/browser-temp \
node independent-lesson-ui.cjs \
  --source source-fc104055 \
  --pins pins-fc104055.json \
  --out reproduction-fc104055
~~~

Create the task-owned browser-temp directory before this command. The preserved
source-fc104055 directory contains all 14 exact initial runtime/build dependencies,
so the original failure can be reproduced without rewriting the current app.
For a corrected composition, supply its frozen source directory, a new pin
manifest and a new output directory. Do not reuse an existing receipt directory.

The existing NODE_PATH is preserved. No installation, model execution, private
artifact access, app edits or provider network calls are needed. All downloads,
derived synthetic files, screenshots and receipts stay in the supplied output
directory. The driver checks the expected source blobs before launch and after a
successful run.

## Contract evidence

The driver starts real Chromium and serves the unchanged modular source over
loopback HTTP. It also opens the actual built demo.html through file://. It
downloads native lesson JSON to disk, selects those real files on fresh browser
contexts, checks preview isolation, and explicitly resumes with the page's button.

Question and feedback round trips finish the lesson and download the existing
completed learning trace. That actual file's canonical answers and full-precision
mastery must equal a separately generated uninterrupted run of the unchanged
native selector/model. Every remaining rendered option permutation must match
the original saved lesson. Started-empty state crosses from the standalone phone
page to a fresh modular page without skipping its first question.

The remaining cases cover explicit cancel, altered-source refusal, older-file
completion after a newer selection, a learner answer during a pending read, and
Next invalidating a staged preview. The current lesson's actual subsequent saved
file must preserve its own answers, model and option ordering.

## Explicitly controlled boundaries

The delayed-read cases invoke native File.text() on an actual selected disk file,
then hold delivery of its completed text in a test-owned promise. They do not
replace the bytes, reader, codec or app state. Receipts label this synthetic delay.

The native chooser-cancel case clicks the real file input after calling the
installed Chromium protocol's Page.setInterceptFileChooserDialog with
enabled:true and cancel:true. The protocol documents this as canceling the chooser
and emitting the browser's cancellation events. The driver requires the observed
cancel event to have isTrusted:true. It does not synthesize a DOM cancel event,
and it does not claim a human pressed Escape in an external OS picker.

The case checks both a staged preview and a native file read whose completion is
held across cancellation. Native event provenance and before/after state are
recorded even when an assertion fails.

## Presentation evidence

The standalone receives files at 390 by 844 CSS pixels with touch/mobile settings.
A real full-page screenshot and measured document/control widths accompany the
functional restore checks. This is scoped phone presentation receiving, not a
general accessibility or browser-compatibility suite.

A failing receipt is retained under its original source pins. Corrections receive
a new manifest/output directory; the original failing output is not overwritten.
