# Eigen directions: when a transformation stays on a line

Open [the offline explorer](eigen-directions-explorer.html), or download
[the original fourteen-question lesson](eigen-directions.json). In RecallWeave,
choose the JSON under **Bring your own lesson**, inspect the preview, then select
**Start this deck**. The normal review, separate practice and study-note downloads
use this course without changing the learner.

The explorer and lesson are separate activities. An experiment download records
matrix arithmetic, not a learner's answers, identity or progress.

## What the experiment asks

A matrix sends an input vector to an output vector. With column vectors,

    A = [[a, b], [c, d]],  v = (x, y)
    Av = (ax + by, cx + dy).

An eigenvector is a **nonzero** input for which one real scale works for both
coordinates: Av = λv. The input and output stay on the same line through the
origin, with an important special case when the output is zero.

- A positive λ keeps the arrow direction.
- A negative λ reverses its direction on that line.
- λ = 0 collapses the nonzero input to the origin.
- Length changes by the nonnegative factor |λ|.

The zero vector itself is excluded. Otherwise A0 = λ0 would hold for every
number λ and would tell us nothing about the matrix.

If v is an eigenvector, every nonzero multiple cv is another representative on
the same eigenline: A(cv) = cAv = cλv = λ(cv). The scale λ does not change when
the representative changes.

## Begin with a prediction

1. Load **Different stretches**. The axes stretch by different amounts. Predict
   whether v = (1, 1) keeps its line, then inspect Av = (3, 1).
2. Change the probe to (1, 0) and apply it. Then try (0, 1). Each axis has one
   common scale even though the diagonal probe did not.
3. Load **Reflection**. Its probe reverses, and still satisfies the eigenvector
   equation. Staying on a line does not require a positive scale.
4. Load **Projection**. The nonzero y-axis probe vanishes. Its eigenvalue is zero.
5. Compare **Shear** and **Uniform scaling**. Both have a repeated root, but they
   preserve different numbers of directions.
6. Load **Quarter-turn**. Every nonzero real direction leaves its original line.
7. Load **Real directions with irrational slopes**. A nearby-looking integer
   probe fails an exact equality check.

Each preset loads and applies its complete matrix and probe. Editing an input
creates a pending change. **Apply experiment** validates all six entries together.
Pending and refused edits leave the clearly labeled applied result and its
download intact. The result prints the applied matrix and vector so those values
remain visible even when the form has later edits.

## Exact entered probes and approximate drawings

Matrix coefficients are integers from −9 to 9. Probe components are integers
from −20 to 20, with at least one nonzero component. Whole-number strings may
include a leading plus or minus and surrounding whitespace. Blank text,
fractions, exponent notation, nonfinite values and values outside these bounds
are refused.

For these bounds, JavaScript represents every intermediate integer in the
multiplication and exact probe check without rounding. Let Av = (u, w). The
signed two-dimensional cross-product is

    xw − yu.

Because the input is nonzero, this quantity is zero exactly when the output is
a scalar multiple of the input. When it is zero, the scale is computed and
reduced as an exact rational:

    λ = (xu + yw) / (x² + y²).

This expression is used as an eigenvalue only after collinearity is established.
A ratio from just one coordinate is insufficient when another coordinate
disagrees.

The plot uses equal scales on both axes. Small arrows may use an endpoint dot;
their exact coordinates remain printed. Dashed eigenlines and their unit
representatives use approximate decimal coordinates. Integer probes cannot
represent an irrational slope exactly. The drawing therefore helps locate a
direction but never overrides the exact probe check.

For A = [[1, 1], [1, 0]] and v = (2, 1), Av = (3, 2). The cross-product is
2×2 − 1×3 = 1. Even a close-looking picture must report that this probe is not
an eigenvector. The real eigenvalues are (1 + √5)/2 and (1 − √5)/2.

## Find all the real eigenlines

Rewrite Av = λv as (A − λI)v = 0. A nonzero solution requires

    det(A − λI) = λ² − trace(A)λ + det(A) = 0.

For a 2×2 matrix, trace(A) = a + d and det(A) = ad − bc. Define the
discriminant D = trace(A)² − 4 det(A).

| Case | Real eigenvalues | Real eigendirections |
|---|---|---|
| D > 0 | Two distinct roots | One line for each root |
| D = 0, A is not λI | One root repeated twice | One eigenline |
| D = 0, A = λI | One root repeated twice | Every line; the eigenspace is the whole plane |
| D < 0 | None | No nonzero real eigenvectors |

For a repeated root, multiplicity counts how often a root occurs in the
polynomial. Eigenspace dimension counts independent directions solving the
vector equation. They need not be equal.

