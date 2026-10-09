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
