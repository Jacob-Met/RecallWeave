# Between the samples: numerical integration

This companion belongs to the original RecallWeave quadrature lesson. It explores
a deliberately small family of polynomials so that both the quadrature and the
reference integral can be kept as exact fractions.

Open `quadrature-lab.html` directly. Enter the six coefficients from the constant
term through x^5, choose integer bounds a < b, and select an even elementary
subinterval count. **Apply polynomial** accepts those settings together.
**Apply example** fills and accepts one worked case. Changing an input retires
the displayed calculation until you apply again.

The rule selector changes only which approximation and node table you inspect.
**Save complete observation** retains every rule and refinement, with that
inspection choice recorded separately. It does not save learner answers.
The course and this guide can be downloaded independently. To study the course,
open RecallWeave's `demo.html`, choose the JSON under **Bring your own lesson**,
review the preview and select **Start this deck**. This starts that deck in the
existing learner; no extra lab-specific start or registration is required.

## Read the calculation

Write the input as f(x) = c0 + c1 x + ... + c5 x^5. The permitted coefficients
are integers in [-9,9], the bounds are integers in [-5,5], and n is one of
2, 4, 8, 16 or 32. Every elementary subinterval has width h = (b-a)/n.

The midpoint sum weights each elementary midpoint value by h. The trapezoid
sum weights each outer endpoint by h/2 and each interior endpoint by h.
Composite Simpson groups two elementary subintervals at a time. Its aggregated
coefficients are 1,4,2,4,...,2,4,1, multiplied by h/3; for n=2 this is 1,4,1.
The lab's n always counts elementary subintervals, not Simpson panels.

The reference I comes from integrating each polynomial term. Signed error
means Q-I, where Q is a quadrature estimate. A negative error puts the estimate
below the exact signed integral; absolute error removes that sign. Integration
retains cancellation between positive and negative contributions. It does not
automatically give the total geometric area.

Fractions in the model are exact BigInt rational calculations. Decimal values,
SVG coordinates and the drawn polynomial/approximation curves are views with
limited precision. Sampling the drawing is never used to decide exactness.

## Worked investigations

### A quadratic brackets the reference

Apply f(x)=x² on [0,2], n=2. The midpoint nodes are 1/2 and 3/2, both with weight 1,
giving Q_M=1/4+9/4=5/2. The trapezoid sum is 0/2+1+4/2=3.
Simpson gives (1/3)(0+4+4)=8/3, equal to I=8/3.

The midpoint error is -1/6 and the trapezoid error is 1/3. At n=4, the midpoint
estimate is 21/8 and the trapezoid estimate is 11/4, with errors -1/24 and 1/12.
Both absolute errors have decreased by a factor of four. Simpson was already exact.

### Cubic exactness and a quartic refinement

For f(x)=1+x³ on [0,2], the reference is 2+4=6.
At n=2, midpoint gives 11/2, trapezoid gives 7, and Simpson gives 6.
Midpoint and trapezoid guarantee exactness for degree at most one. Simpson
guarantees exactness through degree three. These are sufficient guarantees;
a higher-degree special case can still be exact.

For f(x)=x⁴ on [-1,1], I=2/5. Simpson at n=2 gives 2/3 and error 4/15.
At n=4 its values are 1,1/16,0,1/16,1 with coefficient pattern 1,4,2,4,1
and factor 1/6. The result is 5/12, with error 1/60.
The error ratio is (4/15)/(1/60)=16. Inspect the later rows before making a
claim about the observed refinement sequence.

### Two agreeing answers can miss the integral

Apply f(x)=2x⁴-3x³+x² on [0,1], n=2. At 0,1/2,1 every value is zero.
The trapezoid and Simpson estimates therefore both return zero.
But term-by-term integration gives 2/5-3/4+1/3=-1/60.

No rounding caused this disagreement. The sampled values simply omitted
information between the nodes. At the added n=4 node x=1/4, the value is 3/128;
at x=3/4 it is -9/128. Those new values expose behavior the coarse endpoints missed.

### Refinement can lose a coincidentally exact answer

Apply f(x)=5x⁴-9x² on [-1,1]. Its reference is 2-6=-4.
At n=2 the trapezoid sum is also -4. At n=4, the outer values remain -4,
the new values at ±1/2 are -31/16, and the middle value is zero.
The new trapezoid sum is -63/16, whose signed error is +1/16.

The coarse error contributions happened to cancel. This example disproves a
claim that every individual refinement must decrease error. It does not
disprove convergence as the mesh tends to zero.

### Symmetry and zero errors

For x^5 on [-2,2], the exact integral is zero. Each of the three rules also
cancels equally weighted opposite nodes. Degree five is still outside their
general exactness guarantees. Change only one bound to remove this symmetry.

The all-zero polynomial has no finite polynomial degree in this model.
It has zero integral and zero quadrature error everywhere. If two neighboring
error values are both zero, their ratio would be 0/0: the lab reports
**undefined · both exact**. If only the new error is zero it reports
**undefined · now exact**. If the old error is zero and the new error is nonzero,
the ordinary ratio is zero; it is not evidence of fast convergence.

## Lesson answer map and transfer checks

Question numbering follows the original JSON order. Letters below refer to
that file's option order; RecallWeave may shuffle the displayed choices.

| Item | Original option | Transfer check |
|---|---|---|
| 1 | B | f=-5 on [0,2] has signed integral -10 and geometric area 10. |
| 2 | C | Midpoint nodes are 1/4,3/4,5/4,7/4; multiplying the squared-value sum by 1/2 gives 21/8. |
| 3 | A | On [0,2] with n=4, weights are 1/4,1/2,1/2,1/2,1/4 and sum to 2. |
| 4 | D | On [0,4] with n=4, weights are 1/3,4/3,2/3,4/3,1/3 and sum to 4. |
| 5 | B | 3-8/3=1/3; its absolute value is also 1/3. |
| 6 | C | x² on [0,2] gives midpoint 5/2 at n=2, different from 8/3; Simpson remains exact. |
| 7 | A | Newly sampled 1/4 and 3/4 have nonzero values; shared old nodes alone did not establish the integral. |
| 8 | D | Simpson's weighted sum at n=4 is 5/12; 5/12-2/5=1/60. |
| 9 | B | For this case, later trapezoid errors are 5/256 at n=8 and 21/4096 at n=16; these are observations, not universal promises. |
| 10 | C | Changing the upper bound to 1 removes paired cancellation; the exact integral on [-2,1] is -21/2. |
| 11 | A | All errors may be exactly zero while every adjacent error ratio remains undefined. |
| 12 | D | Sampling/quadrature error and finite-arithmetic rounding are separate; this lab isolates the first in its exact fractions. |

## Source and local verification

Mathematical background was checked on 2026-10-08 against
[NIST DLMF §3.5](https://dlmf.nist.gov/3.5) and
[T. von Petersdorff's University of Maryland numerical-integration notes](https://math.umd.edu/~petersd/460/numint460.pdf).
The questions, worked settings, explanations, transfer tasks and graphics here
are newly authored; no reference exercise, prose or figure is reproduced.

From the repository root, run `node --test tests/quadrature.test.mjs tests/quadrature-course.test.mjs`.
Rebuild this page with `node tools/build-quadrature.mjs`, or verify its exact
model/UI/template/course/guide parity with `--check`. The unchanged learner
validator checks the deck's structure; mathematical and teaching review are
separate from structural validation. No learning-efficacy result is claimed.
