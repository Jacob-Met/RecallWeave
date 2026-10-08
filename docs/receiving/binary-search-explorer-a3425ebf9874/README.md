# Binary-search explorer receiving

The existing lower-bound course now has a standalone interactive companion. Learners can build a trace from bounded sorted integers, inspect each decision, move backward and forward, distinguish unresolved element indices from possible answer boundaries, and save the trace or the original course materials. The original course, guide and learner/importer source remain byte-identical to the executed baseline.

## Source and ancestry

The native Mac baseline is selected capture `51e0dcae83f6f01c7fc95042fb51c179e9ef7abf`, bound to original public source `1082482afe31e557e36b1a694b2eb9917729c2dd`. Runtime candidate `e5127ab35f57a9c53cbdeec6a34595f2d0cbdb3b` adds the helper, UI, template, deterministic standalone builder, generated page and focused tests. Capture `55710b09e0de60803a273fe38c9bf776cbdf8208` adds only the final maintained browser receiver.

These native commits are bounded source captures, not public ancestry. This publication uses actual public parent `61751d74475b61ca1e0388c808b9fc81ce9b9ed3` and its complete tree `8b1bbbdf9493128b11e3ababd7ef7d9e715ff513`. Every existing leaf other than the additive README insertion is preserved. The README places the companion beside the existing interactive tools; removing that exact new section recovers the whole incoming README.

## Received behavior

- Native Node 26.3.0 baseline: all 5 existing binary-search course tests passed.
- Native candidate: first standalone build succeeded; all 12 tests passed (the 5 existing tests and 7 focused explorer tests). The build parity assertion compares the original embedded course JSON and guide bytes exactly.
- Independent helper review: the same frozen controls executed on local Node 24.19.0 and native Node 26.3.0. Each run covers 5,544 exhaustive cases, 11 hand-worked traces, signed-zero/input preservation, 16 invalid helper cases, 5 admitted parser examples and 20 parser refusals. Counts are not added across environments. The result oracle is a linear scan; oracle and record adapter were frozen before reading the production helper.
- Independent template review: interval terminology, semantic control contract and static 390px constraints accepted by a reviewer who did not author the template.
- Independent native Chrome 154 receiving: 15 groups, 85 assertions, 6 real saved files and 3 visually inspected original PNGs. This exercises keyboard/mouse progression, duplicate equality, empty/end boundaries, input invalidation, invalid-input retry, object-URL/anchor failure cleanup and successful retry, exact saved bytes, and 390px layout with deliberate internal array/history scrolling.

The final browser run opened the actual standalone file. No HTTP request, page exception, or local/session-storage write occurred in that run. The receiver closed its own Chrome process and removed only its own temporary profile. The helper peer authored the separate template and therefore makes no independent template claim; the separate template and browser reviews retain their own scopes.

## Original failures and custody

The first browser receiver omitted Enter character data. It loaded the correct page but failed to submit. A plain native form reproduced that receiver defect; adding character data made the unchanged plain form submit. The original driver, failed browser receipt, focused diagnosis, correction and successful receiver output remain under `browser/`. No product code or expected behavior changed.

The native file-read transport omitted one trailing newline from the maintained driver. The first byte/SHA admission refused it. Restoring exactly that newline reproduced the native file length, SHA256 and Git blob. Both tool results are under `transport/`; no source file was modified by this correction.

The helper packet, browser packet and their original manifests are retained byte-for-byte. Historical executable controls are published inertly: `independent-oracle.mjs` and `independent-candidate-controls.mjs` gain `.txt` inside `helper/`; `keyboard-contract-probe.mjs` gains `.txt` inside `browser/`. Original manifest paths are interpreted through these explicit mappings. The browser subtree receipt binds all 27 files including the 3 original PNG blobs. The nonbrowser manifest binds the producer, peer and transport files.

## Reproduce the maintained checks

From the repository root:

```sh
node tools/build-binary-search-explorer.mjs --check
node --test tests/binary-search-course.test.mjs tests/binary-search-explorer.test.mjs
node tools/check-binary-search-explorer.mjs --output-dir /absolute/new-receiving-directory --chrome /path/to/chrome
```

The browser command was qualified with Node 26.3.0 and installed Chrome 154. It uses built-in Node APIs and CDP, requires a fresh output directory outside the source tree, and accepts an optional `--freeze` file for exact source admission. It does not install a browser. Original helper controls can be copied into a scratch directory with their original filenames; their source and invocation bindings are in their immutable receipts.

Normal repository CI and final exact-source comments are the remaining public integration gates at the time of this source/evidence commit. This packet demonstrates the scoped standalone companion; it does not assert hosting, cross-browser compatibility or measured learning efficacy.
