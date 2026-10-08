# Stoichiometry course and offline explorer receiving

## Product and ownership

This additive contribution belongs to [RecallWeave issue #25](https://github.com/Jacob-Met/RecallWeave/issues/25). Its learner entrypoint is [the standalone explorer](../../../courses/stoichiometry-explorer.html), with an [original 12-question course](../../../courses/stoichiometry-foundations.json) and [worked guide](../../../courses/stoichiometry-foundations.md).

The source baseline is RecallWeave main `4775af91ba6a5d4df787669f39b44364dd1e37ba`, tree `fb9d1abd96fdbee9a05a88776b204a9f02ed612f`. No AGENTS.md appeared in the complete pinned tree. The first qualified numerical/course source is local commit `18719382ca165043037c194f4eac99a60f830cb7`, tree `8e7317066aa065b366e68f490a208ecd371d2b08`.

Only new stoichiometry source, tests, builder, course artifacts and this receiving directory were added. The existing application, learner importer, authoring interface, archive, default deck, model parameters and existing builders remain under their established owners. The explorer is useful as a direct-open file independently of the separately owned local-deck importer.

The native worktree is `/home/jacob/recallweave-stoichiometry-87eaaf0fdf63.akey5L/source` on hamon-thinkpad. No browser or dependency was installed. Cloud setup encountered ENOSPC before a source checkout was populated; native work then used a separate bounded checkout after checking available capacity. An initial native course write found the new courses directory absent; creating that owned directory resolved the setup error. Neither setup error is represented as a product counterexample.

## Teaching and numerical contract

The model accepts only the three authored balanced reactions: water formation, ammonia formation and magnesium oxide formation. Inputs are decimal strings representing moles, 0–1000 inclusive, with at most three decimal places. Leading/trailing whitespace is trimmed. Leading-dot decimals such as .001 are admitted; trailing-dot, exponential, negative, blank, nonnumeric and over-precision forms are refused.

Integer millimoles and coefficient cross-products choose the limiting side exactly within that input domain. The shared extent is the smaller amount/coefficient. Multiplying extent by a coefficient gives consumed reactant or formed product; the remaining reactant is the starting amount minus consumption. The public result contains both supplies, capacities, consumption, excess and theoretical product.

Equal positive capacities produce the matched outcome. A zero capacity produces the distinct no-product outcome, including when both inputs are zero. Positive unequal capacities identify the first or second reactant as alone limiting. Predictions use those same four outcomes, plus an optional blank selection. Editing an amount, reaction or prediction retires the previous result and disables the worked-record download until recomparison.

The explicit assumptions are ideal completion of the stated reaction with no side reactions. The calculation does not predict experimental yield, equilibrium, rate or recovery. The input increment is a numeric admission boundary, not a measurement-uncertainty model. Displayed amounts use up to eight significant figures.

The deck preserves the existing recallweave-deck/1 schema. Its 12 original questions cover four concepts with three questions each, prerequisite connections, worked explanations and transfer prompts. Answer positions occur three times each; only two correct options are uniquely longest. This is an editorial audit, not evidence of learning efficacy. Scientific background references are OpenStax Chemistry 2e sections 4.3 and 4.4, linked in the guide and artifacts; no textbook passage, image or exercise was reproduced.

## Source qualification

| Receipt | Result and interpretation |
| --- | --- |
| baseline.json | All 50 existing Node tests passed on pinned main before product additions. |
| first-candidate.json | First feature gate: 32 passed, 1 failed. The public solver accepted a sparse two-slot array because Array.map skipped missing entries. |
| input-guard-correction.json | Preserves the exact initial model source and correction to validate both required positions explicitly. The UI already supplies a dense pair. Also aligns record prediction wording with the visible positive-product choices. |
| source-gate.json | All 83 tests passed: 50 existing tests plus 33 feature checks, 2.259 seconds. Exact commands, stdout/stderr and product/test hashes are retained. |
| mobile-grid-correction.json | The changed page passed the seven course/consumer/artifact-parity checks after correcting the mobile grid. |
| product-layout-correction.json | Exact narrow-screen product-layout correction after the visual counterexample. Build parity was checked on the corrected standalone artifact. |

Feature checks include independently worked values, atom balance, reactant inventory, a changed-input conservation grid, scaling, ratio boundaries, invalid input and immutable results. The companion deck completes the existing native item-selection, review, practice and study-notes APIs with correct, mixed and missed first-answer streams. Those checks establish consumer compatibility; they do not claim learner-facing importer acceptance or measured educational benefit.

The model, course JSON and UI behavior did not change after the 83-test core gate. Subsequent product changes are limited to the page's mobile CSS and its generated standalone HTML. A separate receiver authored controls at commit e78bdde722b905e36076fb189e4593f197c3229e before reading producer source/tests, then committed all 12 lesson answers at 674729bb4b77713686948ab539f3be6a7508abd9 before revealing producer keys. Its independent-numerical-content-receiving.json records 109 passed checks and zero failures, including 49 exact-rational cases, decimal admission/refusal and all 12 lesson keys. The receiver did not read producer tests. Root independently read the final desktop/mobile captures and accepted the full product amount fitting its card; the table intentionally scrolls horizontally on mobile.

## Actual browser receiving

The browser receiver is `tools/check_stoichiometry_browser.mjs`, using the repository's dependency-free CDP pattern, Node 22.22.1 and the installed Chromium 153.0.8010.47 snap.

**The accepted browser receipt is browser-qualified/browser-report.json**, with its exact process command/output in browser-qualified/process.json. It passed nine checkpoints through an actual direct-file page:

- Direct-open initialization with three authored reactions and no fabricated result.
- Keyboard Tab/Enter calculation, current amount accounting and result focus.
- A real UTF-8 worked-record download with the displayed quantities and prediction.
- Invalid edits that retire prior output, followed by a successful corrected retry.
- Prediction changes, all three presets and the both-zero boundary.
- A reaction change with different coefficients and a settled 390px fractional-result layout.
- A deliberately failed object-URL allocation that retains the displayed result, followed by a real successful download of the current magnesium quantities.
- A real JSON download matching every byte of the validated companion course.
- No hosted request and no JavaScript page exception in the exercised direct-file paths.

The final mobile geometry is viewport 390px, usable client width 375px, scroll width 375px, product right edge 261.34px and card right edge 355.81px. The page therefore has no document-level horizontal overflow at that tested size. Long fractional values in the balance table retain an explicit local horizontal scrollbar. The standalone product has also been visually read at 1280px and 390px; screenshots are retained in browser-qualified.

### Retained browser failures and receiver corrections

| Directory or receipt | What occurred |
| --- | --- |
| browser-initial | Snap confinement refused a new profile under /dev/shm before any page loaded. The ordinary supported retry used a fresh profile under /home/jacob/snap/chromium/common; confinement was preserved. |
| browser-native | Five checkpoints passed, then the first 390px check found the setup grid wider than the viewport. Zero-minimum fractional tracks corrected its intrinsic sizing. The original screenshot is retained. |
| browser-grid | Six checkpoints passed; the receiving script then timed out because it assumed repeated downloads always create a new filename. Chromium had successfully completed the second download to the same owned test path. |
| download-receiver-correction.json | Preserves the old/new helper. Each download now has its own owned output subdirectory, and the receiver binds its file read to that action's actual completed download GUID and byte counts. Product download code was unchanged. |
| browser-final | Its earlier nine-checkpoint green log is **superseded**: visual inspection of the retained mobile screenshot showed the long theoretical-product amount clipping. Do not use this log as final acceptance. |
| viewport-receiver-correction.json | The receiver had compared scrollWidth to window.innerWidth, which includes the scrollbar. It now uses usable clientWidth, waits for settled frames and checks product/card geometry. |
| browser-viewport-counterexample | The strengthened check reproduces the clipping: client width 375px, scroll width 385px, product right edge 384.55px outside card right edge 355.81px. |
| product-layout-correction.json | The product label and amount now stack on narrow screens. The final nine-checkpoint gate and final visual read confirm the correction. |

Every browser run used a newly created isolated profile and removed only that owned profile afterward. No existing browser session, account, installed runtime or another worker's files was modified. The failed and superseded receipts remain distinguishable from final acceptance.

## Actual downloaded files and final source hashes

The accepted browser run preserves all three artifacts separately:

| File under browser-qualified/downloads | Bytes | SHA-256 |
| --- | ---: | --- |
| 01/recallweave-stoichiometry.txt | 1,135 | 802aa7bc99daa17dfd903463056f82a6683ee5837add41b7c2388c709fd9b57e |
| 02/recallweave-stoichiometry.txt | 1,099 | 056d2882add4aeace9163cb5e98bb86c7dd48d424e09389b950b50462005bb17 |
| 03/stoichiometry-foundations.json | 10,860 | 0b0d499e75d02da6e18926c5366dfc76840a89cbd167cec1b5c1f839ae9110f1 |

| Final product | SHA-256 |
| --- | --- |
| courses/stoichiometry-explorer.html | 47d1705e1a635bab153802c4f865634069b37697128c1e6a2b7a13ae66e4df6c |
| courses/stoichiometry-foundations.json | 0b0d499e75d02da6e18926c5366dfc76840a89cbd167cec1b5c1f839ae9110f1 |
| src/stoichiometry.mjs | c25ce6ec843b9424b9d2cf70581cf02c91ded2cc17f7b598fcade9c28c347943 |
| src/stoichiometry-ui.mjs | 3f90d7ebc1af52d2868cc312d9b4efbb1626b06f1132524348381bcb19d45bd8 |
| src/stoichiometry-page.mjs | e6935d401779a00d977bf541eccdc9c225ccaf000c912c0a34f1394511030c3e |

This receipt establishes qualified source and an exercised native standalone file. It does not claim a public deployment, accepted merge or completed importer integration. Publication and adoption remain explicit receiving actions under the existing estate authority.

## Final native freeze

Native home capacity was reported exhausted during independent receiving and continued to fluctuate. An exact isolated copy of this worker-owned checkout was made at /dev/shm/recallweave-stoichiometry-freeze-87eaaf0fdf63.nw1dljql/source for the final Git index/object/ref writes. All 86 then-present non-Git working files matched by bytes, SHA-256 and mode; native-freeze-copy.json retains the complete comparison and actual capacity values at copy time. The original home source was preserved. The independent numerical receipt was copied byte-for-byte into the freeze. No shared source or another worker's files were removed.

## Accepted-main composition and independent replay packet

The final source composes accepted main 003ce06c72fb3c7924a4414cd34053d87ae46d2f at local merge 5e832633c4acb9fde49d2a4acfd5a25065e865bf. current-main-composition.json records 154 passed tests in 3.013 seconds on native Node 22.22.1, exact required demo regeneration and exact standalone build parity. The selected product files and the existing deck parser, item-selection, review and study-notes consumer modules stayed byte-identical across this merge. The hosted workflow targets Node 20; its result is a separate publication gate.

Independent receiver estate_integration preserved its complete blind review history at bfa7e1ce24b3b0588a225d10c923d77ef25fcba1, tree a5e99497c0796f729fe891ed8d777c03527b72ad. The independent/ directory contains the exact 31,752-byte source/evidence archive, 34,944-byte Git bundle and handoff receipt. The archive includes the oracle generator, exact cases, blind prompts/answers, source snapshots, 109-check result, source correspondence and replay harness; the bundle preserves the earlier control and blind-answer commits. To replay independently, extract the archive into a disposable directory and run node run-numerical-receiver.mjs there (the harness rewrites its report). Do not execute it over the retained original receipt. This contribution copied all three handoff artifacts byte-for-byte and did not edit the receiver's source.
