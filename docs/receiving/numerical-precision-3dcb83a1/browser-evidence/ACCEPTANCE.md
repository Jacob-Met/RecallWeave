# Independent browser receiving: numerical precision

Root accepts the final numerical-precision explorer at SHA-256 `8c9c710a767d7bd322edc465956183715ba0d6aac6ba02edd365b9af9cf91920` (62,717 bytes). This is actual Chromium 153.0.8010.47 execution, with its sandbox enabled, using the repository's existing package-free CDP approach. The source was downloaded from an owned loopback server and opened through its real `file://` URL. No existing browser profile was used.

## Original browser result and correction

The first browser run received the v2 explorer, SHA-256 `44947a2c492513d2489d7af8f3738503e3f7a39d39886dba49dc4f8036a13797`. Six gates passed before a concrete download-byte failure:

- The actual downloaded standalone opened and initialized all twelve questions.
- Keyboard traversal reached the labeled inputs, operation and submit control. Editing invalidated the previous result before recalculation.
- An invalid exponent focused the offending field, exposed the alert and withheld the result/download. Ordinary corrected input restored the comparison.
- Integer-range wording distinguished an outside-safe-range exact result from a rounded one.
- At 390 pixels, expanded exact values and worked-answer disclosure remained keyboard operable without horizontal overflow.
- A deliberately refused URL preparation left the comparison available. After restoring that one test-only hook, real worked-record, lesson and guide downloads completed.

The lesson file then failed exact source-byte comparison: the browser delivered 14,095 bytes at SHA-256 `00ed062daaec4316a20db198a9137f8498516fa804ebc47d7daaf55717533481`, whereas the authored lesson is 14,090 bytes at `7593052ae2eaf3434397d8e733bc0b3538dbfa30b8d274cfd7dd38ff5e48cb09`. The builder had safely escaped one less-than character for HTML, and the UI downloaded that raw embedded JSON text. Parsed lesson meaning was unchanged; the declared byte identity was not met. The original failed report and exact receiver remain preserved.

The author corrected only the builder's source-text encoding and the UI's matching decode, keeping the original source text inside the safe embedding. A separate selected native regression records its own before/after result. The numerical model, authored deck, guide and other UI behavior remained unchanged.

## Focused final browser continuation

The v3 continuation passed five gates and exited 0 in the observed native process. It did not repeat the earlier six-gate sequence or claim a single aggregate test count.

The final standalone downloaded and opened through its actual local file path, initialized the expected example and twelve questions, and produced actual completed browser downloads. Reading those downloaded files through browser file inputs confirmed the exact authored lesson and guide bytes:

| Download | Bytes | SHA-256 |
| --- | ---: | --- |
| Lesson | 14,090 | `7593052ae2eaf3434397d8e733bc0b3538dbfa30b8d274cfd7dd38ff5e48cb09` |
| Worked guide | 17,728 | `136b981ad82b678dd8100d24b21e8fd8ec8b70a4c52e1b7e9c7a7a46054fa5db` |

The worked-record download was parsed as JSON and retained its displayed input operands. Its exact delivered bytes are included as `r2/downloaded-worked.json`.

The exact downloaded lesson was then selected through the existing current importer's real file input. Preview showed twelve questions and preserved the previously loaded lesson until explicit **Start this deck**. The receiving browser completed twelve questions with shuffled canonical answer identities, eight planned correct answers and four planned misses. It then completed four practice corrections. The original score and all displayed mastery estimates were retained, and the review contained all twelve items. This qualifies the actual new-course consumer; it adds no importer implementation.

The imported learner closure is pinned to `9b69c9c1dcc578d45e58d9b7f78eecb0613d76f3`, tree `fec13a2ab7d1a5da29689664281a4af182d137a8`. All thirteen source files were checked against their primary Git blobs/SHA-256 before and after receiving. The explorer, authored deck and guide also remained unchanged. There were no page exceptions or external requests in the received paths.

Root inspected the final desktop explorer, phone import preview and phone completed-learning screenshots. Labels, focus outlines, result wording and the completed practice state are legible in those captured viewports; the exercised phone layout has no horizontal overflow. This is bounded browser receiving, not a universal accessibility or learning-efficacy claim.

## Reproduction and boundaries

The two executable receivers and raw reports preserve exact commands, resource admission, version, source pins, download completion events, request lists, screenshots and failure location. They retain their original isolated native paths. The producer's reversible source transitions reconstruct v2; v3 is the final product source. The importer manifest identifies the thirteen files to obtain from its pinned commit. Use a fresh receiving run directory and the normal installed Chromium launcher; no package installation, sandbox-disabling flag, shared-profile mutation or provider request is required.

Native workspace: `/dev/shm/hamon-recallweave-browser-3dcb83a1`. The original complete native files remain there; this publication selects the two scripts, two raw reports, exact worked JSON, importer manifest and three final screenshots. Source publication, hosted tests, integration and deployment are separate states.
