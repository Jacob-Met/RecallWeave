# Independent RecallWeave study-notes review

Reviewer: `/root/local_estate`. Author/integration owner: `/root`.
Disposition: **PASS for the reviewed source and generated export content**.
No meaningful reachable defect was found in the new study-notes serializer,
app download hook, or direct-open demo composition.

## Frozen source

The exact thirteen-file source/artifact snapshot is under `source/`; every
file's Git blob, byte count, and SHA-256 appears in `source-manifest.json`.
The source was copied from
`/workspace/scratch/a3425ebf9874/production/recallweave-notes` and rechecked
against that checkout after copying. The owner candidate base is
`fca805724b55a9a01f073966cf26507fe2c3d6a0`.

This review does not imply ownership of the existing candidate's shared app or
build hooks. Their incorporation remains with the candidate owner through the
author's existing coordination route.

| Reviewed file | SHA-256 |
| --- | --- |
| `src/session-export.mjs` | `aa33a8ef84fd490e00469c733439d7e7950e72dbe9a4111ca7d917232e027c44` |
| `src/app.mjs` | `d3a61f20342c6c3375aed2d134b97f686b69a11f7deefbb64ff320208601621c` |
| `tools/make_demo.py` | `09eb5074e07a029b317cdba3aa5ed7b322f0cde0e8f8fe58187eeb67a3ff9519` |
| `demo.html` | `5e6cf8c489c517adb575489d173f949aba9972b3a611f4432c677583f64b326c` |

## Design and output assessment

The app supplies the serializer with the immutable first-answer snapshot from
`createReview`, the original model state, and the distinct immutable practice
round. The export uses recorded answer indices; legacy data without indices
is refused. It retains original session order and first choices, even after
a corrected retry. Correctness counts are derived from those recorded choices
and each corresponding answer key.

Practice remains separate in the summary and each question's content. Not
started, zero-answer paused, partially answered, complete, and all-correct
sessions have distinct supported labels. Model estimates are explicitly model
state, not grades or a validated assessment. The export does not mutate session,
review, practice, or model state.

The app hook creates a UTF-8 plain-text Blob and a temporary download link.
The link is removed, the object URL is scheduled for revocation, and the status
says a download was requested, without claiming the browser saved it. The new
hook does not add upload or session-restoration behavior. Actual browser file
delivery is an independent acceptance check owned by the author.

## Focused verification

Runtime: Node `v24.19.0`.

```sh
node --test source/tests/session-export.test.mjs export-association-control.test.mjs
```

**Six tests passed:** the five authored export tests and one independent
receiving control. The latter uses differing correct-answer positions, varying
first choices, changed session order, one corrected and one still-wrong retry,
and checks each question's own output block. This strengthens answer-to-question
association without repeating the existing knowledge/review suites. The first
draft of that control assumed a trailing newline consumed by its own block
split; its assertion was corrected to compare whole lines. No production change
was involved or required.

The copied `tools/make_demo.py` regenerated a **byte-identical** `demo.html`.
The exact serializer is embedded and the module imports and local-deck fetch
are removed in the generated standalone script. Results are recorded in
`generated-demo-parity.json`. This is build/artifact parity, not a browser
download test.

`actual-deck-paused-notes.txt` is a representative export generated from the
actual deck with synthetic receiving inputs recorded in
`actual-deck-paused-input.json`. Its save time is a fixed fixture value. The
reviewer read the complete text. It preserves first choices `3,0,2,0,1,0` in
the recorded question order, reports `3 of 6` first answers correct and a
`1 of 3` paused practice round with one correct retry, and includes the original
explanations, transfer prompts, model-state wording, attribution, and license.

## Limits and handoff

The source owner received the qualified result and exact source pins. This
packet is prepared for preservation in the owner's existing native/git evidence
location. No author code, branch, owner candidate, browser profile, persistent
session data, or deployed application was modified by this review. Source
integration, actual saved-file delivery, and any publication remain distinct
states and are not implied by this receipt. No exercise-efficacy claim was
assessed or made.
