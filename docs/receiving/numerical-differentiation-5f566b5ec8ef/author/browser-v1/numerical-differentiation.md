# Sampled slopes: numerical differentiation

Open `numerical-differentiation-lab.html` directly in a modern browser. No server, account, installation, storage or network request is needed. Keep the supplied `../demo.html` alongside it if using the local learner link.

## Use the lab

The initial admitted example is **f(x)=x², x=1, h=1/2**, with the central rule inspected. Enter six whole coefficients c0..c5 from −9 to9, a whole evaluation point from −5 to5, and one positive step 1,1/2,1/4,1/8,1/16,1/32. A preset fills a draft only. Select **Calculate** to apply it. Any mathematical edit retires the preceding report and worked-record download immediately; an invalid draft stays visible with an error. The rule selector only inspects the current admitted report.

The exact table contains all six positive steps for the same polynomial and point. Inspecting a different rule does not change those calculations. **Save worked record** explicitly downloads complete JSON: admitted input, exact derivative, six sets of samples, differences, divisors, estimates, signed and absolute errors, exactness, degree guarantees, and the inspected rule. Refresh does not restore the draft.

**Download course JSON** and **Download worked guide** preserve the original embedded bytes. Open the existing local learner, choose the downloaded course, complete its twelve first questions, review explanations, retry missed questions and write your own connections. Save study notes explicitly. Neither the first-session mastery model nor a quiz score establishes learning efficacy.

At narrow widths, exact tables have their own labeled keyboard-focusable horizontal scroll regions. The page is designed for a390px phone. The SVG is an approximate illustration; table fractions are authoritative. Printing is a convenience only: long fractions may require a wider print page. The JSON and Markdown downloads preserve the full exact content.

## The mathematical experiment

Let f(x)=Σ c_k x^k. The analytic reference is f′(x)=Σ k c_k x^(k−1).
For positive h:

- Forward F=[f(x+h)−f(x)]/h.
- Backward B=[f(x)−f(x−h)]/h.
- Central C=[f(x+h)−f(x−h)]/(2h).
- Signed error is Q−f′(x); absolute error is |Q−f′(x)|.

The model uses reduced BigInt rational arithmetic, not floating-point polynomial evaluation. All exact number records expose numerator and positive denominator strings, a fraction string, and an approximate display number. No claim about roundoff or noisy measured samples follows from these tables. The graph uses Number coordinates and201 display samples; it is not an exact curve or an error oracle.

One-sided rules are exact for every polynomial of degree at most1. Central is exact for every polynomial of degree at most2. These are **general degree guarantees**, distinct from actual equality at a particular polynomial, point and step. The zero polynomial has no degree but is exact for every rule. The interface says so explicitly.

For a quadratic ax²+bx+c, F=f′+ah and B=f′−ah, while C=f′. The central secant goes through (x−h,f(x−h)) and (x+h,f(x+h)); at coordinate x it has height f(x)+ah². It need not pass through (x,f(x)), even when parallel to the tangent. The graph constructs that actual endpoint line.

For a cubic x³, central signed error is h². For x⁵ at x=0 it is h⁴. Thus halving produces factors1/4 and1/16 in these examples. General order descriptions do not require every input to have the same finite-step error ratio.

A useful counterexample is f(x)=x²−x³ at x=0:
F=h−h², B=−h−h², C=−h², exact derivative0. At h=1 the forward estimate happens to be exact while central is−1. At h=1/2 the forward estimate becomes1/4. This disproves both “central is always closer” and “every smaller step improves this finite estimate.”

## Worked course and transfer responses

These responses support explanation and discussion; transfer text is not automatically scored.

### 1. For h > 0, a central difference uses f(x−h) and f(x+h). What is its slope?

Correct choice: **[f(x+h)−f(x−h)] / (2h)**

The two sample locations are 2h apart. A slope divides the change in function value by that full horizontal separation.

Transfer: For x=2 and h=1/4, name both sample locations and their separation.

One worked response: x−h=7/4, x+h=9/4, separation=1/2.

### 2. For f(x)=x² at x=1 with h=1/2, what are the forward estimate and its signed error Q−f′(1)?

Correct choice: **5/2 and 1/2**

f(3/2)=9/4 and f(1)=1. Their difference 5/4 divided by 1/2 is 5/2. The exact derivative is 2, so Q−f′=1/2.

Transfer: Keep x=1 but use h=1/4. Derive the forward estimate from the two samples.

One worked response: f(5/4)=25/16, f(1)=1. Their difference9/16 divided by1/4 gives9/4.

### 3. For f(x)=x² at x=−1 with h=1/2, what is the backward estimate?

Correct choice: **−5/2**

The backward difference is [f(−1)−f(−3/2)]/(1/2)=[1−9/4]/(1/2)=−5/2. The derivative is −2, giving signed error −1/2 and absolute error 1/2.

Transfer: Explain why a negative signed error here is different from a negative absolute error.

One worked response: Signed error Q−f′=−1/2 records direction. Its absolute value is1/2; an absolute error cannot be negative.

### 4. Which statement gives polynomial degree guarantees for every point and positive h in exact arithmetic?

Correct choice: **Forward/backward are guaranteed through degree 1; central through degree 2.**

For a linear polynomial, the one-sided quotient equals the constant derivative. For a quadratic, symmetric endpoint subtraction cancels the h² term before division, so the central quotient also gives the exact derivative. Higher-degree polynomials can still be exact at particular points.

Transfer: Expand (x+h)²−(x−h)² and explain the central quadratic guarantee.

One worked response: (x+h)²−(x−h)²=4xh. Divide by2h to get2x.

### 5. For f(x)=x⁴ at x=0, what does the central difference give for any positive h?

Correct choice: **0, exactly matching f′(0), despite degree 4 exceeding the general degree guarantee.**

