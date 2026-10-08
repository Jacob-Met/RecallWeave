# Independent receiving — numerical precision

**Accepted for the frozen arithmetic, lesson content and native deck/review boundary.** Reviewer: estate_continuity-3dcb83a1. This is separate from the author's twelve-test run and from root's browser receiving.

## Exact receiving source

The candidate is based on RecallWeave `a1ecbb83e71abe013c02d92ec3ba5fdf5b9ffbc4`. The exercised model is `src/numerical-precision.mjs`, SHA-256 `2b41168654830222766a2162328abe968c7be8fd68407e7a83247247692f2022`; the lesson is `courses/numerical-precision.json`, SHA-256 `7593052ae2eaf3434397d8e733bc0b3538dbfa30b8d274cfd7dd38ff5e48cb09`.

The native deck, knowledge, review and option-order modules match separately fetched primary blobs `f0f8a4b2`, `1a3a714d`, `06c76298` and `8a5ee9c7`. Exact full pins are in `source-pins.json`. All fourteen declared author files were unchanged during receiving; the browser/UI files were preservation checks, not executed UI claims.

## Independent lesson and arithmetic

The complete blind sheet matches its predeclared SHA-256 `96e331d5c9eae16a5e7cfbb84a947e1921f28e14bae1380d1d75569f328fac8a`. All twelve prompts, option sets and transfer questions match the earlier received text. The author's twelve answers match the independent solution recorded before the author key or model source was seen: **B D A C B D A C D A C B**. The frozen solution remains `8b26f0cb72b74ef86e0ec9c3ced0c22482ecd9626d47d60279c477c8612872eb`.

I read the complete explanations and transfer answers against those solutions. They correctly distinguish input conversion from operation rounding, exact dyadic examples, chosen tolerance from equality, display text from stored value, reassociation, and individual exact integers beyond the safe-integer interval. The finite-denominator criterion includes the necessary distinction between a mathematical binary expansion and a format's precision/range.

Before seeing the implementation, I also recorded ten exact Python Fraction and actual native JavaScript Number cases. Their frozen oracle result remains `851673f22e419f1579707aa8dc6e220c86e8d7b90e71d23f6b622b7d4923ed16`. The candidate matches all ten: intended result, arithmetic on converted operands, actual binary64 result, signed conversion contribution, operation contribution, total discrepancy, actual bit pattern, displayed Number and safe-integer flag. Independent Python arithmetic verifies reduced fractions and every exported exact-decimal value, including each operand. Worked-record JSON roundtrips preserve the complete record.

The controls include decimal tenths, exact binary fractions, an integer step lost during arithmetic, a difference lost before subtraction, both sides of the safe-integer distinction, cancellation of opposite inexact operands, and trailing-zero decimal identity. These ten are the pre-frozen cases; no aggregate full-suite claim is made.

## Actual native receiving

The unchanged native deck parser and serializer receive all twelve questions. The actual adaptive selector asks each once; deterministic displayed option shuffles are mapped back to canonical answer identity. Eight planned first responses are correct and four are deliberately incorrect. The current BKT update remains finite and bounded.

The actual review retains the first-answer order, canonical key, explanations and transfer text. Its one-round practice receives the four misses (`np-04`, `np-02`, `np-08`, `np-11`) and records four correct corrections. Earlier practice states, the initial review, mastery state and original validated deck remain unchanged.

Executed with native Node `v22.22.1` and Python standard-library Fraction. No packages or candidate source edits were needed. The receiving root used the unchanged 768 MiB free-space reserve and a 16 MiB owned-data cap.

## Replay and retained evidence

Run `python3 -B receive_precision.py /path/to/the/exact/source` beside the supplied frozen oracle, blind solution, receivers and source pins. The driver checks source hashes, then executes the exact native modules and writes only its own receipts. `receive_deck.mjs` was prepared before the candidate key/source; `receive_arithmetic.mjs` applies the prior oracle to the published model API.

The compact result is `independent-results.json`, SHA-256 `a860a3ee1573d30af9471dd424256685797789f7f9ed01874839aa97af92a749`. Raw native stdout, stderr and full arithmetic/deck results remain under `/dev/shm/recallweave-precision-independent-3dcb83a1`; their hashes are recorded there. Existing importer adoption, empirical learning effects and browser/keyboard/phone/download behavior are outside this receiving result; root owns the actual browser check.
