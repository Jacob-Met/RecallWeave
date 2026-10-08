# Independent normal-modes review

Reviewer: /root/research, session 3e50c5ad22c5. Implementation owner: /root. Review executed on the ThinkPad with Node v22.22.1 on 2026-10-08.

## Result

The physical model passed the independently specified trajectory controls and the separate returned-diagnostic review. All sixteen deck keys matched the retained blind answers. The full guide's derivation and question checks passed. No blocking physical or content defect was found.

| Reviewed source | SHA256 |
| --- | --- |
| courses/normal-modes-core.mjs | b6fecce4c9dea4b8fbf08b2a1b6618c00dfbb177a781509069404d0d5fad4f36 |
| courses/normal-modes.json | 9630e9444af5284cbe42ce1b2eaa8ede8f9bf2d59281c827b36f6264020fcd94 |
| courses/normal-modes.md | 3811bc8c0e77a033f82b46e57b5488439e5bdcec22f3ae8cda2502235d5652dc |

Candidate physics and diagnostic executions each recorded identical model hashes before and after their tests. These receipts qualify those exact contents. A later source change requires review of that change.

The guide review suggested explicitly stating that the ideal springs are unstrained at equilibrium, with no preload. This is a nonblocking wording clarification of the assumption already represented by its force and energy equations.

Browser behavior, offline execution, importer/session integration, packaging, and deployment are covered by other receiving lanes.

## Independent controls and chronology

The first controls were frozen at 18:46:53.495Z before the candidate model or lesson content was read. They derive from Cartesian Newton equations:

- m*x1''=-(k+c)*x1+c*x2
- m*x2''=c*x1-(k+c)*x2

physics-oracle.mjs and frozen-controls.json retain that original freeze. Oracle SHA256: 915bdc0b5d54aeefbf125d5d2ee2f03fb869a89c7b4cf141437575f518e5d74e.

The implementation API subsequently supplied finite bounds. Before inspecting the model, the supported-domain oracle was frozen at 18:50:24.022Z. Only its domain text, grid wall stiffness .25 to 1, and stationary-state time 123 to 19.7 changed. Mathematical controls and tolerances were unchanged; the original files remain retained.

physics-oracle-supported.mjs and supported-controls.json retain the revised freeze. Oracle SHA256: 08d6d15c6094dd560f0668dcf0bef7412767046e9bf7aa9684d308ecf0346624.

## Frozen trajectory review

Completed at 18:52:25.452Z. candidate-physics-receipt.json retains the complete result.

| Control | Coverage | Maximum scaled error |
| --- | --- | --- |
| Exact pure in-phase, pure opposite-motion, and zero-coupling fixtures | Three quarter-period fixtures with nonzero initial velocities | 1.10e-16 |
| Cartesian RK4 comparison | 27 parameter sets and five signed times: 135 cases | 3.23e-12 |
| Differential Newton residual and dx/dt=v | 81 cases | 1.96e-11 |
| Physical energy and modal-energy identity | 135 cases | 2.46e-16 |
| Restart time reversal | 54 cases | 1.40e-16 |
| Exchange symmetry | 54 cases | 0 |
| Stationary zero state | 27 cases | 0 |

The reference integrates the four Cartesian state components with RK4 using only direct spring forces. It does not use the candidate's closed modal equations. A separate fourth-order finite difference checks the submitted trajectory against Newton's equations.

The positive synthetic analytic control passed. All original negative controls are retained. A wrong coupling factor, omitted initial velocities, and a wrong reconstruction sign each failed the Cartesian reference and appropriate additional groups.

## Returned diagnostics and API boundaries

Completed at 18:54:53.806Z. candidate-diagnostics-receipt.json retains the result. This supplement was written after source inspection and is explicitly distinct from the earlier frozen controls.