The endpoint values (−h)⁴ and h⁴ are equal, so their difference is zero. f′(0)=4·0³=0. This point-specific symmetry does not extend the guarantee to every quartic at every point.

Transfer: Try x=1 instead: explain why the symmetry argument no longer makes the endpoint values equal.

One worked response: At x=1 the endpoints1−h and1+h are not opposites. For the quartic the central estimate is4+4h², rather than the exact4.

### 6. For f(x)=x², x=1, h=1/2, the central secant has slope 2. Which geometric statement is correct?

Correct choice: **It is parallel to the tangent, but at horizontal coordinate 1 its height is 5/4 rather than 1.**

The secant passes through (1/2,1/4) and (3/2,9/4); its line is y=2x−3/4. The tangent at x=1 is y=2x−1. Equal slopes do not mean equal lines.

Transfer: For the same quadratic, derive the vertical offset of the central secant at x in terms of h.

One worked response: The midpoint of the two endpoint function values is x²+h². Its offset from f(x)=x² is h².

### 7. For f(x)=x³ at x=0, the central estimate is h² and the exact derivative is 0. What happens to the absolute error when h is halved?

Correct choice: **It is multiplied by 1/4.**

Replacing h by h/2 changes h² to h²/4. The error remains positive for every positive step in this experiment.

Transfer: Compute the exact central errors for h=1/4 and h=1/8.

One worked response: For h=1/4, error1/16; for h=1/8, error1/64.

### 8. For f(x)=x²−x³ at x=0, the forward estimate is h−h². What happens when h changes from 1 to 1/2?

Correct choice: **The estimate changes from 0 to 1/4, so absolute error increases from 0 to 1/4.**

The derivative at 0 is 0. At h=1, h−h²=0 by cancellation; at h=1/2 it is 1/4. A smaller finite step need not improve a particular estimate when a coarse step was accidentally exact. At h=1, the central estimate is −1, so central is not always the closer rule either.

Transfer: Derive the central estimate for this polynomial at 0, then compare all three rules at h=1.

One worked response: At x=0, F=h−h², B=−h−h², C=−h². At h=1 they are0,−2,−1, versus derivative0.

### 9. For f(x)=x³ at x=1 with h=1/2, what are the central estimate and signed error?

Correct choice: **13/4 and 1/4**

f(3/2)=27/8 and f(1/2)=1/8. Their difference is 26/8=13/4 and their horizontal separation is 1. The exact derivative is 3, so the signed error is 1/4.

Transfer: Expand the central quotient for x³ at general x to show why its signed error is h².

One worked response: (x+h)³−(x−h)³=6x²h+2h³. Divide by2h:3x²+h²; subtract3x² to geth².

### 10. A central sampled slope is zero for f(x)=x² at x=0. What is justified?

Correct choice: **The two symmetric endpoint values are equal; this does not prove the function is constant.**

For any h>0, f(−h)=f(h)=h². Equal endpoint values produce a zero secant slope although the polynomial is nonconstant. Here the exact derivative is also zero at the center, but that is a local fact.

Transfer: Give a nonconstant polynomial whose values at −1 and 1 match, and state what a zero secant slope alone tells you.

One worked response: x² works: f(−1)=f(1)=1. Zero secant slope says those endpoint values match, not that the intervening or global function is constant.

### 11. For f(x)=x⁵ at x=0, the central estimate is h⁴ while the derivative is 0. Halving h changes the absolute error by which factor?

Correct choice: **1/16**

The special point cancels lower powers of h, leaving h⁴. Thus (h/2)⁴=h⁴/16. A general second-order error description does not mean every polynomial and point exhibits exactly a factor of four.

Transfer: Compare this example with x³ at 0. What differs, and what remains the same about both positive-step errors?

One worked response: x³ givesh² and quarter-error halving; x⁵ givesh⁴ and sixteenth-error halving. Both are positive for every h>0 and approach0 as h tends to0.

### 12. This lab evaluates bounded polynomials with exact rational arithmetic. Which claim is supported?

Correct choice: **The table isolates exact discretization errors for these inputs; it does not model floating-point roundoff or noisy measurements.**

The table is computed with reduced integer fractions, so it contains no floating-point evaluation error. Approximate numbers and SVG coordinates are display aids only. Real sampled data and floating-point evaluation introduce additional effects outside this model.

Transfer: Name one extra source of error you would need to study before choosing a step for measured or floating-point data.

One worked response: Examples: roundoff in subtracting nearby floating-point values, measurement noise, quantization, or uncertainty in sample locations. These are absent from this exact polynomial experiment.

## Native source and reproducibility

The new model is `src/numerical-differentiation.mjs`. Its input must have exactly coefficients, point and stepDenominator. Booleans, strings, holes, nonfinite values, extra input keys and out-of-domain values refuse. Output is detached and recursively frozen. `serializeDifferentiation(report, inspectedMethod)` requires an actual model-produced report and a known rule; a parsed lookalike is not an admitted report.

`node tools/build-numerical-differentiation.mjs` regenerates this direct-open HTML using only Node built-ins and the unchanged project deck validator. Add `--check` to compare exact bytes without writing. New focused controls are `node --test tests/numerical-differentiation.test.mjs tests/numerical-differentiation-course.test.mjs`. The browser receiver accepts an explicitly installed Chrome path; it does not install a browser or open a personal profile.

The course and worked examples are original. Reference: NIST Digital Library of Mathematical Functions, [§3.4 Differentiation](https://dlmf.nist.gov/3.4), particularly the two- and three-point differentiated interpolation formulas. The concrete polynomial identities above follow directly by expansion; no external explanation text was copied.

Original course and guide text: CC BY4.0. This lab is bounded teaching material, not a production step-size selector or a model of measurement error.
