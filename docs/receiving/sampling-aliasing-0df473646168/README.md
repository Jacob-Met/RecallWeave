# RecallWeave sampling and aliasing: qualified additive handoff

## Product outcome

The addition gives an introductory science or engineering learner an immediately usable offline experiment and an original twelve-question course. Open `courses/sampling-aliasing-lab.html` directly. Change the frequency and sample rate, compare the authored cosine with a different compatible cosine, inspect the numerical observations, and download the current samples as CSV. The page also downloads the exact optional course JSON. The companion guide supplies the worked answers, all distractor rationales, transfer answers and primary scientific references.

The experiment distinguishes the supplied reference, the compatible alternative and the lowest baseband representative. At a rate of 8 samples/sec, its 9 Hz reference shares its samples with a 1 Hz cosine. When the reference already is the lowest representative, the comparison is the higher `f + fs` alias; this deliberately avoids implying that a low reference is uniquely identified by the observations. The one-second plot draws analytical curves and includes both endpoints. Its unit-amplitude, zero-phase cosine model and strict ideal sampling assumptions are visible throughout.

Root published the narrow ownership claim in [RecallWeave issue 7, comment 6059561253](https://github.com/Jacob-Met/RecallWeave/issues/7#issuecomment-6059561253). This packet belongs to `universal-0df473646168 / estate_product`; root owns source publication and integration.

## Frozen source and receiving base

Candidate: `sampling-consumer-v1`.

`candidate-manifest.json` SHA-256: `588b0813d3920441b4c395592742ce1e667d7b6759279eeca6da9bbf60001576`.

The source snapshot was recovered from `Jacob-Met/RecallWeave` commit `5ce520a778da04605f5fa610fb1ad110ffe52b99`, tree `3da3cc7da0005c9e703548057a2e60642f144f37`. Its complete inventory has 239 file leaves and no sampling paths. Fresh pre-freeze receiving readback is `d22b5ef7c641fc1726ae5b774383f8e6527d73e7`, tree `5dfe46795450c2d59da9875d2fb8d49768040a4c`; all nine proposed paths remain absent. The five native core files used by this addition retain their exact original blobs on that receiving base:

| Native file | Unchanged Git blob |
|---|---|
| `src/deck.mjs` | `f0f8a4b234489c2388f427633f548d56c6ed4c03` |
| `data/deck.json` | `8efc98fe278b436a47b245eadd419155ee7af2ad` |
| `src/knowledge.mjs` | `1a3a714dc0cf643b911ec196265746fb61c1f5cc` |
| `src/review.mjs` | `06c76298e0cc60fabedfb8514f5e4851d2381005` |
| `src/session-export.mjs` | `413f9993b5cfd8227d9b8e07658b2226bcfc605b` |

The nine production paths are all new UTF-8 files, mode `100644`, with null before-images:

- `courses/sampling-aliasing.json`
- `courses/sampling-aliasing.md`
- `courses/sampling-aliasing-lab.html`
- `src/sampling-aliasing.mjs`
- `src/sampling-aliasing-ui.mjs`
- `templates/sampling-aliasing-lab.html`
- `tools/build-sampling-aliasing.mjs`
- `tests/sampling-aliasing.test.mjs`
- `tests/sampling-aliasing-course.test.mjs`

There are no existing-path changes. The default course, shared learner/editor/importer, native review and practice, model, trace/archive, README, styles and workflows remain inherited. The course uses the shared `recallweave-deck/1` parser; no competing import route or schema is introduced.

## Qualification and actual counterexamples

### Native baseline and authored tests

The exact existing six-question course parses, round-trips and selects all six items on the baseline. The same direct sampling-module consumer fails there with `ERR_MODULE_NOT_FOUND`, consistent with the complete repository inventory. Its unchanged command succeeds on the candidate with a 9 Hz / 8 samples/sec snapshot, nine observations and a 1 Hz representative.

Seven focused Node methods pass: native course validation/serialization, all twelve native item selections and weak-clock prioritization, calculated answer text, 324 frequency/rate combinations over four distinct clocks, explicit DC/reflection/boundary/limit controls, invalid-input and immutable-observation controls, and full-precision CSV with deliberately forged supplied rows. The latter proves export uses the checked parameters rather than trusting supplied sample values. Both new test files and all numerical/course code remained unchanged after this pass.

The builder produced the standalone and `--check` accepted its exact bytes. It was rebuilt and checked once more after the isolated mobile CSS correction described below; no numerical or course retest was needed for that layout-only change.

### Actual Chromium use

Chromium `153.0.8010.0` ran in a fresh temporary profile against local files. The final functional pass completed thirteen recorded scenarios and five actual downloads:

- Default sample/readout/table bindings and downloaded CSV values.
- A below-half-rate reference with its different higher alias.
- Keyboard ArrowUp following the half-Hz step while retaining focus.
- The cosine's exact boundary sequence and the constant-looking record.
- Empty, noninteger and off-step input refusal, plus four forced stale-download counterexamples.
- A changed acquisition and the supported maximum values, with actual current-identity CSV downloads.
- Exact course JSON download, a 390-pixel layout, and the numerical alternative to the plot.
- That actual downloaded file through the published Deck studio's incoming preview, explicit replacement, answer-key check and native checked export.

The generated page made no external requests and raised no page or console errors. The receipt records exactly two local-file navigations. All fourteen candidate/native file hashes remained unchanged before and after execution. Desktop and 390-pixel screenshots were captured and visually inspected.

The original browser run found an actual mobile layout defect: the workbench's automatic grid minimum expanded the document to 394 pixels at a 390-pixel viewport. The final template changes that one track to `minmax(0,1fr)`, allowing the existing table's horizontal scroll container to constrain its content. The failing receipt, exact old HTML, bounds and screenshot are retained. The same mobile functional check then passed. No model, UI logic, course, guide, builder or test changed for this correction.

The final multi-scenario driver's raw overall result remains **false**, because after all thirteen functional assertions and five downloads it encountered `Page.captureScreenshot: Unable to capture screenshot` for the existing editor's full-page image. This is not rewritten as a successful raw run. A separate bounded editor capture subsequently passed at 1280×960, with an observed document height of 5346 pixels, twelve checked questions, no page errors and unchanged native editor/course inputs. The final qualification disposition accepts the completed functional evidence plus this successful bounded capture; it preserves the ancillary capture failure. There is no claimed diagnosis of the browser's internal capture error.

One earlier author browser-driver syntax error occurred before any browser or product execution. Its exact driver bytes and error output are retained separately. A combined source-intake save also hit the process argument-size limit before creating a process; the exact native HTML was then saved alone and Git-blob verified. These preparation failures are not product behavior or successful tests.

### Independent receiving

`runtime_capability` froze a separate mathematical oracle and three-method receiver before executing the candidate. This was independent content review, **not blinded**: the reviewer had already read the draft solution text before the answer-omitted packet arrived.

The first and only candidate receiving run passed all three methods, with no failures, errors or skips. Three fresh Node consumers and a Python standard CSV reader consumed ten native CSV files and 130 data rows. Independently fixed cosine periods, reflected/multiple aliases, DC, and the 5.5/6/6.5 Hz controls at a rate of 12 passed. CSV numbers round-tripped to the snapshot values.

The reviewer also carried the unchanged twelve-question course through native review, a deliberately missed arbitrary-phase boundary question, one successful practice retry, and actual saved notes. The notes retained the original 11/12 first-session result separately from the successful retry, preserved every question/answer/explanation/transfer/license, and left the original review and mastery unchanged. All fourteen candidate/native source files and the receiver stayed byte-identical. This review did not repeat author tests or browser runs; its exact independent archive and readable receipt are supplied under `independent-runtime/`.

## Current-owner boundaries and remaining adoption gate

The separate browser-tested editor is the immutable `5ce520a7` `author.html`, blob `c43cee519313b1976782176e968f9d17cb3be75b`, SHA-256 `898b32303c834f6539b49a54e6c86ab38d3dd2d3e88e981d8a3287d63f64295c`. Current `d22b5ef7` has a different editor blob, `e2e5a2f2294bea56f863319a75d8cb589966fc53`; the historical editor result is not relabeled as current-editor acceptance. The shared deck and downstream core blobs are unchanged and directly qualified.

Issue 7 was re-read through comment `6060379971` before freeze. The importer owner's published draft PR #33 was then at reported head `7f517150ca828045a5f461e8d5bfc13c2f5821d2`, with its final published composition under independent receiving. The sampling course has **not** been adopted through that picker/preview/start composition. Root should hand the exact published course blob back in issue 7 so the existing importer lane can receive it. The standalone lab works without that pending route.

Keep the importer/shared format, Deck studio, learner persistence, archive/trace, and all existing probability, membrane, vector, SQL, measurement, graph, stoichiometry and newly claimed DC-circuit course owners authoritative. This source adds only the approved sampling prefix. Ordinary integration can inherit a fresher main if all nine paths remain absent and the relevant native contracts are preserved; no stacked order is required for the offline lab.

## Scientific scope and licensing

The primary references are [MIT 6.300 Sampling and Aliasing, Fall 2025](https://sigproc.mit.edu/_static/fall25/lectures/Sampling_and_Aliasing-handout.pdf) and [Dennis Freeman's MIT 6.003 Lecture 21, Sampling, Fall 2011](https://ocw.mit.edu/courses/6-003-signals-and-systems-fall-2011/12e6e5d7567fca2e993ef8563fef5a60_MIT6_003F11_lec21.pdf). Original calculations and explanations are independently reviewed; no source exercises, prose or figures are copied.

Only newly authored course/guide/field-note wording and worked examples are stated as CC0-1.0. Referenced materials retain their licenses; existing repository content is not relicensed. The lab asserts neither learner efficacy nor physical source identification, general finite-record reconstruction, analog filter design, or real hardware suitability. The numerical curve is a stated ideal model, with full-precision output subject to ordinary floating-point evaluation error.

## Replay and publication

From the composed repository:

```sh
node tools/build-sampling-aliasing.mjs --check
node --test tests/sampling-aliasing.test.mjs tests/sampling-aliasing-course.test.mjs
```

The author archive includes the exact standalone/model/UI/template/course/tests, five immutable native inputs, source inventories, original negative evidence, all actual downloads and screenshots, and browser drivers with their runtime path recorded. The raw browser driver retains its ancillary capture failure; the separate bounded capture is the corresponding disposition. No browser binary/profile, provider call or deployed service is bundled or claimed.

`publication-manifest.json` is the exact text/binary allowlist. Every entry has a null before-image under the new sampling paths or the unique claimed evidence prefix. Root should check fresh ownership and tree absence, preserve all other leaves, publish ordinary Git source, and return the composed pin/course blob to issue 7. Source and raw evidence are frozen; further testing is unnecessary unless a receiving source change creates a concrete new risk.
