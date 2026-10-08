# RC transients receiving

Source issue: [RecallWeave #131](https://github.com/Jacob-Met/RecallWeave/issues/131). Authoring cohort: estate-de6848cbddda. Original source context: 8317dcf58f4ec34b631328fffb92ab37390c75e7. This document records a separate model/course/lab contribution. It does not transfer the catalog, course-pack, learner or shared-parser scopes.

## Learner-facing result

The [RC lab](../../../courses/rc-transients-lab.html) follows the existing DC material with an ideal source step into one resistor and capacitor. Its six examples include charging, discharge, reversed polarity, a precharged capacitor returning energy to the source, resistance scaling and equilibrium.

The 16-question [course](../../../courses/rc-transients.json) and [worked guide](../../../courses/rc-transients.md) teach voltage continuity, signed current, time constants, physical versus normalized time, and source/capacitor/resistor energy accounting. The lab's direct-file page offers an exact course download for the existing offline learner. Its guide describes the importer preview, cancellation, lesson start, review, practice and notes.

The circuit inputs and observation are explicit. Draft edits retire prior results; Apply admits and freezes the four values. A time slider selects 0 to 8 time constants in 0.05 increments. The display and downloaded observation refer to that applied response. The fixed course and guide remain independent of circuit edits. No provider calls or automatic browser storage are used.

## Model and numerical scope

The public model accepts finite R from 1 to 1,000,000 ohms, C from 0.001 to 1,000,000 microfarads, and source/initial voltages from −24 to +24 V. Returned physical quantities use SI units. The trace contains 161 points, including both ends of the finite horizon.

Positive current flows from the source into the capacitor's marked positive plate. Source work is positive for delivery and negative for absorption. Resistor heat is nonnegative. The balance compares source work with change in stored energy plus heat over the same interval.

The general analytic response uses the initial voltage rather than assuming an uncharged capacitor. Small-time changes use expm1 and a factored energy difference. The finite horizon never establishes an exact asymptotic completion. The model omits leakage, ESR, inductance, switching parasitics and component ratings.

## Authored receiving

Native LA7 Windows, Node v24.21.0:

- Focused model, course and standalone tests: 13 passed, zero failures or skips.
- UI module syntax: exit 0.
- Standalone generator --check: exact byte parity, exit 0.
- All eight product files and the unchanged parser matched before and after the checks.
- Driver process 31028 exited 0; the initial standalone build process 23460 also exited 0.

The focused tests cover input admission, sign conventions, continuity, equilibrium, component scaling, a nonzero finite-time gap, energy balance, an immutable complete trace, full-precision SI observations, course schema/coverage, and exact embedded download bytes. They also compile the executable bundle and check that it has no external runtime resources or browser-state APIs.

Reproduce from the repository root:

    node tools/build-rc-transients.mjs --check
    node --test tests/rc-transients.test.mjs

The author used the unchanged parser blob f0f8a4b234489c2388f427633f548d56c6ed4c03, 4,894 bytes, SHA-256 621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b. This dependency is not a contribution file.

## Independent physical and content review

A separate reviewer wrote a coupled Runge–Kutta reference integrator before reading the model. The oracle integrates capacitor voltage, source power and resistor power in SI units; it does not use the model's exponential solution. It first passed 17 calibration checks and generated 80 reference cases.

The native candidate receiver then passed 132 signed/general/boundary/tiny-time comparisons, all 161 trace rows, two component-scaling scenarios and 25 invalid-input refusals. Its process 66920 exited 0. Source and course bytes were identical before and after.

The reviewer solved all 16 questions and froze the choices before opening the authored answer key. Every key matched and each prompt had one correct option under the stated assumptions. All 16 worked transfer answers and the guide's derivation were reviewed independently. One example description was clarified to say that the capacitor starts at 10 V and the source is 5 V; computational code and course answers required no correction.

Independent review SHA-256: 7d6de1dc97e08847517f7fdc0432bf9ba0260ec912ce0eb436ecc62f446eabb5.

The reference integrator SHA-256 is d840c153053e0a6168b6c2498229caa9562da5004ed33e62991d96b49e2e542f. Its raw candidate receipt is 495,963 bytes, SHA-256 79773776a001687db78d569e313b6b6b2b5c642ecebc82530cb2d0a99293b35d.

## Frozen product bytes

| Path | Bytes | SHA-256 |
| --- | ---: | --- |
| src/rc-transients.mjs | 6,277 | f527555818cb4ff13311afc84df02b1a6a628021a6f72ffa99e1ad79f28e9313 |
| src/rc-transients-ui.mjs | 11,968 | 3aa56ac62ad60ab70e1be89123cb3234b2311bd0cf6f11d810ab7d333b33fe0b |
| courses/rc-transients.json | 15,703 | aabb295ee962776298063e793f05a0b2f5c486b6287ee1f23232948a4582068a |
| courses/rc-transients.md | 16,214 | 1cb92b3091b47b4b73191af0a1bed500b4f0ef9d20d975c7e18a0fff587230da |
| templates/rc-transients-lab.html | 23,291 | fea9dfaac46026ac110d72af8c802bff9850a77fb058194246a87516dcfc1a3c |
| tools/build-rc-transients.mjs | 2,955 | 29540f2b1f900032629867c5ebc336a8e32ca85923145d0129fc301f62b68657 |
| tests/rc-transients.test.mjs | 9,884 | 337917ef1878001cf8d20c91b1911f5fbf02e5608d8d68570e71de656df7e449 |
| courses/rc-transients-lab.html | 74,401 | 43dbec11e7ced24e3a586958935f7e980aa2bf2dbe45db2ef7d55f14f5ec4a70 |

## Independent browser and unchanged learner receiving

The separate receiver's frozen contract passed on native LA7 Chrome 154.0.8037.98 and Node 24.21.0: 168 of 168 assertions, zero failures. A further bounded visual-only run passed six checks after the original journey screenshots had not shown the plot labels. No product changes were made.

The actual direct-file journey covered all six examples, desktop and 320 CSS-pixel layout, native keyboard controls, retirement of prior results after drafts/invalid edits, and seven real downloads. The downloaded course and guide match their original bytes. Observations preserve the applied circuit, selected time and all 161 full-precision samples.

The receiver imported the browser-downloaded course into the unchanged learner at commit f42ad22e069b5ed3b2d85ea0573b84fef121d254. It checked the preview and cancellation, started the deck, completed all 16 questions with one deliberate miss, reviewed the result and retried the missed item correctly. The original first-pass result stayed 15/16 and the original answers/model remained unchanged. Reflections were included in the real study-note download. The learner demo SHA-256 is c7f1877facf1c62c741373b6bd03b645ec351af3457da06c45988efde805701a.

All 25 product/learner input files remained exact. The run recorded zero external page requests, runtime exceptions or console errors; local/session storage, IndexedDB and cookies stayed empty. The owned browser process exited 0 and its profile was removed.

The receiver directly inspected eight screenshots. The author also viewed the final desktop plot/energy table and 320-pixel quantity screenshots: signs and adjacent values agree, and the narrow table wraps its labels within the page. SVG labels shrink at the narrow width; the semantic quantity table, complete scrollable sample table and accessible SVG descriptions provide readable alternatives. This is native viewport/keyboard/accessibility-tree receiving, not a human screen-reader or physical touch-device certification.

Two receiver-only failed attempts remain preserved. The first supplied window geometry to a CDP tab target and stopped before product navigation. The second assumed six significant figures in a display that intentionally uses five for exponential notation; its correction used half the final printed digit as the tolerance. The exact diagnostic receipts and unchanged source pins remain in the browser packet.

Final browser review SHA-256: 66fb336e6d39522c4f974d55aeb838ed05d8dee5ad5753c603ff1699b98deb16. Raw 168-assertion receipt SHA-256: 93f6b689bf5633d48f51f17636e92fd7b4aada56082292b627047883a38829b2.

The complete RECEIVING-PACKET.zip is 1,236,114 bytes, SHA-256 0100fd3ac8016471696a711f58277e4f8d770cf786bc4fbf8e1ffef4623c859a. Its 94 payload files plus manifest were reopened with exact size/hash matches. The packet preserves the original receiver failures, frozen scripts, exact product and learner closure, raw receipts, actual downloads and screenshots.

## Remaining source integration

Final source composition must use the actual integration parent and preserve every unrelated file. Registration in the catalog and offline course pack remains a handoff to their existing owners (#39/#63 and #109). These numerical, content and browser results do not establish learning efficacy, hosted CI, a merged change or deployed adoption.

## Durable evidence custody

The native author root is C:\Users\minec\hamon\stage\recallweave-rc-de6848cbddda. Its unique receiving directory contains author-receiving.mjs, author-receipt-r1.json and source-manifest-r1.json. The receipt preserves command arguments, stdout, exit status and before/after source hashes.

The separate physical/content root is C:\Users\minec\hamon\stage\recallweave-rc-receiving-de6848cbddda, with INDEPENDENT-COURSE-REVIEW.json, the blind answer review, reference oracle and raw numerical receipt.

The independent browser root is C:\Users\minec\hamon\stage\rw-rc-receiving-de6848cbddda. It retains its own frozen receiver and exact unchanged learner closure. The source issue is the coordination record; native stage names and this document are not runtime leases.
