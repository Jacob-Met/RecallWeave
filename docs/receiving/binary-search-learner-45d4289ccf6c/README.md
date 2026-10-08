# Binary-search course: learner receiving

The original authored binary-search course was received through the original merged local-deck importer. Both application and course sources remain unchanged.

**Result: 9 of 9 course-specific groups passed, with 6 actual browser downloads.** The same twelve-question course completed in a modular loopback HTTP page at 1280 × 900 and in the standalone file at 390 × 844. Each surface recorded ten correct first answers, two intentional mistakes, then two correct practice retries. The first answers and displayed model estimates remained unchanged after practice.

This packet is the course's consumer handoff. It is separate from the earlier nine authoring groups and preserves importer owner estate-490fcd7c4056's source and general receiving scope.

## Public evidence packaging

The complete frozen 39-file packet is in `native-receiving.tar.gz` (SHA-256 f2e4e557714d348cb71e86e06a2195d3ce684f3bfb1fce1e7bc18fd9d886d78c). It contains the source snapshot, original actual input, all six actual downloads, six PNG captures, both run receipts/logs, and the executable receiver. Extract it into a new directory to use the relative paths and reproduction command below. The packet manifest, acceptance, and receiver are also available beside the archive for direct review.

This publication is based on current main `003ce06c72fb3c7924a4414cd34053d87ae46d2f`, tree `7ae4800657652f213a22a459e6e0fff35591909c`. All 400 pre-existing leaves and modes are preserved; all fourteen exercised learner files and the binary course are still exact. `publication-source-custody.json` records this additive composition. The receiving itself remains pinned to the actual merged `d8a9` source, not relabeled as a later run.

## Exact source and input

- Actual importer/course merge: d8a9ff81e8e5290e8daad5b4af957d4eddc0ee74, tree 2d6b3849fe9efe0d38f8c3cd62588fb9477d328d.
- Ordered parents: course merge a06c3c8702774c02906281f0b631bc8263f2d7a7 and original importer head 7f517150ca828045a5f461e8d5bfc13c2f5821d2.
- Published course: 13,885 bytes, SHA-256 b88e88ba249003421c014cec635ac6bbbf2cdd2f4c2f3cc3fcefbba02b153329.
- Actual author-downloaded input: 14,169 bytes, SHA-256 7632d95fb566b7ae4894e113e8326406680745d7c442b9605fa458c4434cbee2. Its parsed fields match the published course exactly.
- The input came from the sealed original author-browser download. See input-custody.json for archive/member custody. It was not regenerated for this receiving run.
- source-receipt.json identifies fourteen exact learner/deck-format files; merged-source-custody.json binds them to the actual merged tree.
- A later SQL-course-only merge 9b69c9c1dcc578d45e58d9b7f78eecb0613d76f3 added sixteen paths without changing learner or binary-course bytes. The actual receiving pin remains d8a9.

## Measured groups

| Group | Desktop modular | Standalone at 390 px |
| --- | --- | --- |
| One prior bundled answer survives binary preview and cancel | Passed | Not repeated |
| Actual downloaded JSON preview preserves twelve prompts and course metadata | Passed | Passed |
| All twelve questions preserve options, canonical feedback and transfer text across four concepts | Passed | Passed |
| Complete review and actual first-session notes preserve both mistakes | Passed | Passed |
| Two correct retries preserve first answers/model display; notes and trace contain exact course and separate retries | Passed | Passed |

Question order was observed from the real selector. Option ordering used the unmodified browser randomness; keyboard input followed the displayed canonical mapping. No application variables or source code were injected. The deliberate first-answer mistakes were bs-contract-duplicates and bs-progress-single.

The six download payloads retain actual browser download GUIDs, suggested names, received sizes and SHA-256 digests in runs/qualified/receipt.json. Notes before and after practice preserve all prompts, first answers, correct answers, explanations and transfer text. Completed JSON traces contain the exact course fields, twelve first-answer records, four model estimates and two separate correct retry records.

## Evidence and preserved launch failure

- runs/qualified/receipt.json: SHA-256 53f094ecd27375b9bd1eed9256b07cdf84f3d5260190c54fc1afcf0c88c547a6.
- runs/launch-negative/receipt.json: SHA-256 4e8961d6076aec2b7e00576731b5739bc541f7e7df209a5366e831c3cc4f52ad.
- receive-binary-course.mjs: SHA-256 ab7be4320ecb22777778fbd06f4414a8165144dca28520245df67d324e4e7568.
- acceptance.json records the reviewed scope, source identities and visual findings.
- artifact-manifest.json hashes every packet payload, including all six actual downloads, six PNG captures, both raw run receipts/logs, receiver, source snapshot and input custody.

The first browser launch aborted before any course interaction because Chromium's generated Unix socket pathname was too long beneath our initial exclusive RAM directory. It recorded zero groups and zero downloads. The same receiver and application bytes passed when given the shorter exclusive temporary root /dev/shm/rw45-gr. The original negative remains intact.

Native receiving used Node v22.22.1 and Chromium 153.0.8010.47 on Linux. The successful browser exited 0; the loopback server closed; the receiver removed its own temporary profile; download staging was empty; all fourteen source files and the canonical input retained their exact hashes.

## Reproduce this specific consumer route

This requires Node 22+ and an already installed Chromium executable. No package installation is needed. Supply a new output directory and a short, exclusive temporary directory. The base is this packet directory, which contains the exact input and source receipts.

    node receive-binary-course.mjs \
      --base /absolute/path/to/this/packet \
      --browser /absolute/path/to/chromium \
      --temporary-root /short/exclusive/existing/temp-root \
      --output /absolute/path/to/new-output-directory

The script starts its own loopback server, serves only the pinned source directory, runs the modular and standalone surfaces, receives real download files, and closes its own resources. It does not edit application source or an existing learner session.

## Scope limits

The 390-pixel result is phone-width Chromium receiving, not a physical-device or touch-device claim. A normal scrollbar leaves 375 pixels of captured content at that viewport; the desktop capture is 1265 pixels inside its 1280-pixel viewport. The geometry checks cover actual document and control bounds.

The course's four concept labels and prerequisite fields are preserved. The current selector is an illustrative adaptive model; it does not impose a hard prerequisite gate or validate learner ability. These scripted answers provide interface evidence, not learning-efficacy or human-performance evidence.

Generic importer, trace restoration/tamper, probability-course, and authoring receiving remain with their existing owners. This packet does not replace their evidence or repeat their suites.
