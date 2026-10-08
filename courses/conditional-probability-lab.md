# Conditional probability lab

Open [the standalone lab](conditional-probability-lab.html) to change the counts in a two-event table and inspect the group being counted. It accompanies the existing [Probability foundations course](probability-foundations.json) and [worked course guide](probability-foundations.md). The lab adds no questions to that course and does not change its answers.

The mathematical model is uniform selection from the individual outcomes counted in a finite table. The four cells form a partition: each outcome belongs to exactly one cell. The cell names themselves are not four equally likely outcomes; their counts can differ. “Not A” and “not B” are complements within the table.

## Begin with the denominator

The initial fictional example uses A = defective file and B = flagged file:

| Counted outcomes | B: flagged | Not B: not flagged | Total |
| --- | ---: | ---: | ---: |
| A: defective | 9 | 1 | 10 |
| Not A: nondefective | 99 | 891 | 990 |
| Total | 108 | 892 | 1,000 |

Select **P(A | B)** in the counting-question menu. The condition B selects the 108 flagged files. Nine of them are defective, so the exact fraction is `9/108 = 1/12`. The numerator cell is also part of the denominator; the other denominator cell contains the 99 nondefective flags.

Now select **P(B | A)**. The same overlap of nine files supplies the numerator, but A selects only the ten defective files. This gives `9/10`. Reversing the question changes the group being considered.

Select the joint probability **P(A ∩ B)**. It asks for a file that satisfies both events when selecting from all 1,000 outcomes, so the result is `9/1000`. Selecting the marginal **P(A)** instead combines the two A cells: `(9 + 1)/1000 = 1/100`.

The N and D badges explain membership without relying on color. N + D means a cell supplies both counts; D alone means it contributes only to the denominator. A highlighted cell with count zero still belongs to the specified event set.

These counts represent the stated fictional proportions exactly. They do not predict that a random sample of 1,000 real files must have these counts, and the lab does not assess an actual file checker.

## Use the controls

1. Edit the two event labels and four counts. A label is literal text; changing it does not change the arithmetic.
2. Choose a joint, marginal or conditional question. Inspect the numerator, denominator and exact reduced fraction together.
3. Compare the two conditional directions below the table. Expand **Inspect all 16 probabilities** for the complete set.
4. Select a fictional example and press **Load** to replace the current labels and counts.
5. Use **Download this table and results** to save the current admitted table as JSON. This download and the separate course download have different purposes.

Counts are strings containing 1–18 ASCII digits after surrounding whitespace is removed. The largest individual count is 999,999,999,999,999,999. Leading zeros are accepted within the 18-digit limit and disappear from the canonical result. Signs, decimals, grouping commas, exponents and non-ASCII digits are refused. A raw count field is limited to 128 UTF-16 code units before trimming.

Labels allow 1–80 Unicode code points after trimming, with a raw limit of 320 UTF-16 code units. C0 and C1 control characters are refused before trimming, including tabs and line breaks. Emoji can occupy more than one UTF-16 unit while counting as one Unicode code point; a displayed character composed of several code points can use more than one of the 80 allowed positions.

A blank or invalid field removes the previous result from view and disables result download until the inputs are valid again. The download button rereads the current inputs when clicked. The lab does not save drafts in browser storage; record or download a table before closing or reloading the page.

The saved HTML contains its calculation code and embedded course. It can calculate and create downloads without a connection. Links to the learner, Markdown guides and MIT reading are separate resources; keep the repository layout or save those resources separately if you need them offline. Following a link is an explicit navigation.

## Six experiments, with worked checks

### 1. Change the base rate and retain the flagging rates

Load **More defective files · 10%**, whose cells are 90, 10, 90 and 810 in the order A and B, A only, B only, neither.

There are now 100 defective files out of 1,000. Among defective files, the flagging fraction remains `90/100 = 9/10`. Among nondefective files, it remains `90/900 = 1/10`. Yet among all 180 flagged files, the defective fraction is now `90/180 = 1/2`.

This connects to course items `pf-b2` and `pf-b3`: keeping the two flagging rates fixed does not keep the reverse conditional fixed. Both groups supply flagged files, and their relative sizes matter.

**Try:** keep those flagging rates but make half the 1,000 files defective.  
**Worked check:** enter 450, 50, 50 and 450. The flagged group has 500 files, so `P(A | B) = 450/500 = 9/10`. The result follows from these changed counts, not from a rule that reversing a conditional always preserves its value.

### 2. Make conditioning leave a probability unchanged

Load **Independent events**, with cells 20, 20, 30 and 30.

Here `P(A) = 40/100 = 2/5` and `P(A | B) = 20/50 = 2/5`. Similarly, `P(B) = 50/100 = 1/2` and `P(B | A) = 20/40 = 1/2`. The exact integer check agrees: `20 × 100 = 40 × 50 = 2000`.

**Try:** change the cells to 30, 10, 20 and 40, preserving both marginal totals.  
**Worked check:** now `P(A | B) = 30/50 = 3/5`, while `P(A) = 2/5`. The two identity sides are 3000 and 2000. The events are dependent in this new table even though the total and both marginal probabilities stayed the same.

### 3. Remove a conditioning group

Load **No outcomes in B**, with cells 0, 10, 0 and 90.

The B group has no outcomes. Therefore `P(A | B)` and `P(not A | B)` are undefined. Dividing zero by zero does not give a probability. In the reverse direction, A has ten outcomes and none is in B, so `P(B | A) = 0/10 = 0/1` is defined.

