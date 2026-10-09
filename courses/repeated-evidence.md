# Repeated evidence: two flags, three models

An optional twelve-question course for learners who can already calculate a one-event conditional probability and want to reason about a second report. You will compare three complete models with the same population size, prior and individual flag rates. Their different joint behavior makes two flags produce different answers.

The importable lesson is [repeated-evidence.json](repeated-evidence.json). The [Probability foundations guide](probability-foundations.md) is useful preparation if conditional denominators or Bayes' rule are new to you.

## Study the course

Download the JSON file, choose it under **Bring your own lesson**, inspect its preview, then select **Start this deck**. Starting a different deck clears the current session's first answers, practice and reflections, so download any study notes you want to keep first.

Try each question before reading its explanation. Work through its transfer prompt on paper, then use this guide to check the derivation. At completion, review your first answers and use missed-item practice separately from that first trace. The study-note download keeps explanations and transfer prompts for offline review.

RecallWeave shuffles choices. The worked answers below identify questions by their stable IDs and answer content, not by displayed letters. Prerequisites connect ideas used by the selector; they do not guarantee a fixed question order. Every question supplies the information needed for its own answer.

## The populations and notation

A file is selected uniformly from a **fully specified fictional population of 16,000 files**. Exactly 1,600 files need rework, denoted D; the remaining 14,400 do not, denoted not-D. The prior is therefore `P(D) = 1/10`.

Each of two reports either flags the file or does not. A + means flag; a - means no flag. In a pair such as +-, the first sign belongs to report 1. The four joint cells are:

| Cell | Report 1 | Report 2 |
| --- | --- | --- |
| ++ | Flags | Flags |
| +- | Flags | Does not flag |
| -+ | Does not flag | Flags |
| -- | Does not flag | Does not flag |

These counts are original teaching inputs, **not empirical observations or expected counts from a sample**. Uniform selection from each stated finite population makes the ratios exact. The three populations are alternative models of report behavior, not consecutive samples, and no file is drawn from a mixture of them.

### Model 1: reports independent within each class

| Class | ++ | +- | -+ | -- | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| D | 900 | 300 | 300 | 100 | 1,600 |
| not-D | 900 | 2,700 | 2,700 | 8,100 | 14,400 |
| All files | 1,800 | 3,000 | 3,000 | 8,200 | 16,000 |

Within D, each report flags 1,200 of 1,600 files. Their joint flag rate is `900/1,600 = 9/16 = (3/4)(3/4)`. Within not-D, each flags 3,600 of 14,400; their joint flag rate is `900/14,400 = 1/16 = (1/4)(1/4)`. These product identities establish independence within each class for the binary report outcomes. They do not establish independence in the pooled population.

### Model 2: report 2 copies report 1

| Class | ++ | +- | -+ | -- | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| D | 1,200 | 0 | 0 | 400 | 1,600 |
| not-D | 3,600 | 0 | 0 | 10,800 | 14,400 |
| All files | 4,800 | 0 | 0 | 11,200 | 16,000 |

The two reports agree for every file. Within the first-positive group, the second flag is certain in either class. Counting it again does not narrow that group.

### Model 3: dependent reports with the same individual rates

| Class | ++ | +- | -+ | -- | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| D | 800 | 400 | 400 | 0 | 1,600 |
| not-D | 3,600 | 0 | 0 | 10,800 | 14,400 |
| All files | 4,400 | 400 | 400 | 10,800 | 16,000 |

Each report still flags 1,200 D files and 3,600 not-D files. However, only 800 D files receive both flags. Among first-positive files, report 2 flags 800 of 1,200 D files and all 3,600 not-D files. That selected group's second-positive rates differ from the rates in the whole class.

### What stays fixed, and what changes

