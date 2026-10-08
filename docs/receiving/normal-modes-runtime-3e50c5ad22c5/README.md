# Independent browser receiving: normal modes

**Result: passed.** The frozen offline lab and its physically downloaded course passed 10 acceptance groups in Chromium 153 on the ThinkPad host. The successful run started at 2026-10-08T19:56:28.955Z and completed at 19:58:16.893Z. It produced 12 completed browser downloads and 10 screenshots. All eight consumed source files were byte-identical before and after receiving. No application exception or HTTP/HTTPS/WebSocket request was recorded; the three page requests were local file URLs. The owned Chromium process exited normally, its temporary profile was removed, and download staging was empty.

The primary result is `receiving-v2/receipt.json`, SHA256 `8d6fef6e5ebd880535fc0305226f67ff3c79183a086da68b076cf34a3431bcdf`. The first failed attempt is retained separately in `receiving-v1/`; it timed out during Chromium startup before any application page opened.

## Scope and source identity

This is the independent receiving lane delegated by `/root` for the original RecallWeave normal modes course and offline lab. It does not modify the product source. Native coordination is recorded at `/srv/hamon-estate/coord/estate-3e50c5ad22c5.json`; this lane owns the `docs/receiving/normal-modes-runtime-3e50c5ad22c5/` evidence prefix.

Repository: `Jacob-Met/RecallWeave`. Authoring began against `f42ad22e069b5ed3b2d85ea0573b84fef121d254`. Before product execution, the unchanged learner dependency was updated to main `567425f209cdf8e8cf9767faac9bfd3003af3e65`. `demo.html` was independently verified against Git blob `42f991e0ceab6144e24b667f59905777d9659246`; the deck parser remained blob `f0f8a4b234489c2388f427633f548d56c6ed4c03`. The candidate commit had not yet been assigned when receiving ran; acceptance binds to the exact eight source byte sequences below. The receipt also records their Git blob IDs.

| Source | Bytes | SHA256 |
| --- | ---: | --- |
| courses/normal-modes-core.mjs | 5702 | b6fecce4c9dea4b8fbf08b2a1b6618c00dfbb177a781509069404d0d5fad4f36 |
| courses/normal-modes-ui.mjs | 18185 | 8afd808f6cc6f85a475e777176af295e93808d129314bcf085b26c7cdb6b1b86 |
| courses/normal-modes-lab.template.html | 24439 | 17b6d7eaf11f42862a79b56c64ea3b4edda1399992df163646b36bf6613cc98e |
| courses/normal-modes-lab.html | 77052 | 5378b02dbaa102e26d172b3777dd1e7f5590e8152690b16973f041b473e6e760 |
| courses/normal-modes.json | 16553 | 9630e9444af5284cbe42ce1b2eaa8ede8f9bf2d59281c827b36f6264020fcd94 |
| courses/normal-modes.md | 11259 | e89f0eb939190d2b8ff457b257ccbf02560294042828f9dd641b40d81ce3f49a |
| demo.html | 97716 | 9dff3fa7343b586bccb1c97e8cc9e270e9be9ceac0e9259af57a8756d451d380 |
| src/deck.mjs | 4894 | 621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b |

The authoritative source workspace was `/tmp/hamon-normal-modes-3e50c5ad22c5`. The receiver was isolated in `/dev/shm/hamon-normal-modes-receiving-3e50c5ad22c5` after the main filesystem reached ENOSPC. Earlier source/dependency pins, relocation records, and preflight checkpoints remain in Git and provenance files. No unrelated files or processes were cleaned up.

## Acceptance and independent controls

The original nine groups in `acceptance.json` were frozen before product execution. `acceptance-addendum.json` records the agreed pending-edit export contract. `acceptance-layout-addendum.json`, also written before the first product run, adds the root-requested 360px viewport and the specific subnormal apparatus regression disclosed by the UI author. These are receiving controls, not changes to product behavior.

