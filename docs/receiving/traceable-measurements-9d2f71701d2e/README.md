# Traceable measurements — receiving and source record

## Delivered course

The original course is [Traceable measurements: follow a result back to its samples](../../../courses/traceable-measurements.md), with an importable [native deck](../../../courses/traceable-measurements.json) and its [authoring/source record](../../../courses/traceable-measurements.source.json).

It contains 12 self-contained questions, six connected concepts, original distractors, worked explanations and transfer prompts. It teaches source identity versus processing settings, zero-based sample clocks and crop offsets, explicitly aligned sampling grids, signed values versus absolute summaries, record versus reference identities, and unavailable values versus numeric zero. The six recorded events are an exact factual projection of a received public-trial report. The two-value sign comparison is separately labelled fictional.

The scope was accepted in [HAMON issue 140, comment 6062825150](https://github.com/Jacob-Met/hamon/issues/140#issuecomment-6062825150). The addition consists of five new course/builder/test paths and this receiving directory. No learner, model, catalog, UI, reflection, archive, explorer, shared builder or existing course file is replaced.

## Acceptance and limits

The frozen native course source is e00a98e5c19302e893600f6d45aac08b6a69a08d, tree b45339c1d9a9f5eefce6a129d4d23fa1440add38. Its generated deck is 16,275 bytes, SHA-256 c45d46851b432d3a9fb0fd89d661d3ee5d61bc4acfbdd1a8f8c82343ccf4f913.

| Evidence | Result | What it establishes |
| --- | --- | --- |
| Independent blind question review | 12 of 12 derived answers match the authored key | Each item had one supported answer; no blocking ambiguity or unsupported clinical/calibration claim was found. The reviewer had not seen the key or explanations. |
| Authored content receiving | Five native Node groups passed | Exact source projection, stated crop/sample clocks, paired-grid calculations, sign/summary arithmetic, and record/reference/unavailable identities agree with the received data. |
| Native builder check | Passed | The existing author codec generates the exact native import JSON; its parser/serializer retain the content. |
| Standard standalone builder | Passed, identical 97,565-byte output | Existing demo generation still reproduces the unchanged learner artifact. |
| Independent native state receiving | Six groups passed across three separate Node processes | Stable content/answer identity under reordering, real unfinished and completed archives, separate practice and readable study-note files, and exact-course-version refusals. |
| Actual browser/UI receiving | **Unqualified: zero interaction checkpoints** | An initial prelaunch capacity refusal and one later bounded Page.navigate timeout are preserved separately. There is no rendered-layout, DOM-interaction or browser-download acceptance claim for this course. |

These are content and scripted integration results. Answer schedules and retry counts are fixtures, not observations of human learning. The work makes no learning-efficacy, clinical, reference-contact-accuracy, force-calibration or body-mass claim.

The independent receiver deliberately creates free-text reflections after archive restore. Existing native archives do not promise to preserve those reflections; study notes are a separate readable text export. The tests do not treat a notes download as an importable archive.

## Source and current repository relationship

The source component was materialized from canonical RecallWeave main e49aee89dc6ecf579f1c9152f32f826bf6f9d8b7, tree 2a9cfa00c9a3f18ffa834335abb609c1cd7cc989. SOURCE-MANIFEST.json lists all 21 received source/build/document blobs and hashes. This component Git history is not presented as a full canonical clone or invented upstream ancestry.

The final current-source read is main 61751d74475b61ca1e0388c808b9fc81ce9b9ed3, tree 8b1bbbdf9493128b11e3ababd7ef7d9e715ff513, with 1736 leaves. All 20 executable, learner, data and build files in the received component remain byte-identical. Only the component's README differs from that current tree. CURRENT_SOURCE.json records the comparison. All new-file paths are absent from that base, so composition preserves the complete existing tree, including newer course, catalog and explorer work. The root publisher remains responsible for a fresh source check at publication.

The source data are [the immutable SRS report](https://github.com/Jacob-Met/srs-vicon-gait-analysis/blob/38c5cce04cef4782b6ff3b6e34c9437c86a34d22/docs/receiving/public-c3d-9d2f71701d2e/event-records/analysis.json), 9,779 bytes, SHA-256 e7eabec7cf886a3c1ab5f21eaf6536f6be6ad5fab2498e756e8f93ecad1adb75. The local measurement-report.json is byte-identical. The published example has SHA-256 1d3ff6e5ea88eb77053fdf00d9da78d00d4aac24495731d32205ad485d2c9667. The source archive URL, member, original/derivative hashes, normalization, settings and measurement limitations are retained in the course's source record and guide.

No original or derived C3D is included. Original lesson wording and authored exercises are CC0-1.0; this does not relicense the publisher's recording or referenced documents.

## Preserved review and failures

The original question-only packet has SHA-256 9deaa3abb874e3308a0d10c106f1dbefddb83ee8b25b0e58a6660c609959b09a and remains unchanged. The author's earlier source commit ea4e9709e064c0b4f0a44b8a059b21985b2e02f2 is preserved. After the blind review, question 2's opening phrase changed from “A restricted analysis derivative” to “An analysis derivative”; all options, answers, numbers, explanations, transfers and prerequisite links stayed fixed. The wrapper gained immutable published-source metadata. The clarified question-only packet is a separate file.

The original browser admission refusal and its driver log are retained under author/. A later small evidence-adoption script write returned ENOSPC. Inspection confirmed that no partial script existed; a bounded retry after a fresh capacity check copied the sealed peer files successfully. No course or receiving pass was inferred from either resource failure. The initial unsuccessful adoption command and the source/custody distinction are recorded in author/RESOURCE-FAILURES.md.

The independent/ directory contains the receiver's byte-exact review, index, manifest, ready receipt and complete-history Git bundle. All five selected files were verified against original bytes, adopted working bytes and adopted Git objects. ADOPTION_READBACK.json is a later separate receipt; it does not modify the sealed five-file packet.

## Reproduction and repository gates

From a normal checkout:

```sh
node tools/build_traceable_measurements.mjs --check
node --test tests/traceable-measurements-course.test.mjs
```

The maintained tests use the pinned factual report in this directory and need no additional dependencies. The existing repository workflow runs the broader Node suite and checks standard demo-build parity; the broader suite was not repeated during this content-only receiving.

The native author commands, logs and receipts are preserved under author/. The prepared browser script is receiving evidence, not a maintained product feature; its admitted attempt timed out before course interaction. Its native component layout and resource floor are explicit in that script. The independent bundle contains the exact source projection, predecessor, receiver, real saved files and complete native I/O; its REVIEW.md explains reproduction without new dependencies.

MANIFEST.json inventories the five deliverable paths and every evidence file, excluding only itself to avoid a recursive hash. Publication metadata outside this directory binds that manifest, the native custody commit and the exact composed tree.

## Later bounded browser attempt and guide label

After the initial 32-file packet was sealed, a fresh resource check admitted one actual Chrome attempt at 2026-10-08T16:13:51.234Z with 1,942,917,120 free bytes. Native Chrome 154.0.8037.98 launched, but the first Page.navigate command hit the receiver's 10-second CDP timeout. The report records **zero interaction checkpoints**, no screenshots and no downloads. No course defect or UI pass is inferred, and no browser retry was made.

The original report, driver log and profile inventory are preserved under author/browser-v2/. They are distinct from the earlier prelaunch capacity refusal. A later cleanup read found the main child absent and no process referencing the unique receiver profile. All 27 frozen source/course/report inputs still matched their pre-run hashes. Only the ended receiver's generated profile was removed; source and evidence were retained. CLEANUP.json records this readback. Display-link messages in the browser log are diagnostics, not a demonstrated cause of the timeout.

The root's exact current-source review also corrected one guide label: **Save study notes** became **Download study notes (.txt)**, matching the existing #save-notes-button. This is the sole change to the five deliverable paths after the content freeze. The course JSON, authoring source, builder and maintained tests remain byte-identical to e00a98e5; no runtime rerun is attributed to the wording correction.