For the shear [[1, 2], [0, 1]], the repeated root is 1. Solving
(A − I)(x, y) = (2y, 0) = (0, 0) forces y = 0, leaving only the x-axis.
For [[2, 0], [0, 2]], every vector satisfies Av = 2v. Its eigenspace has
dimension 2 but contains infinitely many lines. The few dashed spokes in the
plot are examples, not an exhaustive list.

The quarter-turn [[0, −1], [1, 0]] has polynomial λ² + 1 and D = −4.
Its eigenvalues over the complex numbers are i and −i. This lab draws the
real plane, where no nonzero eigenvector exists. It does not draw complex
eigenvectors.

## Worked preset checks

| Preset | Eigenvalues | Independent real directions |
|---|---|---|
| Different stretches | 3, 1 | x-axis, y-axis |
| Reflection | 1, −1 | x-axis, y-axis |
| Projection | 1, 0 | x-axis, y-axis |
| Shear | 1 repeated | x-axis only |
| Uniform scaling | 2 repeated | Whole plane |
| Quarter-turn | i, −i over the complex numbers | None in the real plane |
| Two oblique eigenlines | 3, 1 | (1, 1), (1, −1) |
| Irrational slopes | (1 + √5)/2, (1 − √5)/2 | Two real lines with irrational slopes |
| Zero map | 0 repeated | Whole plane |

A listed direction represents all its nonzero multiples. Two different
eigenvalues have linearly independent eigenvectors, but a generic matrix need
not have perpendicular eigenlines.

## Lesson answer and transfer checks

The learner shuffles displayed options. The stable question IDs identify these
answers independently of their on-screen letters.

| ID | Worked conclusion |
|---|---|
| ed-01 | Av = (5, 1). The transfer probe (1, −2) gives (0, −7). |
| ed-02 | A(0, 1) is the second column (−2, 4). A(1, 0) = (3, 1), and A(1, 1) = (1, 5). |
| ed-03 | v must be nonzero and satisfy Av = λv for a real λ. |
| ed-04 | λ = −3 reverses direction and multiplies length by 3. |
| ed-05 | The nonzero vector (0, 2) has eigenvalue 0. The x-axis supplies eigenvectors with eigenvalue 1. |
| ed-06 | −4v still has eigenvalue 2 because linearity preserves the same scale. |
| ed-07 | (2, 1) is not a single multiple of (1, 1). The transfer probes have eigenvalues 2 and 1. |
| ed-08 | λ² − 7λ + 10 = (λ − 5)(λ − 2). The probes (1, 1) and (1, −2) have eigenvalues 5 and 2. |
| ed-09 | (1, 1) has eigenvalue 3, while (1, −1) has eigenvalue 1. A² multiplies them by 9 and 1. |
| ed-10 | Only nonzero x-axis vectors solve the shear's eigenvector equation. |
| ed-11 | Every nonzero vector is an eigenvector of 2I. For the zero matrix, the common eigenvalue is 0. |
| ed-12 | A quarter-turn has no nonzero real eigenvector. A half-turn is −I and preserves every line. |
| ed-13 | Cross-product 1 refuses exact collinearity. The transfer probe (3, 2) maps to (5, 3) and has cross-product −1, so it also fails. |
| ed-14 | A²v = 4v. The next two powers give A³v = −8v and A⁴v = 16v. |

## Source and build

The calculation is in `src/eigen-directions.mjs`; its UI is in
`src/eigen-directions-ui.mjs`. The template, original course and this guide are
embedded into the standalone page. Its download buttons preserve the exact
course/guide UTF-8 source, including their final newline.

From the repository root:

    node tools/build-eigen-directions.mjs
    node tools/build-eigen-directions.mjs --check
    node --test tests/eigen-directions.test.mjs

The builder validates the original course with the existing shared deck
validator and refuses unexpected template/import boundaries. It changes only
the eigen-directions standalone page.

## Mathematical references and authorship

Concepts were checked against [MIT OpenCourseWare 18.06SC, Eigenvalues and
Eigenvectors](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/least-squares-determinants-and-eigenvalues/eigenvalues-and-eigenvectors/)
and [MIT 18.06 Spring 2025, Lecture 21](https://github.com/mitmath/1806).
The formal nonzero-input definition is retained throughout, including for zero
eigenvalues and rotations.

All lesson prompts, options, worked examples, explanatory prose and diagrams are
newly authored for this contribution. No textbook passage, exercise or figure
is copied. This contribution makes no additional reuse-license grant.
The linked sources retain their own terms. Reference review is not an empirical
evaluation of the lesson's learning effects.
