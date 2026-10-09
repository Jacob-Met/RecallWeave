# Reading the saved absorbing-walk experiment and study notes

The saved experiment selects **step 3 of a fair walk on states 0, 1, 2, 3, starting at 1**. At that step, **7/8 of the probability has already been absorbed and 1/8 is still moving**. The left endpoint holds 5/8, but only 1/8 first arrived there on step 3. These quantities answer different questions.

This explanation reads two existing downloads from [RecallWeave issue 206](https://github.com/Jacob-Met/RecallWeave/issues/206): the R1 experiment JSON and the later R5 study notes. They are separate captures. The notes describe the fixed twelve-question course, which includes several different walks; they are not a saved learner state for the selected experiment. No model, browser, course or export was rerun or changed to produce this explanation.

The experiment applies upper = 3, start = 1, rightNumerator = 1, rightDenominator = 2 and horizon = 4. Each interior move goes left or right with probability 1/2. Once a path reaches 0 or 3, it stays there. Let T be its first endpoint-arrival time. The export contains every frame from 0 through 4; selectedStep = 3 records the frame selected when downloaded. It neither discards frame 4 nor says that every path stops at time 3.

Every number in this table is transcribed from those saved frames:

| Step | First arrival at 0 on this step | First arrival at 3 on this step | At 0 by this step | At 3 by this step | Still interior, P(T > step) |
| --- | --- | --- | --- | --- | --- |
| 0 | 0 | 0 | 0 | 0 | 1 |
| 1 | 1/2 | 0 | 1/2 | 0 | 1/2 |
| 2 | 0 | 1/4 | 1/2 | 1/4 | 1/4 |
| **3, selected** | **1/8** | **0** | **5/8** | **1/4** | **1/8** |
| 4, final exported frame | 0 | 1/16 | 5/8 | 5/16 | 1/16 |

“At 0 by this step” is cumulative left absorption; “at 3 by this step” is cumulative right absorption. Their sum is total absorption. Each first-arrival column counts only paths reaching that endpoint for the first time on the named step. Already absorbed mass remains at its endpoint without becoming a new arrival again.

At selected step 3, the complete saved distribution is:

| State | Probability mass | Meaning |
| --- | --- | --- |
| 0 | 5/8 | Cumulative left absorption |
| 1 | 0 | No surviving mass here |
| 2 | 1/8 | All currently surviving mass |
| 3 | 1/4 | Cumulative right absorption |

Thus total absorption is 5/8 + 1/4 = 7/8, while total new absorption on step 3 is 1/8 + 0 = 1/8. These totals must not be substituted for the endpoint-specific values.

The saved transition contributions explain the difference. Frame 2 has mass 1/4 at state 1. On the transition to frame 3, that mass splits into 1/8 going to 0 and 1/8 going to 2, because each edge has probability 1/2. The 1/2 already at 0 stays there: 1/2 retained + 1/8 newly arriving = 5/8 cumulative. The 1/4 already at 3 also stays there, with no new right arrival on this step. A conditional edge probability of 1/2 is therefore not itself the amount transferred; the transferred mass is the source mass multiplied by that probability.

The finite and eventual expectations also have distinct meanings:

| Selected observation step h | Saved E[min(T, h)] | Saved E[T] - E[min(T, h)] |
| --- | --- | --- |
| 0 | 0 | 2 |
| 1 | 1 | 1 |
| 2 | 3/2 | 1/2 |
| 3 | 7/4 | 1/4 |
| 4 | 15/8 | 1/8 |

For the applied start 1, the saved eventual row gives E[T] = 2. At step 3, the finite expectation is 7/4: the saved survival probabilities before that step sum to 1 + 1/2 + 1/4. This is E[min(T, 3)], counting each path only up to three transitions. It is not the mean stopping time restricted to paths that have already stopped.

The remaining 1/4 is an **unconditional expected excess**, E[(T - 3)+]. Already stopped paths contribute zero. It is not the expected remaining time conditional on still moving. Dividing that excess by the saved survival probability gives (1/4)/(1/8) = 2 further steps conditional on T > 3. This last value is an arithmetic interpretation of the saved fields, not an additional exported field or a newly executed model result.

Even the final exported frame does not show universal completion: P(T > 4) = 1/16. Its cumulative endpoint probabilities, 5/8 at 0 and 5/16 at 3, differ from the saved eventual probabilities, 2/3 and 1/3. E[T] = 2 is an average under this model, not a two-step deadline or a guarantee that all paths have ended within the four-step horizon.

The separate R5 study-notes download records **11 of 12 first answers correct**, then **one practice answer correct out of one**. The receiving script deliberately selected an incorrect first answer for the conditional-transfer question. That question has source mass 3/8 and right-edge probability 2/3: the first recorded answer is 1, while the correct answer and later practice answer are 1/4. The multiplication (3/8)(2/3) = 1/4 is the same distinction illustrated above by the saved experiment's (1/4)(1/2) = 1/8. The question's 2/3 edge probability belongs to its own example; it does not change the experiment's applied 1/2.

These are controlled receiving choices, not evidence of a human learner's weakness or of teaching efficacy. The retry remains separate from the first-session record. The notes explicitly describe the displayed mastery percentages as learning-model state, not a grade or validated assessment: Boundary rules 33%, First arrival 91%, Finite horizons 91%, Eventual outcomes 91%, Expected stopping time 98%, Model limits 64%. They say practice does not change the first-session estimates. Every item reflection and the final application reflection is recorded as “Not written”; the file supplies no written learner reasoning to assess.

Several recorded questions connect directly to this export: item 5 reads step-2 survival as 1/4; item 10 subtracts left cumulative absorption at steps 2 and 3 to obtain the first-arrival mass 1/8; item 12 distinguishes the step-2 truncated expectation 3/2 from its unconditional excess 1/2. Item 9's saved phrase “that same fair walk” is ambiguous following item 8's different 0..6 example. Here, the relevant first-right-arrival example is explicitly the **fair 0..3 walk starting at 1**, whose saved step-2 right first-arrival mass is 1/4. This explanatory clarification neither changes the saved wording nor claims a numerical lesson defect or repairs the shared course.

Exact fractions describe the stated finite, fixed-probability model. They do not establish that a real process follows its assumptions. Similarly, a successful ordinary receiving session does not qualify every learner interaction: the retained R1–R4 additional reflection/stress path remains unqualified after target crashes, with no renderer cause established. R1's experiment download was saved during its earlier successful lab checks; its overall later stress receipt remains negative. R5 is the separately qualified ordinary practice/notes continuation, not a replacement success label for R1.

The input bytes come from joint custody commit [8b4b61e23d4d80fce607e315caee31e98a4d9183](https://github.com/Jacob-Met/RecallWeave/commit/8b4b61e23d4d80fce607e315caee31e98a4d9183), preserving qualified source cb12f239052b1e30e03a0c2ecb17cbb54bf77125. Paths below are relative to the retained independent archive's evidence directory:

| Saved input | Bytes | SHA256 |
| --- | --- | --- |
| browser-r1/downloads/fair-step3.json | 13,024 | 708ca16c87d292cf9c86a39bf7befed6011579f7694afb462829aa74447a907b |
| browser-r5/downloads/study-notes.txt | 8,373 | c040c1de2c46220553c2de8706d656caad64087ed1f0eb817c0b02dece3dc17d |

The [joint receiving record](https://github.com/Jacob-Met/RecallWeave/blob/8b4b61e23d4d80fce607e315caee31e98a4d9183/docs/receiving/absorbing-walk-db371a37f4c8/JOINT.md) preserves package use, original results and limitations. A separate read-only intake checked all 194 manifest payloads, 3,164,498 bytes, against the archived sizes and SHA256 values; the extra member is the exact manifest itself. The sealing script deliberately normalizes archive permissions to 0644 rather than preserving the source manifest's 0664. This explanation adds no execution, hosted-CI, installed-adoption or attachment-route result.
