# Reading data and evaluating evidence: blind receiving

## Freeze and scope

This review was derived from the parent-provided blind prompts and options only. No author key, explanations, full native course or separate probability-course content was read before this freeze. The provided blind input SHA-256 is 39705c9b26e87b9191814ebc5bae38c00d6e4c71ddda802647ccd90b34e1d3c3. All 12 items have one supported choice under the ordinary arithmetic-mean interpretation of “average”; two small clarity/pedagogy improvements are identified below.

The index in BLIND-ANSWERS.json is zero-based. These positions apply only to the supplied blind option order.

| Item | Correct option | Derived answer |
|---|---|---|
| rates-1 | A (0) | A: 30%, compared with B: 25%. |
| rates-2 | B (1) | 10 percentage points; a 25% relative increase. |
| rates-3 | C (2) | The rates cannot be compared without the total deliveries for each service. |
| summary-1 | D (3) | Mean 10 minutes; median 5 minutes. |
| summary-2 | A (0) | The mean rises to 22 minutes; the median stays at 5 minutes. |
| summary-3 | B (1) | 8 pages per student. |
| context-1 | C (2) | A: 20 points; B: 10 points. |
| context-2 | D (3) | A is higher within each experience group; B is higher when all participants are pooled. |
| context-3 | A (0) | Their means are equal, but the second group's range is larger. |
| design-1 | B (1) | The share of these respondents who say the timetable is useful. |
| design-2 | C (2) | Prevent baseline traits from systematically deciding the assigned interface. |
| design-3 | D (3) | The participants scored higher here, but the comparison alone does not establish that joining caused the difference. |

## Independent derivations and ambiguity checks

### rates-1

**Choice A: A: 30%, compared with B: 25%.**

24/80 = 3/10 = 30%; 30/120 = 1/4 = 25%; 30% > 25%.

**Uniqueness:** The other choices reverse the rates, incorrectly equate them, or compare only the two numerators.

**Teaching boundary:** Observed completion among the stated participants does not establish a causal difference between libraries or a population-wide ranking.

