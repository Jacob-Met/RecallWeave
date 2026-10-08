# First-pass answer feedback

[Issue #76](https://github.com/Jacob-Met/RecallWeave/issues/76) · owner `hamon-ultra-ab529ac65023-20261008/mac_production`.

First-pass feedback now states **Your answer** and **Correct answer** in visible text. Both use the canonical option indices and the existing `escapeHtml` function. The same renderer handles restored feedback. The production change is one markup line in `src/app.mjs`; the unchanged `tools/make_demo.py` generated `demo.html`.

Scoring, model state, adaptive selection, option permutations, focus, the polite live region, practice, review, course files and saved-state formats retain their existing source. Issue #81's question-phase resume work remains separate. One new, bounded `answer-feedback-browser` workflow adds receiving; all prior workflows retain their bytes.

## Actual native receiving

| Stage | Answer-text checks | Existing behavior controls | Physical saved lesson files |
| --- | --- | --- | --- |
| Baseline | 5 expected failures: explicit paragraphs absent | 8 passed | 2 |
| Candidate, same frozen receiver | All 5 passed | All 8 passed | 2 |

The native run used Node 22.22.1 and installed Chromium 153.0.8010.47 with an owned profile/output. It exercised real Tab/Enter actions, nonidentity option permutations, wrong and right answers, literal markup-shaped option text, forced colors, exact visible paragraphs, and the complete labeled values in each paragraph's accessibility subtree. It also downloaded an unfinished lesson, previewed it without changing a fresh question, explicitly resumed feedback with its original display order, and physically saved it again.

All four downloaded lesson files have the same canonical state apart from their save timestamps. First-try review and mastery are identical before and after the presentation correction. Each run retained all 19 consumed source hashes, observed no page/harness/external-request errors, closed Chromium with code 0 and removed its own profile. The native source was a thin byte-pinned learner carrier, not a full repository checkout; repository package checks and hosted receiving are recorded separately by the PR's normal gates.

This proves the exercised visible text, accessibility-tree text and keyboard/file behavior. It does not claim screen-reader interoperability or whole-application accessibility certification.

## Review the evidence

- [Production-only patch](native/candidate-app.patch)
- [Baseline report](native/baseline/browser-receiving.json) and [complete baseline console](native/baseline/console.log)
- [Candidate report](native/candidate/browser-receiving.json) and [complete candidate console](native/candidate/console.log)
- [Baseline phone image](native/baseline/literal-forced-colors-phone.png), [candidate phone image](native/candidate/literal-forced-colors-phone.png), and [candidate desktop image](native/candidate/bundled-forced-colors.png)
- [Composition and qualification receipt](source-receipt.json)
- [Native source receipt](native/source-receipt.json), [actual source/build preflight](native/source-preflight.json), and [candidate source receipt](native/candidate-source-receipt.json)

Each console retains its full bounded, indexed, SHA-256 checked packet. Every decoded report, screenshot and downloaded file is also preserved individually. The native controller, source transfer and setup commands remain under `native/`. Native custody is commit `8d6f200b747a885e97d414e3a1f127a1fa3a250d`; candidate source is `8b5266aec8050392159d38e60d42b416a93a98c2`. The original Mac capacity refusal and earlier unexecuted receiver preparation remain explicit.

The frozen receiver is blob `6291696942fe3843549c8a8f8adae51327e3898d`; the candidate app is `da21bcd0218b06a6067d6ad685438bd2712dc4ca`; the actual maintained-builder output is `42f991e0ceab6144e24b667f59905777d9659246` (97,716 bytes). All 17 existing learner source leaves match composition parent `f42ad22e069b5ed3b2d85ea0573b84fef121d254`.

## Maintained receiving command

```sh
node --check tools/check_answer_feedback_browser.mjs
python3 tools/make_demo.py
git diff --exit-code -- demo.html
node tools/check_answer_feedback_browser.mjs --root "$PWD" --browser /path/to/chrome --output /new/owned/output --emit-bundle
```

The receiver requires Node 22+, an installed Chrome-compatible browser, a new output directory, at least 1 GiB free disk and 512 MiB available memory. The native baseline and candidate used exactly the same receiver and original synthetic fixture; no acceptance expectation was changed to obtain a pass.
