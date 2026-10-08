# Newton's method: a tangent step is a proposal

Open the [offline tangent explorer](newton-method-explorer.html) and keep this guide beside it. Download the [twelve-question course](newton-method.json), then open the existing RecallWeave learner, choose the local JSON file, inspect its preview and select **Start this deck**.

The explorer studies one polynomial at a time. It records exact rational steps; the drawn curve and short decimal labels are approximate. A tangent can lead toward a root, jump far away, become unusable or repeat an earlier point. The result panel states which fact the actual recorded run establishes.

## 1. The current coordinate, residual and slope have different jobs

A root is a coordinate r satisfying f(r) = 0. At a current coordinate x, the **residual** is f(x), the vertical function value. It is not generally the horizontal distance x − r.

The tangent at x is the line

    y = f(x) + f′(x)(X − x).

Here X is a coordinate moving along the line; x is the fixed point where the tangent was taken. Set y = 0. When f′(x) is nonzero, the tangent's x-intercept is

    next = x − f(x) / f′(x).

The quotient f/f′ is a signed correction. Subtract it from x to obtain a new coordinate. The tangent line is a local approximation to the curve; its intercept is a proposed next iterate, not automatically a root of the original polynomial.

**Worked line.** Let f(x) = 2x − 3 and start at 4. The residual is 5 and the slope is 2. The correction is 5/2, so the next coordinate is 4 − 5/2 = 3/2. Substitution gives f(3/2) = 0. This polynomial is itself a straight line, so its tangent reaches the exact root in one step.

**Try it.** Select **One step on a straight line**. Inspect the original point and the final point separately. Then change the constant coefficient from −3 to −5 and run a fresh experiment.

## 2. Exact fractions make the square-root calculation inspectable

Use f(x) = x² − 2, with f′(x) = 2x and x₀ = 2. The first three steps are:

| Current x | Exact f(x) | Exact f′(x) | Correction f/f′ | Next x |
| --- | --- | --- | --- | --- |
| 2 | 2 | 4 | 1/2 | 3/2 |
| 3/2 | 1/4 | 3 | 1/12 | 17/12 |
| 17/12 | 1/144 | 17/6 | 1/408 | 577/408 |

At the final point in this table,

    f(577/408) = 1/166464.

That value is small and positive. It is still not zero. A display rounded to a few decimal places can conceal the distinction, so inspect the exact fraction before interpreting a stop.

Starting with rational coefficients and a rational coordinate, each defined Newton step uses rational arithmetic and remains rational. The irrational root √2 can therefore be approached without being reached exactly in a finite sequence of such steps.

**Try it.** Select **Approach a square root**, set the step limit to 3, and inspect each recorded tangent. Check that the final panel says the chosen step limit was reached. Increasing the limit is another bounded experiment; it does not change a nonzero exact residual into zero by declaration.

## 3. Check for an exact root before attempting division

Two experiments can have the same zero slope and different outcomes.

| Polynomial and point | Residual | Slope | Correct interpretation |
| --- | --- | --- | --- |
| f(x) = x² at x = 0 | 0 | 0 | Already an exact root; no step is needed. |
| f(x) = x² − 2 at x = 0 | −2 | 0 | Nonroot horizontal tangent; the Newton step is undefined. |

In the second row, the tangent is y = −2, which never meets the x-axis. The explorer retains that initial point and records no invented step.

A small nonzero slope is different from zero. For x² − 2 at x = 1/1000, the next coordinate is

    1/1000 − (−1999999/1000000)/(1/500)
    = 2000001/2000
    = 1000.0005.

A starting point close to zero has produced a very large jump. The input limit applies to the starting point; the method is not silently clamped when it produces an iterate outside that starting interval. A point outside the current chart window remains available in the exact records.

## 4. A repeated exact point can prove a cycle for one start

For f(x) = x³ − 2x + 2:

- At x = 0, the residual is 2 and the slope is −2. The next point is 1.
- At x = 1, the residual is 1 and the slope is 1. The next point is 0.

Thus the exact sequence is 0 → 1 → 0. Neither point is a root. Returning to the same exact point under the same deterministic rule repeats the same future steps, giving a cycle of length two.

This conclusion concerns the selected start and recurrence. It does not say that the polynomial has no real root. A different start defines a different experiment.

**Try it.** Select **An exact two-step cycle**. Read both corrections, then inspect the repeated final point. The explorer includes the completed step returning to zero and labels the cycle; it does not continue filling the table with redundant repetitions.

## 5. Repeated roots can approach at a different rate

For f(x) = (x − 1)², the derivative is 2(x − 1). Away from the root, cancellation gives

    next = x − (x − 1)² / (2(x − 1))
         = (x + 1)/2.

Subtracting 1 from both sides shows that the distance from the root is halved on every defined step:

    next − 1 = (x − 1)/2.

From x₀ = 3, the coordinates are 3, 2, 3/2, 5/4, … . The exact distances to 1 are 2, 1, 1/2, 1/4, … ; the residuals are their squares, 4, 1, 1/4, 1/16, … . This start approaches the root without reaching it in a finite number of steps.

At x = 1 itself, the original residual is zero. The explorer stops there before trying to use a divided expression.

## 6. Interpret only what the recorded experiment establishes

Multiplying a polynomial by any nonzero constant multiplies both f and f′ by that constant. Their ratio stays the same, so the defined tangent x-intercepts stay the same. The curve's vertical scale and exact residuals can change while the iterate path does not.

Changing the starting point is different. For x² − 1, the update at a nonzero x is (x² + 1)/(2x). Its numerator is positive, so the next point has the same sign as x. A start of −3 gives −5/3 as the next point; a start of +3 gives +5/3. The method does not carry a separate instruction naming a preferred root.

Use the result labels precisely:

- **Exact root:** the recorded exact residual is zero.
- **Zero slope:** a nonzero residual has a zero derivative; the next tangent step is undefined.
- **Exact cycle:** a nonroot rational point repeats, establishing repetition under this recurrence.
- **Step limit:** the selected number of complete steps has been recorded; no further conclusion is added.
- **Arithmetic limit:** the next complete exact step would exceed the computation's bound; the last complete point and steps remain valid.

The last two labels describe bounded execution. Neither proves convergence nor divergence.

## Explorer contract and saved files

Enter four integer coefficients, from −12 to 12, for the constant, x, x² and x³ terms. Include zeros. The starting point must lie from −20 to 20 and can be an integer, a decimal with up to three decimal places, or a fraction with a positive denominator at most 1000 and numerator magnitude at most 20000. Choose 1–8 steps. Rational numerators and denominators are bounded to 4096 bits during computation.

Editing any input retires the previous computed result. Choose **Run exact steps** to calculate from the current complete inputs. The experiment download includes the admitted input, complete rational point/step records, explicit outcome and limits. It is a record for inspection, not a claim that the learner has mastered the topic.

The course and guide downloads contain the same text embedded in the self-contained page. The page makes no network requests and uses no account or hosted model. Existing RecallWeave learning estimates and review/practice behavior remain controlled by the learner itself.

## Mathematical reference

The tangent recurrence and its limitations can also be studied in [OpenStax, Calculus Volume 1, §4.9: Newton's Method](https://openstax.org/books/calculus-volume-1/pages/4-9-newtons-method), by Gilbert Strang and Edwin Herman, checked 2026-10-08. The teaching prose, questions, calculations and graphics in this contribution are original. No textbook passage, exercise or figure is reproduced.

See the repository's AI-tool disclosure for its educational-content review guidance.
