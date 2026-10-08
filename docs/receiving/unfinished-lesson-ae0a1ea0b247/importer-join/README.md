# Receiving the merged importer and unfinished lessons

## Accepted source and behavior

The accepted application is local receiving commit
`6255bcb2e739c4c8e4e6821b63defce655a9771d`. It composes the already reviewed
unfinished-lesson codec and UI with native importer main
`9b69c9c1dcc578d45e58d9b7f78eecb0613d76f3`, tree
`fec13a2ab7d1a5da29689664281a4af182d137a8`.

[Current native input pins](current-main-source.json) record all 64 non-document
runtime, course and test files received from that native commit. Six existing
paths contain this feature's app, markup, style, builder and README changes; all
58 other baseline files remain exact. The [joined source pins](joined-source-pins.json)
bind all 67 files exercised by the receiver, including the two lesson modules
and native codec test.

The importer still admits course files through its native validator, previews
them, and starts a fresh session only on the existing explicit action. Learning
uses the validated course. Saved files use the same identity getter as completed
traces: original trusted bundled source or normalized admitted imported source.
No archived course content becomes the active imported course.

Every fresh Start or Reset increments a transient app session revision. The new
lesson UI includes it in pending-read and preview validation without serializing
it into the archive. This closes the concrete equal-state restart boundary:
even identical course content, initial estimates and answer order belong to a
new session. Feedback restoration retains the original first answer and estimate
without submitting them twice. Reset continues to retain the currently selected
course.

## Qualification

The [native output](native-tests.txt) and [receipt](native-tests.json) show
**134 tests passed, zero failures or skips**, on Node 24.19.0. The direct-file
builder produced one classic script that passed the JavaScript parser. The first
native run could not retain its output because the shared filesystem filled;
the same source was rerun solely to retain the complete result. The receipt
identifies that failure without inventing the lost exit disposition.

The independent app/UI receiver passed these four new groups in actual
Chromium 153.0.8010.0:

1. A locally supplied unversioned course with ignored extra fields was admitted,
   saved through the modular app, resumed at feedback in a fresh standalone
   phone context, and completed to the exact native trace. Normalized identity,
   all option orders, first answers and full-precision estimates matched.
2. Previously downloaded raw-bundled lesson and completed-trace files remained
   compatible. Restoring the completed trace invalidated a pending lesson read.
3. Starting the same course cleared a staged preview and a delayed read even
   when real before/after downloads contained identical archived state apart
   from the save timestamp.
4. Starting a newly imported course invalidated an old-course read and its late
   status; the actual subsequent download contained only the current course and
   empty first-answer prefix.

The [full receipt](independent-browser/independent-importer-join-receipt.json)
records eight actual JSON downloads, zero page errors and unchanged hashes and
lengths for all 67 inputs. The reviewer authored the lesson codec earlier, so
this is independent receiving of root's app/UI/builder composition. Independent
codec acceptance remains the separate production review in the parent packet.

The held-read fixtures delay delivery of already-completed native File.text
results. The equal-state case explicitly fixes Math.random in its fresh context.
Both controls are labeled in the driver and receipt. The
[phone capture](independent-browser/imported-phone-preview.jpg) fits 390 by 844
pixels without overlap or horizontal overflow. The local font renders the
fixture compass as a missing-glyph box; actual JSON and DOM text retain its exact
Unicode. [Final source and visual disposition](JOIN-REVIEW.json) records this
bounded acceptance.

The earlier eight-group UI receiver and original chooser-cancel failure remain
unchanged in the parent packet. Their source identities remain separately
labeled; they were not rerun or relabeled as this new importer composition.

## Evidence custody and reproduction

All 19 members of the reviewer's compact transport packet are preserved exactly
under `independent-browser/`, with only the containing directory changed.
The original tar.gz was 72,893 bytes, SHA256
`389dc7c29f4cbc22977d3885119b65783daa71a8aa6f6ff34420d67d372bf5c7`.
Its [manifest](independent-browser/MANIFEST.json) and
[retention receipt](independent-browser/retention.json) preserve original member
names and custody. The packet was written into allocated shared space and read
back before its per-command temporary filesystem ended; every member was then
checked. The browser receipt SHA256 is
`c619fad5734ea6297ddbbc420aa2859c30a2bfebe55bf8ac550f39f21a307197`.
The final acceptance SHA256 is
`6d2ee5d94ac9a4b216ed11b81ac6848cfbf4934b0befe8506616ce6136f7e17d`.

The normal repository command remains:

```sh
node --test tests/*.test.mjs
python3 tools/make_demo.py
```

For the optional changed-seam browser receiver, use the exact pinned source
checkout, an existing Playwright installation and Chromium executable. The
original compatibility files are in the earlier accepted static packet:

```sh
RECALLWEAVE_REVIEW_CHROMIUM=/path/to/chromium \
node docs/receiving/unfinished-lesson-ae0a1ea0b247/importer-join/independent-browser/independent-importer-join.cjs \
  --source "$PWD" \
  --pins docs/receiving/unfinished-lesson-ae0a1ea0b247/importer-join/joined-source-pins.json \
  --legacy docs/receiving/unfinished-lesson-ae0a1ea0b247/independent-ui/candidate-f52bf26f/downloads \
  --out /path/to/new-receiving-output
```

The source-pin check intentionally refuses a later changed checkout. Optional
browser receiving dependencies are not added to the app or default test suite.
