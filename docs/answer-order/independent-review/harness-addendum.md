# Final answer-order browser evaluator addendum

Reviewer: `/root/local_estate`. Disposition: **PASS for the final evaluator
changes and their evidence linkage**. No test or browser run was repeated for
this addendum.

The original independent source review remains immutable, with receipt SHA-256
`a045124fada8ce590f85fa7cd36bf620f51fabb455a84f292f12c527828c095e`.
All fifteen files in its source manifest still match. This addendum changes
no product, module, app, demo, model, deck, or unit-test qualification.

## Authoritative final evaluator pins

Only these two evaluator paths receive final receiving pins. A receiving
comparison must use these pins for the evaluators and retain the original
review's pins for its product/test files. The original independent manifest
did not list browser evaluators; this addendum supplies their final pins and
supersedes earlier evaluator captures elsewhere in the receiving packet.

| Path | SHA-256 | Git blob |
| --- | --- | --- |
| `tools/check_browser.mjs` | `d6b080ba05cf9b35f04c76314c4b851c0569498e969ee6fbaab9bc29d1591ee3` | `2555b694dd967831aa71b234aa4c1586d304dc74` |
| `tools/check_notes_browser.mjs` | `e1e4130a9f8f6796a752e92e38a8ce285ccce2a883b6ca06d757d9974cad922c` | `7ed3ad1229858ee8e97259aebe13475ad979710b` |

The complete two-file diffs against notes base `eb8e6b64` were read. They adapt
keyboard selection to canonical indices, verify displayed text/letters and
practice-order reuse, set test-only random seeds, record per-item orders, and
capture the first question. Both final evaluators compare the complete
question map by item ID when checking changed session input.

The final report shows why the corrected assertion matters: item `p1` has the
same permutation under seeds 41 and 83, while `r1`, `p2`, `a1`, `x1`, and `g1`
change. A collision for one question is valid. The retained earlier single-item
assertion failure is historical evaluator evidence, not a product defect.

## Linked positive and negative evidence

| Production source and evaluator | Result | Verified scope |
| --- | --- | --- |
| Unchanged notes parent + final evaluator | Intended failure after 12 passing checkpoints and 5 downloads | Independent worker run; exact full-map feature-absence assertion; no page errors; parent/evaluator unchanged |
| Answer-order candidate + final evaluator | 15 passing checkpoints and 6 downloads | Author's completed browser run; all 9 reported source hashes and 6 saved-file sizes/hashes checked against current artifacts |

The notes evaluator's final SHA-256 exactly matches the evaluator used in the
independent negative control. Both report versions are preserved by their
owners; this addendum verifies their linkage without asserting a new browser
execution.

- Candidate report, `docs/answer-order/browser/browser-report.json`:
  `4ec03e27d35cf1b589163ca84ddc46d8a9435235c06b048c6b8758ce4bc2fee0`.
- Independent parent-negative report:
  `d0e612a6fdd718a8f407e261d4e64b8c77d7924e5d5f29032bf813d01c2ec4e6`.
- Retained historical single-item evaluator-failure report:
  `b1e6a5746fed90cfecaebd26ce8feec3e41b475841a01a0dcd7afa88ea2c8892`.

`harness-addendum-verification.json` contains the exact final and base evaluator
pins, report identities, and changed-item set. `harness-addendum.json` is the
machine-readable final receiving addendum. Original source-review and negative
evidence files were not edited.