| Group | Verified behavior |
| --- | --- |
| NM-B01 | The standalone file loads with the page network offline and exposes all five presets. |
| NM-B02 | In-phase and opposite presets agree with an independent analytical oracle at zero and at each exact quarter period, in both visible readings and real observation files. |
| NM-B03 | Home, ArrowRight and End physically operate the range input, retain focus and update physical values. ArrowRight reached 0.08 seconds; End reached 8 seconds. The accessibility tree reports a named slider. |
| NM-B04 | Changing mass from 1 to 2 leaves applied results visible and disables observation download until Apply. Applying changes the visible and downloaded physics and resets time to zero. |
| NM-B05 | Blank, negative and nonfinite mass drafts show visible validation, retain applied results and cannot produce a download. Reverting a field still requires explicit Apply. A valid Apply recovers. Chromium sanitizes the entered `1e309` number input to an empty value; the receipt preserves both attempted input and observed browser value. |
| NM-B06 | Keyboard activation produces actual observation, canonical course and guide files through browser download events. Course and guide bytes, including final newlines, exactly match their canonical source files. These two downloads remain available while parameter edits are invalid. |
| NM-B07 | The 390px and 360px lab layouts have no document overflow. Controls, diagrams and table wrappers stay inside the viewport; any wider table remains inside its scrollable wrapper. |
| NM-B08 | The physically downloaded course is selected through the unchanged learner file input, previewed and explicitly started. All 16 questions across four concepts complete. The first deliberate wrong answer and 15 correct answers retain their feedback, review, notes and trace. Notes and trace are actual downloaded files. |
| NM-B09 | All eight source inputs retain their byte counts, SHA256 hashes and Git blob IDs after the complete run. |
| NM-B10 | A valid displacement `x1=1e-320` is actually applied and exported. All 18 apparatus SVG descendants have finite attributes, and the apparatus stays contained at 360px. |

The oracle in `lab-receiving.mjs` does not import the production physics implementation. It derives half-sum coordinates, the two angular frequencies, positions, velocities, forces, accelerations and physical/modal energies directly from the input parameters. It checks the inspection state and first, middle and last trajectory samples. Energy drift is the signed difference E(t)-E(0) in joules. Visible values use a tolerance of 6e-8 times max(1, absolute expected value), compatible with the UI's eight-significant-digit contract. Exported values use 2e-10 times that scale.

The changed mass is a positive changed-input control; rejected blank/negative/nonfinite drafts and the deliberate incorrect learner answer are negative controls. The subnormal check confirms the author's concrete finite-schematic fix with an actual browser and downloaded observation.

## Evidence and visual inspection

`receiving-v2/` contains eight observation JSON downloads, the exact course and guide, learner notes and completed learning trace. Every download has a browser GUID, suggested filename, completed event, byte count and SHA256 in the receipt. The renamed evidence filenames preserve the original suggested names in that metadata.

Ten full-page screenshots cover the desktop lab, both pure-mode quarter periods, 390px lab, invalid 390px and 360px states, subnormal 360px state, and the learner preview/question/completed review at 390px. Desktop, normal narrow layout, invalid 360px layout, learner question and completed review were visually inspected. No overlapping cards, clipped controls or document-wide overflow was observed. The learner visibly reports 15 of 16 first-try connections and preserves the one missed connection. `visual-review.json` records the inspected artifacts and their hashes.

The CSS viewport widths are 1280, 390 and 360 pixels; screenshot content widths are 1265, 375 and 345 pixels because Chromium reserves 15 pixels for its scrollbar. This is expected and separately distinguished from the geometry assertions.

## Preserved startup failure

`receiving-v1/receipt.json` contains the full failure stack, browser stderr, frozen inputs and before/after hashes. Chromium's first startup exceeded the original ten-second receiver polling allowance under host load. No page was opened, no product download happened and no product pass was claimed. The owned process was stopped and its exact temporary profile removed.

`receiver-adjustments.json` records the resulting receiver-only adjustment: bounded startup polling of approximately 60 seconds and a 30-second CDP command timeout. Product source and acceptance criteria did not change. The second attempt passed and closed Chromium normally. Earlier runtime smoke tests and parser compatibility preconditions are retained and clearly separate from product acceptance.

## Reproduction

Use the installed Node 22 and Chromium 153; the harness has no npm dependencies and installs no browser. Run from this receiving directory, substituting a source workspace containing the exact pinned files and a new, nonexistent output directory:

```sh
node receive-normal-modes.mjs \
  --source /tmp/hamon-normal-modes-3e50c5ad22c5 \
  --output /dev/shm/normal-modes-receiving-new \
  --lab courses/normal-modes-lab.html \
  --course courses/normal-modes.json \
  --guide courses/normal-modes.md \
  --learner demo.html \
  --identity source-identity.json \
  --inputs source-inputs.json
```

The default executable is `/snap/chromium/current/usr/lib/chromium-browser/chrome`; pass `--browser` to use another installed binary. Fresh browser contexts and an owned temporary profile isolate the application from personal browsing. Each page has network conditions set offline before its local file is loaded.

## Limits

The result qualifies these exact source bytes in the observed Chromium build. It does not establish behavior in every browser, on physical phones, with touch input, or with a screen reader. Narrow layouts are emulated desktop Chromium viewports; only the range input's accessibility role/name and keyboard behavior were examined. Scripted question answers establish content delivery, state preservation and export correctness, not human learning efficacy. Physics validity beyond the accepted model assumptions belongs to the separately delegated scientific review. Publishing should preserve these source hashes or record and qualify any changed input.
