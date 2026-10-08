# Enzyme unit: learner receiving and r2 delivery

This addendum completes the learner receiving handoff for the unchanged **Enzymes: energy, speed and control** unit. The local-course importer from PR33 is merged. The unit now runs through the actual learner, its review and separate practice flows, and its downloaded learning-trace archive.

The earlier course-production and Deck Studio qualification files remain an immutable record of that earlier stage. This directory records the subsequent learner receiving work.

## Source and ownership

| Source | Immutable revision | Receiving relationship |
| --- | --- | --- |
| Original enzyme contribution | `0cffd37c7b73a7c4b4387056879792d4b3655074` | All 16 original contribution files are preserved exactly. |
| Published importer used for browser controls | `6a98243456cc9ef579b2b649c918f0e649a7f9ee` | Fourteen app, runtime, data and build files were exported and checked by Git blob and SHA-256. |
| Merged PR33 source | `7f517150ca828045a5f461e8d5bfc13c2f5821d2` | All fourteen receiving files match the tested source. |
| Canonical base for this PR28 update | `003ce06c72fb3c7924a4414cd34053d87ae46d2f` | All 400 existing leaves are retained; all fourteen receiving files still match. |

The course JSON remains SHA-256 `f8539cc5ba82cdae6f128986cdec2d09b62d846c2cf3bc9bc221d406264ff64a`; the guide remains `35e13144be394947ec5677289c65149d950b403691492a8239df84cf4e4bd3d6`.

The importer, app, learning model, review and archive code remain with their existing owners. This contribution uses the published interfaces. Native external claims 4088 and 4121 attribute the consumer receiving and PR28 evidence update to `chatgpt-a0eb505c4971/estate_products`, following handoff 4024.

## Actual learner receiving

The frozen Python control ran the standalone file and modular app in Chromium 153.0.8010.12, with a private browser profile and network namespace. It completed five milestone groups in 10.54 seconds:

- A real local file input previewed all twelve original prompts and four concepts. Canceling preserved the prior lesson; explicit start created the enzyme lesson.
- The control answered every question through visible option text and checked its canonical choice index, original feedback, transfer prompt and review card. Four deliberate misses, one per concept, produced eight correct first answers.
- Seven actual browser downloads produced study notes and learning traces. The assertions inspect the saved files.
- Separate practice preserved the original first answers and full-precision model state. A paused trace moved from the standalone learner to the modular learner, where the remaining practice continued.
- A completed trace returned to a fresh standalone learner. Every semantic field remained equal; only `savedAt` changed. Choosing the enzyme trace against the bundled course was refused without changing that lesson.

The full source guard passed before and after execution. The browser reported no JavaScript exceptions or external/non-GET page requests. The learner result includes all seven download names, sizes and SHA-256 values.

## Actual Mac receiving

The six-file r2 bundle was extracted into a new versioned Mac Downloads directory. Every delivered file was read back against its expected hash, and the r1 ZIP remained unchanged.

A separate control used the Mac's existing Chrome 154.0.8037.98 and a temporary profile. It imported the delivered enzyme file, restored the actual completed Linux-browser trace, waited for the native download completion event, and read the resulting Mac file. The downloaded JSON matched every semantic field of the Linux trace, including all twelve canonical first answers, the unchanged model estimates, and four separate practice answers.

A fresh delivered app then loaded the same course and reopened that actual Mac download. The restored eight-of-twelve first result and four-of-four completed practice remained visible at a 390-pixel viewport without horizontal overflow. The package hashes were unchanged.

The browser completed shutdown after the control's bounded cleanup wait. The original result retains that timing observation; the separate cleanup receipt verifies the exact browser PID was absent and removes only the temporary profile whose birth time matches this run.

## Setup evidence and interpretation

An initial attempt to save the private harness encountered ENOSPC and left a zero-byte file before execution. The receiving files were copied to private temporary memory storage with all hashes checked.

The first Chromium attempt then crashed before a lesson control ran. A minimal blank-page control succeeded with the existing `/tmp` temporary storage. The successful run used that storage for the temporary profile and IPC files while keeping the same product source and assertions. These are preserved environment setup negatives; the completed learner run is the product behavior evidence.

All receiving answers are synthetic. These controls establish software behavior and preservation of exported data.

## Frozen controls and receipts

- `check-learner-browser.py` is the exact successful Linux control, SHA-256 `5f4d52505617091fcb4868e3a3211b2875d28c8accd2ee603219b1040b76868b`.
- `check-mac-receiver.mjs` is the exact successful Mac control, SHA-256 `8196b5c2f02ef69a403e9933c97d26ab40da7e70d4c7d9f956fe8f7e62cc0d8c`.
- `receipts/learner-browser-result.json` and `receipts/mac-browser-result.json` record the actual controls.
- `receipts/actual-linux-completed-trace.json` and `receipts/actual-mac-downloaded-trace.json` retain the exact saved files used for the receiving identity comparison.
- `receipts/canonical-base-binding.json` and `receipts/published-source-binding.json` bind the receiving files to the immutable source revisions.
- `receipts/environment-setup.json` retains the setup failures and successful invocation provenance.
- `receipts/package.json` records the delivered six-file archive.

These are frozen receiving controls with their original estate paths and fixtures. The Linux invocation used the existing Playwright Python environment under a private network namespace; the Mac invocation used the existing Node and Chrome executables. No dependencies were installed.

Full native custody, including all actual downloads, screenshots, raw logs and the earlier setup records, is preserved at `/var/lib/hamon/custody/recallweave-enzymes-learner-20261008-a0eb`.

## Delivered package

`RecallWeave-Enzymes-Learner-20261008-r2.zip` is 37,658 bytes, SHA-256 `c85406a815c683e70364f36438f241ef52ed5727f704a90b93d9070651f5bdb6`.

It contains the unchanged standalone `RecallWeave.html`, the unchanged enzyme JSON and guide, a learner README, source provenance and checksums. Learners choose the course file and explicitly start it, then download a completed learning trace to preserve their answers and practice. The package contains no test session.

The existing enzyme PR28 identity is retained. The coordinating reviewer owns the final ready/merge decision.
