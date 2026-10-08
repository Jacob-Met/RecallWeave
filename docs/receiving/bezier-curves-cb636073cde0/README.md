# Bézier lesson and exact curve construction — receiving packet

This contribution gives RecallWeave an original sixteen-question course and a directly openable Bézier explorer. The native learner, authoring, import, review, practice and study-notes implementations remain unchanged.

## Source and scope

The author inspected native project base `3870c63d0cee746dcc9ec8f14d2eb71b5d3b2525` / tree `f7c9200d85749381ec67b5d0bdfe1daa77d9f1f5`. The initial frozen manifest records nineteen source/test/baseline files, including the built HTML. Its SHA-256 is `0861708731a9962d1ba906fd5a47c8edddb1f9c4f0653a99f508768a1f14086d`.

The bounded pure model admits two to four dense integer control-point pairs in [-20,20], with a rational parameter satisfying 0 <= numerator <= denominator <= 1000. It retains every de Casteljau level, exact point, ordered left/right subdivision polygons and first derivatives as reduced fraction strings. The parameter describes traversal, not arclength. A zero first derivative remains distinct from a constant curve or a conclusion that no geometric tangent exists.

Public APIs are `parseBezierInput(pointsText, parameterText)`, `traceBezier(points, {numerator, denominator})` and `BEZIER_PRESETS`. Parsing returns `{points, parameter}` and retains an admitted numerator/denominator pair; tracing canonicalizes exact fractions. Invalid input throws an Error with a readable message and `field` equal to `points` or `parameter`. Presets contain text-valued `points`/`parameter` plus `id`/`label`.

The standalone page is generated from the exact model, UI, template, course and guide. Editing either calculation input retires previous geometry/download availability until a successful Apply. The source JSON and guide download exactly; the mathematical observation retains applied text and the inspected level. It is not a learner-answer archive.

## Author qualification

Native execution was on Windows 10, Node 24.21.0 and Chrome 154.0.8037.98, using only the project's JavaScript and Python standard-library evidence utilities. No dependency installation, borrowed profile or sandbox weakening was used.

- **14 native methods passed**: nine model and five course methods. The model tests compare 504 changed cases with direct Bernstein sums and differentiated-polynomial oracles, verify subdivision and local derivative mappings, and exercise boundaries, degeneracy, input admission, source immutability and determinism.
- The course tests independently derive the displayed mathematical choices, check all sixteen items and balanced option positions, round-trip through the existing native authoring API, and exercise all-correct, all-missed and mixed responses through the existing learner, review, practice and notes APIs.
- The builder and `--check` passed. All fifteen initial source inputs remained unchanged.
- **27 actual-browser controls passed**: default and changed non-dyadic cubic values, all degrees and degeneracies, level navigation, retire-on-edit and invalid-input behavior, actual exact downloads, 390-pixel layout and native Enter activation. The actual pinned existing `demo.html` imported the downloaded deck and completed all sixteen questions with twelve correct/four incorrect responses, original explanations/transfer prompts and a real notes download. Existing `author.html` opened, validated and downloaded byte-identical course JSON.
- All eighteen browser source/baseline inputs remained unchanged. No page runtime exception or external request occurred. Desktop, mobile, native learner and authoring screenshots are retained; desktop/mobile presentation was visually inspected.

Author browser-v1 is a retained failure, not a successful full run. It recorded twenty checks before a CDP Enter-event assertion failed. The synthetic keyDown omitted text/unmodifiedText; v2 adds those fields and an active-element check. Product source bytes did not change. V2 completes the full intended browser receiving, including the previously unexecuted native learner/authoring controls.

The ThinkPad became full while preparing the template and before its builder/tests. Its completed original model/source and the exact ENOSPC are preserved. Only Node22 syntax checking of the model occurred there. The Windows transport verified all source Git blobs, including exact Linux model SHA-256 `4370ea0db40b5a0d51838bb5e024d82f2f168e68237c09d190665869f5906e6f`.

The author archive contains 36 files, 630,228 expanded bytes. Its compressed SHA-256 is `f1149e0e2488e13b5cf71bb0918c52412c72851fb0d037303337a70c8c4fcba4`. The original failed driver, failure screenshot/receipt, both browser runs, actual downloads, native logs, contract, source identities and composition receipt remain additive. Browser profiles are excluded.

## Independent receiving

Root froze its independent mathematical oracle before seeing the candidate, then froze separate browser assertions before UI disclosure. Its exact BigInt Bernstein/derivative oracle passes **60 traces and 7,210 assertions**, including subdivision parameter maps and derivative scaling; it does not copy the production recurrence.