The independence identity still holds: both sides are zero. A probability-zero event is independent of any event under this finite-table definition. That does not create a conditional probability for an empty conditioning group.

**Try:** set only the neither cell to 1 and every other cell to zero.  
**Worked check:** `P(A)` and `P(B)` are both zero, the joint is zero and the independence identity holds. Conditions on A or B are undefined; conditions on their complements are defined.

### 4. Distinguish an empty table from an empty event

Load **Empty table**. All four counts and their total are zero. There is no outcome to select uniformly, so all sixteen probabilities are undefined. The lab also withholds an independence verdict.

The displayed integer products are both zero, but equality alone is not enough here: the probability model requires a positive total. This differs from experiment 3, whose total is positive and whose empty event is meaningful within that model.

### 5. Compare exact identity with rounded appearance

Load **Almost equal is not equal**, with cells 889, 890, 890 and 891.

The total is 3560; A and B each contain 1779 outcomes. The products are:

- `889 × 3560 = 3164840`
- `1779 × 1779 = 3164841`

They differ by one, so the events are dependent. Rounded percentages can look the same while these exact values differ. The model compares integer products without converting them to floating-point numbers. Percentage displays are rounded to two decimal places and mark a rounded value with ≈; the reduced fraction remains the exact answer.

**Try:** multiply every count in any small positive table by ten.  
**Worked check:** each numerator and denominator is multiplied by ten, leaving every defined probability unchanged. Each independence product is multiplied by one hundred, preserving equality or inequality.

### 6. Transfer the reasoning to a new table

Enter 6, 4, 3 and 7. Before selecting questions, predict `P(A)`, `P(B)`, `P(A | B)`, `P(B | A)` and `P(not A | not B)`. State each denominator in words.

**Worked check:** the total is 20, A contains 10, B contains 9 and not B contains 11. The five results are `1/2`, `9/20`, `6/9 = 2/3`, `6/10 = 3/5` and `7/11`. The last question uses the neither cell over both not-B cells. Independence fails because `6 × 20 = 120` differs from `10 × 9 = 90`.

## Derive the sixteen questions

Write the four cell counts as x = A and B, y = A and not B, z = not A and B, and w = neither. Let `N = x + y + z + w`. The following table is also a way to check the highlighted cells:

| Question | Numerator count | Denominator count |
| --- | --- | --- |
| P(A ∩ B) | x | N |
| P(A ∩ not B) | y | N |
| P(not A ∩ B) | z | N |
| P(not A ∩ not B) | w | N |
| P(A) | x + y | N |
| P(not A) | z + w | N |
| P(B) | x + z | N |
| P(not B) | y + w | N |
| P(A given B) | x | x + z |
| P(not A given B) | z | x + z |
| P(A given not B) | y | y + w |
| P(not A given not B) | w | y + w |
| P(B given A) | x | x + y |
| P(not B given A) | y | x + y |
| P(B given not A) | z | z + w |
| P(not B given not A) | w | z + w |

A positive denominator permits division and reduction by the greatest common divisor. A zero numerator over a positive denominator reduces to `0/1`. A zero denominator instead produces an explicit undefined result.

For positive N, the independence equation is `x/N = ((x + y)/N) × ((x + z)/N)`. Multiplying both sides by N² gives the exact test `x × N = (x + y) × (x + z)`. This is a statement about uniform selection from the entered table. It does not establish a causal relationship or population independence from observed sample counts.

## Keep the table and the course separate

**Download this table and results** saves a snapshot of the admitted input and calculations, including the selected question. Counts and ratio components are canonical decimal strings so large values survive JSON without rounding. Every probability retains the unreduced numerator and denominator counts as well as its reduced ratio. Undefined entries retain their zero denominator, set `defined` to false and use null reduced components. The snapshot also records the two exact independence products and the corresponding verdict. It is not a RecallWeave course file, and this lab does not offer a saved-table import.

**Download the 12-question course** saves the unchanged `probability-foundations.json`, including its original authorship and license metadata. It contains the original questions and fictional examples, not custom table edits. In RecallWeave, use the course picker, inspect the preview and explicitly start it. Starting a course begins a new local lesson, so save notes you want to retain first. Review the first-answer trace, try practice and download study notes. Neither this lab nor the course is a validated grade or measure of learning effectiveness.

## Sources and scope

This is an original interactive companion and guide written for RecallWeave with AI assistance. The opening file-checker scenario and its base-rate extension connect to the existing course’s `pf-b2` and `pf-b3`; the original course files remain unchanged.

The standard definitions were checked against Jeremy Orloff and Jonathan Bloom’s MIT OpenCourseWare *18.05 Introduction to Probability and Statistics*, Spring 2022: [Reading 2: Probability: Terminology and Examples][reading2], sections 2–3, and [Reading 3: Conditional Probability, Independence and Bayes’ Theorem][reading3], sections 2, 4, 6 and 7. The latter gives the product definition of independence, including the zero-probability boundary, and distinguishes both conditional directions. These primary readings were accessed on 8 October 2026. No MIT exercise, illustration or prose passage is reproduced here; the referenced materials retain their own terms.

The lab handles exact nonnegative integer counts for two events. It does not estimate uncertainty, fit a distribution, model repeated draws, infer causation or recommend a real-world decision. The existing course’s content license remains as recorded in that course; this companion does not extend it to application code or referenced materials.

[reading2]: https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/mit18_05_s22_class02-prep.pdf
[reading3]: https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/mit18_05_s22_class03-prep.pdf
