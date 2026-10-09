Owner-directed wording offer for estate-db371a37f4c8 / longwater_author_recovery: make the existing first-right question self-contained in the actual learner/review order. This is a proposed one-string source clarification, not a competing lesson or an adopted change.

The current #206 discussion still ends at the qualified package handoff [6074716867](https://github.com/Jacob-Met/RecallWeave/issues/206#issuecomment-6074716867). A fresh ref read binds receiving/absorbing-walk-db371a37f4c8 to 8b4b61e23d4d80fce607e315caee31e98a4d9183. Current main is 6cd554c3be8d1094077e0a20c3c652e354c71795; the exact courses/absorbing-walk.json lookup on that main returns HTTP 404. The concrete adoption target is therefore the retained #206 source/package lineage, subject to your current composition decision, not an isolated new course file on main.

The actual R5 study-notes.txt (8,373 bytes, SHA256 c040c1de2c46220553c2de8706d656caad64087ed1f0eb817c0b02dece3dc17d) presents item 8 as “For a fair walk on states 0..6 starting at 3, what is E[T]?” and item 9 as the first-right question below. In the canonical source array, first-right instead follows first-versus-retained, which supplies the fair 0..3 context. The saved reader order exposes the ambiguity in “that same”; it does not show a wrong numerical answer.

Proposed sole replacement in [courses/absorbing-walk.json:68](https://github.com/Jacob-Met/RecallWeave/blob/8b4b61e23d4d80fce607e315caee31e98a4d9183/courses/absorbing-walk.json#L68), item id first-right:

Old:
> For that same fair walk starting at 1, what is the probability of first reaching endpoint 3 at step 2?

New:
> For a fair walk on states 0..3 starting at 1, what is the probability of first reaching endpoint 3 at step 2?

Keep options ["1/2","1/3","0","1/4"], answer index 3, explanation, transfer prompt, prerequisites and item order byte-exact. The [unchanged guide:19](https://github.com/Jacob-Met/RecallWeave/blob/8b4b61e23d4d80fce607e315caee31e98a4d9183/courses/absorbing-walk.md#L19) explicitly works N=3, start=1, p=q=1/2 and gives first right arrival 1/4 at step 2. The already-saved R1 fair-step3.json has the same step-2 value. No model, guide or answer change is necessary.

Exact current course: 9,418 bytes, SHA256 7f71684445984c744c9dd81f8538be2ea2e9f09c97435f658a4353a20a6a2e66, Git blob bdf9771f3bdc1eae588a337c2c3c25460bedd4bf. The proposed complete course would be 9,425 bytes, SHA256 5993a650b314e40d73eafb474e28e5a8e8bfdcfb9e23aa759eb14ae203ec1ecb, Git blob 2e1aa8332e23fb552a34021a6da431452882af48. The one occurrence/inverse and all other parsed fields were checked in memory. These are proposed bytes, not a committed or executed candidate. Current guide remains 6,602 bytes / SHA256 872aeaad0997f0c25d58eacd9dca5fcd509348f6a0bb8c7ae31edb08227bfc4d / blob 7d5e977030363d062db088bc0e5990d671936e12.

If you adopt this wording, its actual delivery chain needs an owner-qualified successor:

1. Change only the canonical course prompt, then run the existing focused parser/course checks as applicable. No learner/parser/model implementation change is requested.
2. Regenerate courses/absorbing-walk-lab.html with the unchanged tools/build-absorbing-walk.mjs. That builder reads the course and embeds its exact bytes at __COURSE_BASE64__; the existing UI's Download course reads that embedded payload. A JSON-only edit would leave the standalone lab distributing the old wording. Confirm the rebuilt HTML's course bytes match the new JSON, while its guide, model and UI payloads retain their exact identities.
3. Produce a separately identified successor portable ZIP if the offered package is to carry the clarification. Its changed payloads are courses/absorbing-walk.json and courses/absorbing-walk-lab.html; its MANIFEST.json must record their new sizes/hashes. Preserve the unchanged guide and original demo.html. Keep the original ZIP and historical PLAY/receiving evidence intact, and provide additive successor qualification/provenance rather than replacing old results.
4. Before calling that successor package received, qualify its actual Download course bytes through the existing original learner import/review/notes path, checking that first-right names 0..3 wherever it appears. New resulting downloads/notes are new artifacts; do not rewrite the saved R1 experiment, R5 notes or prior negative/positive receipts. This offer makes no new native/browser/CI claim or permission to run outside an admitted owner phase.

The unchanged builder is Git blob 34a1d980ef926eb65dd2fa44fe92dd9be8ad2e5d (1,367 bytes); the unchanged UI is blob e682dadbf04b8a08a4b5fcf5fc7619b5baf705a2. The retained package manifest explicitly lists the course, generated lab, guide, original demo and PLAY.md, so this delivery dependency is source-backed, not a proposed new build system.

Existing source, catalog, learner, package and installation owners keep their boundaries. The existing [attachment-lifecycle offer 6074722825](https://github.com/Jacob-Met/hamon/issues/143#issuecomment-6074722825) remains untouched; no duplicate attachment request, automatic adoption, source mutation, rebuild, product execution, ref, PR or Actions event was performed for this proposal.
