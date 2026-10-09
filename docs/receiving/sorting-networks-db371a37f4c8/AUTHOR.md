# Sorting networks: author qualification

This contribution adds an original twelve-question lesson and an offline lab to RecallWeave issue #253. A learner writes a fixed min/max comparator sequence, follows every value change, and checks all binary inputs for that exact sequence. A missing-comparator example supplies concrete counterexamples instead of relying on successful sample runs.

Status at this author seal: author native and actual installed-browser qualification complete; independent receiving and root acceptance remain pending. This report records the author epoch. Later receiving must supplement it rather than rewrite that status.

## Source and scope

Repository: Jacob-Met/RecallWeave.
Canonical parent: ec07bf3989132130759e5c00c6cb02eef19709d3.
Parent tree: a839b6877bf2824f134443829d1ce62e1bd79e50.
Immutable source commit: 0083e940b3f357ed5a45d6a379b3b2a0ce70c795.
Source tree: c4122a970f73277e5a91f61e13748df3a0e825cf.

Ten new paths comprise the core, course, template, UI, guide, build tool, native tests, maintained browser checker, generated standalone page and portable ZIP. Full API readback preserves every one of the 2,933 parent leaves/modes and adds only those ten leaves. The canonical learner, catalog, other courses, dependencies and all five workflows remain unchanged. SOURCE-COMPOSITION-r1.json records both full leaf sets and complete current workflow bodies; NATIVE-SOURCE-PROOF-r1.json independently reconstructs the Git trees and binds native bytes.

The original public contract and API/preset addenda are retained. The explicit preset flow is choose an example, Use example as draft, then Run. Browsing the chooser alone leaves the draft and accepted result unchanged; applying an example or editing any actual draft field retires the prior result. The clarification was posted before independent candidate admission at issue comment 6079241152.

## Model and lesson

The exact supported domain is 2–6 wires, 0–30 ordered comparator pairs, and exactly one integer value from -999 through 999 per wire. Pairs satisfy 1 <= a < b <= n; repeats are legal. Every unchanged/equal-value step is retained. Exhaustive binary enumeration is lexicographic with wire 1 as the most significant bit. Observations include the entire authored trace, every binary trace and every failing ordinal. Returned structures are copied and deeply frozen.

The zero–one conclusion applies to this fixed min/max network on ordered values. The lab makes no minimum-size, depth, speed, hardware or equal-record stability claim. Configuration JSON is a precise inspection/reuse artifact; the page has no configuration importer, automatic storage or network dependency.

The lesson is original CC0 text and exercises. Mathematical background was checked against Sariel Har-Peled, Sorting Networks (2018), definitions 24.2.1–3 and theorem 24.3.2, https://sarielhp.org/teach/notes/algos/files/24_sortnet.pdf. Source prose and diagrams were not copied. An attempted Princeton reference open returned 403; no claim relies on that unavailable page.

## Original and author native qualification

Original-only admission bound 23 files/219,095 bytes to canonical Git before candidate authoring. The unchanged parser and standalone learner were available. Six native original checks passed: bundled six-question parsing, serialization roundtrip, deep freeze, invalid format refusal, invalid answer refusal and standalone presence. Its raw receipts and delayed closure are retained.

At 10:29:34 UTC, actual Node 24.19.0 build, generated-page check, both syntax checks and the maintained nine-case model suite exited 0. The suite checks exact hand traces, the incomplete four-wire counterexamples, equal/negative/repeated/empty cases, immutable copying, all 121 three-wire sequences of length at most four against six permutations, the six-wire insertion network against all 64 binary inputs and all 720 permutations, 28 strict refusals and accepted boundaries, editor grammar/JSON, and the original parser with all twelve questions and exact embedded lesson bytes. These are author assertions, not the independent receiving oracle.

## Actual installed-browser qualification and retained negative

Windows MSI\\Veria used admitted Node 24.19.0, installed Edge 154.0.4258.53 and the exact 173-file Playwright 1.62.1 donor. Both runs used the ordinary pipe with chromiumSandbox:true, a fresh task-owned D: TEMP/TMP and unchanged C:/D: 1 GiB and physical-memory 2 GiB floors. No browser download, disabled sandbox, server or shared cleanup was used.

R1 passed B1–B4: direct file default analysis and three actual downloads; incomplete-network counterexample/trace and draft retirement/refusal; empty and maximum comparator/wire boundaries; and 390-pixel keyboard/layout behavior. It then failed before the learner assertion because the author driver tried a redundant #start-button click after #start-deck had already opened the first question in the unchanged learner. The original consumer implementation confirmed that setup mistake. The full R1 source, driver, receipt, five downloads and logs remain exact.

R2 changed only that redundant 47-byte driver action; runtime and lesson bytes did not change. The maintained checker retains the complete corrected journey. A focused continuation consumed the actual R1 lesson download and ran only unfinished B5/B6: all twelve questions with one intentional first-try error, review, successful missed-item practice without altering first-try counts, and a real 9,280-byte study-notes download. No extra Unicode/reflection stress requirement was introduced. The notes SHA256 is ab4a09a3f557e1d66f4c447d2132ab5ce1f39966d1aa6738e02d2bbe58c612a6.

R2 Node 15416 exited 0 in 36.860 seconds; Edge 23324 closed normally. All 32 pre-package source files and all 173 donor files were unchanged before/after. No external HTTP request or page error was observed. Delayed 10:47:06 UTC reconciliation found all eight recorded R2/staging IDs absent and the owned TMP empty. Earlier R1 closure is separately retained.

Four actual captures were directly viewed by the author: desktop-lab.png, phone-controls.png, phone-result.png, learner-review.png. Desktop lab controls, exact trace table and binary cases are readable; phone controls/results fit the viewport and use ordinary page scrolling. The learner capture is the lower review/download section, not a claim to show the whole lesson. Exact image hashes are in AUTHOR-R2-DELAYED-CLOSURE.json.

Two read_process_output responses for recorded shell IDs returned unrelated earlier task output. They were not used as evidence of our run's exit. Exact namespace receipts, native command output and process census supply the bindings. The cause of this connector mismatch is unestablished; no uncertain browser launch was repeated and no unrelated process was altered.

## Portable use and custody

courses/dist/sorting-networks-offline.zip is 49,582 bytes, SHA256 1de74462a7c755b51d6a43ccf75cee492755510eac22c1274341bdae98328c5f, Git blob ddcf36df7bbd8692240c569e322126e025464fda. Its six regular safe members were byte-verified after ZIP readback: the lab, lesson, guide, unchanged demo.html, PLAY.md and SOURCE-MANIFEST.json. Extract into a new folder; open courses/sorting-networks-explorer.html. Download the lesson and explicitly import/start it in demo.html. Keep the ZIP and source pins for recovery. The package's historical independent-pending label is intentional and remains unchanged.

The archive retains original and both candidate snapshots, all failed and passed receipts, raw downloads, screenshots, compiler-free build commands, staged drivers, source manifests, contracts, resource guards, workflow bodies and native/API custody. MANIFEST.json gives exact byte/SHA/Git pins and mtime_ns as decimal strings. No runtime or product rerun is needed for sealing.

No ref, PR, main move, tag, dispatch or GitHub Actions was created. All five current workflows trigger only main pushes and/or pull requests; issue coordination was guarded before writing. Hosted checks are unexecuted, never represented as passing. Root owns any later safe receiving ref and adoption handoff after independent acceptance.