| Quantity | Model 1 | Model 2 | Model 3 |
| --- | --- | --- | --- |
| Prior P(D) | 1/10 | 1/10 | 1/10 |
| Each report's flag rate within D | 3/4 | 3/4 | 3/4 |
| Each report's flag rate within not-D | 1/4 | 1/4 | 1/4 |
| P(D given first flag) | 1/4 | 1/4 | 1/4 |
| P(second flag given first flag and D) | 3/4 | 1 | 2/3 |
| P(second flag given first flag and not-D) | 1/4 | 1 | 1 |
| P(D given both flags) | 1/2 | 1/4 | 2/11 |

The identical single-report summaries leave the within-class overlap unspecified. The three joint tables supply different overlaps, and that is enough to change the second update.

## Four connected ideas

| Concept | Stable IDs | Focus | Prerequisites in this deck |
| --- | --- | --- | --- |
| Joint evidence | re-j1, re-j2, re-j3 | Choose the conditioned group and count both classes | None |
| Conditional second evidence | re-c1, re-c2, re-c3 | State the product assumption and retain earlier evidence | Joint evidence |
| Copied and dependent flags | re-r1, re-r2, re-r3 | Distinguish duplicate information from a new conditional likelihood | Joint evidence; Conditional second evidence |
| Limits of a supplied model | re-l1, re-l2, re-l3 | Recognize missing joint information and zero-support events | The other three concepts |

This lesson uses exact finite models. It does not estimate real report accuracy, diagnose actual files, infer a causal mechanism or establish learning effectiveness. The application's illustrative learner-state estimates are separate from the probabilities of fictional rework used here.

## Two ways to make the same update

For an event E of positive probability, conditioning changes the denominator to the E group:

`P(D | E) = P(D and E) / P(E)`.

For both flags, let `qD = P(F1+ and F2+ | D)` and `qN = P(F1+ and F2+ | not-D)`. If the prior is p and the denominator is positive, then

`P(D | F1+, F2+) = p*qD / (p*qD + (1-p)*qN)`.

This uses both class contributions. Bayes' rule itself does not require independence. Independence is an extra assumption that can let you replace each joint rate with a product.

Alternatively, begin inside the first-positive group. Let `p1 = P(D | F1+)`, `a = P(F2+ | F1+, D)` and `b = P(F2+ | F1+, not-D)`. The second update is

`p1*a / (p1*a + (1-p1)*b)`,

again when the denominator is positive. Retaining F1+ in a and b matters. Reusing the marginal second-report rates silently assumes the relevant within-class independence.

For 0 < p1 < 1 and b > 0, the same calculation can be expressed as posterior odds multiplied by the likelihood ratio `a/b`. In all three tables the first-positive odds are `1:3`. Their second-positive likelihood ratios are 3, 1 and 2/3. The resulting odds are `1:1`, `1:3` and `2:9`, corresponding to probabilities 1/2, 1/4 and 2/11.

These conditioning and product rules are described in [MIT 18.05 Reading 3][reading3]. The distinction between independence within a class and independence after pooling classes is discussed in [MIT 6.041/6.431 Lecture 3][lecture3]. The tables and calculations in this course are original examples.

## Worked answers and transfer checks

### Joint evidence

**re-j1 — 1,800: all files flagged by both reports.**

The conditioned group contains 900 D and 900 not-D files. The ratio is `900/1,800 = 1/2`. Using all 1,600 D files would reverse the conditioning direction; using all 16,000 would answer an unconditional question.

Transfer: `P(D and both flags) = 900/16,000 = 9/160`. The joint event is measured against the whole population. In `P(D | both flags)`, we have already restricted selection to the both-flag group.

**re-j2 — 1/4.**

The first-positive group has `1,200 + 3,600 = 4,800` files. Its D fraction is `1,200/4,800 = 1/4`. Posterior odds are D:not-D = `1,200:3,600 = 1:3`; the ratio 1/3 is odds, not probability.

Transfer: matching individual counts does not show that the same files were flagged. In Model 1 the two D flag sets overlap in 900 files; in Model 2 they overlap in all 1,200; in Model 3 they overlap in 800. Each report flags 1,200 D files in every model.

