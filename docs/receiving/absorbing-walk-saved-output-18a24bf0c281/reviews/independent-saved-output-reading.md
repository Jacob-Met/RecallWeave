# Independent reading of the saved Recall #206 artifacts

Status: frozen after exact saved artifact intake and before exposure to any future explanatory draft. This is an independent interpretation of existing recipient outputs, not a model, browser, native, source or lesson qualification. No producer function, transition solver or retained campaign was run.

## Scope, custody and existing ownership

Existing issue: https://github.com/Jacob-Met/RecallWeave/issues/206. The retained owner is estate-db371a37f4c8/longwater_author_recovery; independent recipient is longwater_receiving_recovery. The accepted joint commit is 8b4b61e23d4d80fce607e315caee31e98a4d9183, tree bfc313d06faceba257440691fe1c4370180ff31f. Runtime reported full issue plus two comments and a bounded all-state absorbing-topic search, with no separate explanation owner. This reading does not reserve a new content scope.

Runtime recovered the archive in memory and reported all 194 payloads verified; I did not repeat archive recovery. I independently bound the two relayed text files:
- browser-r1/downloads/fair-step3.json: 13,024 UTF-8 bytes including final LF; SHA256 708ca16c87d292cf9c86a39bf7befed6011579f7694afb462829aa74447a907b.
- browser-r5/downloads/study-notes.txt: 8,373 UTF-8 bytes including final LF; SHA256 c040c1de2c46220553c2de8706d656caad64087ed1f0eb817c0b02dece3dc17d.

The JSON was relayed in full. Memory serialization of its literal fields reproduced its exact byte length and SHA256; no model was used to derive these values. The notes were copied verbatim into memory and independently hashed. R1 and R5 are distinct captures. Runtime reports R1 B1–B4 passed but its overall run later failed at application-reflection fill with Targetcrashed; R5 was the later ordinary-consumer closure. The exact downloaded R1 JSON remains evidence despite that later run failure. These session dispositions were relayed, not newly audited here.

## What the actual export says

The top keys are format, input, probabilities, eventual, frames and selectedStep. The format is recallweave-absorbing-walk/1. Input is upper=3, start=1, rightNumerator=1, rightDenominator=2, horizon=4. Both direction probabilities are 1/2. selectedStep=3, while frames contains steps 0 through 4. The selected row is therefore distinct from the saved calculation horizon; the export is not a three-step-only result.

For T equal to the first endpoint-arrival time, the saved rows are:

| step | first left | first right | cumulative left | cumulative right | survival | E[min(T,step)] | expected excess |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 |
| 1 | 1/2 | 0 | 1/2 | 0 | 1/2 | 1 | 1 |
| 2 | 0 | 1/4 | 1/2 | 1/4 | 1/4 | 3/2 | 1/2 |
| 3 | 1/8 | 0 | 5/8 | 1/4 | 1/8 | 7/4 | 1/4 |
| 4 | 0 | 1/16 | 5/8 | 5/16 | 1/16 | 15/8 | 1/8 |

These are readings of actual fraction objects, whose numerators and denominators are decimal strings, not measurements from a new simulation.

At selected step 3, the distribution across 0,1,2,3 is [5/8,0,1/8,1/4]. Newly arriving mass is only 1/8 at the left endpoint. Cumulative endpoint mass is 5/8+1/4=7/8, and the remaining 1/8 is at interior state 2. Thus firstArrival.left=1/8 is neither absorbed.left=5/8 nor total absorption=7/8. The contribution 0→0 of mass 1/2 is retained absorbed mass, not a new arrival. The additional 1→0 contribution 1/8 explains the increase from step 2.

Straight sums and differences of all five saved rows confirm unit total distribution, cumulative endpoint mass plus survival equal to one, each side's first-arrival mass equal to its cumulative increment, and cumulative absorption equal to the sum of first arrivals through that step. No transition routine was invoked.

## Finite window and eventual quantities

At selected step 3, the saved survival sum before the selected step is 1+1/2+1/4=7/4, agreeing with truncatedExpectedSteps. This is E[min(T,3)]. It is not the finite first-arrival moment: the latter is 1*(1/2)+2*(1/4)+3*(1/8)=11/8. Adding the still-surviving paths' three observed steps gives 11/8+3*(1/8)=7/4.

