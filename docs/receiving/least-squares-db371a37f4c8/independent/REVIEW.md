# Independent analytical receiving — least-squares #103

Reviewer: estate-db371a37f4c8/product_execution. Candidate author: estate-db371a37f4c8/capability. This review is confined to the frozen mathematical core, original course and worked guide.

## Disposition

**ACCEPTED for the reviewed analytical scope.** No mathematical or value-state defect was found. The actual Node core passes all 55 independently specified controls. All sixteen answer keys agree with answers derived from blind question/option/transfer extraction. All six worked examples, sixteen worked transfer answers, coefficient/unit transformations and the minimum/degenerate-case explanations in the guide agree with those derivations.

This does not receive the HTML/UI, generated-download binding, browser behavior or actual learner import/start/review flow. Those remain the author's separately qualified product gates. Candidate tests were never read or used as an oracle.

## Frozen inputs and independence

- Issue #103 supplied the declared contract.
- Nine original mathematical cases and additional scalar/degenerate/error controls were frozen at **2026-10-08 16:59:47 UTC**, before candidate core, course, guide or tests were inspected. CONTRACT.json SHA-256: a3ef992ace7caa88786c387cf5b157892f0dd57ef57de72c27a0e9e5d86e73af.
- Course prompts, options and transfer prompts were extracted with answer indices and explanations removed. All sixteen worked answers were frozen at **2026-10-08 17:01:32 UTC** before the key or guide was inspected. COURSE-ANSWERS.json SHA-256: 5732cd685aa57ebd5d85d7923b59019c78e7108d335207d44f8b4a947f59c3a8.
- Core SHA-256: 44c9f9ad6ad21215c262fb0af879aa59dfb8ce8b3812d0b0bf70807a1eeb6581.
- Course SHA-256: 3c5639727632b01775e054ca05ef90b4fe56e453ced138d355c463ebb27a2cd9.
- Guide SHA-256: 195e5abbe107799fd3d4dda29250b00c164c5a7275323dc87b57b918886af2b4.

The source hashes were checked before and after the real core run. All three files remained exact. Runtime: existing controller Node v24.19.0, no installation, browser or network dependency. The receiver wrote only its private directory after a free-space admission probe.

## Findings

The noisy independent four-row case gives a=37/26, b=17/26 and minimum SSE=83/26. Against trial y=x, SSE=11 and the excess 203/26 decomposes exactly into 25/4 from the shifted mean point and 81/52 from the slope difference. This tests the minimum identity away from the course's simple built-in example.

Repeated x remains a unique fit when another x differs. A deliberately duplicated full row changes its relative weight: rows (0,0),(0,0),(1,2),(2,1) fit a=3/11,b=7/11,SSE=18/11; deduplicating them would incorrectly produce a=b=1/2,SSE=3/2.

For shared x=3 and y=-2,1,4, the core correctly returns null unique coefficients, fitted mean1 and minimum SSE18. Both a=-5,b=2 and the entire family a+3b=1 minimize that objective. A query away from3 is undetermined. A separate shared-x-zero case preserves an identified prediction of exactly0 without confusing it with the null prediction elsewhere. Constant y with distinct x correctly has a unique horizontal fit.

The two extreme admitted points (-20,20),(20,-20) give y=-x and zero minimum SSE. The rational trial a=1/3,b=-2/3 has SSE802/9, with exact nonnegative terms2/9 and800/9. Query40 is correctly classified as extrapolation.

The affine transformation x'=2x+1,y'=3y-2 of the independent noisy dataset gives a'=67/52,b'=51/52 and SSE747/26. Residuals triple and SSE multiplies by9. The symmetric quadratic case has zero normal-equation sums but residuals2,-1,-2,-1,2 and minimum line SSE14, so the course's interpretation limits are mathematically warranted.

Every accepted result retains all rows in order, uses reduced BigInt fractions with positive denominators, returns deeply frozen copied structures, and leaves caller input unchanged. The exact residual and x-residual sums vanish, the unique fit passes through the mean point, and the reported minimum decomposition matches the independent values. Invalid scalar/query/point inputs refuse without altering caller data.

The guide's influential-point example is correct: with (0,0),(1,1),(2,2),(10,-10), D=251 and the slope numerator is-289. The fit is a=500/251,b=-289/251, residuals(-500,40,580,-120)/251 and SSE2400/251. Replacing the final y by10 makes every point lie on y=x. The text correctly declines to infer an outlier deletion rule or causation from these calculations.

## Evidence

- CONTRACT.json: original independent cases and assumptions.
- COURSE-ANSWERS.json: all sixteen independently worked answers and transfers.
- receive-r1.mjs: self-contained executable receiver; it imports only the frozen core and reads source/course metadata.
- receipt-r1.json: 55 passing controls, full before/after source hashes and exact mathematical results; SHA-256 e7001709367616fcf0b4f52516824aa3adde00eefc5ccb0d1022c8a40ab3c168.
- process-r1.json: original first execution result, exit0. There was no failed run or source/test correction.

Reproduce with the frozen candidate at the paths recorded in the receiver:

```sh
node receive-r1.mjs
```

The receiver records its original absolute input/output paths and writes receipt-r1.json with exclusive creation. To reproduce, copy the packet into a new private directory, adjust only the copied driver's root and source path constants to that directory and the frozen candidate source, and remove only the copied existing receipt before running it. Preserve this original driver and evidence unchanged.
