# Chemical equilibrium: direction, extent and what remains

## One declared model

This lesson uses one ideal homogeneous reaction, **A + B ⇌ C**, in a closed system at fixed temperature and volume. It assigns all activity coefficients the value 1. The letters are generic species, not a recipe for a particular substance.

Write a = [A]/c°, b = [B]/c° and c = [C]/c°, with the standard concentration c° = 1 mol L⁻¹. These normalized concentrations are dimensionless. For this model, Q = c/(ab), and the supplied equilibrium constant K is also dimensionless. A displayed concentration ratio of 2 therefore means 2 × c°.

The model asks which composition is compatible with equilibrium and the initial component totals. It does not calculate reaction rates or the time needed to reach that composition. Its assumptions also exclude nonideal activities, additional reactions, changes of phase and changes of temperature or volume during an experiment.

## Read a quotient before predicting a direction

When a and b are positive, compute Q from the current composition.

| Comparison | Net direction in this model |
| --- | --- |
| Q < K | Forward: A and B decrease; C increases |
| Q > K | Reverse: A and B increase; C decreases |
| Q = K | Balanced composition |

For example, a = 2, b = 3 and c = 3 give Q = 3/(2 × 3) = 1/2. With K = 2, forward conversion is favored. This comparison gives a direction; it does not give a timescale or the final extent.

Chemical equilibrium does not require equal concentrations. It describes balanced forward and reverse rates and no net composition change under the stated constant conditions.

If a or b is zero, the quotient would divide by zero. The lab labels it undefined rather than inserting a finite number. A direction can still be inferred from the allowed stoichiometric changes and the signed residual described below.

## Build the initial/change/equilibrium table

Let x be a signed forward extent measured in the same normalized concentration units.

| Species | Initial | Change | At extent x |
| --- | --- | --- | --- |
| A | a | −x | a − x |
| B | b | −x | b − x |
| C | c | +x | c + x |

A negative x represents reverse conversion. Requiring all three concentrations to remain nonnegative gives

**−c ≤ x ≤ min(a, b).**

Both **a + c** and **b + c** remain unchanged. They are the two conserved component totals for this reaction. The sum a + b + c changes by −x: the number of species molecules is not the same conserved quantity as the component totals.

For initial (3, 2, 1), the feasible interval is [−1, 2]. At x = 1/2 the composition is (5/2, 3/2, 3/2), with totals 4 and 3. At x = −1/2 it is (7/2, 5/2, 1/2), with the same totals.

## Find the admissible equilibrium

Substitute the extent expressions into the mass-action condition:

**K(a − x)(b − x) = c + x.**

Define f(x) = K(a − x)(b − x) − (c + x). On the feasible interval,

**f′(x) = −K(a + b − 2x) − 1 ≤ −1.**

The inequality follows from x ≤ min(a, b). Thus f is strictly decreasing. Its value at −c is nonnegative, and its value at min(a, b) is nonpositive. These facts give one admissible root. They also let the lab decide direction without dividing by ab: positive f(0) means forward, and negative f(0) means reverse.

For (a, b, c) = (2, 2, 0) and K = 1, the equation becomes x² − 5x + 4 = 0. Its algebraic roots are 1 and 4. Only x = 1 lies in [0, 2]. The equilibrium composition is (1, 1, 1), not complete consumption of the reactants.

Starting instead from (0, 0, 2) with the same K gives the same conserved totals. Reverse extent x = −1 reaches (1, 1, 1). The initial quotient was undefined, but reverse conversion was available because C was present.

Starting from (1, 1, 1) is already balanced for K = 1. The exact extent is zero.

## A changed mixture has new component totals

Begin at (1, 1, 1) with K = 1 and add A at fixed volume to obtain (2, 1, 1) before conversion. The immediate quotient becomes 1/2 while K remains 1.

Now the extent equation is x² − 4x + 1 = 0. The admissible root is **x = 2 − √3**, approximately 0.2679491924. The new equilibrium concentrations are approximately (1.7320508076, 0.7320508076, 1.2679491924). Their conserved totals are 3 and 2. Adding A changed the available component total; it did not change K within the declared constant-temperature model.

Removing C from the original mixture to obtain (1, 1, 0) makes Q = 0. Forward conversion is favored, but a finite positive K still requires an equilibrium calculation rather than an assumption of completion.

## When no conversion is available

For (2, 0, 0), the feasible interval is [0, 0]. There is no B for forward conversion and no C for reverse conversion. The lab reports **no feasible change**.

