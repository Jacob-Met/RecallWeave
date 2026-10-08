# Finite convolution course and lab — receiving

This packet records the original finite convolution lesson, the optional standalone lab, and their receiving evidence in RecallWeave. Native component and course-content acceptance, author browser receiving, independent UI receiving, and visual inspection are complete. Hosted CI, source publication, and the final normal merge are recorded separately in the pull-request conversation.

## Beneficiary and behavior

The existing course importer gives RecallWeave learners a way to load an original twelve-question course on finite convolution. The companion lab computes the same operation and exposes every per-index product before the learner enters the existing adaptive questions, review, bounded retry, and study-note flow.

Open [the lab](../../../courses/finite-convolution-lab.html), [the lesson JSON](../../../courses/finite-convolution.json), or [the worked guide](../../../courses/finite-convolution.md). Download the lesson from the lab, open the existing RecallWeave learner, select the downloaded JSON under “Bring your own lesson,” inspect its preview, and start it.

The numerical convention is full finite linear convolution:

`y[n] = sum_k x[k] h[n-k]`.

Both lists begin at index zero and are zero elsewhere. The output retains all `N + M - 1` entries, including leading and trailing zeros. Input lists contain 1–24 finite real values in −100…100 with at most four decimal places. Integer accumulation preserves the admitted decimal grid; output formatting uses at most eight decimal places. The lab shows signed examples, delays, a two-tap average, and a finite difference. Selecting an output index displays every input term, the reversed kernel index, outside-list zeros, the products, and the final sum. Invalid input retires the previous result and its calculation download. The separate original lesson remains downloadable.

The lab runs from a local file without dependencies or uploads. The existing learner remains responsible for its own session, review, practice, and exports.

## Source and ownership

The [production checkpoint and complete leaf comparison](production-source-delta.json) bind commit bfb3c50349ef7ab54076c813d81782ffcb8e5349. Implementation was isolated on `estate/recallweave-convolution-347f3417824d`, based on the final adopted importer commit `d8a9ff81e8e5290e8daad5b4af957d4eddc0ee74` (tree `2d6b3849fe9efe0d38f8c3cd62588fb9477d328d`). The baseline had four admitted course JSON files and no convolution course or path. [The baseline receipt](baseline-receipt.json) and [complete tree](baseline-tree.txt) preserve this missing-capability baseline.

