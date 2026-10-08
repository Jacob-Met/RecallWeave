# Measurement uncertainty: what more readings can tell you

This optional RecallWeave course and offline lab help an introductory science or
engineering learner distinguish the scatter of individual readings, uncertainty
in their mean, and uncertainty in a calibration correction shared by every reading.

Open **[measurement-uncertainty-lab.html](measurement-uncertainty-lab.html)** directly
in a browser. It includes its scripts, styles and practice deck. Calculations,
charts and the download work without a server or connection. Edit the readings,
unit label, signed additive correction and shared calibration half-width. Edits
retire the previous result; **Calculate this case** shows the new one. Reference
links require a connection only if you follow them.

The examples are fictional and the model has two specified components. The lab
does not certify a real measurement, infer a complete uncertainty budget, diagnose
an instrument or demonstrate learning effectiveness.

## A useful first comparison

The first two presets use the same readings:

`9.8, 10.2, 9.9, 10.1, 10.0 mm`

Both add a correction of `−0.04 mm`, giving corrected mean `9.96 mm`. Both have
sample standard deviation approximately `0.158114 mm` and repeatability standard
uncertainty of the mean approximately `0.0707107 mm`.

| Shared correction half-width | Shared standard uncertainty | Combined standard uncertainty |
| --- | ---: | ---: |
| `0.02 mm` | `0.0115470 mm` | `0.0716473 mm` |
| `0.30 mm` | `0.173205 mm` | `0.187083 mm` |

Only the calibration information changes. More independent readings can reduce
the projected repeatability component. They do not reduce uncertainty in a
correction that every reading shares.

Change only the additive correction: the mean moves, while observed scatter and
both uncertainty components stay fixed. Then try the identical-readings preset.
It shows zero observed scatter, but a shared component remains. Equal displayed
values do not establish an exact true value or perfect calibration.

## The model and its assumptions

Let `x_i` be `n` observations of one stable quantity, with independent
repeat-to-repeat random effects. A stated additive correction `c` applies to all
readings:

```text
raw mean = sum(x_i) / n
corrected mean = raw mean + c
s = sqrt(sum((x_i − raw mean)^2) / (n − 1))
u_A = s / sqrt(n)
```

The sample standard deviation `s` estimates the scatter of individual readings;
`u_A` estimates the standard deviation of their mean. The `n − 1` denominator
matters. These evaluations follow NIST TN 1297
[section 3](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-3-type-evaluation-standard-uncertainty)
and [Appendix A, equations A-4/A-5](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-appendix-law-propagation-uncertainty).
Calculating them does not establish independence or stability. The acquisition-order
plot helps you examine those assumptions; it does not test them.

The one shared correction is modeled as equally plausible anywhere between
`c − a` and `c + a`. The nonnegative `a` is a half-width, in the same unit:

```text
u_cal = a / sqrt(3)
```

This explicitly rectangular evaluation follows NIST TN 1297
[section 4.6](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-4-type-b-evaluation-standard-uncertainty).
The full interval width is `2a`. Neither a quoted confidence interval nor a standard
uncertainty can automatically be entered as `a`; interpret the calibration
information and its distribution first.

The repeatability and correction components are assumed independent of each other.
Their variances therefore add in this additive two-component model:

```text
u_c = sqrt(u_A^2 + u_cal^2)
```

The general propagation expression includes covariance when needed; see NIST TN
1297 [Appendix A, equation A-3](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-appendix-law-propagation-uncertainty).
If the components are correlated, this lab's combination is incomplete.

Known significant systematic effects should be corrected. The correction and its
uncertainty are different quantities, as described in NIST TN 1297
[section 5.2](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-5-combined-standard-uncertainty).
The lab applies `c` to the estimate and includes uncertainty about `c` separately.
An uncertainty component is not a substitute for applying a known correction.

## Why repetition leaves a shared component

The same uncertain correction `C` appears in every corrected observation:

```text
((x_1 + C) + ... + (x_n + C)) / n = raw mean + C
```

Its coefficient in the mean is one. Equivalently, the `n` diagonal variance terms
and `n(n − 1)` shared-covariance terms give:

```text
(n * u_cal² + n(n − 1) * u_cal²) / n² = u_cal²
```

Dividing this shared component by `sqrt(n)` would incorrectly treat the correction
as an independent new draw for every observation.

