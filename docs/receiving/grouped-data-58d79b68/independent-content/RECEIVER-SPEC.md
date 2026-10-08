# Independent grouped-data receiver — blind specification v1

Recorded before reading the root implementation or course answer key.
Source ownership: root under RecallWeave #27, HAMON #140 comment 6059447126.
Contract SHA256: 6314d6fa5e886305de6bf1a833049cffe6b591a6b09b1c50d4fa02b94cbc974d.
Independent review claim: 4026 / cev_11edba9349974893bf0f7516.

## Numerical oracle

The receiver uses reduced BigInt fractions and signed cross-products. Its fixture shape is private to this review; a later adapter may translate the public product output but must not modify these fixtures or derive expectations from product code. Fractions are serialized as numerator/denominator strings. A null fraction means unavailable, never zero. Numerical fixture expectations are frozen in numerical-expectations.json.

The strict reversal fixture has A newcomers 1/10, A experienced 81/90, B newcomers 16/80, B experienced 19/20. B leads in each group; A leads in the pooled result (41/50 versus 7/20). At an experienced reference share of 50%, the common-mix result favors B (23/40 versus 1/2). A pooled denominator is 100, B pooled denominator is 100; group weights differ 10%/90% versus 80%/20%.

Separate fixtures distinguish pooled ties, one tied subgroup, opposing subgroup directions, a missing subgroup comparison, and genuine 0% rates. All comparisons retain their independent directions; no label is permitted to hide a tie or missing support. A reference mixture never substitutes for the observed pooled result and cannot change whether an observed strict reversal exists.

The two rounding controls are deliberately different:
1. A tiny strict reversal has all four subgroup and both pooled rates round to 50.00%. A is 99999/200000 and 500001/1000000; B is 499996/1000000 and 100001/200000. B strictly leads in both groups but A pooled 1/2 exceeds B pooled 199999/400000.
2. Reference precision cancellation: let n=999997. A rates are (n-1)/n and (n+2)/(n+3); B rates are n/(n+1) and (n+1)/(n+2), weighted equally. Pooled totals are equal and subgroup directions oppose. The exact common-mix B-A difference is (2n+3)/(n(n+1)(n+2)(n+3)), positive although ordinary double-precision weighted rates can compare equal. This tests the contract's exact comparison requirement beyond safe numeric cross-products.

Missing support controls cover both ends and the interior of the reference interval: a missing newcomer rate is irrelevant at 100% experienced but makes 0% and interior references unavailable; a missing experienced rate is irrelevant at 0% but makes positive experienced references unavailable. An entirely empty option has no available pooled or reference rate. The other option remains reportable. A real zero numerator with positive denominator remains an available rate.

Metamorphic controls use a 37% reference share: exchanging A/B reverses every non-tied available direction but preserves reversal status; exchanging both group columns and complementing the weight preserves all pooled/reference fractions; multiplying every A count by seven preserves A rates, A group weights and all comparison directions while accurately changing its counts.

## Input and UI receiving boundaries

invalid-drafts.json describes each of the eight count fields independently, including empty and whitespace-only drafts, malformed text, negative and fractional values, nonfinite overflow, counts over one million, and successes exceeding the paired total. Reference weight has its own invalid controls. Do not silently sanitize invalid draft values into zero or keep the previous valid report/export current.

The receiving adapter must distinguish raw edit validation from a numerical kernel that accepts already validated typed counts. The contract does not fix lexical policy for numerically integral forms such as 1.0 or 1e3; these are not predetermined rejection tests.

Actual browser receiving should perform a valid → blank → repaired keyboard edit without blur being necessary, observing immediately unavailable output and downloads during the blank interval. Editing the reference share must leave all eight counts and observed results unchanged. At zero support, the numeric zero and unavailable cases must remain textually distinct. Downloaded data must identify the current weight and counts and be independently recomputable; course download must match original course bytes.

This numerical/content lane will not modify importer, learner state, authoring, browser owner source or accounts. Full learner-import admission is outside this receiving gate and remains dependent on the existing importer owner.

## Lesson review

Prompts/options will be answered blind before reading indices or explanations. The sealed answer record will show the calculation or premise that excludes each tempting alternative. The subsequent keyed comparison will check causal overreach, unspecified denominators or reference weights, units, rounding, unique correct answers, plausible distractors, transfer conditions and answer-length/style cues. Passing numerical and content receiving is not a claim about learning efficacy, hosted CI, publication or integrated learner-import acceptance.
