# Saved absorbing-walk output: explanation and one prompt proposal

[Read the explanation](receiving.md). It interprets the actual saved fair-walk experiment and the separate ordinary study-notes download from [RecallWeave #206](https://github.com/Jacob-Met/RecallWeave/issues/206). It makes no new model or learner run.

The selected experiment is the fair walk on states0..3 starting at1, selected step3, saved horizon4. At step3, cumulative absorption is7/8 while newly arriving mass is1/8. Truncated expected time is7/4, eventual expected time is2, unconditional expected excess is1/4 and conditional remaining time is2. The explanation distinguishes these quantities and connects them to the two unchanged saved artifacts.

The notes record the controlled receiver's11/12 first answers and1/1 practice retry. They retain unwritten reflections and explicitly label mastery percentages as model state. They do not measure a human learner's ability or teaching efficacy. The R1 saved export remains distinct from its later stress failure and the separate R5 ordinary completion.

## Exact existing inputs and independent reading

The [experiment JSON](inputs/fair-step3.json) is13,024bytes/SHA256708ca16c87d292cf9c86a39bf7befed6011579f7694afb462829aa74447a907b. The [study notes](inputs/study-notes.txt) are8,373bytes/SHA256c040c1de2c46220553c2de8706d656caad64087ed1f0eb817c0b02dece3dc17d. Their original archive paths, full provenance and unchanged hashes are in the [intake](provenance/archive-intake.json).

Runtime received the exact1,032,813-byte independent archive and checked all194 manifest payloads,3,164,498bytes, plus the exact manifest member. [The full member audit](provenance/member-audit.json) preserves that result. Root received and independently hashed the complete audit and the two actual files; root did not repeat the full archive decoding. The archive's0644 permissions are deliberate sealing normalization of source0664 modes, not preserved source modes.

The [independent reading](reviews/independent-saved-output-reading.md) was frozen before draft exposure. The [draft review](reviews/independent-explanation-review.md) found no material mathematical or provenance issue and proposed one heading clarification. Final receiving.md is8,174bytes/SHA256fa969782c64e73727d3111f0acdbea9e225f875889165681e11e89b4206d6563. Its sole heading change from the [8,183-byte original draft](retained/explanation-v1.md) inverses exactly. Root read the complete final explanation and both saved inputs.

## Concrete source-owner proposal

The saved learner order exposes one context-dependent prompt: item9 says “that same fair walk” immediately after item8's different0..6 example. The original source array happened to place a0..3 question before it. A self-contained prompt should identify its own state interval.

Replace only:

> For that same fair walk starting at 1, what is the probability of first reaching endpoint 3 at step 2?

with:

> For a fair walk on states 0..3 starting at 1, what is the probability of first reaching endpoint 3 at step 2?

The [exact original course](proposals/before/absorbing-walk.json), [proposed complete course](proposals/absorbing-walk.json), [one-span proposal receipt](proposals/first-right-prompt.json) and [independent adoption review](reviews/prompt-adoption-review.json) are included. The proposed course is9,425bytes/SHA2565993a650b314e40d73eafb474e28e5a8e8bfdcfb9e23aa759eb14ae203ec1ecb, blob2e1aa8332e23fb552a34021a6da431452882af48. The exact inverse restores the original9,418bytes/SHA2567f71684445984c744c9dd81f8538be2ea2e9f09c97435f658a4353a20a6a2e66, blobbdf9771f3bdc1eae588a337c2c3c25460bedd4bf.

Every other parsed field and source byte is preserved: options, answer index3/value1/4, explanation, transfer, prerequisites and order. The guide already specifies the fair0..3 walk and needs no change. There is no numerical model repair.

This proposal is for retained source commit8b4b61e23d4d80fce607e315caee31e98a4d9183 / treebfc313d06faceba257440691fe1c4370180ff31f, branch receiving/absorbing-walk-db371a37f4c8. The canonical course is absent on the current main used for this documentation commit. The proposal is intentionally under this new docs prefix; no canonical course file is added or changed here.

Actual owner adoption must update the canonical JSON, regenerate its embedded-course lab using the unchanged builder, and produce an identified successor portable ZIP with its two affected manifest rows updated. JSON-only adoption would leave the lab's real Download course output stale. The original learner, guide, model, UI/template, PLAY instructions and maintained tests/checkers need no source change. The derived-artifact dependency review is static; no new lab, archive or receiving pass is claimed. Keep previous packages, downloads and all positive/negative receipts as historical evidence.

## Ownership and publication

The existing estate-db371a37f4c8/longwater_author_recovery and longwater_receiving_recovery retain source, package and runtime ownership. The existing attachment request6074722825 is unchanged. Root's new claim is [comment6077334467](https://github.com/Jacob-Met/RecallWeave/issues/206#issuecomment-6077334467), covering only this absent documentation prefix.

[manifest.json](manifest.json) binds all13 exact payload files and the current documentation source base. This commit adds16 files, preserving all2,933 inherited leaves and modes from mainec07bf3989132130759e5c00c6cb02eef19709d3 / treea839b6877bf2824f134443829d1ce62e1bd79e50. It changes no existing owner file. The original owner-directed proposal text is preserved in retained/ for provenance; the current adoption comment will cite this actual publication.

[workflow-preflight.json](workflow-preflight.json) binds all five complete unchanged workflow bodies. Their push events select main only and other events are pull_request; no issue/comment/create subscriber exists. This non-main docs publication opens no PR, updates no main, launches no Actions and releases no native hold. Exact commit/tree/branch and all-event Actions readbacks belong in the subsequent acceptance comment.

This addendum delivers a readable interpretation of already received output and a concrete owner-ready wording fix. Installed or regenerated-package adoption remains separate.