Conceptual checks: [OpenStax, Introductory Statistics 2e, §1.2 Data, Sampling, and Variation in Data and Sampling](https://openstax.org/books/introductory-statistics-2e/pages/1-2-data-sampling-and-variation-in-data-and-sampling). All scenario arithmetic and counterexample worlds above are independently derived.

### rates-2

**Choice B: 10 percentage points; a 25% relative increase.**

50% - 40% = 10 percentage points. Relative increase = (0.50 - 0.40)/0.40 = 0.25 = 25%.

**Uniqueness:** Percentage-point subtraction and division by the starting rate give only this pair.

**Teaching boundary:** Keep the baseline denominator explicit. A relative change is not the same unit as a percentage-point difference.

### rates-3

**Choice C: The rates cannot be compared without the total deliveries for each service.**

Cedar 3/30 = 10% and Elm 6/120 = 5% makes Cedar higher. Cedar 3/100 = 3% and Elm 6/100 = 6% makes Elm higher. Cedar 3/50 = Elm 6/100 = 6% makes them equal. All three worlds preserve the reported late counts.

**Uniqueness:** The same numerators are consistent with either ranking or equality; no unconditional rate comparison follows.

**Teaching boundary:** The counts are known, but their rate denominators are not. These counterexample totals are reviewer inventions and must not be mistaken for prompt data.

### summary-1

**Choice D: Mean 10 minutes; median 5 minutes.**

Sum = 4 + 5 + 5 + 6 + 30 = 50; mean = 50/5 = 10 minutes. The third of five ordered observations is 5 minutes.

**Uniqueness:** None of the other mean/median pairs equals both calculations.

**Teaching boundary:** The question explicitly asks for arithmetic mean. There is no need to call the 30-minute observation an error or exclude it.

Conceptual checks: [OpenStax, Introductory Statistics 2e, §2.5 Measures of the Center of the Data](https://openstax.org/books/introductory-statistics-2e/pages/2-5-measures-of-the-center-of-the-data). All scenario arithmetic and counterexample worlds above are independently derived.

### summary-2

**Choice A: The mean rises to 22 minutes; the median stays at 5 minutes.**

The replaced value increases the total by 60, so the mean rises by 60/5 = 12 from 10 to 22. The ordered values become 4, 5, 5, 6, 90; the third remains 5.

**Uniqueness:** Both the numerical mean and the unchanged middle position identify this option.

**Teaching boundary:** This demonstrates insensitivity of this median to the specified extreme-value replacement, not that medians are unaffected by every possible data change.

Conceptual checks: [OpenStax, Introductory Statistics 2e, §2.5 Measures of the Center of the Data](https://openstax.org/books/introductory-statistics-2e/pages/2-5-measures-of-the-center-of-the-data). All scenario arithmetic and counterexample worlds above are independently derived.

### summary-3

**Choice B: 8 pages per student.**

The first group contributes 12*5 = 60 pages and the second contributes 3*20 = 60. Overall mean = 120/15 = 8 pages/student. Equivalently (12/15)*5 + (3/15)*20 = 8. The distractor (5 + 20)/2 = 12.5 weights groups equally instead of students.

**Uniqueness:** The answer is uniquely 8 under the standard convention that average denotes the exact arithmetic mean. A mean of group means without group-size weighting is wrong here.

**Teaching boundary:** Small wording improvement: explicitly say arithmetic mean or mean in this item, as summary-1 does. Otherwise a highly literal reader could interpret average as another measure of center. No rounding is specified, so use the stated means exactly.

Conceptual checks: [OpenStax, Introductory Statistics 2e, §2.5 Measures of the Center of the Data](https://openstax.org/books/introductory-statistics-2e/pages/2-5-measures-of-the-center-of-the-data). All scenario arithmetic and counterexample worlds above are independently derived.

### context-1

**Choice C: A: 20 points; B: 10 points.**

A: 60 - 40 = 20 test-score points. B: 80 - 70 = 10 test-score points.

**Uniqueness:** Only this option matches both after-minus-before group-mean changes.

**Teaching boundary:** Same scale makes subtraction meaningful. These are changes in group means; the prompt does not establish matching individuals, a workshop causal effect, or which workshop is better.

### context-2

**Choice D: A is higher within each experience group; B is higher when all participants are pooled.**

Beginners: A=20/80=25%, B=2/10=20%. Experienced: A=18/20=90%, B=72/90=80%. Pooled: A=(20+18)/(80+20)=38%, B=(2+72)/(10+90)=74%. A has 80% beginners, B 10%. At any common beginner weight w in [0,1], A-B = [0.25w+0.90(1-w)]-[0.20w+0.80(1-w)] = 0.10-0.05w > 0.

**Uniqueness:** The within-group and pooled directions are both strict. Neither a tie nor a uniform winner matches the four fractions.

**Teaching boundary:** The reversal comes from the different experience mixes. A pooled proportion answers a different descriptive question from the stratum comparisons. Neither set of counts alone identifies a causal effect or mandates that adjustment is always correct in every study.

### context-3

**Choice A: Their means are equal, but the second group's range is larger.**

Both sums are 40 and each group has 4 observations, so both means are 10. First range=10-10=0; second range=20-0=20.

**Uniqueness:** The means agree, the ranges differ, and the individual observed values clearly differ.

**Teaching boundary:** Equal centers do not imply equal spread or identical distributions. The item asks only for the elementary range, not a variance formula.

### design-1

**Choice B: The share of these respondents who say the timetable is useful.**

180/200 = 0.90 = 90% of respondents. For an illustrative city of 1,000 including these 200 respondents, all 800 nonrespondents saying yes gives 980/1000=98%, while none saying yes gives 180/1000=18%. Both preserve the observed 90%.

**Uniqueness:** Only the respondent statement follows directly. The invitation and reply process supplies no population sampling distribution or nonrespondent responses.

**Teaching boundary:** Keep says/said in the explanation: this is reported usefulness. Voluntary response need not be biased in a known direction, and the result need not be numerically false. Its design does not justify direct generalization to all residents or even all newsletter readers.

Conceptual checks: [OpenStax, Introductory Statistics 2e, §1.2 Data, Sampling, and Variation in Data and Sampling](https://openstax.org/books/introductory-statistics-2e/pages/1-2-data-sampling-and-variation-in-data-and-sampling). All scenario arithmetic and counterexample worlds above are independently derived.

### design-2

**Choice C: Prevent baseline traits from systematically deciding the assigned interface.**

Under ordinary complete random assignment of exactly 40 of 80 people to A, each person has probability 40/80 = 1/2 of A, independently of their fixed baseline trait values in the assignment mechanism. Equal arm sizes do not fix trait composition. If 40 volunteers hypothetically have a trait, assigning all 40 to A remains one of C(80,40)=107507208733336176461620 possible allocations; its nonzero probability is a counterexample to guaranteed exact balance.

**Uniqueness:** Random allocation does not change how the 80 volunteers were recruited, guarantee covariate equality in the realized run, or remove sampling/randomization variation. The third option is the only supported principal function.

**Teaching boundary:** Interpret the given random assignment as implemented as stated. Explain balancing in expectation and breaking systematic selection; avoid claiming every confounder is eliminated in the realized sample or that any observed difference proves causation. Blocked or stratified randomization can deliberately use baseline information, so a general definition should not claim that all randomization ignores baseline traits.

Conceptual checks: [NIST/SEMATECH e-Handbook of Statistical Methods, §5.3.3.1 Completely randomized designs](https://www.itl.nist.gov/div898/handbook/pri/section3/pri331.htm), [Susan Athey and Guido Imbens, The Econometrics of Randomized Experiments (2016), arXiv:1607.00698](https://arxiv.org/abs/1607.00698). All scenario arithmetic and counterexample worlds above are independently derived.

### design-3

**Choice D: The participants scored higher here, but the comparison alone does not establish that joining caused the difference.**

The observed group difference is 75-65=10. It fits (1) no effect, with joiners having potential scores 75 either way and nonjoiners 65 either way; (2) a +10 effect, with everyone at 65 without joining and 75 with joining; or (3) a -10 effect, with joiners 85 without/75 with and nonjoiners 65 without/55 with. Only the observed joiner and nonjoiner means are fixed by the prompt.

**Uniqueness:** These compatible worlds refute an identified universal +10 effect and the claim that no effect is possible. Repeating the same selection mechanism with more observations need not remove confounding.

**Teaching boundary:** An observational association can be useful evidence, but this design alone supplies no assumption that identifies the joining effect. Do not turn this item into a claim that causal reasoning from all observational designs is impossible.

Conceptual checks: [OpenStax, Introductory Statistics 2e, §1.2 Data, Sampling, and Variation in Data and Sampling](https://openstax.org/books/introductory-statistics-2e/pages/1-2-data-sampling-and-variation-in-data-and-sampling). All scenario arithmetic and counterexample worlds above are independently derived.

## Publication hardening

1. **Weighted-mean terminology:** summary-3 uses “average” where the intended quantity is the arithmetic mean. Explicitly say “mean” or “arithmetic mean” for both the subgroup summaries and the requested pooled result. The given arithmetic is correct.

2. **Correct-answer positions:** the sequence is exactly A, B, C, D repeated three times. If the app preserves option order, some content options should be permuted together with their correct indices. Equal position counts are useful, but a regular cycle supplies a clue unrelated to understanding. This is conditional on the app’s existing presentation behavior; no app behavior has been read or tested here.

3. **Random-assignment source wording:** the course’s qualified third choice is defensible. Do not replace it with a claim of exact realized balance or automatic elimination of every lurking variable. Some wording in [OpenStax §1.4](https://openstax.org/books/introductory-statistics-2e/pages/1-4-experimental-design-and-ethics) is stronger than the assignment mechanism warrants. The NIST allocation description and Athey–Imbens randomization/sampling distinction support retaining the narrower explanation.

## Course sequence and references

All prerequisite names occur in the four-concept catalog and the relations form an acyclic progression. Some design items could stand alone, but the stronger prerequisites are a coherent curricular choice, not a content error.

The descriptive questions consistently ask what the stated data establish. Keep that scope in the explanations: the pooled reversal does not itself prove a treatment effect; the voluntary survey remains a valid report of its respondents; an observational comparison alone does not identify a joining effect.

The current [OpenStax preface](https://openstax.org/books/introductory-statistics-2e/pages/preface) identifies Introductory Statistics 2e as CC BY-NC-SA 4.0. Cite it as conceptual background and scope any original-material license statement to the original course material. No textbook exercise is needed to make these original calculations. This observation records publisher metadata; it does not claim publisher endorsement or relicense the source.

Primary sources were read on 8 October 2026. PRIMARY-REFERENCES.json records exact URLs, retrieval references, bounded uses and source caveats. The first search returned unrelated results and was not used; direct official-page reads supplied the actual reference checks.

## Remaining receiving boundary

This is blind content/derivation receiving. Author key, explanations, importer schema, UI flow, export/reload and metadata correctness remain unreviewed at this freeze.

Author key and explanations may now be supplied for a separate comparison. This blind packet must remain unchanged; any findings after unblinding belong in a later file.