Ownership was registered in the existing [RecallWeave coordination issue](https://github.com/Jacob-Met/RecallWeave/issues/7#issuecomment-6060586961) before edits. Every contributed source path is new and uses the finite-convolution prefix. The shared importer, learner, authoring tools, default course, existing courses, and CI are outside this contribution's edit fence.

At the subsequent main observation, `4fb270aebc1b93322059911ddfe1febca38fbfa7` added 99 leaves and preserved all 362 original leaves, including object, mode, and type. [Root's complete-tree comparison](root-current-main-equivalence.json) binds that observation. It establishes unchanged importer and learner bytes; it is not another browser test. This earlier observation was superseded before publication by `3cdebd86e69506709bcaeaeff4026deb3d1fc208`: learner reflections changed six inherited files and 509 paths had been added. [The current consumer delta](current-consumer-delta.json) records that later boundary. The current linked demo was therefore rebuilt and received separately; the earlier additive comparison is not used as current learner acceptance.

## Qualified components

| Evidence | Observed result |
| --- | --- |
| [Native model/course v3](native-v3-receipt.json) | 15/15 pass, including the corrected formatter exponent case and actual validator/selector/review/practice/notes consumers. |
| [Root's independently frozen numeric vectors](root-numeric-oracles-v1.json) and [unchanged final harness](root-model-receiving-v3.json) | 9/9 groups pass. Seven numerical groups were derived before the model was read; they check full results, every term, decimal formatting, immutability, and JSON records. |
| [Root's final independent browser receiving](root-browser-v1/root-browser-receipt.json) | 6/6 cases pass, with actual zero exit reported by the independent receiver. Four sealed oracles exercise visible products, complete outputs, keyboard boundaries, tiny cancellation, mixed magnitudes, and maximum mobile scrolling. Two physical calculations and the exact original course are downloaded; no page exception or HTTP request is observed. |
| [Blind question packet](questions-only-v1.json) and [root's frozen answers](root-blind-answers-v1.json) | All twelve original prompts/options/keys agree. Root also reviewed all explanations, transfer guidance, and the worked guide. |
| [Full native project run](all-native-v4-receipt.json) | 130 pass, one author-bundle failure caused by an omitted sparse-checkout input. |
| [Unchanged author case after populating its exact base input](build-and-author-v4-receipt.json) | The remaining case passes. The other 130 cases carry from the unchanged full run; this is not represented as one 131-pass invocation. |
| [Existing standalone builder](build-and-author-v4-receipt.json) | The exact published builder, run in a temporary source closure, reproduces the existing demo byte-for-byte. Its temporary copies were removed. |
| [New standalone build](build-and-author-v4-receipt.json) | The generated convolution lab matches its source inputs. |
| [Initial native browser run](browser-v2/browser-report.json) | Six actual lab groups and two completed physical downloads pass; transition to the local importer times out. This is partial browser evidence. |
| [Final standalone browser receiving](browser-v4-standalone/browser-report.json) | All nine groups pass, child exit zero. The final lab completes calculation and exact-course downloads. The actual published standalone importer previews and receives all twelve questions in both mixed/retry and all-correct sessions, with completed physical study-note downloads. |
| [Current linked consumer at 3cde](consumer-browser-3cdebd86/browser-report.json) | 3/3 groups pass, child exit zero, using the exact previously downloaded course. The unchanged receiving function completes both twelve-question sessions, mixed retries, and two physical reflection-capable note exports. All fifteen consumer input hashes remain unchanged; no page errors or HTTP requests occur. [Root independently bound those fifteen files to current GitHub blobs and rehashed both physical note exports](root-current-consumer-binding.json). [Its current builder reproduces the published 81,178-byte demo exactly](consumer-main-3cdebd86-build.json). |

The [native input manifest](native-inputs-v4.json) pins the source closure for these tests. Later browser-runner changes do not imply another native model run. The final runner is bound by [the publication source delta](publication-source-delta.json); the original 042e557b runner remains preserved as the nine-group input.

## Failures retained

The first native model run passed twelve of fifteen tests. It exposed negative-zero products and sparse-array admission. [Its log](native-v1.log), [receipt](native-v1-receipt.json), and complete [source snapshot](source-v1/src/finite-convolution.mjs) remain available. The next run passed all fifteen unchanged tests after those two source corrections.

Independent review then found that the exported formatter turned `1e30` into `1e+3` by trimming the exponent's trailing zero. [The 8-pass/1-fail receiving result](root-model-receiving-v2.json) and the [reviewed pre-fix source](source-v2-root-reviewed/src/finite-convolution.mjs) are preserved. The correction returns exponent-form output before trimming fractional zeros. The unchanged independent harness then passed all nine groups; maintained tests also cover both signs of large exponent-form values.

The guide's fc05 distractor rationale initially described `[4,1,5,3]` as a reversed-kernel convolution. Independent review correctly identified the actual reversed-kernel output as `[4,0,5,3]`. The guide now explains the distractor's incorrect endpoint products. The questions, options, and keys did not change. Both earlier guide snapshots remain in this packet.

The first browser receiving passed real lab interactions, signed cancellation, all selected terms, invalid-input retirement, presets, narrow-screen layout, and completed calculation/course JSON downloads. A second isolated transport probe reproduced the file-to-loopback navigation timeout while Node received HTTP 200 from the same local server. [The preserved runner](browser-runner-v2.mjs), [probe](browser-transport-probe.mjs), [probe report](transport-v1/browser-report.json), and raw logs record this fixture limitation. Neither report attributes a learner defect or claims importer acceptance. A [no-interception control](transport-v2/browser-report.json) still timed out with 8.29 GB free. A [fresh-target control](transport-v3/browser-report.json) failed before any file-page navigation; Chrome emitted a loopback request start, while the server received only Node’s preliminary HTTP 200 request. The cause was not established. No browser security setting was changed.

Visual inspection of the initial mobile rendering led to a visible horizontal-scroll cue and an explicitly named, keyboard-focusable contributions region. The final browser runner verified actual ArrowRight horizontal scrolling on the final template; the visible cue and focused region were inspected in the recorded mobile screenshot.

### Current consumer capture timing

The first current-consumer narrow screenshot repeated portions of the image even though the session assertions passed. [The original capture](consumer-browser-3cdebd86/learner-standalone-correct-390px.png) is preserved. A single [focused paint/DOM probe](consumer-paint-3cdebd86/browser-report.json) confirmed exactly one result card, heading, first-try summary, and heading occurrence in body text, plus twelve review items. Bringing the owned target forward and waiting two animation frames plus 150 ms produced [a normal narrow capture](consumer-paint-3cdebd86/learner-standalone-correct-390px.png) on unchanged product source. Both focused groups passed and the physical notes download completed.

The maintained receiving runner adds only those three capture-wait lines; [the exact patch](paint-wait-maintained.patch) and the [earlier runner](browser-runner-qualified-v4.mjs) are retained. The focused result qualifies this narrow fixture delta. No incoming renderer source was changed and no repeated markup defect is claimed.

## Repeatable local commands

From the repository root:

```sh
node --test tests/finite-convolution.test.mjs tests/finite-convolution-course.test.mjs
node tools/build-finite-convolution.mjs --check
node --test tests/*.test.mjs
```

The existing CI automatically discovers the two new test files; the course test enforces generated-lab parity. No CI or shared test runner was edited.

For browser receiving, use Node 22+ and an installed Chrome/Chromium executable, with a new output directory:

```sh
node tools/check_finite_convolution_browser.mjs \
  --root /absolute/path/to/RecallWeave \
  --browser /absolute/path/to/chrome \
  --output /absolute/path/to/new/receiving-directory \
  --standalone-only
```

The qualified invocation above exercises the direct-file lab and the published standalone importer. Omitting the standalone-only flag additionally requires the modular loopback importer; that mode did not qualify in this native environment. The browser runner uses an owned temporary profile, an optional loopback source server, actual keyboard/file-input interactions, and completed browser downloads. It preserves logs, source hashes, rendered screenshots, physical downloaded files, and a terminal report, then removes only its owned profile. A nonzero process exit or a failed report is not acceptance.

## Attribution and scope of claims

All course questions, numerical examples, explanations, transfer prompts, UI, and diagrams were authored for RecallWeave. The [course guide](../../../courses/finite-convolution.md) cites the two primary MIT resources used to check the mathematical conventions. Root opened both independently. No MIT exercises, prose passages, or figures were reproduced.

The evidence establishes specified mathematics, source behavior, and the receiving outcomes actually recorded. It does not measure learning improvement or claim a deployed service. Source publication and final receiver acceptance are tracked separately.
