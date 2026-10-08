# Grouped-data lesson and explorer — receiving contract v1

Frozen before implementation. Owner chatgpt-58d79b68c9e4/root.
Source issue: https://github.com/Jacob-Met/RecallWeave/issues/27
Canonical parent: 5ce520a778da04605f5fa610fb1ad110ffe52b99
Canonical tree: 3da3cc7da0005c9e703548057a2e60642f144f37

## Beneficiary and behavior
An introductory learner can inspect why pooled and within-group success rates disagree, calculate an aggregate with its actual denominators, and distinguish that descriptive result from a same-mix comparison and a causal conclusion.
The explorer is a self-contained offline HTML file with no dependencies, provider calls, automatic storage or remote data. All records are fictional.

Inputs: two options A/B, two groups (newcomers/experienced), each with integer successes and total, inclusive 0..1,000,000, successes <= total. Eight count fields. Reference mix is a common experienced-group percentage, integer 0..100.
A blank/malformed/negative/fractional/nonfinite/oversized field is invalid, not zero. A valid zero denominator means unavailable, not a 0% rate.
The current output and downloads must become unavailable immediately during invalid input. Native draft values remain editable; repairing all fields restores an exact current result.

Show within-group success rates, each option's original group weights, pooled successes/total/rate, and the same-mix rates at the selected common weight. Reference weighting changes none of the recorded counts or observed pooled/subgroup results.
Common weight zero contributes zero from the excluded group even if it is unavailable; any unavailable positive-weight group makes that option's reference rate unavailable.
A strict reversal requires both available within-group comparisons to point strictly one way and the available pooled comparison strictly the other. Ties, opposing subgroup directions and unavailable comparisons must have distinct truthful interpretation; no rounded-number classification.
All exact comparison decisions use integer/rational arithmetic. Display rounding cannot turn a small strict difference into a declared tie. Tables retain the source counts; notes make displayed rounding explicit.
Swapping A/B swaps direction but not reversal status; swapping group order with complementary reference weight preserves the numerical comparison. Scaling every count in one option by the same positive integer preserves its rates and weight.

## Learning content
Twelve original four-choice items in recallweave-deck/1, with explanations and transfer prompts. Concepts form an acyclic progression: denominators; group composition; reference mix; causal questions.
The reviewer first receives prompts/options without answer indices or explanations, records independently calculated answers/reasons, then compares to the keyed course.
Check distractor plausibility, unambiguous premises, rounding/units, direct and transfer cases, and systematic answer-length/style cues. Do not equate model mastery with learning efficacy.
Data alone does not prove an intervention effect, and grouping is not automatically a causal correction. No real study result, statistical uncertainty interval, significance, causality estimate or population-validity claim.

## Product receiving
Three or more original presets including a strict reversal, a nonreversal and an empty-group case. Editable native controls, keyboard focus, visible labels, narrow-screen layout, no stale results during invalid edits. All output is available as text/tables independent of visual bars.
Explicit download of the current displayed data and reference mix plus an independently recomputable summary; download of the exact original course JSON. A browser save is not automatic persistence or a lesson restore.
Source module tests cover meaningful edge/counterexample behavior. Builder check must establish standalone/source parity. Real file:// and loopback pages, actual browser keyboard input and actual downloads are required.
Use existing validator and native knowledge/review/session-export modules for course admission/answer/notes receiving. Final full learner-import acceptance remains separately dependent on #7's finalized published importer, without copying over its sources.
Preserve exact source/evidence pins and every unowned parent leaf. Keep failures and corrections. Source publication, integration and browser receiving must be distinguished.
