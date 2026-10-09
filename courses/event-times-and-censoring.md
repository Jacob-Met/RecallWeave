# Event times and right-censoring

An optional RecallWeave course with **12 original questions across four concepts**. It uses fictional machines to explain what event-time records reveal when some observation ends before an event. It introduces a small Kaplan–Meier, or product-limit, calculation and its limits. This is a learning example, not a reliability certification or a prediction for real equipment.

## Use the course

Download [event-times-and-censoring.json](event-times-and-censoring.json) and select it in a RecallWeave version that supports local deck import. Check the preview title, **Event times and right-censoring**, then choose **Start this deck**. The file uses `recallweave-deck/1`.

Selecting a file previews it; starting it replaces the current session and practice answers. Preserve any work you need before starting another deck. No catalog, offline-pack or installed-app inclusion is implied by this separate course file.

Read the explanation after each answer. The open **Apply the idea** exercises are for your own written or spoken reasoning; the worked guidance below supports discussion and self-review rather than automatic grading. A calculator, fractions and a short timeline are sufficient. No statistical software or prior survival-analysis course is required.

| Concept | Questions | Practice |
| --- | --- | --- |
| Observed follow-up | followup-1 to followup-3 | Retain time and event status; separate observation durations from event times. |
| At-risk sets | risk-1 to risk-3 | Count those still observed just before an event; retain earlier censored follow-up. |
| Product-limit estimates | estimate-1 to estimate-3 | Multiply changing conditional factors; read a step curve; distinguish estimates from counts. |
| Assumptions and limits | limits-1 to limits-3 | Examine the observation process and avoid inventing an unobserved tail. |

The prerequisite links connect these ideas in that order. They guide the existing selector; they do not impose a new pass/fail gate. Each question states the information it needs, so it can be discussed without relying on a previous question's answer.

## One defined observation process

Time zero is the start of operation for each of four fictional machines. Time is measured in **hours**. The event is **first failure**. All four are working and observed at time zero; there is no delayed entry, repeated failure, competing event or tied recorded time in this example.

| Machine | Recorded time, hours | Status | What was observed |
| --- | ---: | --- | --- |
| A | 2 | Event | First failure at 2. |
| B | 3 | Right-censored | Still working through 3; observation then ends. |
| C | 4 | Event | First failure at 4. |
| D | 5 | Right-censored | Still working through 5; observation then ends. |

A censored record gives a lower bound on the first-failure time, not its value. Here B's event time is later than 3 and D's later than 5. Their later failures are unknown. A censored machine is neither an observed failure at its stopping time nor a machine known never to fail.

Keep both the recorded time and status. B and D supply event-free follow-up before observation ends, even though they do not supply exact event times.

For the probability interpretation, imagine comparable machines with independent observations and censoring that is non-informative about later failure risk among otherwise comparable machines. Those are assumptions about the process behind the table. They are not proven by these four records or by calculating a curve. A fixed observation ending unrelated to condition may motivate the censoring assumption; condition-driven removal raises a different concern.

## Build the curve from the risk sets

Let T denote first-failure time and S(t) = P(T > t) the probability of remaining event-free beyond time t. The Kaplan–Meier estimate starts at 1. At each observed failure time, multiply its previous value by:

**1 − d/n**, where n is the number still observed and not yet failed immediately before that time, and d is the number of observed failures at that time.

The risk set includes a machine that fails at the current event time. A machine already failed or previously censored is absent. At a censoring-only time there is no downward jump, but the machine leaves later risk sets. No tie convention is needed for the distinct times in this course.

| Time | At risk just before, n | Events, d | Censored | Factor at this time | Estimate just after | Still observed and event-free afterward |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 4 | 1 | 0 | 3/4 | 3/4 | 3 |
| 3 | 3 | 0 | 1 | 1; no event jump | 3/4 | 2 |
| 4 | 2 | 1 | 0 | 1/2 | 3/8 | 1 |
| 5 | 1 | 0 | 1 | 1; no event jump | 3/8 | 0 |

The event-time product is (3/4) × (1/2) = **3/8 = 0.375**. The second factor 1/2 is conditional on having reached that event time in its at-risk set. It is not the entire survival estimate from time zero.