Independent browser receiving accepts the same frozen product bytes. The original run retains **101 completed check records and five actual trace downloads**, then its wording regex failed because /stationary|zero derivative/i did not match the accurate phrase “Zero first derivative.” A separately retained correction expands only that semantic matcher. A narrow continuation completes the remaining stationary guidance, exact course/guide downloads, error/network and source-preservation controls with **19 check records and two downloads**. Those records include diagnostics and re-establishment: they are **not 120 distinct independent assertions**, and the original run is not relabeled as passing.

The receiver independently reviewed all sixteen questions/four concepts, uniform SVG coordinate scale and positive-y-up geometry, declared bounds, parameter/subdivision identities and zero-derivative guidance. Four native screenshots were visually inspected. All seven candidate source pins remained exact; no product fix or full rerun was requested. The nonblocking content note about “stretched onto” versus “mapped onto” is retained in the content review, with the correct explicit formula/result unchanged.

The definitive acceptance is `independent/SOURCE_ACCEPTANCE_V1.json`, SHA-256 `d8c7451354cbacb0321a0161079b95012648b8b5f7d15fce5f707c6a34a5b3ef`. Its separate archive has 57 members / 1,344,337 expanded bytes; compressed SHA-256 `1bf4c8942eb2d99ea5699fd4e282bca951d725a7de2ab9967006f31d445de7df`. The original freeze, transport/setup failures, actual oracle correction, first-run failure and narrow successful continuation remain distinct. Profiles are excluded.

## Current-parent composition

A separate read-only composition check inspected `5b9b86fc54e1f7538d05c549b2fab02a98af2b50` / tree `8d4553d62575ced8008309ed7b8ce83870efa2be`. All nine native dependencies and baseline browser files used in author qualification remain byte-identical on that parent. No Bézier path already existed.

The current README before-image (blob `bc4c9d93f4d05530a65ca46a614704de1db7a4a9`) is preserved verbatim, with only the 888-byte course section appended. The composed blob is `56ff946c67a0f97012d58b1e05bdfd049a1a5b7f`. The final composition in `composition-current-parent.json` uses actual main `992080948d3464d52270001308b0e2e3e257c962` / tree `89db5b55a78e35a982aa59eeb1f22e924443f5e3`. Its entire 43,471-byte README (blob `9996231d20dd64a0658c64e7718a05adb47f67ec`) is preserved with the same 888-byte section appended, yielding 44,359 bytes / blob `522d253bfe7b33778dc5cee3032d8754a88ef8ff`. All nine qualification dependencies remain exact and all ten new source paths are absent. The later publication receipt identifies the created full tree and preserves every unrelated leaf/mode; a component-only source projection must not be used as canonical ancestry.

The original source manifest is not relabeled as a qualification of a future changed runtime. A README-only current-parent adaptation is recorded separately.

## Inspect and reproduce

Each archive is UTF-8 base64 wrapping an XZ-compressed tar so the native screenshots and exact downloads can travel through the ordinary Git API without a separate binary upload route. The adjacent archive manifest records every member's size and SHA-256, plus Git blob identities where recorded.

From the repository root, decode into fresh destinations:

```text
python docs/receiving/bezier-curves-cb636073cde0/unpack_evidence.py docs/receiving/bezier-curves-cb636073cde0/author/evidence.tar.xz.base64 NEW_AUTHOR_DIRECTORY
python docs/receiving/bezier-curves-cb636073cde0/unpack_evidence.py docs/receiving/bezier-curves-cb636073cde0/independent/evidence.tar.xz.base64 NEW_INDEPENDENT_DIRECTORY
```

The unpacker verifies archive/member hashes and requires a new output directory. Both archives were decoded by the publication utility on Windows and all 36 author / 57 independent members verified. The utility supports the author's top-level archive digest and the independent packet's nested archive digest without changing either original manifest.

Run the native source checks from an exact repository checkout:

```text
node tools/build-bezier-curves.mjs --check
node --test --test-reporter=tap tests/bezier-curves.test.mjs tests/bezier-curves-course.test.mjs
```

The original native commands, runtime versions/binary hash, runner hash and before/after source pins are in `author/evidence/native-v1/receipt.json`. The browser driver is `tools/check-bezier-curves-browser.mjs`; its qualified command points to a task directory containing the exact checkout as `source/`, original `expected-source.json`, and a new output directory. It uses the qualified Windows Chrome path and Node's native WebSocket/fetch CDP transport. Its actual controls and input identities are preserved with both runs; do not label a new browser or changed checkout as the old run.

No full unrelated repository suite, hosted CI result, physical hardware result, deployment, empirical educational effectiveness, B-spline/CAD support or arclength solver is inferred. Current source publication and any later integration/adoption are separate receipts.

Ownership: [HAMON scope fence](https://github.com/Jacob-Met/hamon/issues/140#issuecomment-6067188205).