**re-j3 — 1/2.**

Use the ++ cell: `900/(900 + 900) = 1/2`. As a Bayes update, Model 1 has `qD = 9/16` and `qN = 1/16`. Multiplying by prior class weights gives `9/160` and `9/160`; their normalized D share is 1/2.

Transfer: at prior `p = 1/5`, keeping those within-class joint rates fixed gives class contributions `(1/5)(9/16) = 9/80` and `(4/5)(1/16) = 4/80`. The posterior is `(9/80)/(13/80) = 9/13`. This is a new probability model, not a relabeling of the original 16,000-file counts.

### Conditional second evidence

**re-c1 — The reports are independent within D and within not-D.**

We need the product identity in each class because the posterior denominator adds their separately weighted both-flag contributions. Equality of marginal rates does not say how often the two flag sets overlap. Independence in the pooled population concerns a different probability law.

Transfer: in Model 1, `P(F1+) = P(F2+) = 4,800/16,000 = 3/10`. The pooled joint probability is `1,800/16,000 = 9/80`. Since `9/80 != (3/10)(3/10) = 9/100`, the reports are not independent in the pooled population, even though they are independent within each class.

**re-c2 — 1/10.**

The +- cell contains 300 D files and 2,700 not-D files. Thus `P(D | +-) = 300/3,000 = 1/10`. The second negative multiplies first-positive odds `1:3` by `(1/4)/(3/4) = 1/3`, giving `1:9`. Returning to the prior here follows from this table's particular symmetric rates; it is not a general rule for disagreeing reports.

Transfer: the -- cell gives `100/(100 + 8,100) = 1/82`. The corresponding posterior odds are `100:8,100 = 1:81`.

**re-c3 — P(F2+ given F1+ and D), and P(F2+ given F1+ and not-D).**

The class likelihoods must be evaluated inside the group selected by the first flag. Starting from `p1 = 1/4`, use those conditional likelihoods in the second-update formula.

Transfer:

| Model | Second-positive rate within first-positive D | Second-positive rate within first-positive not-D |
| --- | --- | --- |
| Model 1 | 900/1,200 = 3/4 | 900/3,600 = 1/4 |
| Model 2 | 1,200/1,200 = 1 | 3,600/3,600 = 1 |
| Model 3 | 800/1,200 = 2/3 | 3,600/3,600 = 1 |

These three likelihood pairs produce the three posteriors even though the unconditioned individual flag rates match.

### Copied and dependent flags

**re-r1 — 1/4.**

In Model 2, the both-positive and first-positive groups are the same set of 4,800 files. Consequently `1,200/4,800 = 1/4` for either condition. The second-positive likelihood ratio is `1/1 = 1`.

Transfer: a third exact copy leaves the posterior at 1/4. The all-three-positive event is still exactly the first-positive event. This statement requires an exact copy, not merely a second report with the same individual flag rate.

**re-r2 — 2/11.**

Model 3's ++ cell gives `800/(800 + 3,600) = 800/4,400 = 2/11`. Its within-class joint rates are `800/1,600 = 1/2` and `3,600/14,400 = 1/4`, not the products used in Model 1.

Transfer: Model 3's +- cell contains 400 D files and no not-D files. The posterior for this event is `400/(400 + 0) = 1`. The event has positive probability `400/16,000 = 1/40`, so this is a defined conditional probability. It is an exact conclusion about this table, not a guarantee that disagreement identifies rework in a real system.

**re-r3 — 2/3.**

The conditional likelihood ratio is `(800/1,200)/(3,600/3,600) = (2/3)/1 = 2/3`. Starting with odds `1:3` gives updated odds `2:9`, hence probability 2/11.

A positive report is not required to raise every already-conditioned posterior. In Model 3, each report alone favors D compared with the prior, but among first-positive files the second positive is more likely for not-D. The earlier evidence changes the comparison group.

