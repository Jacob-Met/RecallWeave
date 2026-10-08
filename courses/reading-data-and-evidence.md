# Reading data and evaluating evidence

An optional RecallWeave course about comparing quantities, describing distributions and judging what a study can establish. It contains **12 original questions across four concepts**, with an explanation and an open transfer exercise for every question. All people, counts and datasets in the course are fictional.

## Use the course

Download [reading-data-and-evidence.json](reading-data-and-evidence.json). In a RecallWeave version with the local deck picker, choose that file under **Choose a deck file**. Check that the preview title is **Reading data and evaluating evidence**, then choose **Start this deck**. The deck uses the documented `recallweave-deck/1` content format.

Complete the first pass, read its learning trace and use **Practice missed connections** for any missed items. Practice records are separate from first answers. The open **Apply the idea** prompts are for written or spoken reasoning; this course supplies the guidance below for self-review or discussion, and does not automatically grade those responses.

Choosing a file previews it without replacing the current lesson. **Start this deck** begins a fresh lesson in the current tab. To return to the existing default lesson, choose **Use bundled lesson** and then **Start this deck**. This file supplies lesson content; it does not change the app's learner model or replace other courses. The local import capability must be present in the app version you open.

## What the course covers

| Concept | Questions | Learner can practise |
| --- | --- | --- |
| Rates and denominators | rates-1 through rates-3 | Choose the right denominator; distinguish percentage points from relative change; recognize missing information. |
| Summaries and spread | summary-1 through summary-3 | Compute means and medians; inspect an extreme value; weight group means by group sizes. |
| Comparisons and context | context-1 through context-3 | Separate levels from changes; compare subgroup and pooled rates; notice different spread despite equal means. |
| Study design | design-1 through design-3 | Describe voluntary responses, distinguish selection from assignment, and separate an observed association from a causal effect. |

The first two concepts provide the arithmetic used in later comparisons. Study-design questions then use those comparisons to examine what is and is not established. The prerequisite links describe those connections for the existing selector; they are not a requirement to pass every earlier question before seeing a later one.

Basic division and percentages are sufficient. A calculator or written working is welcome. No probability-course completion, domain expertise or statistical software is required.

## Worked key and transfer guidance

The key below identifies answers by their content so it remains useful when discussing a question without its option letters. Transfer responses often have several valid forms; the examples are guidance, not an exhaustive marking scheme.

### rates-1 — Compare each count with its own total

Library A: 24/80 = 30%. Library B: 30/120 = 25%. **A has the higher observed completion percentage**, although B has more completed projects.

For the transfer, ask for the total number of corresponding opportunities, participants or attempts for each success count, and make sure each total covers the same defined outcome and observation period. The counts 45 and 36 alone do not order the rates. A rate comparison describes the observed groups; it does not establish what caused their difference.

### rates-2 — Name the denominator for a relative change

From 40% to 50%, the difference is **10 percentage points**. Relative to the original rate, (50 − 40)/40 = 25%, so the relative increase is **25%**.

The transfer goes from 20% to 15%: a decrease of 5 percentage points and a relative decrease of (20 − 15)/20 = 25%. The original 20% is the relative-change denominator. Dividing by the new 15% would answer a different comparison.

### rates-3 — Construct compatible alternatives

**The late counts alone cannot determine the rate ordering.** With totals Cedar 10 and Elm 100, the rates are 30% and 6%, so Cedar is higher. With totals Cedar 100 and Elm 10, they are 3% and 60%, so Elm is higher.

Any two valid pairs giving opposite rankings answer the transfer. Each total must be at least its corresponding late count. A tie is also possible, such as totals 10 and 20: both rates are 30%. These alternatives demonstrate missing information without guessing the actual totals.

### summary-1 — Retain both a center and the long wait

The sum of 4, 5, 5, 6 and 30 is 50, so the **arithmetic mean is 10 minutes**. The third ordered value is 5, so the **median is 5 minutes**.

A useful transfer response could report five observations, median 5, four waits between 4 and 6 minutes, and one wait of 30 minutes. Reporting the full small dataset is also useful. The median alone would hide the long delay; the mean alone would not show how tightly four waits cluster.

### summary-2 — Track the sum and the middle position separately

Replacing 30 with 90 raises the sum by 60, from 50 to 110. The **mean becomes 22 minutes**, while the **median stays 5 minutes**.

For seven ordered observations, the median is the fourth. If only the largest observation changes and remains at least as large as every other observation, the fourth ordered value does not change. Ties do not change the median's value.

### summary-3 — Weight by the number of individuals

The first group contributes 12 × 5 = 60 pages and the second 3 × 20 = 60 pages. The combined mean is **120/15 = 8 pages per student**. Giving each group equal weight would produce 12.5 and would not describe these 15 students' combined mean.

For two nonempty groups, equal group sizes are one sufficient transfer answer. Equal group means are another. More precisely, the unweighted mean of the group means equals the combined individual mean exactly when (n1 − n2)(m1 − m2) = 0, where n denotes group size and m group mean. This follows by equating (m1 + m2)/2 with (n1m1 + n2m2)/(n1 + n2).

