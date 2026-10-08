# Independent RecallWeave answer-order review

Reviewer: `/root/local_estate`. Source author/owner: `/root`.
Disposition: **PASS for the exact reviewed source**. No meaningful defect was
found in the order generator or its first-answer/practice integration.

## Source pins and scope

The owner checkout is `/dev/shm/hamon-a3425ebf9874/recallweave-answer-order`,
based on notes packet `eb8e6b64c0935f0c0fc821235e65e759e7759545`.
`source-manifest.json` records fifteen source/artifact pins. Only the four newly
changed source/test files needed for independent review were copied locally;
the existing notes packet was left immutable. Fourteen execution/product files
were rechecked after testing and remained exact matches.

| File | SHA-256 |
| --- | --- |
| `src/answer-order.mjs` | `2344ac31fadadce56d8a054f79057b47a84030b5822ef025d3ad2cafc73b2cef` |
| `src/app.mjs` | `1260280c394a8d6a3688ff9760e37aadbcb3fa04a8b54a3f722193bb37fb3f18` |
| `demo.html` | `d0807801467636dea29fad73b725220ba00681888db730da0497f5d85fa69353` |

The deck, knowledge model, review module, and note serializer match the earlier
independent notes review byte for byte. The exact deck's six canonical answer
indices are all zero; the new display permutation removes that guaranteed
visible-position correspondence without editing any answer key or question.

## Correctness assessment

`orderOptions` implements the descending Fisher–Yates swap over original option
indices. Each consumed random value must be a finite number in `[0,1)`, so the
target index remains inside the current swap prefix. The returned array is
frozen. Empty and one-option inputs need no random draw.

The app builds one permutation per item at initialization and reuses the same
map in practice. Both rendering paths use the permutation value for the option
text and the `data-choice` / `data-practice-choice` attribute. Display letters
use the separate display position. Existing click handlers read the canonical
index from the data attribute; correctness, feedback highlighting, mastery
updates, review, and exported notes continue to use that canonical index.

Returning to the learning trace or rendering the next unanswered practice
question does not call the order generator. Practice therefore retains the
same presentation order, while its answer records remain separate from the
immutable first-answer review.

The build-script diff embeds the order module before the app and removes its
module import. A source/artifact check confirmed the exact helper is embedded
in `demo.html`, with no remaining order-module import or asynchronous deck fetch.
No browser behavior was exercised in this independent review.

## Focused controls

Runtime: Node `v24.19.0`. The four authored answer-order tests and one independent
control passed, for **five unique passing tests**. The full 23-test suite and
derivative browser suites were not repeated.

The independent control enumerates all 24 bounded random-draw paths for four
options. They produce 24 unique complete frozen permutations. For each
permutation, all four canonical answer keys are checked against the first
displayed choice. Repeated reads of an unanswered practice item preserve the
same state; a corrected retry records the canonical correct option and leaves
the original choice and correctness untouched.

The portable version of that same independent control was rerun once after
changing only its import configuration to accept an explicit checkout. It
passed against the exact owner source. This is one control, not another unique
test or a production change. Both run logs are retained.

```sh
RECALLWEAVE_REVIEW_SOURCE=/path/to/exact/recallweave-checkout \
node --test exhaustive-order-control.test.mjs
```

The author's new tests can be run directly from that checkout with
`node --test tests/answer-order.test.mjs`.

## Handoff

The root owner received the independent PASS and source pins. The existing
notes receiving evidence remains unchanged; this packet covers the new
answer-order source only. Actual keyboard/browser acceptance and any native
publication retain their own evidence and attribution. No deployment or
learning-efficacy claim is made by this review.