The chart compares sample sizes `n`, `2n`, `4n`, `10n` and `100n`, holding estimated
single-reading scatter and calibration information fixed. These are hypothetical
future independent samples, not extra observed data. A future scatter estimate can
differ. Copying existing rows does not create new independent evidence; genuine
equal readings remain valid observations.

For example, independent components of `0.30` and `0.40` units combine to `0.50`
units. Four times the independent readings would halve the first component to
`0.15`; the projection becomes `sqrt(0.15² + 0.40²) ≈ 0.427200` units. Repetition
approaches a `0.40` unit floor. Better calibration information changes that floor.

## Interpretation limits

- **Standard uncertainty is not a guaranteed bound.** No confidence or coverage
  percentage is attached. Additional conditions are needed for those
  interpretations; see NIST TN 1297
  [sections 5.4–5.5](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-5-combined-standard-uncertainty).
- **Type A and Type B describe evaluation methods.** They are not synonyms for
  random and systematic, and do not determine what averaging reduces. See NIST TN
  1297 [section 2](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-2-classification-components-uncertainty).
- **Zero observed scatter describes the recorded numbers.** Resolution, offsets,
  drift and omitted effects can remain. Setting `a` to zero merely excludes the
  shared calibration component from this model.
- **Units must be consistent before entry.** The unit field labels results; it does
  not convert readings, correction or half-width.
- **The plot retains acquisition order.** Shuffling a trend changes its appearance,
  not the physical conditions under which the observations were obtained.

## Input and numerical boundaries

Enter 2–100 decimal readings separated by commas, spaces or newlines. Empty
comma-separated fields are rejected rather than quietly changing the count. Use
decimal points, an ASCII minus sign and optional scientific `e` notation. The input
range is zero or magnitude `1e-12` through `1e9`; the half-width is nonnegative.
This bounded teaching interface is not a general measurement-file importer.

Calculations use JavaScript numbers. The mean uses compensated summation of the
original readings; sample spread uses centered deviations and a scaled norm.
Budget and projection table values use six significant digits; chart ticks are
abbreviated. Precision beyond the numeric representation cannot be recovered. The readings table shows accepted
numeric values, without pretending to retain significant trailing zeros from the
typed text.

## Optional twelve-question course

[measurement-uncertainty.json](measurement-uncertainty.json) contains twelve original
questions, explanations and transfer prompts in `recallweave-deck/1` format. Four
concepts each have three questions: readings and correction, scatter and mean,
shared calibration, and combining and deciding. Answer positions are balanced;
correct options do not have a general longest-answer shortcut.

The lab offers the exact committed JSON bytes through the browser's usual download
flow. The existing published validator admits the deck. Its serializer can reorder
object fields: semantic normalization differs from download-byte identity.

This contribution leaves the learner's admission flow unchanged. Full
lesson/review/practice acceptance with this deck depends on the final local-course
importer from RecallWeave issue #7. That integration is separate from using this
standalone lab or validating the file. A validator pass does not establish importer
integration, educational quality or learning effectiveness.

## Build and verify

From the repository root with Node.js 20 or newer:

```bash
node tools/build-measurement-lab.mjs
node --test tests/measurement-uncertainty.test.mjs tests/measurement-uncertainty-course.test.mjs
```

The builder reads the new lab template, calculation/UI modules and course, plus
the existing validator. It writes only `courses/measurement-uncertainty-lab.html`.
Existing learner and author builds are unchanged. Native tests cover arithmetic,
shared covariance, input boundaries, course structure and standalone/deck byte
identity. Actual keyboard, layout, offline and download behavior is qualified
separately in the browser receiving evidence.

## Content and references

Questions, fictional measurements, distractors and teaching explanations were
authored for this contribution with AI assistance. No NIST exercise or extended
passage is copied. Original course content is offered under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), with attribution to
RecallWeave contributors and retained source acknowledgments. This does not change
another course's terms or imply NIST endorsement. The existing project AI
disclosure remains applicable.

The primary reference is B. N. Taylor and C. E. Kuyatt, *Guidelines for Evaluating
and Expressing the Uncertainty of NIST Measurement Results*, NIST Technical Note
1297, 1994 edition. Linked NIST sections were read on 2026-10-08. The receiving
record distinguishes independently checked arithmetic and content from model
assumptions and remaining product-integration limits.
