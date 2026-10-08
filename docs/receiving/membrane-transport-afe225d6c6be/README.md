# Membrane-transport course receiving

The contribution adds two optional course files: `courses/membrane-transport.json` and `courses/membrane-transport.md`. The twelve original questions cover four concepts, and the companion guide supplies every answer, all 36 distractor rationales, and twelve worked transfer answers. Source ownership is recorded in [RecallWeave #15](https://github.com/Jacob-Met/RecallWeave/issues/15) and [the central claim](https://github.com/Jacob-Met/hamon/issues/140#issuecomment-6058605660).

## Source and scope

- Discovery and pre-writing contract baseline: `a64369f84fae4cfd0b81aa3878cc11e2fa8d298c`.
- Actual source parent: `d14edbb014b3b4ad92c2d016f7bc1e573bb93324`, which already includes the original trace-restore contribution.
- Frozen two-file course commit: `8cf80eb0bd1dc1c669285789cb1965277770c509`; tree `09aded8fa354aa41e881abc62067ede7991014ca`.
- Deck SHA-256: `b9f0c657dee8d5bd2dd10cfed8d8205b464473a6b46f707c1336363dc170f800`.
- Guide SHA-256: `d5c3136fcf63733e7ecec2f04d887805be1d4e55fbfe84e43fb663b5d79a19b1`.

The source commit changes only those two files. It does not change the learning model, bundled energy lesson, application, importer, authoring tools, trace restore, builder, or standalone demo. Later commits under this receiving directory contain qualification only. Publication can add these paths to a newer main without replacing existing owner contributions.

`content-contract.json` was frozen before the candidate wording. It specifies learner level, concept coverage, balanced answer positions, scientific assumptions, and receiving boundaries. Its discovery baseline is historical; it does not assert that an importer existed on that commit.

## Native format and learning-core result

The exact read-only importer-owner validator at SHA-256 `621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b` admits the file, returns frozen session content, and serializes it back to identical bytes. Its unchanged snapshot is retained as `reference/deck-validator-owner.mjs` so this historical format check can be reproduced. This file is reference evidence and is not installed into the application.

`verify_course.mjs` then uses the actual source parent's unchanged knowledge, answer-order, review, practice, and study-notes modules. It executes all twelve questions through the adaptive selector in three changed-input sessions:

| Initial choices | First-session result | Separate practice result |
| --- | --- | --- |
| All correct | 12 of 12 correct | No missed questions |
| All incorrect | 0 of 12 correct | All 12 corrected on retry |
| Alternating outcomes | 6 of 12 correct | Six retries, three correct and three still incorrect |

All questions are exhausted exactly once per first session. Display positions map back to the canonical choice; every prompt, first answer, correction, explanation, transfer, and attribution appears in the corresponding UTF-8 study notes. Practice leaves the first answers and original model state unchanged. The all-correct and all-incorrect inputs produce distinct model states in every concept. These are synthetic inputs to the real local core, not learner outcomes or a validation of the educational model.

The report and five actual generated note files are under `native/`. The baseline witness establishes that neither course file exists in the actual parent and verifies the learning-module bytes against that parent. The initial helper run completed its course flows but failed because it assumed one Git error-message wording for that absence. `native-harness-initial.log` preserves the failure. The helper correction verifies the exact baseline tree; neither course file nor a production module changed to accommodate the helper.

To reproduce the bounded native check from the repository root with Node 18 or newer:

```bash
node docs/receiving/membrane-transport-afe225d6c6be/verify_course.mjs \
  . \
  docs/receiving/membrane-transport-afe225d6c6be/reference/deck-validator-owner.mjs \
  /tmp/recallweave-membrane-native
```

Use an ordinary writable output directory. This command reads the two course files and four learning modules from the supplied repository, imports the explicitly supplied validator, and writes its report and generated study notes. It requires the actual source parent commit to be available in Git so the baseline comparison can run. It installs nothing and makes no network request.

`format-initial.json` also records all four option lengths per item, three items per concept, and three canonical answers at each of four positions. Only three correct options are uniquely longest; the key does not use a uniform position or length rule. These counts are cue checks, not a substitute for the independent content review.

## Independent content review

The independent reviewer froze its own criteria before inspecting the candidate. It then solved all twelve items from a blinded view that exposed only prompts, options, and transfer questions. The independent answers were recorded before opening the key and explanations. All twelve matched. The subsequent review checked the guide's 36 misconception rationales and twelve worked transfer answers against the stated idealized assumptions and the primary publisher references.

The independent receipt and its selected artifacts are under `independent/`. They bind the exact deck and guide above. No course changes were requested. The independent reviewer also checked the unchanged owner validator's format admission and round trip, with invalid answer-range and cyclic-prerequisite controls.

## Open receiving gate

**Final browser integration remains pending the existing owner of [importer #7](https://github.com/Jacob-Met/RecallWeave/issues/7).** The validator snapshot used here is discoverable owner source, not a frozen current-main importer composition. An older interim importer page is not evidence that this course has been received in the final application.

The intended remaining checks are actual local file selection, preview, explicit session start, all twelve questions, review and separate practice, and a real study-notes download in both the finalized modular app and the standalone demo. These must use the importer's final current-main composition and fresh disposable browser state. No such browser acceptance is claimed by this packet. The course is suitable for a draft source review while that dependency is unresolved.

Scientific review does not establish learning efficacy, accessibility of an untested final importer flow, or a validated assessment. There was no live account, hosted learner data, browser profile, or runtime deployment involved in the checks here.