Its quotient is 0/(2 × 0), which is undefined. The unchanged boundary state must not be described as having a finite quotient equal to K. The all-zero mixture has the same reporting distinction.

Adding C to make (2, 0, 1) changes the interval to [−1, 0]. Reverse conversion is now available even though B still starts at zero.

## What the numerical bounds mean

The lab parses admitted decimal inputs exactly as rational numbers. It retains exact rational signs of f at interval endpoints and refines the interval by bisection.

If a tested value has exactly zero residual, the lab returns that exact root. Otherwise it performs 64 refinements. The final interval is at most 1/2⁶⁴ of the original feasible width, and its endpoint signs still enclose the unique root. A rational root need not fall on a bisection midpoint; such a root can remain bracketed too.

The midpoint of a nonzero-width bracket is an estimate. The lab reverses extent-bound order when it reports bounds for A and B, because those concentrations decrease as x increases. C bounds follow the same order as x. All exact values and the complete refinement record are retained in the observation download.

These bounds describe a calculation. They are not experimental confidence intervals, and refinement steps are not units of reaction time.

## Use the offline explorer

1. Enter initial normalized A, B and C concentrations and K, or choose one of the original examples.
2. Select **Apply experiment**. The direction, equilibrium table and conserved totals belong to this one admitted input.
3. Move the extent slider to inspect any of 101 evenly spaced feasible compositions. This is a composition inspection, not a trajectory. The initial mixture, inspected point and calculated equilibrium have separate labels.
4. Open **Exact root bounds and refinement** to inspect the retained calculation.
5. Download the observation when the current input is applied. Editing an input retires that result and disables its observation download until another successful Apply.

The input grammar accepts unsigned ordinary decimal strings with an integer part and up to six decimal places. A, B and C range from 0 through 100; K ranges from 0.001 through 1000. These are bounded educational inputs. Exponents, signs, blank strings and out-of-range values are refused.

The course and this guide can be downloaded independently of the current experiment. Load the course JSON in RecallWeave, preview it and explicitly start a lesson. Review and practice remain separate from the first session, and study notes retain the authored explanations and transfer prompts.

The standalone explorer requires no browser storage or external request.

## Transfer answers

1. With c = 6, Q = 6/(2 × 3) = 1. Changing composition changes Q even though the stoichiometry is the same.
2. Q = 4 is greater than K = 2, so net reverse conversion is favored. Neither value gives a timescale.
3. Constant composition does not reveal the numerical rates. At equilibrium their equality is known; their magnitudes need kinetic information. Constant observations alone can also conceal slow or otherwise constrained changes.
4. At x = −1/2, the composition is (7/2, 5/2, 1/2), a net reverse change.
5. For (1, 4, 2), the interval is [−2, 1]. C reaches zero at −2; A reaches zero at 1.
6. The conserved totals are a + c = 4 and b + c = 3. At x = −1/2, 7/2 + 1/2 = 4 and 5/2 + 1/2 = 3.
7. Starting from (0, 0, 2), x = −1 gives (1, 1, 1). Both initial mixtures have a + c = b + c = 2.
8. For (2, 0, 0), only x = 0 is feasible. Reverse conversion would require consuming absent C.
9. For (1, 1, 0), Q = 0 and forward conversion is favored for K = 1. This does not imply complete conversion.
10. A kinetic model and its rate constants, together with appropriate initial and operating conditions, would be needed to predict a time course.
11. For (2, 0, 1), the interval [−1, 0] permits consuming C to produce A and B. The zero initial B concentration does not block reverse conversion.
12. Zero width with exactly zero residual gives the exact root of this declared equation. It does not validate ideal activities, the absence of other reactions or the applicability of the model to an actual substance.

## Background and original material

The definitions of chemical equilibrium and equilibrium constants are grounded in the IUPAC Gold Book: [equilibrium constant](https://goldbook.iupac.org/terms/view/E02177), [standard equilibrium constant](https://goldbook.iupac.org/terms/view/S05915), and [chemical equilibrium](https://goldbook.iupac.org/terms/view/C01023). The initial/change/equilibrium teaching structure is also discussed in [MIT OpenCourseWare 3.091, Fall 2018, extra equilibrium notes for Lecture 28](https://ocw.mit.edu/courses/3-091-introduction-to-solid-state-chemistry-fall-2018/0de26165d2c924f4a46e7cb1e3118c23_MIT3_091F18_Equilibrium.pdf).

The equations above are derived for the declared A + B ⇌ C ideal model. All lesson wording, numerical cases, questions, diagrams and code in this contribution are newly authored. Original course wording and numerical cases: CC0-1.0; referenced works retain their own terms.
