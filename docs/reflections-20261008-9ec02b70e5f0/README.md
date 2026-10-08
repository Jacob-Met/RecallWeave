# Learner reflections and trace restoration

The notebook adds editable, unscored writing beside the existing question and
Apply-it prompts, includes the latest text in study-notes downloads, and retains
writing through review and practice. A fresh session clears it. Restoring a
compatible saved trace replaces first answers and practice while keeping the
notebook already in the tab; the archive imports no other notebook.

## Current source and receiving

The final lesson runtime is qualified on main
`5ce520a778da04605f5fa610fb1ad110ffe52b99`. Its app is SHA-256
`b24889341a7e4bf160ce29c2a746150639002786bca3dee68e017bf36dbb1661`
and standalone demo is
`40ce4658f17df07a945c49cd425045c89602107b58fefd22b620d667e8cf9c65`.

- [Current content composition](current-content-receiving-5ce/README.md): 56 native tests passed, zero skips; the rebuilt demo contains the exact current lesson content. The stale-content counterexample is retained.
- [Independent current receiving](independent-current-content-5ce/README.md): six actual browser checkpoints, six notes downloads and two trace downloads. It verifies edits and clearing during a pending preview, canceled preview, wrong-course refusal with reused question IDs, confirmed restoration, next-item practice and fresh reset. All 13 runtime pins are unchanged.
- [Final receiving-parent comparison](publication-parent-d22.json): publication is composed over main `d22b5ef7c641fc1726ae5b774383f8e6527d73e7`. All 13 affected runtime before-images match the qualified parent. Newer authoring and additional-course/lab contributions are retained from that complete parent. Only the README needs a new three-way composition; the same three reflection documentation hunks remain.

These are local source and browser results. They establish neither learning
efficacy nor persistence through reload. No account, upload, synchronization,
trace-format change or hosted deployment is added.

## Preserved earlier evidence

- [Earlier trace composition](current-main/README.md) fixes its source at `4775af91`: 23 affected native tests, five authored browser checkpoints and six downloads.
- [Independent attempts on that earlier source](independent-current-main-4775/README.md) are transport-blocked: two original keyboard-acknowledgement timeouts, zero completed coupling checkpoints and one validated source trace. Source inspection does not turn those attempts into passes. Shared memory pressure was observed; its causality was not established.
- [Original-main qualification](original-main/README.md), [original independent receiving](independent-original/README.md), and [PR #12 independent receiving](independent-pr12/README.md) retain their exact sources and successful and unsuccessful runs.
- [Earlier publication index](current-main/publication-index.md) and [prior PR #12 receipt](pr12-receiving/source/docs/reflections-20261008-9ec02b70e5f0/README.md.source) retain their original status wording.

`preservation-index.json` maps every file in the frozen 96-file PR #12 packet
and its earlier 33-file qualification to exact archived paths. Later receiving
receipts remain separate. Historical source hashes and local paths are retained
as provenance; none are relabeled as executions on the final publication parent.
