# Probability foundations

An optional twelve-question course for RecallWeave, covering how to count outcomes, choose a conditional denominator, test independence and update a probability with Bayes' rule. The course assumes familiarity with fractions, percentages and multiplication. All numerical scenarios are fictional and fully specified.

The importable course is [probability-foundations.json](probability-foundations.json). The worked answers below are useful after a first attempt; they are also available question by question in the course's feedback and completed review.

## Study the course

Use RecallWeave's local course import to select the JSON file, inspect its title, four concepts and twelve questions, and explicitly start the course. Importing a course starts a fresh local lesson when confirmed. Keep any study notes you want before starting another lesson.

Choose an answer, read the explanation and work through the transfer prompt on paper. At completion, use the learning trace to revisit your first answers. Practice retries remain separate from that first trace. The study-note download includes the explanations and transfer prompts for offline review. The application estimates a model state; this course has not been validated as a grade, diagnostic or measure of learning effectiveness.

The answer letters displayed by the application may vary because RecallWeave shuffles choices. This guide identifies answers by their content and stable question IDs.

## Concept map and scope

| Concept | Questions | Mathematical focus | Prior concepts used |
| --- | --- | --- | --- |
| Sample spaces | `pf-s1`–`pf-s3` | Equally likely outcomes, complements and overlapping events | Basic fractions |
| Conditional probability | `pf-c1`–`pf-c3` | Restricting the group; reversing a condition; sampling without replacement | Sample spaces |
| Independence | `pf-i1`–`pf-i3` | Product criterion; mutually exclusive events; combining failure events | Sample spaces and conditional probability |
| Bayes' rule | `pf-b1`–`pf-b3` | Weighted causes, false flags and changing base rates | Sample spaces and conditional probability |

Bayes' rule does not require the events being related by the rule to be independent. The course's prerequisite graph therefore does not make independence a prerequisite for the Bayes questions. Prerequisites describe conceptual relationships used by the existing selector; they do not promise a fixed presentation order.

These questions concern exact finite examples and specified probability models. They do not ask a learner to infer that a real process is independent from a small observed sample. Sampling variation, statistical estimation, causal inference and the reliability of actual software or manufactured products are outside this short course.

## Relationships to keep in view

For equally likely finite outcomes, count favorable outcomes and divide by the total. For unequal probabilities, add the probabilities of the favorable outcomes. A complement has probability `1 - P(A)`; overlapping events satisfy `P(A or B) = P(A) + P(B) - P(A and B)`. See [Reading 2, sections 2–3][reading2].

Conditioning on an event B with positive probability gives `P(A given B) = P(A and B) / P(B)`. Independence means `P(A and B) = P(A) × P(B)`. Bayes' rule rewrites the joint probability to give `P(A given B) = P(B given A) × P(A) / P(B)`; the denominator includes every way B can occur. See [Reading 3, sections 2, 4, 6 and 7][reading3].

## Worked answers and transfer responses

### Sample spaces

**pf-s1 — 3/8.** The equally likely outcomes meeting “at least 6” are 6, 7 and 8. Add their three probabilities of 1/8. The event excludes five outcomes, but those five are not the denominator for the unconditional question.

Transfer: if the spinner is not uniform, the labels alone do not determine the answer. You need the probabilities of 6, 7 and 8, or enough information to obtain their sum. Equal-looking outcome names do not establish equal probability.

**pf-s2 — 0.73.** The two categories exhaust the model and are mutually exclusive. Subtract the rework probability from 1: `1 - 0.27 = 0.73`.

Transfer: the complementary event is meeting the deadline, with probability `1 - 0.08 = 0.92`, provided “meeting” and “missing” exhaust the stated deadline outcomes.

**pf-s3 — 0.70.** The two club counts include their twelve shared members twice. The union contains `30 + 24 - 12 = 42` learners, so its probability is `42/60 = 0.70`.

Transfer: `60 - 42 = 18` learners joined neither club. The complement has probability `1 - 0.70 = 0.30`, which also gives `0.30 × 60 = 18`.

### Conditional probability

**pf-c1 — 0.20.** The condition selects the 30 Windows builds. Six failed, so the ratio is `6/30`. The six Windows failures divided by all ten failures would answer a different conditional question.

Transfer: the Linux condition selects 70 builds, of which four failed. The result is `4/70 = 2/35`, approximately 5.71%. These are probabilities for uniform selection from this fictional log, not estimates of an actual operating system's reliability.

**pf-c2 — 0.60.** The condition selects the 30 late parcels, including 18 priority parcels. Thus `18/30 = 0.60`.

Transfer: for late given priority, the numerator remains the 18 parcels in both categories, but the denominator becomes all 60 priority parcels. The result is `18/60 = 0.30`. Reversing the condition retains the overlap and changes the conditioning group.