- 2,808 comparisons checked reported frequencies, half-sum coordinates, velocities, forces, accelerations, physical and modal energies, degeneracy, and displacement bounds across 135 states in 27 parameter sets spanning the documented extrema. Maximum scaled error: 4.45e-16.
- Cartesian RK4 matched 24 cases at all eight minimum/maximum mass, wall-stiffness, and coupling corners. Maximum scaled error: 3.78e-10 against a 2e-9 tolerance.
- Forty-three malformed, omitted, non-finite, or out-of-range inputs were rejected. Inclusive numeric boundaries and complete numeric strings were accepted.
- The maximum-frequency twenty-second export contained 11,836 points, with endpoints preserved and at least 48 intervals per fastest modal cycle.
- Diagnostic-only mutants with a force sign error, orthonormal coordinate scaling in a half-sum API, and an extra factor one-half in modal energy were rejected.

## Blind content review

The reviewer read only normal-modes-questions.json and recorded all sixteen choices and independent reasoning in blind-answers.json at 19:01:58.940Z. The full deck and its answer keys were first inspected afterward. Prompt and choice equality to the full deck was checked before comparing the keys.

The comparison completed at 19:02:48.249Z and matched sixteen of sixteen keys. content-review-receipt.json records every comparison and the manual review scope.

- Key-free question SHA256: 5de83f236cf42137f9f8e702f6f26f13fac251191e614608a19da0411555c85b
- Retained blind-answer SHA256: 6b6eeceee67053f65f397704d491d1eb94f4afeb63134d021bd58c4d91651094

Every explanation and transfer prompt was read. The review found no mathematical error or ambiguous correct option in the stated ideal-model context. The content correctly distinguishes equal instantaneous positions from pure-mode initial conditions and distinguishes amplitude envelopes from guaranteed complete energy transfer.

## Guide and references

The full guide was reviewed at 19:06:28.752Z. guide-review-receipt.json records its hash and the checked topics: force derivation, stiffness eigenvalues, half-sum transformations, initial-value solution, both pure-mode conditions, quarter-period signs, energy accounting, degeneracy, and all sixteen answer checks.

The guide's API bounds and analytical-sampling description agree with the already-tested core. Its claims about browser/file execution, pending/applied UI state, storage, downloads, and importer behavior were not assessed in this physical/content lane.

Both official mathematical-background references resolve: [MIT OCW Chapter 3: Normal Modes](https://ocw.mit.edu/courses/8-03sc-physics-iii-vibrations-and-waves-fall-2016/d96262076cff658e551107bbb7c4b14c_MIT8_03SCF16_Text_Ch3.pdf) and [Lecture 4](https://ocw.mit.edu/courses/8-03sc-physics-iii-vibrations-and-waves-fall-2016/pages/part-i-mechanical-vibrations-and-waves/lecture-4/). reference-check.json retains their URLs and the bounded source check.

## Reproduction

The original candidate-adapter.mjs retains the relative import used in the historical receipts. The portable-adapter.mjs helper reads the same candidate path passed to the review runner, so the packet can be relocated without changing any frozen oracle or historical receipt.

From any directory, provide the indicated absolute file paths:

```text
node /packet/run-supported-review.mjs /packet/portable-adapter.mjs /candidate/normal-modes-core.mjs /new-physics-receipt.json
node /packet/diagnostic-review.mjs /candidate/normal-modes-core.mjs /new-diagnostics-receipt.json
```

The adapters pass m/k/c as mass/wallStiffness/coupling and pass all four initial-state values directly, without clamping. The runner verifies the supported oracle against its frozen hash and records candidate and adapter hashes before and after execution. Receipt files are created exclusively; existing evidence is not overwritten.

## Recovery and integration

The ThinkPad root filesystem exhausted its free space after all immutable receipts had been retained. A final mutable README update failed and left a partial old README. At 19:08:35.875Z, all sixteen immutable review artifacts, totaling 67,407 bytes, were copied byte-for-byte into this isolated tmpfs packet. recovery-receipt.json records every original file hash and the copy verification.

This README was reconstructed from the retained receipts. No passed core suite was repeated, no original negative controls were changed, and no other owner's files were removed or edited. The complete packet is intended for durable inclusion in the implementation owner's source contribution.

## Scope

The physical model uses equal positive masses, equal positive outer stiffnesses, nonnegative coupling, and ideal linear undamped, unforced motion. Numerical findings concern the exact source above and the finite tested parameter/time ranges. They establish neither learner efficacy nor deployment success. content-review-contract.md retains the mathematical and teaching criteria specified before candidate content inspection.
