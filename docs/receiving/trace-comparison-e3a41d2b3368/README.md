# Completed learning-trace comparison receiving

This packet qualifies the separate `compare-traces.html` capability claimed in [RecallWeave #55](https://github.com/Jacob-Met/RecallWeave/issues/55). It preserves the existing learner, importer, editor, model, review, archive and other course owners.

## Result and source

A learner can open the standalone page, choose two completed trace JSON files from exactly the same raw course, and inspect both original first answers and separate practice records. Questions follow canonical course order; each side retains its own original question position. Filters select differing first answers, practice records, or concepts. Printing retains the selected questions, file metadata, filter description and supplied attribution.

The core delegates admission and replay to the unchanged `readTraceArchive` contract and validates the embedded course with the unchanged deck validator. It passes the original archived deck into replay rather than normalizing the bundled legacy identity. Practice distinguishes initially correct questions, an unstarted round, a pending retry and an answered retry. Two different wrong options still count as different answers. No result infers chronology, learning improvement, a grade or a model-estimate change.

Initial source was `c00bd1f31c353698957d2ebad311334536cdef98`, tree `22edf70cdecedd0788170d7956159a2e8f8cac30`. Current-consumer receiving and this packet are pinned to `e49aee89dc6ecf579f1c9152f32f826bf6f9d8b7`, tree `2a9cfa00c9a3f18ffa834335abb609c1cd7cc989` (1,300 complete leaves). The four core dependencies, default deck, completed-trace UI and answer-order inputs retained their exact blobs. The current learner's newer reflection and unfinished-lesson code was received through its actual generated page.

Only six new source/test paths and a pure README insertion form the product delta. This composition preserves every other parent leaf and mode. The source manifest and the publication packet enumerate exact source hashes and the seven upstream paths that changed between intake and current receiving; those owner changes were retained.

## Qualification

| Gate | Outcome and scope |
| --- | --- |
| Author native Node 22.22.1 | 42 tests passed, zero failures/skips: 15 new core/controller tests and 27 existing archive/deck/review tests. Rebuilding the standalone output twice was byte-identical. |
| Independent root model receiver | 12 of 12 groups passed against the exact frozen core and four original dependency blobs. Source bytes stayed unchanged. |
| Initial Mac actual-browser run | Its first six completed groups passed 91 checks. The overall run is retained as **failed** at a later unsuitable native-select popup keyboard sequence. |
| Native-select diagnostic | A plain select and the application select both ignored the same popup sequences. Keyboard typeahead selected the expected option and emitted trusted input/change events on both controls. |
| Final Mac current-consumer run | 69 of 69 checks passed in five groups: current learner downloads, old/current trace compatibility, remaining keyboard/mobile/print controls, and source/session preservation. |

These are separate receiving records with overlapping consumer checks, not a claim of 160 distinct browser tests. The initial six accepted groups and the final successful groups are bridged by the identical standalone page hash `9d76de38b4b901f7c7605bed5fa3caad9cc805efcd9b58f20e7bc73d4ff5c5a3`. No application code changed between browser attempts, and unchanged model tests were not repeated after the independent gate.

The original native author log remains at the recorded ThinkPad path with SHA256 `ea2358ef11151b61d6a8b3972773aade28899d15ee957ce3fe8c6e2cbf45a086`. That host's later read calls timed out. `native-author-record.json` labels this as the previously observed author result and records the original paths; it does not substitute a generated log for the preserved native artifact.

## Actual-browser evidence

`browser-receiving.tar.gz` contains 48 exact members, including the three original receiver scripts and receipts, the plain/native keyboard diagnostic, actual learner downloads, deliberately invalid/literal test fixtures, source pages and source manifests, desktop/mobile/print screenshots, and a two-page printed PDF. `browser-members.json` binds each included member's bytes, mode and SHA256. Redundant/intermediate PNGs are listed separately with their original hashes and remain in the full native archive; raw failed receipts and their drivers are included.

The browser was Google Chrome 154.0.8037.98 on macOS arm64, controlled by existing Puppeteer Core 25.12 and Node 26.3.0. Each browser used an exclusive empty profile and normal sandboxing. All browser processes closed; the completed private profiles were then removed. No dependency installation or changes to a shared browser profile were needed.

The scripts drive the real learner's canonical answer buttons and separate practice controls, then await Chrome's completed download events and read the actual files. The comparison uses those exact downloads. The final receiver also pairs an earlier learner's downloaded trace with the current learner's downloaded trace. It leaves the original current learner's first-answer summary, completed practice and literal reflection unchanged.

Accepted cases cover canonical question order and each file's original answer order; distinct wrong first choices and separately recorded retry outcomes; partial and completed practice; same-file comparison; difference/concept filters and no-match state; rejected course identity and invalid UTF-8; immediate retirement of a pending replacement; superseded reads and clear-during-read; literal markup in names, titles, questions and options; 390-pixel layout with no horizontal overflow; keyboard controls; and filtered printing. Only the asynchronous File-read boundary and the system print call are controlled in the respective receiver cases; application source is unchanged.

The first two popup attempts are historical receiver failures, not product passes. The retained diagnostic shows trusted key events, focus and visibility on both a plain select and the application select. On this headless Mac Chrome path, ordinary native typeahead works while arrow/popup navigation does not. The final receiver uses that verified keyboard interaction and retains the same selection assertion.

The PDF and print rendering show the chosen two-question concept subset, both trace filenames/save times, separate first/practice records, active filter description and supplied course attribution. Opening an explanation with the keyboard remains reflected in the printed view.

## Reproduction

The maintained source tests run from the repository with:

```sh
node --test tests/trace-comparison.test.mjs tests/trace-archive.test.mjs tests/deck.test.mjs tests/review.test.mjs
node tools/build-trace-comparison.mjs
```

The independent model script is preserved byte-for-byte. It expects a sibling `candidate/src` directory and checks the source hashes before running. To receive the frozen source in a fresh directory, copy the five listed source modules into that directory and place the script in `root-review/receive-model-v1.mjs`; its output is `root-review/model-v1-result.json`. Do not silently relabel a changed-source run as the original result.

Extract the browser archive into a new isolated directory to inspect its complete input layout. Its historical drivers retain the exact qualified Mac Puppeteer and Chrome paths. Another receiver may adapt those execution paths, while preserving the application bytes and semantic assertions and recording its own environment and result.

## Limits and integration state

The answers are scripted receiving fixtures, not learner-performance observations. File metadata is editable; save order does not establish learning order. Source-derived counts do not validate course content or demonstrate learning efficacy.

Observed application requests were local file or download-blob URLs. This is not a claim about every background request of the browser process. This packet records source and native/browser qualification; it does not claim a hosted CI pass, a merge, a deployment, installed-runtime activation or a live rollout. Publication must use an actual current parent and preserve all other owners' leaves and modes. The original local evidence ancestry must not be pushed as production ancestry.