At the saved horizon 4, the analogous survival sum is 1+1/2+1/4+1/8=15/8. First arrivals through 4 contribute 13/8 to the first-arrival moment; 4*(1/16)=1/4 supplies the remaining truncated contribution. Residual survival 1/16 means the four-step window has not captured every eventual arrival. It does not mean there is a 1/16 probability of never being absorbed.

The separate eventual array reports, from start 1, left=2/3, right=1/3 and expectedSteps=2. These are separately model-based eventual quantities, not estimates obtained merely by stopping the frame table at 4. Their saved interior rows satisfy the standard boundary equations by substitution: expected values at states 1 and 2 are both 2, with 2=1+(1/2)*0+(1/2)*2 and 2=1+(1/2)*2+(1/2)*0. The saved endpoint expectations are zero. The saved left/right probability rows likewise satisfy the two boundary values and interior averaging equations. This checks these reported values; it does not call or reproduce the producer solver.

At selected step 3, expectedExcessSteps=2−7/4=1/4 is E[(T−3)+], an unconditional quantity. Dividing by survival 1/8 gives E[T−3 | T>3]=2 in this particular saved model. Confusing 1/4 with that conditional remaining time would be wrong. Similarly, at horizon 4 the unconditional excess is 1/8, survival is 1/16, and their ratio is 2. The equality of these two conditional values is a property of these saved rows, not a general rule.

The additional conditional-on-arrival quantity E[T | T<=3] would be (11/8)/(7/8)=11/7. It is not an exported field and is recorded here only to distinguish it from the truncated and eventual expectations. No explanatory deliverable needs to add it unless useful.

## Separate learner notes and one wording caveat

The R5 notes were saved at 2026-10-09T05:00:16.562Z. Counting their recorded item outcomes gives 11 first-try correct, one needs-review and one correct practice retry. The first-try miss is the edge-mass item: 3/8 times 2/3 is 1/4, rather than the first answer 1. The notes correctly keep that first answer and later practice separate; a later correct retry does not make the first-session result 12/12. Twelve per-item reflections and the application reflection are recorded as unwritten.

The displayed mastery percentages are expressly model state, not a validated assessment or a learner's ability score. No statistical inference about mastery follows from this one saved session.

Items 5, 10 and 12 provide direct arithmetic connections to the saved 0..3 table: survival at step 2 is 1/4; new left arrival at step 3 is 5/8−1/2=1/8; and the step-2 truncated expectation/excess are 3/2 and 1/2. Other notes discuss different walk parameters and must not be presented as the configuration of fair-step3.json.

One concrete wording ambiguity exists in this actual saved order: item 9 begins “For that same fair walk starting at 1” and calls 3 an endpoint, while item 8 immediately before it names states 0..6. Reaching 3 in two right moves from 1 still has probability 1/4, so this is not evidence of a numeric model error. But the cross-reference does not clearly identify the intended endpoint model in the exported order. An explanation should explicitly say the fair 0..3 walk, rather than repeat that ambiguous cross-reference. Any lesson edit remains the existing owner's scope.

## Primary grounding and limits

Bertsekas and Tsitsiklis, MIT Introduction to Probability selected summary, section 7.4, states the boundary equations for eventual absorption and expected absorption time:
https://ocw.mit.edu/courses/res-6-012-introduction-to-probability-spring-2018/d973b10c2587781f86ca4f2aff49098f_MITRES_6_012S18_Textbook.pdf

Grinstead and Snell, Introduction to Probability, chapter 11.2, describes absorbing-chain probabilities and expected time:
https://chance.dartmouth.edu/teaching_aids/books_articles/probability_book/Chapter11.pdf

The finite-window identities above follow directly from summing survival or partitioning arrivals; they are arithmetic checks on the saved table, not borrowed exercise content. The original lesson's recorded attribution and CC BY 4.0 statement are retained in the untouched notes.

No new product execution, producer/model evaluation, browser use, filesystem operation, source edit, installed adoption, session replay, empirical forecast or universal correctness claim is made. This independent reading is frozen before runtime's future explanatory draft and may be used to review that draft.
