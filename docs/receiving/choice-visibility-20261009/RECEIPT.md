# Choice Visibility Review — source-only receiving candidate

Date: 2026-10-09 UTC. State: **qualified additive candidate; not merged or activated**.

## Direct learner/author value

RecallWeave's native `parseDeck` requires options to be distinct by literal JavaScript string equality. Ordinary HTML choice buttons collapse breakable whitespace, so `"A"` and `" A "` can appear identical while retaining separate answer indices. This new optional offline course-author tool reports those *visible* collisions, plus selected nonbreaking/invisible format characters, without rewriting options, correct-answer indices, admission behavior, learner state, or stored data. It accepts a local deck in the browser and exports a human-readable, machine-readable report. It does not upload course content.

## Integration footprint

The candidate adds five files: `src/choice-visibility.mjs`, `tools/build-choice-visibility.mjs`, `templates/choice-visibility.html`, `courses/choice-visibility-review.html`, and `tests/choice-visibility.test.mjs`, plus this receiving note. Existing application/deck/README/CI files remain unchanged; the receiving owner can later add a navigation link, or leave this optional tool as a direct-open page.

The builder embeds the existing native `src/deck.mjs` in the offline HTML. Its required original Git blob is `f0f8a4b234489c2388f427633f548d56c6ed4c03`, independently checked with `git hash-object`. This does not pin the whole repository or claim that a future upstream importer will remain unchanged.

## Verification

- Node v22.16.0: **14/14 native tests passed** on this exact candidate and on the prior independent standalone product. `node --test tests/choice-visibility.test.mjs`.
- `node tools/build-choice-visibility.mjs --check`: passed exact byte reconstruction. Output SHA256 `a5aeeb0c16e6d1bda1f18f92828572f59748f132f22f62269d6f9bb64616e8ce`.
- Current main paths checked by GitHub `fetch_file`: all six receiving paths absent on 2026-10-09; no upstream file overwritten.
- Prior standalone product acceptance: 28/28 Chromium checks across 320, 390, 768 and 1280px. Since the embedded HTML checksum remains identical, that evidence covers this exact HTML output, but not an on-device double-click launch. The browser harness's `file://` navigation was blocked by administrator policy.
- The original three unpublished Numerical Methods lessons are *not* included as test fixtures or product dependencies in this additive candidate. Native test coverage uses self-contained importer-admitted examples so the page can be received without adopting those lessons.

## Boundaries and receiving

The tool is intentionally advisory: CSS-equivalent text may reflect semantically different Unicode characters, and not every visually deceptive glyph can be detected programmatically. Authors retain responsibility for correctness and accessibility. There is no change to core import validation. Related issue #190 handles *literal repeated questions and answer disagreement*, not per-choice CSS collapse; #7 owns the existing importer, and #10 handles authoring. Existing active owners remain unchanged.

Before merge: re-read actual main and object hashes, inspect any new ownership/overlap, apply the additive patch with absent-path protection, run `node --test tests/choice-visibility.test.mjs` and `node tools/build-choice-visibility.mjs --check`, open the HTML on a device as a local file, and perform a user-facing accessibility review. This receipt documents a candidate, not deployed acceptance.

## 2026-10-09 long-token mobile receiving repair (follow-on commit)

An independent Chromium receiving check found a real layout defect in the previously qualified `courses/choice-visibility-review.html` (SHA-256 `a5aeeb0c16e6d1bda1f18f92828572f59748f132f22f62269d6f9bb64616e8ce`). The unchanged native parser admits a 160-character single-token title and an 80-character single-token question ID; one valid course with `options: ["A", " A "]` produced a correct finding but expanded the page to 1,520 CSS pixels at 320px, 390px and 768px widths (1,710px at 1280px), making the result difficult to read on mobile. Short identifiers did not exhibit the defect.

Only the optional page's `#status` text and `.finding h3` now have `overflow-wrap:anywhere`. `src/choice-visibility.mjs`, the native importer, serialized report, answer indices and existing learner remain unchanged. The original 13,399-byte page regenerates to 13,453 bytes, SHA-256 `9419d33a13098a17fe7871f4c583c5e088ed25c0bee1fa8ef8c348990cdda35f`. A native Node regression checks both allowed long-field inputs and the two explicit wrap surfaces.

**Evidence categories:** 15/15 native Node tests and deterministic build check passed in an isolated source reconstruction. Actual installed Chromium (Playwright document loading, no network) checked old versus repaired output at 320, 390, 768 and 1280 CSS pixels for long and ordinary title/ID specimens, 16 successful browser cases. Correct collision/question ID, report downloads, and zero page exceptions were verified in every case. Repaired document widths stayed exactly at the corresponding viewport widths (320/390/768/1280); old long-field specimens overflowed at all four widths. This is actual browser acceptance of rendered document bytes, not direct `file://` navigation, upstream merge, deployed use or an independently authorized HAMON native task. The browser case uses only original native schema bounds and the existing importer; it does not create or modify learner records. No existing source besides the three product-owned paths and this receipt is changed.