Using a right-continuous step curve, the estimate is:

- 1 for 0 ≤ t < 2;
- 3/4 for 2 ≤ t < 4;
- 3/8 for 4 ≤ t ≤ 5.

Censoring at 3 does not lower the middle plateau. Censoring at 5 does not force the last plateau to zero. The displayed plateau through the last observed time does **not** justify extending that height indefinitely beyond 5.

## Worked key and transfer guidance

Answers are identified by content, not displayed option letters. Transfer answers can have several valid forms; these examples show what reasoning to check.

### followup-1 — A bound, not an invented event

The record establishes **no first failure through hour 3, with later event time unknown**. A first failure at 3 would require an event record.

For a machine censored while working at 7, a suitable transfer answer is: “It was event-free through 7 hours. Whether and when it first failed later is unknown.” Neither zero lifetime nor infinite lifetime follows.

### followup-2 — Keep time and status together

Retain **A (2, event), B (3, censored), C (4, event), D (5, censored)**. A time-only column cannot distinguish a known event from the end of observation.

For the transfer, compare X (6, event) with Y (6, censored while working). X first fails at 6; Y has no first failure through 6, and later follow-up is unknown. The identical numeric times encode different information once their statuses are retained.

### followup-3 — Name the mean you calculated

**3.5 hours is mean observed follow-up**, because the four observation durations sum to 14. It is not the full cohort's mean first-failure time. The observed-event-only mean is (2 + 4)/2 = 3 hours; dropping B and D does not recover their lifetimes.

Two possible transfer completions are B failing at 4 and D at 6, giving (2 + 4 + 4 + 6)/4 = **4 hours**, or B failing at 8 and D at 10, giving (2 + 8 + 4 + 10)/4 = **6 hours**. Both respect B > 3 and D > 5. These are hypothetical completions, not extra observations or changes to the course's original risk sets. Their different means demonstrate that the observed records do not identify the full mean.

### risk-1 — Include the current failure in its denominator

Immediately before 2, **all four machines are at risk**. A has not yet failed at that instant. B and D are still observed even though their later records will be censored.

In the transfer, one of five machines leaves observation at 1 before the first failure at 2. That leaves **4 at risk immediately before 2**. Count the machine that will fail at 2 among those four; it has not failed immediately before that event.

### risk-2 — Remove earlier events and earlier censoring

Immediately before 4, the risk set is **C and D**. A failed at 2; B left observation at 3.

If B instead remained observed and event-free until censoring at 4.5, the transfer's set immediately before 4 would be **B, C and D**, giving n = 3. This is an explicitly changed observation record, not a reinterpretation of B's original censoring at 3.

### risk-3 — Separate curve height from eligibility

At 3, **the curve stays at 3/4 while B leaves later risk sets**. Earlier follow-up remains valid.

For any censoring-only time in this course's setup, no failure factor reduces the curve; the number still observed decreases by the number censored. The change in future eligibility can affect the denominator at the next event even though there is no current jump.

### estimate-1 — Multiply the changing conditional factors

The keyed value is **3/8**, from (1 − 1/4)(1 − 1/2). Counting two observed failures out of the original four gives a different calculation that ignores incomplete follow-up. Reusing n = 4 at the second event yields 9/16 and ignores B's departure. Deleting B and D before starting likewise loses their valid earlier observation.

For the transfer, (1 − 1/5)(1 − 1/3) = (4/5)(2/3) = **8/15**, about 0.5333. The denominators 5 and 3 belong to their respective event times; the second is not replaced by the original count.

### estimate-2 — Read a step, not an interpolated slope

At 3.5 the estimate is **3/4**. No event occurred after 2 and before 3.5, so there is no additional product factor. The curve does not anticipate the failure at 4.

The transfer values are **1 at 1.5** and **3/8 at 4.5**. Each is the plateau after all events at or before the requested time. No sloped segment is needed.

### estimate-3 — Do not turn an estimate into a half-machine