**pf-c3 — 1/2.** Given a first red draw without replacement, two red tokens remain among four tokens. The second draw is uniform over that remaining bag: `2/4 = 1/2`.

Transfer: returning the first token restores three red and two blue tokens. With the stated mixing and uniform draw, the probability becomes `3/5`.

### Independence

**pf-i1 — Yes: 0.2 equals 0.4 × 0.5.** The joint probability equals the product of the marginal probabilities. The conditional check agrees: `P(A given B) = 0.2/0.5 = 0.4 = P(A)`.

Transfer: changing the joint probability to 0.3 gives `P(A given B) = 0.3/0.5 = 0.6`, which differs from 0.4. The events are dependent in that changed model. The new model is possible: its four cells have probabilities 0.3, 0.1, 0.2 and 0.4, all nonnegative and summing to 1.

**pf-i2 — No: given B, A has probability 0 instead of 0.3.** Mutually exclusive positive-probability events cannot be independent. Their joint probability is zero, while the product in this example is `0.3 × 0.2 = 0.06`. The last option's universal assertion about every pair of different events is false.

Transfer: the event sets are `{1, 2, 3}` and `{9, 10}`. Their overlap is empty. Their probabilities are 0.3 and 0.2, so the same product and conditional checks show dependence.

**pf-i3 — 0.28.** The stated independence assumption gives a joint failure probability of `0.10 × 0.20 = 0.02`. The union is `0.10 + 0.20 - 0.02 = 0.28`. Multiplying the two success probabilities gives 0.72 for no failure, which has complement 0.28.

Transfer: knowing `P(A fails and B fails)` is enough: subtract that overlap from 0.30. Alternatively, either corresponding conditional failure probability together with its marginal yields the overlap through the multiplication rule. Multiplying the marginals without the independence assumption is not justified.

### Bayes' rule

**pf-b1 — 2/3.** Workshop B contributes defective sensors with joint probability `0.40 × 0.06 = 0.024`. Workshop A contributes `0.60 × 0.02 = 0.012`. The total defective probability is 0.036, and `0.024/0.036 = 2/3`.

For a count-based representation of the specified proportions, consider 10,000 equally weighted sensors: A contributes 6,000 sensors and 120 defects; B contributes 4,000 sensors and 240 defects. Of the 360 defective sensors, 240 came from B. These are illustrative counts derived from the model, not a measured sample.

Transfer: with equal workshop shares, B's share of defective sensors is `(0.50 × 0.06) / (0.50 × 0.02 + 0.50 × 0.06) = 0.03/0.04 = 3/4`.

**pf-b2 — 1/12.** The numerator is the joint probability of defective and flagged: `0.01 × 0.90 = 0.009`. The denominator also includes nondefective flags: `0.009 + 0.99 × 0.10 = 0.108`. The conditional probability is `0.009/0.108 = 1/12`, approximately 8.33%.

| Model counts per 1,000 files | Defective | Nondefective | Total |
| --- | ---: | ---: | ---: |
| Flagged | 9 | 99 | 108 |
| Not flagged | 1 | 891 | 892 |
| Total | 10 | 990 | 1,000 |

The table is an exact count representation of the supplied rates. It does not assert that a random sample of 1,000 files must realize these counts.

Transfer: the joint probability of defective and flagged is `9/1,000 = 0.009`. It uses all files as the denominator. The original conditional question uses only the 108 flagged files.

**pf-b3 — It rises from 1/12 to 1/2.** With defective share p, use `0.90p / (0.90p + 0.10(1 - p))`. Substitution gives `0.009/0.108 = 1/12` at p = 0.01 and `0.09/0.18 = 1/2` at p = 0.10.

Transfer: at p = 0.50, the result is `0.45/(0.45 + 0.05) = 0.90`. The prior defective share weights the defective and nondefective contributions to all flags. The conditional flagging rates themselves have not changed.

## Authorship, license and references

The twelve prompts, options, explanations and transfer prompts, and the worked course-specific derivations in this guide, were written for RecallWeave with AI assistance. All scenarios and data are fictional. This original course content is released under CC0-1.0. That statement applies to these course files and does not change the license of the application or the referenced materials.

Mathematical definitions and identities were checked against Jeremy Orloff and Jonathan Bloom's readings in MIT OpenCourseWare's *18.05 Introduction to Probability and Statistics*, Spring 2022:

- [Reading 2: Probability: Terminology and Examples][reading2], especially sections 2–3, pages 1–5.
- [Reading 3: Conditional Probability, Independence and Bayes' Theorem][reading3], especially sections 2, 4, 6 and 7, pages 1–10.

These links provide background definitions and further reading. No source exercise, illustration or prose passage is reproduced in the course. The referenced MIT materials retain their own licensing terms. Source pages were read on 8 October 2026.

[reading2]: https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/mit18_05_s22_class02-prep.pdf
[reading3]: https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/mit18_05_s22_class03-prep.pdf
