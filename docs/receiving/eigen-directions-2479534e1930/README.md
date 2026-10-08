# Eigen-directions: native production receiving

This package accompanies the original [offline matrix lab](../../../courses/eigen-directions-explorer.html), [fourteen-question course](../../../courses/eigen-directions.json) and [worked guide](../../../courses/eigen-directions.md). Ownership: [RecallWeave issue 125](https://github.com/Jacob-Met/RecallWeave/issues/125), estate worker `2479534e1930 / coordination_production`.

## Product contract

A nonzero integer probe and a bounded 2×2 integer matrix produce an exact matrix action and cross-product eigenvector decision. Positive, negative and zero eigenvalues are distinct. All real eigenspaces are classified, including scalar matrices, repeated roots with one eigenline, irrational roots and absence of a real eigenspace. Numerical unit representatives and plotted eigenlines are explicitly approximate. Pending or refused edits preserve the visibly identified applied result and its download. The standalone page embeds the exact original lesson and guide bytes.

The model accepts integers as numbers or signed whole-number text with surrounding whitespace. Matrix entries are from −9 to 9; probe entries are from −20 to 20, with the zero probe refused. Empty, fractional, exponent, nonfinite, boolean, null and malformed-array inputs are refused. These bounds make the entered-integer action, trace, determinant, discriminant and cross product exact in JavaScript arithmetic.

## Verification

- `authored-first.tap`: 13/13 authored tests. Includes 2,401 matrix cases, eigenpair/polynomial residuals, strict admission, exact scale and classification cases, immutable outputs, recomputed export, shared deck parsing and standalone embedding.
- `browser-final/browser-receipt.json`: 10/10 actual native Chromium receiver groups on Linux, Chrome 153.0.8010.47 and Node 22.22.1. The receiver opens the file directly, uses actual controls and downloads, exercises all nine presets, pending/refused edits, negative/zero/repeated/complex/irrational cases, and checks 390px and 320px layouts. It imports the actual downloaded course into the existing learner, answers all fourteen questions with one deliberate first-answer error, reaches full review and performs a separate retry without changing the original summary or estimates. Only the two local file documents were requested; page errors were empty. The temporary browser/profile was cleaned up. Screenshots show captured viewports only.
- `integration-gate.json` and `integration-suite.tap`: 555/555 tests across all 64 test files on current main `f42ad22e069b5ed3b2d85ea0573b84fef121d254`, with concurrency bounded at four. The existing demo rebuilt byte-identically; the new standalone builder's `--check` passed.
- `independent/integration-source-review.json`: separate reviewer accepted final source and verified its hashes against the final browser receipt, exact standalone parity, safe DOM insertion, applied-state consistency, finite shared-axis plotting and template/UI integration. No source changes were made by the reviewer.

The final source remains bound to the successful browser run in `integration-binding.json`. The original browser/test checkout was `8317dcf58f4ec34b631328fffb92ab37390c75e7`; fast-forward composition to the cited current main changed neither `src/deck.mjs`, `demo.html`, the test workflow nor any eigen-directions path. Final product-file hashes were checked again after composition.

## Retained failures and independent review

The first native browser run exposed real horizontal body overflow at 390px. `browser-first/` preserves its original failed receipt, screenshots, emitted files and original template/UI/receiver sources. Shrinking the panels and fieldset, permitting button wrapping, and sizing the SVG to its actual width resolved the defect. The second complete browser run passed at both 390px and 320px; its desktop and 320px result screenshots were also inspected visually.

The independent reviewer froze fourteen mathematical controls, twenty-five admission controls, one immutability control, and all fourteen course answers before reading the implementation or answer key. The original frozen run remains **38 passed, 2 failed** in `independent/model-results.json`. Its two failures assumed numeric strings must be refused; the published model and guide intentionally admit signed whole-number text. A separate post-source clarification records **20/20** string-equivalence, bounds and malformed-text checks. It does not replace or relabel the original frozen run. All fourteen independently derived course answers agree; the reviewer found no substantive algebra or content defect. Original evidence hashes were preserved during transfer.

## Reproduce

From the repository root, run `node --test tests/eigen-directions.test.mjs` and `node tools/build-eigen-directions.mjs --check`. Run the entire suite with `node --test --test-concurrency=4 tests/*.test.mjs`. The native UI receiver requires Node with its built-in WebSocket API (tested on Node 22) and a Chromium executable: `node tools/check_eigen_directions_browser.mjs --browser /usr/bin/chromium-browser --output /absolute/new/evidence-directory`.

The original course wording and examples use mathematical background from [MIT 18.06SC](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/least-squares-determinants-and-eigenvalues/eigenvalues-and-eigenvectors/) and [MIT 18.06](https://github.com/mitmath/1806). No source exercises or prose were copied. The course carries its own attribution and permission statement. These checks establish the scoped software/content behavior; they do not measure learner outcomes.