Transfer: start instead at `p1 = 2/5`, with conditional likelihoods `a = 2/3` and `b = 1`. The D contribution is `(2/5)(2/3) = 4/15`; the not-D contribution is `(3/5)(1) = 9/15`. The posterior is `4/13`. Equivalently, odds `2:3` become `4:9`.

### Limits of a supplied model

**re-l1 — P(D given report 1 flags) = 1/4.**

The single-report class contributions are `(1/10)(3/4) = 3/40` and `(9/10)(1/4) = 9/40`. Their D share is `(3/40)/(12/40) = 1/4`.

None of the three proposed both-flag values is compelled by those marginal summaries. Each is realized by one of the supplied joint models. This is an absence of model information, not a calculation error or a reason to select the independent product by default.

Transfer: Model 2 has ++ counts `D = 1,200`, `not-D = 3,600`, giving 1/4. Model 3 has `D = 800`, `not-D = 3,600`, giving 2/11. The D overlap changes while both D marginal counts stay at 1,200: in Model 3, each disagreement cell contains 400 files and the -- count is zero. Their not-D rows are identical.

**re-l2 — Undefined: the conditioning event has probability zero.**

Model 2 has no +- files in either class. The ordinary finite-event conditional ratio has numerator zero and denominator zero, so no posterior is defined for this condition. This differs from Model 3's +- event, whose positive denominator and zero not-D count give posterior 1.

Transfer: a genuine disagreement cannot be represented as an outcome of the stated exact-copy population. It establishes a mismatch between that event and the supplied model. By itself it does not specify a replacement model, the cause of disagreement or a true rework probability. You would need further information rather than a numerical value obtained from 0/0.

**re-l3 — The both-flag rate within D and the both-flag rate within not-D.**

Knowing `qD` and `qN` supplies both joint likelihoods required by the prior-weighted formula. The individual report rates alone cannot provide their overlap. One can also obtain the joint rates from the first-positive rates and the appropriate conditional second-positive rates; multiplying marginal rates requires the extra independence assumption.

Transfer: with `qD = 1/2` and `qN = 1/4`, the contributions are `(1/10)(1/2) = 1/20 = 2/40` and `(9/10)(1/4) = 9/40`. The posterior is `(2/40)/(11/40) = 2/11`. If both joint likelihoods are zero, the both-flag event has probability zero and the ordinary formula is undefined.

## A check you can carry to a new example

Before updating on another report, state the event you have already conditioned on. Ask whether the new report supplies a new conditional likelihood, repeats an existing event, or lacks a joint model. Write both class contributions and verify that their sum is positive before dividing. This keeps the assumption about report overlap visible alongside the arithmetic.

## Authorship, license and primary references

The twelve prompts, choices, explanations and transfer prompts, the three finite populations and the worked course-specific derivations were authored for RecallWeave by estate-234cae4aee53 with AI assistance. They are original fictional teaching content released under CC0-1.0. This does not change the application's license or the terms of the referenced materials.

Mathematical background was read from these primary MIT OpenCourseWare materials on 9 October 2026:

- Jeremy Orloff and Jonathan Bloom, MIT 18.05, Spring 2022, [Reading 3: Conditional Probability, Independence and Bayes' Theorem][reading3]. See the definitions of conditional probability, the multiplication rule and Bayes' rule.
- MIT 6.041/6.431, Fall 2010, [Lecture 3: Independence][lecture3]. See its conditional independence discussion and the distinction between the probability laws before and after conditioning.

The sources support the definitions and identities. They are not empirical support for these fictional inputs. No source exercise, prose passage or illustration is reproduced. The referenced materials retain their own licensing terms.

[reading3]: https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/mit18_05_s22_class03-prep.pdf
[lecture3]: https://ocw.mit.edu/courses/6-041-probabilistic-systems-analysis-and-applied-probability-fall-2010/b200b6217af1cd5dbea8c659ebbf046a_MIT6_041F10_L03.pdf
