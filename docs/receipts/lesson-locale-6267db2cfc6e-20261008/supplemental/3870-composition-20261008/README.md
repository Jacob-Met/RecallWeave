# RecallWeave issue81: composition with main 3870

This packet is additive. The original 25-path evidence packet, the 11-path f42 supplemental packet, the original 12-source payload, and both earlier qualification checkpoints remain unchanged.

## Exact current source

The authoritative base is commit `3870c63d0cee746dcc9ec8f14d2eb71b5d3b2525`, tree `f7c9200d85749381ec67b5d0bdfe1daa77d9f1f5`. Its answer-feedback change touched the same app module as locale resume. A native three-way merge used ancestor app `18521c1f4d3abdadf76790218616f09cee96d6c2`, upstream app `da21bcd0218b06a6067d6ad685438bd2712dc4ca`, and frozen locale app `59cef2bbf747ce26687db51bc370765d5ea9c39d`.

The clean result is app `df26efead1e231ce458f3ae83fa2b9d755d27982`, SHA-256 `17357a32c9a2457b2bfbdc37e4453c8cf9726516f8493f9fdcab6bb91921fa62`. Relative to current main, its only change renders the already-validated saved question item instead of selecting again. Upstream answer-feedback markup is retained exactly. The official unchanged demo builder reproduced original main, generated the candidate, and reproduced that candidate on a repeated build. The resulting demo blob is `ef7bc3e27e7f161d917ced6a457fad8822802f3f`.

The source payload has 13 authored paths. Only app and demo differ from the old 12-source payload; its other ten files stay exact. The separately qualified comparison page stays `2deb3ac70583c36e81279371f7109e57daf9f137`. No test oracle was changed for this composition. The production manifest and merge/build diffs were frozen before the new full-suite run.

## Preserved first attempt and corrected source closure

The first projection represented 360 current functional base files plus six new test/helper/fixture paths. It ran all 67 maintained root test modules and returned 583 passes and one ENOENT failure. The unchanged mathematical-induction test reads an existing frozen question fixture beneath `docs/receiving`, outside the original historical-evidence exclusion. That input was missing from the projection. Its full failing process output and source inventory remain in `FULL_NATIVE_3870_RECEIVING.json.gz`; this is not a passing gate.

The correction adds exactly main's `docs/receiving/mathematical-induction-0378a7b6/questions-only.json`, blob `f4860af13e9ed15066693ee0cdaf4d69f8af6db3`, 7,172 bytes, SHA-256 `2ccc6d5fa7a64d1b09500312091eaba7bcaa6b36257c2e0c44ea01590eb916dd`. All three newly added native test modules were read for dependencies. The corrected closure is 361 base files and 367 candidate files, still 67 modules. The exact 13-source payload and all test bytes were unchanged. This input correction was frozen before the necessary full rerun.

The corrected local Node v24.19.0 gate ran 584 tests: 584 passed, zero failed, cancelled, skipped or TODO, process exit 0. Its complete raw stdout/stderr and all 584 pass records are retained. The official demo rebuild exited 0 and was byte-exact. Every one of the 367 projected files retained its bytes and mode. This is a local source-projection gate, not a whole repository checkout or hosted Node20 result.

## Independent app receiving

The independent receiver reproduced the same clean three-way app result and reused its original frozen DOM runner, both locale inputs, and checks. All 34 checks passed, with the prior state/callback behavior preserved and all seven source files unchanged. This is actual Node execution of the app module through the existing VM/DOM harness; it is not a rendered-browser, keyboard, file-picker, accessibility or visual-wording gate. The newly integrated answer-feedback browser workflow remains a separate hosted check.

## Source custody and earlier evidence

The complete executed 367-file source projection is retained outside this Git text packet as `FULL_NATIVE_3870_SOURCE_002.tar.xz`, 714,488 bytes, SHA-256 `0346d83a815c793144365d781e66d6c42a6fe5defc0816b5a1fc7f1c3546aa3c`. It expands to the exact 5,949,440-byte tar stream, SHA-256 `b9b1c2a56aca5e8c78dc48b4e813941c1047658a7db47d6937f258f6ab6d6c1f`. Every member path, regular-file type, mode, size and SHA-256 was checked against the corrected executed inventory. XZ was used only to reduce storage; the original gzip encoding of the same tar stream is separately retained in tool memory. The source archive belongs in the final native ZIP, not in these envelopes.

The f42 local 565-test gate and first-head hosted 565-test gate retain their original identities and source boundary; they are not relabeled as this 3870 qualification. No hosted clean-working-tree claim is made. All new receipts have their own names, and the original failure is preserved.

## Decode and verify

Run `python3 decode_receipts.py --output /path/to/new-empty-output` from this directory. The decoder verifies publication files, validates each base64 envelope, checks compressed and decoded sizes and SHA-256, parses the JSON receipt, and writes only new output files. The local publication payload records the decoder's actual successful run and byte-exact recovery of all six compressed originals. The source tar is deliberately not embedded.
