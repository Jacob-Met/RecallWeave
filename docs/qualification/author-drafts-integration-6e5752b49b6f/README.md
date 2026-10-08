# Author drafts on dependency-graph main

The final application composition is `12111ca41643579c847b81fb5a39e61d082dbacb`, tree `754461e649caa7b1d80dd97e81589555668db6c9`. Actual main `a1ecbb83e71abe013c02d92ec3ba5fdf5b9ffbc4` advanced after the corrected draft browser receiving. That main adds the independently authored dependency-graph course JSON, its explanation document and its native tests. These three paths are preserved byte-for-byte here.

All **233 unrelated current-main leaves and modes** are unchanged. The nine allowed modified main paths remain the previously received author UI, template, styles, core undo fix, loader/tests, builder/output and author README additions. The new draft module and its tests are additive. All nine runtime hashes match the executed R2 source `f17b4937eef9fb4faaffa356acf1e0d4a1a220c1`; no browser or independent-format run has been relabeled to a different source.

The complete [R2 packet](../author-drafts-r2-6e5752b49b6f/README.md), including the independent reviewer's 18-member archive, is unchanged. R1 remains unchanged as well. This follow-on records only the materially new main composition.

## Bounded execution

The newly introduced course test file passes **16 tests** on Node v24.19.0 in [dependency-graphs-tests.txt](dependency-graphs-tests.txt). Its answer checks and negative controls are the existing course contributor's code, unchanged. A first invocation could not execute because this lane's sparse checkout had omitted `courses/`; materializing the exact Git paths resolved that setup error. No course source was edited.

A separate [course draft receiver](receive-course-draft.mjs) admits the actual 12-question, four-concept file through the shared lesson validator, converts it to editor state, saves it as an editable draft, reopens it and checks it again. The [receipt](course-draft-receiving.json) verifies all course semantics, public question IDs, selected correct answer text, explanations, transfer prompts and graph relationships, plus exact checked JSON bytes before and after draft reopening. The 17,110-byte canonical draft is stable on repeat save. The original course remains 12,121 bytes; its checked canonical lesson is 12,813 bytes. This is a native source integration check, not an additional browser execution or an authorship claim on the course.

`python3 -B tools/make_author.py --check` passes against the composed source. The existing R2 full suite has 67 passing tests; this additional course file adds 16. Exact final hosted CI is recorded separately in the PR 24 handoff, rather than treating the two local commands as a fabricated full-suite run.

## Independent root acceptance

Root independently accepted the UI, loader, builder and three-line undo repair after reading their complete source diffs. Its [frozen receipt](root-review-receipt.json), SHA-256 `d7f37de6ba8af22555ab643f5220bf7e4a53e04af8d1ff78bfb302a87c31b87a`, is copied byte-for-byte. It verifies all nine R2 runtime hashes, independently decompresses and hashes both actual boundary downloads, and checks the checked/refusal/repaired lesson bytes. Explicit replacement, retirement of stale file reads, separation of draft-save status from checked state, removable self-links and undo reference repair are accepted with no further finding.

The frozen receipt includes visual inspection of the two original phone images. Root separately reported acceptance after inspecting the R2 phone image in its later handoff message. That later observation is stated here; it has not been added retroactively to the immutable receipt. Final hosted CI and the normal expected-head merge remain the integration gates.

## Reproduce

From a full checkout with Node 20+ and Python 3:

```bash
node --test tests/dependency-graphs.test.mjs
node docs/qualification/author-drafts-integration-6e5752b49b6f/receive-course-draft.mjs "$PWD" /tmp/recallweave-course-draft.json
python3 -B tools/make_author.py --check
```

The [source manifest](source-manifest.json) includes exact preserved modes/blobs for all main paths and the unchanged R2 runtime. [Main recovery](current-main-recovery.json) pins the actual signed Git merge, its course parent and the three recovered blobs. These checks preserve the learner app, lesson validator, model, other courses and all prior receipts. They qualify the explicit offline author draft workflow; they do not add silent persistence or claim learner importer adoption.
