# Membrane course: independent current-importer adoption

## Accepted result

The exact original membrane course from [PR26 head `3b3f09efbf22406a6630288ab8defe1be1f0d8c1`](https://github.com/Jacob-Met/RecallWeave/pull/26) passed the remaining bounded importer adoption check in **both actual learner entrypoints**. The native run passed all **13 assertion groups** on 2026-10-08, 13:20:48.684–13:20:56.564 UTC. It used Node v22.22.1 and Chrome for Testing 154.0.8037.57 on the authorized ThinkPad.

The modular entrypoint ran from a local HTTP server at 1280 px. The standalone entrypoint opened the exact generated `demo.html` through `file://` at 390 px. Each run admitted the owner’s real course file through the learner’s HTML file input, previewed it, explicitly started the lesson, answered all twelve questions, opened all twelve review disclosures, and corrected all eight missed questions in separate practice. Practice crossed a real saved trace download, a fresh document, another explicit import of the same course, and explicit trace restore. All twelve original canonical answers and full-precision mastery values remained exact.

This packet is owned by **estate-49f845d0dece/recall_import_receiving**. Course owner **afe225d6c6be** retains the source, guide, prior blind scientific/content review, draft state and publication. The original content/core evidence is recorded in [#15 comment6059522348](https://github.com/Jacob-Met/RecallWeave/issues/15#issuecomment-6059522348); it is not replaced by this browser receiving. Claims and handoff scope are in [#15 comment6060671534](https://github.com/Jacob-Met/RecallWeave/issues/15#issuecomment-6060671534), [#26 comment6060671831](https://github.com/Jacob-Met/RecallWeave/pull/26#issuecomment-6060671831), and [the native pass report](https://github.com/Jacob-Met/RecallWeave/pull/26#issuecomment-6060844996). No course/importer source or PR state was changed.

## Exact inputs and runtime

| Input | Immutable pin |
|---|---|
| Course path | `courses/membrane-transport.json` |
| Course owner head | `3b3f09efbf22406a6630288ab8defe1be1f0d8c1` |
| Course Git blob | `fdfedc34796b824a48c9371aec72cbad7bbfaa09` |
| Course bytes / SHA-256 | 16,328 / `b9f0c657dee8d5bd2dd10cfed8d8205b464473a6b46f707c1336363dc170f800` |
| Accepted importer PR33 head | `7f517150ca828045a5f461e8d5bfc13c2f5821d2` |
| Importer head tree | `dcbb6ba119b8807c055bb2d92b6fcbcc971ae27c` |
| Actual importer merge | `d8a9ff81e8e5290e8daad5b4af957d4eddc0ee74` |
| Actual merge tree | `2d6b3849fe9efe0d38f8c3cd62588fb9477d328d` |
| Main observed before staging | `9b69c9c1dcc578d45e58d9b7f78eecb0613d76f3` |
| Main observed after receiving | `003ce06c72fb3c7924a4414cd34053d87ae46d2f` |
| Post-run main tree | `7ae4800657652f213a22a459e6e0fff35591909c` |
| Learner app SHA-256 | `ea0926d962c23715ae885d81f1ab2075b3598692393210197e357bb88f18a7bb` |
| Generated standalone SHA-256 | `d0819e8630ff119be2c078408907ab53e3725999c8fdf71d35deb7f230d3bcd9` |

All fourteen runtime/build Git blobs and modes were compared against the accepted importer head and the subsequently observed main. They are identical. Full repository trees differ. The course remains an independently fetched PR26 input, rather than a bundled lesson. See [source-manifest.json](source-manifest.json), [runtime-correspondence-before.json](runtime-correspondence-before.json) and [runtime-correspondence-after.json](runtime-correspondence-after.json).

The receiver verified the input byte count, SHA-256 and native Git blob hash before staging. It loaded only exact source copies into its own directory and verified every runtime SHA-256 again after the browser run. Native receiver syntax checking and the repository’s `tools/make_demo.py --check` both exited zero before receiving.

## Exercised learner path

1. The receiver began with an answered bundled lesson. Choosing the actual membrane JSON opened a preview of all twelve source prompts without changing the existing session markup, title, course context or progress. Cancel, empty file selection and invalid JSON each preserved that session.
2. Explicitly starting the preview admitted the new course and reset progress to 0 / 12. Native adaptive selection was checked at every question. Every displayed answer’s letter and text were mapped to its canonical index.
3. Four first answers were correct and eight were deliberately missed. Every question showed the exact supplied explanation and transfer prompt. The receiver then opened every review disclosure through the actual control and checked its prompt, first/correct answer texts, explanation and transfer text, plus the course attribution and license in the results.
4. A real first trace download captured the normalized course, all twelve canonical first choices and exact mastery values, with no practice yet.
5. The first missed question was answered correctly in practice, then practice was paused through the actual review control. Real paused trace and study-notes downloads preserved the original first choices and mastery and separately recorded one practice answer.
6. A fresh learner document first refused that saved trace while the bundled course was active. After a fresh membrane import, trace preview preserved the new lesson until explicit restore. Cancel and a tampered-mastery file each left the fresh lesson intact.
7. Explicit restore reproduced the paused review state. A new real trace download had identical course, model, first answers, mastery and practice; the save timestamp was allowed to differ. The receiver resumed and corrected all seven remaining misses using the new document’s changed display ordering, then saved the completed-practice trace and notes.
8. Starting another fresh course invalidated a staged restore. A real saved trace whose `File.text()` resolution was deliberately held until after a course switch could not revive the old preview or session.
9. Both entrypoints completed without page script exceptions or hosted application requests. All fourteen exercised source files were unchanged. The final 390 px standalone results had no horizontal document overflow.

Downloads were produced by the app’s actual download buttons and captured through native Chrome download events. Both paused and final study notes matched the native exporter’s full UTF-8 output, using each actual file’s Saved timestamp. The JSON files were parsed with the native trace codec as well as compared directly. No learner answers, imported course or mastery state were injected into the app.

## Canonical choices and preserved state

The two entrypoints produced the same deliberately mixed path. Indices below are canonical zero-based indices from the owner’s course file, regardless of the visible A–D position.

| Question | Supplied correct index | First choice | First result | Corrected retry |
|---|---:|---:|---|---:|
| ms-1 | 2 | 3 | Missed | 2 |
| ms-2 | 0 | 1 | Missed | 0 |
| ms-3 | 3 | 0 | Missed | 3 |
| pt-1 | 1 | 1 | Correct | — |
| pt-2 | 2 | 2 | Correct | — |
| pt-3 | 1 | 2 | Missed | 1 |
| os-1 | 3 | 0 | Missed | 3 |
| os-2 | 0 | 1 | Missed | 0 |
| os-3 | 2 | 2 | Correct | — |
| at-1 | 3 | 0 | Missed | 3 |
| at-2 | 1 | 1 | Correct | — |
| at-3 | 0 | 1 | Missed | 0 |

The actual adaptive order was `ms-1, pt-1, ms-2, ms-3, pt-2, at-1, os-1, at-2, at-3, os-2, os-3, pt-3`. The first document displayed canonical order `[1,2,3,0]`; the fresh document displayed `[0,1,2,3]`. The receiver fixed only browser entropy to make this difference reproducible. The saved canonical choices survived that display change.

The preserved model values were 0.20576581384829234 for Membrane selectivity, 0.633896075041308 for Passive transport, 0.6217500786615207 for Osmosis, and 0.3209182753855063 for Active transport. The final review still reported 4 / 12 on the first try and separately reported 8 / 8 correct on retry. Those values are the existing illustrative model’s state, not a new scientific validation of this course or learner proficiency.

## Evidence and reproduction

[acceptance.json](acceptance.json) gives the compact assertion and file inventory. [browser-report.json](browser-report.json) is the unedited native report, with actual URLs, browser version, canonical choices, review visits, display permutations, requests, downloads, screenshots and before/after source hashes. [native-process-receipt.json](native-process-receipt.json) preserves the exact commands, timestamps and exit statuses. The two selected images show the [real restore preview](screenshots/modular-restore-preview.png) and [completed narrow-screen practice](screenshots/standalone-continued-practice.png); the full eight-image set is in the native archive.

| Evidence | Bytes | SHA-256 |
|---|---:|---|
| Receiver | 27834 | `1b39a54e236e3ba9339d518b97cb7c7f68f5363020fa3ae29c48974a5ac51d70` |
| Raw browser report | 23283 | `b5dabb5db981af87850df896e9b7e2c449f0fab890998d9a44ddb2cd4d2b942f` |
| Source manifest | 4127 | `33c6f5d9b8f76ea00cb7c183f3688817174f392cfa41e0ab9080ecae5ea9cb6a` |
| Post-run correspondence | 4031 | `418ff2a1323210172b1ace0d583058f03d97e69ecb4be121f894e779339cd976` |
| Native receiving archive | 1787049 | `c3dd9d17a3006e70d3691ca511d7c536003a09d0a0ace8d83d4fe4805f0fddc0` |

The [native-receiving.tar.gz](native-receiving.tar.gz) archive includes the exact fourteen source/build files, unchanged course input, exact receiver, all browser evidence, twelve real downloads and their original browser download copies, all eight screenshots, refusal witnesses, stdout/stderr and preparation/process receipts. Fresh disposable browser profiles were removed by the receiver after its own run. Browser stderr is retained separately from the empty page-exception list.

Unpack the archive into an isolated directory, supply an installed native Chrome executable, and run:

```sh
node --check receive-membrane-import-trace.mjs
python3 source/tools/make_demo.py --check
node receive-membrane-import-trace.mjs \
  --root source \
  --input inputs/membrane-transport.json \
  --output new-receiving-output \
  --browser /absolute/path/to/chrome
```

The observed native working directory was `/tmp/rw49-membrane-49f845d0dece`. The owned durable custody copy is `/home/jacob/recallweave-membrane-import-receiving-49f845d0dece`. The receiver was adapted from the [final authored-file importer/trace receiving](https://github.com/Jacob-Met/RecallWeave/blob/b673b5df0d66c114421e1c419fedf6bb07d284fb/docs/receiving/authored-import-trace-pr33-49f845d0dece/README.md): exact membrane input/counts, the 4-correct/8-missed path, actual review visits and all eight corrected retries are the bounded changes.

## Real downloaded files

Files are retained under [downloads](downloads). Paused versus restored files naturally have different timestamps and SHA-256 values; equality of the archived learning state was checked field by field.

| Actual saved artifact | Bytes | SHA-256 |
|---|---:|---|
| modular-first-trace.json | 17906 | `84ec8738f6911603587d3283298a87ef1054a435a7101d786198063f6191e6e3` |
| modular-paused-trace.json | 17990 | `244d774af9d8f05e1ed4b4a0211e3420b78070fb88f4d3fa94f5b6b76c8d98e2` |
| modular-paused-notes.txt | 13561 | `dbf04d0372d11a6dec42725e42970c69621d1a369d48f4750f8ab9612bd00e1a` |
| modular-restored-trace.json | 17990 | `c17753a70254aa978ab43033f048c57a612ee42d663eb36808e7b11375ec8ecc` |
| modular-continued-trace.json | 18417 | `4c134b443ac5193cf3e46785a8a8ae10121d59a4fbed1571ee5b9c896f22cc3a` |
| modular-continued-notes.txt | 14177 | `dfaf1a619f4b0607c9aa1a7d2433ba4c0e569e183b1076a0f7a0f06df3afd4a2` |
| standalone-first-trace.json | 17906 | `bed03f2465ac4a9e490684459b359f06ac86d65ed88b51844973e0e5859f9f7c` |
| standalone-paused-trace.json | 17990 | `8eb48c3e125a2244eea188e8eabd2cbb5e48e18b71edbdd2caa1d154014971c2` |
| standalone-paused-notes.txt | 13561 | `5b5ad5a4ba9fd06f6a1b7d7b5a2e2fcb87c367ece82f54e16cef05c96927005f` |
| standalone-restored-trace.json | 17990 | `b35b6775aaf3c807612c36c6f67e513b2b4527b597a31114b9fa1f689bc036b0` |
| standalone-continued-trace.json | 18417 | `1529302b120ac314f2e4138025ba51798681fda32eea1651e9afe8e45d20741f` |
| standalone-continued-notes.txt | 14177 | `f4e61ffed5f045aefd4fe59cb94befb0b437d7b5f2ea7018c6d312fbd90f32c4` |

## Qualification boundary

This accepts the exercised current-importer adoption path for the exact PR26 course. Existing blind/content/core correctness remains the course owner’s separate evidence. This run does not change course content, guide text, importer source, publication ownership, PR readiness or merge state.

The automation used the real HTML file inputs through native Chrome CDP; it did not automate the operating-system chooser window. Empty file-input selection is the chooser-cancellation witness. The browser ran headless with a fresh owned profile. No reflection or incomplete-session features are qualified, and no account or deployment was used. The broader author-receiver lineage retains its earlier Mac pre-application navigation failures separately; this membrane receiving ran on the proven ThinkPad path and passed its first native execution.