**3/8 is an estimated event-free proportion under the observation assumptions**. The records do not contain 1.5 observed surviving machines; four times an estimated probability need not reproduce an integer observed count. B's state after censoring is unknown, and D remains observed beyond 4.

A suitable rewrite is: “The estimate beyond hour 4 is 3/8, calculated from the observed records using the stated censoring and comparability assumptions.” It is not an exact probability established for each named machine or for a population.

### limits-1 — State, then examine, the assumption

**Censoring should be non-informative about later failure risk among otherwise comparable machines** for this simple interpretation. The table alone cannot verify that.

For the transfer, a preplanned observation ending because a test facility closes at a fixed time, unrelated to condition, could motivate the assumption. Check whether the closure rule really was fixed in advance and whether early removals depended on wear, symptoms or operating conditions. Administrative wording by itself is not evidence that censoring was independent. Comparable operation and independent observations also need justification.

### limits-2 — Recording honestly does not repair informative removal

**Removing machines because vibrations suggest near failure may violate the censoring assumption.** It can leave a healthier observed group. The point is the dependence on risk; these four course records do not quantify the size of such bias.

One useful transfer proposal is to continue observing safely in a suitable controlled setting after the warning, retaining the same first-failure definition. Another is to record removal reasons and relevant condition measurements, then seek a method suited to that observation process. Neither proposal automatically eliminates unmeasured differences, loss of follow-up, model assumptions or safety constraints. Do not invent failure times at removal or promise that a larger sample fixes the process.

### limits-3 — Stop where follow-up stops

**The tail beyond 5 and an unrestricted mean are not identified without more information or assumptions.** The last plateau is positive, but nobody remains under observation after 5.

Possible transfer questions are: “Were comparable machines actually observed past 5, and how was further censoring handled?” and “What explicit tail model or other assumption supports extending the curve to 20, and what evidence checks it?” An unrestricted mean depends on all of the tail. A positive final plateau neither establishes an infinite true mean nor permits an arbitrary forced drop to zero. Restricted summaries over a stated horizon are a different topic and are not calculated in this course.

## Scope and interpretation

This course teaches a hand calculation and its observation assumptions. It does not teach confidence intervals, representative sampling, causal comparisons, competing risks, interval censoring, delayed entry, repeated events or tied-time handling. Do not infer those capabilities from the four-machine example.

Three questions per concept do not establish comprehensive statistical competence. The app's mastery values come from its existing illustrative learner model; they are not validated measurements of mastery of this course. A corrected retry remains a learning activity, not evidence that the original answer was correct.

## Sources and reuse

Conceptual background was checked against these primary or official sources on 2026-10-09:

- [NIST Engineering Statistics Handbook: Censoring](https://www.itl.nist.gov/div898/handbook/apr/section1/apr131.htm), for the difference between event time and follow-up ending before an event.
- [NIST: Kaplan–Meier estimation](https://www.itl.nist.gov/div898/handbook/apr/section2/apr215.htm), for risk-set denominators and the product-limit calculation.
- [E. L. Kaplan and Paul Meier, “Nonparametric Estimation from Incomplete Observations” (1958), pp. 457–463](https://web.stanford.edu/~lutian/coursepdf/KMpaper.pdf), for the observation assumptions and the undefined tail after a final censored observation, especially §2.1, p. 463.
- [R survival package: print.survfit](https://stat.ethz.ch/R-manual/R-patched/library/survival/html/print.survfit.html), for distinguishing an unrestricted mean from a summary restricted to a stated follow-up horizon when the estimated curve has an unfinished tail.

The risk-set rule, not a blanket “last failure makes survival zero” rule, governs this example. At the final failure only one of two at-risk machines fails; the largest observation is censored. The estimate therefore remains 3/8 through 5, and later behavior is not identified.

All machine records, questions, options, explanations, transfer prompts and worked prose here are original. No source exercise, dataset or passage is reproduced. These references support the statistical concepts; they do not validate the app or the learning effectiveness of this course.

The original course JSON and this guide are offered under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). Attribute **HAMON estate — Event times and right-censoring**, retain that license link and indicate changes. This grant covers the original course content only; cited sources and app code retain their own terms.
