# Independent receiving: membrane transport course

**Disposition: accepted for scientific content, pedagogical contract, and the
pinned importer format.** No content correction is requested. Actual import,
session start, modular build, and standalone browser acceptance remain pending
the current source freeze from importer owner #7.

Repository: `Jacob-Met/RecallWeave`, issue #15. The author owns the two original
course files. This review neither changes the application nor creates an
alternate importer composition.

## Exact source and independent sequence

The reviewed source is author commit
`8cf80eb0bd1dc1c669285789cb1965277770c509`, whose only two added paths are
`courses/membrane-transport.json` and `courses/membrane-transport.md`.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| Course JSON | 16,328 | `b9f0c657dee8d5bd2dd10cfed8d8205b464473a6b46f707c1336363dc170f800` |
| Companion guide | 18,170 | `d5c3136fcf63733e7ecec2f04d887805be1d4e55fbfe84e43fb663b5d79a19b1` |

The [receiving contract](REVIEW_CONTRACT.md), author contract, native format
helper, and importer validator were frozen at 11:17:46 UTC on 8 October 2026,
before the candidate was inspected. The helper produced a view containing only
stems, options, and transfer prompts. The reviewer recorded an
[independent answer and reasoning for every question](independent-answer-key.json)
at 11:34:24 UTC without consulting the authored answers, explanations, or guide.
The [key comparison](answer-comparison.json) followed at 11:36:29 UTC. The guide
was copied and read afterward. Those original records are preserved unchanged.

## Content and learning contract

All **12 independent answers match** the authored key. Under the stated model
conditions, the review found one defensible correct option per item and no
additional defensible alternative among the other 36 choices. All 12 authored
explanations, all 36 guide distractor rationales, and all 12 worked transfer
answers were reviewed after the blind record.

The principal scientific risks are addressed explicitly:

- Bilayer passage is separated from protein-assisted passage. Oxygen versus
  sodium tests charge and the hydrophobic interior; adding aquaporins changes
  water permeability while the question holds the driving force fixed.
- Neutral diffusion distinguishes net movement from continuing microscopic
  crossings. Protein use alone does not imply energy coupling, and the carrier
  transfer uses finite transport capacity rather than inventing ATP use.
- Osmosis questions specify retained particles, dissociation, and initial
  pressure. The guide counts 100 + 100 versus 200, then changes one solute to two
  retained particles for transfer. The plant-cell item allows pressure to oppose
  the concentration effect without requiring final concentration equality.
- The potassium item deliberately leaves opposing chemical and electrical
  magnitudes unspecified. Its sodium transfer supplies forces in the same
  direction. Direct ATP coupling is distinguished from using an already
  established ion gradient, including the time after its maintaining pump stops.

These distinctions are consistent with the publisher's membrane structure,
passive transport, and active transport material in OpenStax *Biology 2e*
[5.1](https://openstax.org/books/biology-2e/pages/5-1-components-and-structure),
[5.2](https://openstax.org/books/biology-2e/pages/5-2-passive-transport), and
[5.3](https://openstax.org/books/biology-2e/pages/5-3-active-transport), independently
retrieved on 8 October 2026. The detailed question-specific reasoning is the
reviewer's conditional analysis in the independent key, not copied textbook
text.

Every transfer changes a condition, representation, or context: exposed bilayer
edges, added channels, removed channels, equal concentrations, a labeled
molecule, carrier saturation, reversed water gradients, dissociation, pressure
balance, exhausted ATP, aligned ion forces, or loss of upstream gradient
maintenance. The guide connects each wrong alternative to the actual option's
misconception and refers to correct answers by text, which avoids binding the
worked answers to shuffled positions. Its fictional-model and learner-level
statements fit the frozen contract. It distinguishes original course authorship
and reuse terms from the referenced textbook and does not claim measured
learning effectiveness or a validated ability score.

## Executed format and cue checks

The native [format helper](review_course_format.mjs) executed successfully once
against the exact owner #7 validator at SHA-256
`621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b`.
The [execution result](format-review.json) establishes:

- Valid UTF-8 and `recallweave-deck/1` admission; 16,328 bytes is within the
  validator's 256 KiB limit.
- Four concepts with three questions each, four distinct options per question,
  and the declared acyclic prerequisite mapping.
- Exact parse/serialize/parse semantic equality.
- Deliberately invalid copies with an out-of-range answer and a prerequisite
  cycle are rejected. The accepted source remains unchanged.
- Answer positions are balanced at three each. A uniquely longest option is
  correct in 3 of 12 items; a uniquely shortest option is correct in 1 of 12.
  Inspection found no consistent length or grammar cue selecting the key.

These cue counts describe this deck. They do not establish psychometric quality
or classroom effectiveness. The review also checked that all twelve guide
answer quotations equal the corresponding JSON option, and that each guide
section supplies three misconception entries and one worked transfer.

## Boundary and handoff

This acceptance concerns exact course content and the pinned owner validator.
The validator was a discoverable #7 contract, not a claim that a final
current-main importer was available. The guide conditions its learner
instructions on a build containing that importer. No browser import, session
start, option shuffling, practice persistence, or export was exercised by this
review. Their final source-bound receiving stays with the owner and root.

Current-main advancement after the author's two-file commit does not change
these content hashes. A final receiving composition should verify both source
bytes before reusing this acceptance. No author source, shared dependency tree,
or remote repository was modified by the reviewer.

The compact [review receipt](review-receipt.json) binds the source, preserved
blind record, guide checks, native result, and supporting evidence hashes.
