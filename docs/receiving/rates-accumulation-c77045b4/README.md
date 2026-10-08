# Rates and accumulation: receiving record

Worker: `hamon-ultra-20261008-c77045b4-production`  
Project scope: [RecallWeave #74](https://github.com/Jacob-Met/RecallWeave/issues/74)  
Team source fence: [HAMON #140](https://github.com/Jacob-Met/hamon/issues/140#issuecomment-6063479903)  
Date: 2026-10-08

## Open the offline review bundle

Download [RecallWeave rates and accumulation review v1](RecallWeave-rates-accumulation-review-20261008-v1.zip), extract the complete folder, then open `courses/rates-accumulation-explorer.html` inside it. The ZIP includes the exact same-source learner at `demo.html`, the original course JSON, the worked guide and concise opening instructions. The explorer's existing relative learner link works within the extracted folder. No source checkout, build, server or account is needed.

This is a five-file user review bundle, version `20261008-v1`, with product bytes taken from public source `9207da3fe40a5376886c656d68b073815a563f8c`. [The bundle manifest](review-bundle-manifest.json) gives its SHA-256, each member's bytes and original source identity. It is a review download, not a hosted deployment or release. Windows extraction and direct-file receiving are recorded separately.

## Delivered experience

[Rates become change](../../../courses/rates-accumulation-explorer.html) is an original, offline motion explorer with a [twelve-question lesson](../../../courses/rates-accumulation.json) and [worked guide](../../../courses/rates-accumulation.md). It connects velocity, signed displacement, total distance, average velocity and acceleration through editable continuous piecewise-linear curves.

The arithmetic engine retains exact rational values. A crossing at one third of a second is split at that exact time even though the inspection control uses tenths of a second. Positive and negative contributions can cancel in displacement; distance integrates their magnitudes separately. At zero elapsed time, average velocity is undefined. At a velocity corner, the output retains both one-sided slopes and does not invent a two-sided acceleration.

The user can download the current calculation, the exact original lesson and the complete guide. Editing a point retires the previous result until the curve is applied again. The lesson uses the existing learner's local-file preview and explicit start, then its ordinary question, review, practice and study-notes flow.

The implementation adds nine uniquely named source/test files and an additive README entry. Learner, importer, learning model, other courses and catalog sources were not edited.

## Immutable source and composition

The original checkout began at `67b5fd0381fd8cbd843952ca2cb26434dba3b594`. Its initial source checkpoint was `ebe735ebb572d55e78c8cdcd258d420b89f11b4c`; that exact nine-file tree is preserved inside `author-evidence.tar.gz` as `first-source.tar.gz`.

The feature rebased cleanly onto observed main `049d0d2`, which had added the catalog, DC circuits course and sampling receiving documents. The composed candidate was `cf799ffd75a28e5075b44131764a495753c832eb`. A final bounded UI repair made graph labels readable on narrow screens; the resulting native product commit is **`9ef0ca1fa515aec1a1cf8fca5c0e5f89f6938ebe`**.

The exact core SHA-256 is `1eb98c03f32291a8a72c96e33f54f725032ff476d64bedfc5ff9845fae52822f`. It did not change during browser refinement. [source-binding.json](source-binding.json) records the complete product and unchanged learner dependency pins. Each browser receipt records its source pins; successful runs assert those same pins again after the complete workflow.

The native Mac git remote had no authenticated HTTPS push capability. Publication uses the GitHub connector's immutable blob/tree/commit API; its published commit identity may differ from the native commits. File hashes and the tree bind the published content to the tested native source. This record does not claim a resident HAMON goal lease or a hosted deployment.

## Author verification

All browser runs used a new, isolated Chrome profile. Network emulation was set offline before navigating to the direct-file explorer. Downloads were observed through browser download completion and read from disk; the receiver did not substitute a serializer call for the browser download action.

| Gate | Observed result | Archived evidence |
| --- | --- | --- |
| Current composed native suite | **294/294 passed**, zero skipped, failed or cancelled; Node v26.3.0; exit 0 | `current-native-tests.json`, `current-native-tests.log`, `native-suite-runner.mjs` |
| Final focused native checks | **12/12 passed**, including exact arithmetic, invalid-input controls, immutable records, lesson admission and generated-file parity | `final-focused-tests.log` |
| Final offline browser | **9 groups passed**, Chrome 154.0.8037.98, zero page errors and zero HTTP requests | `browser-final/report.json`, `browser-final.log` |
| Real curve/guide/course files | All three physical downloads were checked against exact source or arithmetic output bytes | `browser-final/downloads/` |
| Existing learner integration | Downloaded lesson preview/cancel preserved an ongoing session; all twelve items then completed after explicit start | `browser-final/report.json` |
| Separate practice and notes | Initial score remained 11/12 after correcting the single missed item; physical notes retained every prompt, first answer, explanation, transfer prompt and distinct practice answer | `browser-final/downloads/recallweave-study-notes-2026-10-08.txt` |
| Narrow-screen presentation | 390- and 320-pixel viewports had no page overflow; effective SVG font size met the receiver's 12-pixel threshold; screenshots inspected | `browser-final/03-graphs-phone.png`, `browser-final/03-graphs-320.png` |

The author browser reported effective SVG font size of 15 CSS pixels at both narrow widths: computed font size multiplied by the SVG screen scale. This is not a rendered glyph-box height; actual text boxes vary with the font and viewport. Independent visual assessment is recorded separately.

The full suite was run on the composed candidate before the final SVG layout repair. That repair touched only the graph UI, its generated HTML and the authored browser receiver; the final focused native and complete browser paths exercised the repaired product. Independent receiving is a separate review and should be read with its own source pins and scope.

### Preserved first attempts

The packet keeps failures as well as successful follow-ups.

- The first complete native run passed 271 of 273 checks. Two unchanged grouped-data builder checks failed because the macOS default temporary path used a `/var` symlink while the builder's CLI-entry comparison used a canonical `/private/var` module URL. Running the same unchanged sources with `TMPDIR=/private/tmp` passed 273/273. The first log is `native-tests.log`; its successful follow-up is `native-tests-real-temp.log`. The later, source-pinned 294/294 composed run used the same explicit temporary directory.
- The first browser run completed seven groups, then the receiver looked for `#feedback` instead of the learner's existing `#feedback-slot`. The null-element exception, screenshots, completed downloads and first receiver version are retained in `browser-first/` and `first-source.tar.gz`. Correcting the receiver yielded the complete nine-group pass in `browser-second/`.
- The first successful phone screenshots exposed small axis labels caused by a fixed 780-unit SVG viewBox shrinking to the phone width. The final UI measures the actual graph width and redraws on resize, retaining the full curve and readable text. The later `browser-final/` receipt includes measured labels at 390 and 320 pixels.
- A later shell invocation could not create its temporary heredoc file while the shared Mac volume was nearly full. It failed before running tests. The same source-pinned test runner was then invoked directly as a quoted Node argument and completed the 294/294 gate. No unrelated files or processes were removed.

The earlier unpinned suite logs are historical diagnostics; the current JSON receipt and final browser source maps provide the explicit content binding.

## Reproduce

From the repository root:

```sh
node tools/build-rates-accumulation.mjs --check
node --test tests/rates-accumulation.test.mjs
TMPDIR=/private/tmp node --test tests/*.test.mjs
node tools/check_rates_accumulation_browser.mjs \
  --browser "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --output /absolute/path/to/a/new-empty-receiving-directory
```

The browser receiver requires a fresh output directory and Node's built-in WebSocket implementation. It creates and removes only its own temporary browser profile. Use the exact executable path for the browser being received; this author run establishes macOS Chrome behavior.

To inspect the archived evidence without touching the source:

```sh
mkdir /absolute/path/to/empty-evidence-directory
tar -xzf docs/receiving/rates-accumulation-c77045b4/author-evidence.tar.gz \
  -C /absolute/path/to/empty-evidence-directory
```

[author-evidence-manifest.json](author-evidence-manifest.json) lists every archived member with its SHA-256 and byte count. [The desktop screenshot](preview-desktop.png) and [320-pixel graph screenshot](preview-phone-320.png) are also provided directly.

## Scope and provenance

Inputs are intentionally bounded: 2–8 points; exact CSV header `time_s,velocity_m_s`; start at 0; strictly increasing whole seconds through 120; velocity from −50 to 50 m/s with at most one decimal place; inspection on tenths of a second within the curve. The complete source text remains in the calculation record. The SVG coordinates use numeric approximations, and the accumulation display samples at 0.1-second spacing; visible text and downloaded records retain the exact fractions.

The questions, worked examples, explanations and diagrams are original. Conceptual references were checked on the official OpenStax Calculus Volume 1 pages on 2026-10-08: [3.1](https://openstax.org/books/calculus-volume-1/pages/3-1-defining-the-derivative), [5.3](https://openstax.org/books/calculus-volume-1/pages/5-3-the-fundamental-theorem-of-calculus), and [5.4](https://openstax.org/books/calculus-volume-1/pages/5-4-integration-formulas-and-the-net-change-theorem). Exact reference titles and author credit are in the guide and deck. No textbook passages or figures were copied and no new permission grant is asserted.

These are authored mathematical curves and implementation checks. They are not measurements of physical motion, evidence of learning effectiveness, a grade or a validated learner diagnosis. No account, remote endpoint, automatic storage or provider was added.