### context-1 — Separate the final level from the increase

**A increases by 20 points and B by 10 points.** B's final mean is higher, 80 versus 60. A's increase is larger, 20 versus 10.

A transfer response should name both comparisons rather than merge them. The final gap is 20 points in B's favour; the difference in changes is 10 points in A's favour. Neither comparison alone supplies the credible no-workshop counterfactual needed for a causal interpretation. Baseline differences, other events and study design remain relevant.

### context-2 — State the mixture behind a pooled rate

Among beginners, A is 20/80 = 25% and B is 2/10 = 20%. Among experienced participants, A is 18/20 = 90% and B is 72/90 = 80%. **A is higher within both experience groups, while B is higher overall:** A is 38/100 = 38%; B is 74/100 = 74%.

The pooled groups have different experience mixes. Applying the transfer's common 50/50 weights instead gives A: 0.5 × 25% + 0.5 × 90% = **57.5%**, and B: 0.5 × 20% + 0.5 × 80% = **50%**. These standardized summaries describe a chosen common mix. They are neither the observed pooled rates nor proof of a causal method effect. Stating the weights makes the comparison reproducible.

### context-3 — Equal means can accompany different spread

Both four-value groups sum to 40, so **both means are 10**. Their ranges are **0 and 20**.

One valid transfer group is 5, 5, 15, 15: the sum is 40 and its range is 15 − 5 = 10, strictly between 0 and 20. Many other answers work. Check the number of values, sum and largest-minus-smallest calculation rather than matching this example.

### design-1 — Identify whose responses were counted

**90% describes the 200 respondents' reported views:** 180/200 = 90%. Voluntary replies do not by themselves establish the corresponding percentage for all readers, timetable users or residents.

The transfer is explicitly about an unweighted voluntary-response poll. Identify its intended population, invitation group and actual respondents where reported. If recruitment or coverage is unstated, flag the missing information instead of inventing it. A raw respondent percentage directly summarizes those counted responses. Weighted population estimates require their own stated weighting and inference methods and are outside this transfer's specified raw-count calculation.

### design-2 — Distinguish random selection from random allocation

**Random assignment helps avoid systematic allocation differences.** Under the specified random split, the allocation rule is independent of baseline traits. Equal arm sizes do not guarantee identical characteristics in the realized groups; chance imbalance remains possible.

For the transfer, random selection concerns who enters the study from a population. Random assignment concerns which comparison group an enrolled person enters. Randomly assigning these volunteers does not turn them into a representative probability sample. Uncertainty from random allocation can remain even when outcomes are measured for all 80 volunteers. Neither procedure alone repairs problems in follow-through or measurement.

### design-3 — Describe the association without supplying an effect

**The observed joining group has the higher mean, but this comparison alone does not identify the effect of joining.** The difference is 75 − 65 = 10 points. Earlier preparation or other differences could affect both joining and test scores; no effect, a positive effect and a negative effect can each be compatible with such observational means.

For the transfer, accept a feasible random-allocation design with a remaining uncertainty, such as chance variation, adherence, measurement or applicability beyond those enrolled. Also accept collecting relevant baseline information and comparing otherwise similar students, provided the response acknowledges possible unmeasured confounding. Merely increasing the number of self-selected students does not resolve that problem. Randomizing an invitation to join can inform the effect of the offer; identifying an effect of actual joining when some invitees decline requires further assumptions.

## Interpretation

This is a compact learning resource with original illustrative questions. Three items per concept do not establish comprehensive statistical competence. The app's mastery numbers are outputs of its existing illustrative model, not validated estimates for this particular course. Reviewing explanations and retrying an item are learning activities; a corrected retry does not erase the first answer.

## Sources and reuse

Conceptual background was checked on 2026-10-08 against Barbara Illowsky and Susan Dean's *Introductory Statistics 2e*, OpenStax:

- [§1.2: Data, Sampling, and Variation in Data and Sampling](https://openstax.org/books/introductory-statistics-2e/pages/1-2-data-sampling-and-variation-in-data-and-sampling) for sampling, response processes and variation.
- [§1.4: Experimental Design and Ethics](https://openstax.org/books/introductory-statistics-2e/pages/1-4-experimental-design-and-ethics) for experimental comparisons and assignment.
- [§2.5: Measures of the Center of the Data](https://openstax.org/books/introductory-statistics-2e/pages/2-5-measures-of-the-center-of-the-data) for means, medians and frequency weighting.

The course's counts, questions, distractors, explanations, transfer prompts and worked numerical derivations are original. No textbook exercise, dataset or passage is reproduced. The assignment explanation explicitly retains the possibility of chance imbalance.

The original course JSON and this guide are offered under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). Attribute them to **HAMON estate — Reading data and evaluating evidence**, retain that license link and indicate changes. This grant covers this original course content only. The textbook has a separate license; its [current preface](https://openstax.org/books/introductory-statistics-2e/pages/preface) states **CC BY-NC-SA 4.0**. The app's own code license remains as stated by its repository.
