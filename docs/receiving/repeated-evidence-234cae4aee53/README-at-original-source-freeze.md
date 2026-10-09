# Repeated evidence course: source and original blind review

This packet preserves an original twelve-question course and worked guide for an introductory probability learner comparing a second report with a copied or dependent report. It changes only the two new course files and a 685-byte README discovery addition. The main-source read was `698902f9c9c1d5c5023092b85b3632a7cb7a01ed`; root handles complete source-branch composition separately.

Scope was reserved in [HAMON #140 comment 6073270116](https://github.com/Jacob-Met/hamon/issues/140#issuecomment-6073270116) at 02:52:25 UTC on 9 October 2026. No ref, PR, merge, GitHub Actions run or native product invocation is part of this source packet.

## Learner product

- [Importable twelve-item course](../../../courses/repeated-evidence.json), four concepts with three questions each.
- [Worked guide](../../../courses/repeated-evidence.md), complete fictional count tables, every answer and every transfer derivation, with primary MIT mathematical references.
- The README addition links these files and directs learners to the existing **Bring your own lesson** preview and explicit **Start this deck** flow.

Every alternative population has 16,000 equally likely files, including 1,600 needing rework and 14,400 not needing rework. Each report individually flags 3/4 of the first class and 1/4 of the second. Those unchanged summaries give a first-flag posterior of 1/4 in every model. Their different joint behavior gives both-flag posteriors of 1/2, 1/4 and 2/11. The counts are original teaching inputs, not empirical data.

The guide refers to stable question IDs and answer content because the learner shuffles choices. Imported text and its prerequisite graph use the unchanged `recallweave-deck/1` schema.

## First independent outcome, preserved

The solver froze its method at 02:38:00 UTC before receiving questions. It verified the complete 8,062-byte question-only packet and froze all twelve independent derivations at 02:50:34 UTC before seeing the author's key, feedback or guide. All intended answer choices agreed with the author key.

The first review found a real notation ambiguity in `re-r1`: the copied-report prompt ended “After both reports flag, what is P(D)?” while its unconditional prior was also a choice. Before this candidate source freeze, the author changed only that query to “What is P(D | both reports flag)?” The original question packet, original finding and all first derivations remain unchanged here. The choice order, intended answer and other eleven prompts did not change.

The author's feedback and worked guide were exposed only after the blind solve. Their separate post-blind review remains pending in this packet; it must not be inferred from the blind solve.

## Exact content identities

| Path | UTF-8 bytes | Git blob |
| --- | ---: | --- |
| `courses/repeated-evidence.json` | 15,424 | `6184cb6da8279c46d1c6f34b1c3f8c8f5f9108a1` |
| `courses/repeated-evidence.md` | 16,224 | `81f3aa66081933e66f285b535de1ddb88bf7baab` |
| `README.md` | 52,025 | `3776a8ae223a1c0edc4b53aa01c44dd19ce3ca63` |
| `docs/receiving/repeated-evidence-234cae4aee53/independent/questions-original.json` | 8,062 | `01ea490da68ce9f6ce58885a49d7006f019889bf` |
| `docs/receiving/repeated-evidence-234cae4aee53/independent/blind-method.json` | 3,149 | `8c25002bcf5b0be88adc472f18067061b0c23bad` |
| `docs/receiving/repeated-evidence-234cae4aee53/independent/blind-review.json` | 10,693 | `6c84d63c479d41399470ec24de6f59a472a26bb5` |
| `docs/receiving/repeated-evidence-234cae4aee53/source-freeze.json` | 9,170 | `ccd5071f133cc87c3c9e5137ef8c4a58d5c1e8ca` |

[source-freeze.json](source-freeze.json) records SHA-256 values, exact models, source bounds, answer agreement and the documented correction. The original evidence is [blind-method.json](independent/blind-method.json), [questions-original.json](independent/questions-original.json) and [blind-review.json](independent/blind-review.json).

The README candidate is the complete preserved 51,340-byte original plus a 685-byte insertion before “Review and practice,” totaling 52,025 bytes. Removing that insertion reproduces every original byte. The remaining existing courses, labs, parser, learner, model, selector, importer, catalog, downloads and builders are outside this contribution.

## Validation boundary

The author inspected the exact unchanged `src/deck.mjs` blob `f0f8a4b234489c2388f427633f548d56c6ed4c03` and the existing Probability foundations schema example. Data-only source checks confirm twelve unique item IDs, four fully covered concepts, four distinct options per item, acyclic earlier-concept prerequisites and three canonical answers at each option position. The 15,424-byte JSON is below the parser's 262,144-byte limit. These are source checks; the actual native `parseDeck` has not been invoked for this course.

Native import, explicit Start, first-answer feedback, completed review, separate missed-item practice, actual study-note downloads and focused keyboard/390px reading remain pending. A receiving owner must accept the separately scoped placement before any native work. This packet does not claim that an existing owner has admitted the new course or that its learning efficacy has been measured.
