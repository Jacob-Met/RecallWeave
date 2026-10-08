# Least-squares course and lab — receiving packet

Owner: `estate-db371a37f4c8 / capability`. Receiving project: [RecallWeave](https://github.com/Jacob-Met/RecallWeave). Scope reservation: [#103](https://github.com/Jacob-Met/RecallWeave/issues/103), published before implementation. The established catalog scopes in #39 and #40 remain with their existing owners; this contribution does not change catalog source or its manifest.

## Delivered learner workflow

The self-contained lab lets a learner edit 2–12 paired integer points, compare a trial line with the exact least-squares solution, inspect signed vertical errors and their squares, and distinguish in-range line evaluation from extrapolation. It contains six original fictional examples. Ordinary repeated x values remain valid when another x differs; all-equal x has a separate family-of-minimizers state, without an arbitrary unique slope. Exact fractions drive every calculation and the coefficient-copy action; plot coordinates and secondary decimals are display only.

The fixed original sixteen-question course and worked guide download independently of the editable experiment. The real downloaded JSON was consumed by the current actual learner's preview/start/review/practice workflow. No learner, importer, model, editor, other course or catalog implementation changed. The lab contains no automatic storage, uploads or provider calls. It makes no causal, population-inference or learning-efficacy claim.

## Results and their precise scopes

| Receiving layer | Observed result | Source and limitation |
| --- | --- | --- |
| Authored Node tests | 14 groups passed, including 143 changed datasets and exact artifact embedding | Actual controller Node 24.19.0 and ThinkPad Node 22.22.1; the complete native first-run output is retained. |
| Independent mathematics/content | 55 controls passed; all six examples and sixteen answer/transfer derivations accepted | The other reviewer froze nine mathematical cases before reading the core and blind-derived every answer before seeing the key/guide. Candidate tests were never read. This review covers core/course/guide, not browser behavior. |
| Native full browser | 12 groups passed | Chromium 153.0.8010.47, fresh private profile; native input, literal file downloads, all 16 questions and one separate practice retry. No simulated DOM was used. |
| Final mobile correction | One focused group passed | The final HTML differs only in the two intended mobile CSS declarations. Full selector wording, heading, plot text, keyboard table scroll and Fit→Trial→Fit operation were received on that final file. Settled numerical/learner gates were not repeated. |
| Native cleanup and requests | Both private browsers exited 0; both profiles removed | Full run observed only the lab and learner file: documents; mobile-only run observed only the lab file. No uncaught page exceptions or hosted requests occurred. |

The first browser pass preceded the author's visual discovery of a clipped selector label. The original screenshot and source are retained. The final mobile capture corrects that specific defect; the test history does not relabel a passing run as a failed automated test. See [environment and attempt notes](ENVIRONMENT-NOTES.md) and the exact mobile source-delta receipt.

## Independent visual receiving

Root independently inspected the captured desktop, equal-x, corrected mobile, actual learner import and learner review regions and accepted their presentation. This was image review of the recorded native run, not a second application execution.

- `author/attempt-1/lab-desktop.png` (`5a6bac17716466a14be6438d4a7e3367fc9f37baeef8afcb68e053bf3d69cf3d`) clearly connects editable rows, fitted/trial legend and the residual plot, with the approximate-drawing disclaimer visible.
- `author/attempt-1/lab-equal-x.png` (`1c7152fc86fbee9ab5b5341b20d34f65648487dd811bec838cbb74a4f01f669f`) clearly states `a + 3b = 3`, non-unique coefficients, the fitted value identified only at x = 3, the complete shown residual table and minimum SSE 8; copying is disabled.
- `author/attempt-2/lab-mobile.png` (`f1eda148b8939d79577bd4420c2859d0595d1ce3bb7e5e171e5156612f612545`) shows the complete “Fitted values” selector, a readable stacked heading, chart and legend, and exact-result cards (a = 2, b = 0, minimum SSE 14; trial SSE 34 and excess 20). That capture ends at the table heading; its visual acceptance does not extend to unseen table rows.

- `author/attempt-1/learner-import.png` (`a23a4d65c7253dc18be39fa744abb37f8acfeb29e35b28e5fe583f44735d574c`) shows the exact least-squares title, sixteen questions and four concepts, readable attribution and the explicit “Start this deck” control.
- `author/attempt-1/learner-review.png` (`50e55a64f7d7c218b32b64bfcd5a7750e84591f3207f858afe448fb3d7ad6cb7`) shows the same course, all four concepts, 15 of 16 first answers correct and one correct retry, with readable retained question/review cards. The capture ends during the third card; the separate actual sixteen-question native receipt establishes completion, rather than the screenshot alone.

Combined with the exact CSS-only source comparison, the original twelve native groups, the focused final mobile group and the independent 55 mathematical/content controls, this review identified no remaining issue in those inspected regions. The full first-run receipt separately records the actual learner import, answers, review and retry; screenshot inspection does not replace those execution assertions.

## Source identities

[SOURCE-PROVENANCE.json](SOURCE-PROVENANCE.json) records the reservation parent, receiving source, actual canonical parser/learner blobs and full final source hashes. The central production pins are:

| Source | SHA-256 |
| --- | --- |
| Mathematical core |`44c9f9ad6ad21215c262fb0af879aa59dfb8ce8b3812d0b0bf70807a1eeb6581` |
| UI program |`79e4e5ed673fd08b4fb5cdad9a7c2776c9cc40a40f22e4f35501c446bcee01aa` |
| Fixed course JSON |`3c5639727632b01775e054ca05ef90b4fe56e453ced138d355c463ebb27a2cd9` |
| Worked guide |`195e5abbe107799fd3d4dda29250b00c164c5a7275323dc87b57b918886af2b4` |
| Final template |`0c9372869993e447a2696283cba3ea09c8b063ee4c11dca89763f5974eb983b4` |
| Final standalone HTML |`b3d0866be9275b1fccfe231b65f58fdc555e83c6d8c714964b4d053c0616227f` |
| Final browser receiver |`6e134f865d8cf0c14d260aa182a79e8131e57f6ff5158e559d5df75fdc4771cb` |

The current learner tested directly was `demo.html` Git blob `cf7eea3792deacc3eb98a22aef539b920fb66746`; the actual shared parser was `src/deck.mjs` blob `f0f8a4b234489c2388f427633f548d56c6ed4c03`. Their byte identity is recorded both before and after the native run. The first generated HTML pin was `9214785b822ea0b74aae3fbe52a6fbdf53bd1681efe73b8b4d62a95c54b89ad0`; exact comparison proves the final replacement affects only the narrow-screen stylesheet.

## Evidence contents

The independent review is preserved as seven unchanged readable files in [independent/](independent/), including its frozen contract, blind answers, executable receiver, original process result, receipt, review and manifest. Its manifest is `60f4f6c2102479c93b9b9e95b4883522dea62111d0943efd76853bd73898d18d`.

The complete authored native evidence is in [author-evidence.tar.gz](author-evidence.tar.gz), with every member's size and SHA-256 listed in [AUTHOR-MANIFEST.json](AUTHOR-MANIFEST.json). It includes:

- Initial native Node output and source pins.
- Full twelve-group browser receipt and process log.
- Five original PNGs, including the original narrow-label finding and actual learner import/review.
- The literal browser-downloaded course JSON and worked guide, byte-identical to their repository sources.
- The first template, generated HTML and browser receiver before the visual correction.
- Exact final CSS-only comparison, the mobile-only receipt and its corrected PNG.
- Original environment/capacity refusal observations with the limits described in the notes.

The archive contains no build target, browser profile, credential, external dependency cache or hidden user session. Native source/evidence also remains in the owner's isolated ThinkPad namespace. Archive custody is verified from member hashes; no artifact is represented only by a screenshot description.

## Reproduce

From a checkout containing the contribution:

```sh
node tools/build_least_squares.mjs --check
node --test tests/least-squares.test.mjs
node tools/check_least_squares_browser.mjs --browser /absolute/path/to/existing/chromium --output /absolute/path/to/a-new-evidence-directory
```

The output parent must already exist and have at least 256 MiB free. The browser receiver creates its own profile and refuses an existing attempt directory, so repeated filenames cannot overwrite previous downloads. It requires Node 22+ with built-in WebSocket and an existing Chromium-compatible browser; it installs nothing. `--mobile-only` runs the bounded final-layout receiver. The full default entry still exercises the complete lab and actual emitted-course workflow.

To inspect archived receipts, extract `author-evidence.tar.gz` into a new directory and verify its members against `AUTHOR-MANIFEST.json`. The independent driver's original absolute paths and original output are intentionally unchanged; its review explains how to reproduce in a private copy without rewriting the accepted receiver.

## Integration boundary

The reservation began at main `81363271da63c5428fcb4cafba39fc89c3557b82`. Native learner receiving used the exact shared source at `04470d482c7c743b8bce913055e33640a9b53681`; a later direct-main read confirmed that parser and learner unchanged before composing the additive README section. The eventual publication/merge receipt records the actual parent and full-tree preservation. This packet's mathematical or native-browser acceptance must not be substituted for that separate hosted/integration proof.
