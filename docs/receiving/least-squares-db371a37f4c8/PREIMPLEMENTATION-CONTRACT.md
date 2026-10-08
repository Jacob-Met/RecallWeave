# Least-squares learner contract — frozen before implementation

Owner: estate-db371a37f4c8 / capability. Receiving repository: Jacob-Met/RecallWeave. This contract is for an original course and directly openable lab, with existing learner/importer/catalog source preserved.

## Learner workflow

Open the self-contained lab, choose one of six authored examples, edit paired x/y values, and compare an editable trial line with the exact least-squares solution. Inspect signed vertical residuals, each squared residual, the total SSE, the mean point and the change in SSE. Evaluate the fitted line at a chosen x and distinguish values inside and outside the observed x range. Download the fixed original sixteen-question course and worked guide; the course JSON must pass the actual shared parser and be consumed by the actual current learner import/preview/start/review flow. Editing lab data never edits the fixed course. State remains in the tab; no automatic storage, uploads or provider calls.

## Data and mathematics

- Two to twelve ordered point rows; each x and y is an integer in [-20,20]. Repeated points and ordinary repeated x values are admitted and counted as equal-weight rows. No row is silently discarded.
- Fit y-hat = a + b*x by minimizing sum((y_i - a - b*x_i)^2). Residual means observed y minus fitted y, measured vertically at the same x.
- Use exact reduced rational arithmetic for coefficients, means, residuals and SSE. Number conversion is only for drawing and explicitly approximate decimal presentation; rounded values never feed the calculation.
- A unique line exists exactly when at least two distinct x values occur. Compute b = (n*sum(x*y)-sum(x)*sum(y))/(n*sum(x*x)-sum(x)^2) and a = mean(y)-b*mean(x).
- All-equal x is a valid teaching state with no unique slope/intercept. If every x equals c, all minimizing lines satisfy a+b*c=mean(y). Minimum SSE is sum((y_i-mean(y))^2). Only their fitted value at x=c is determined. Do not select an arbitrary horizontal line or display a numerical slope as the unique answer.
- Constant y with at least two distinct x has a unique horizontal fit and zero SSE.
- Trial a/b and query x accept bounded integer, finite-decimal or fraction strings. Coefficients are limited to absolute value1000; query x to40. Fraction numerator/denominator length is bounded, denominator must be nonzero, and decimals have at most three places. The exact fit can be copied to the trial fields without rounding.
- Every accepted unique fit satisfies sum(residual)=0, sum(x*residual)=0, and passes through the mean point. For delta a/b from the optimum, SSE(trial)-SSE(fit)=n*(delta a+mean(x)*delta b)^2+sum((x-mean(x))^2)*delta b^2. This identifies the mathematical minimum; it does not establish a correct causal model.
- Invalid point/scalar text remains visible for correction and retires computed outputs rather than leaving an old fit attached to new visible inputs. The fixed checked course download remains independent and available. All-equal x has its own clear computed state, not the malformed-input state.

## Pedagogical scope

Six examples cover a noisy trend, a perfect line, a curved pattern, repeated x, all-equal x and an influential distant point. Sixteen original questions span residuals/criterion, fitted line/mean, changes/units and interpretation limits. Each has four distinct options, a worked explanation and transfer prompt; the guide contains worked transfer answers. Course examples are explicitly fictional. A minimum SSE is not proof of linearity or causation; an in-range fitted value is not guaranteed accurate, and extrapolation adds an unsupported extension. No confidence intervals, p-values, population-inference or clinical claims are introduced.

## Presentation and receiving

Use semantic keyboard-operable controls, a readable SVG plot and complete numeric tables; color is supplemented by line patterns and labels. Clip drawn lines to the plot and identify an off-screen trial line instead of distorting or hiding data. Verify desktop and390px views, actual input/focus behavior, six changed examples, unique/nonunique/invalid transitions and recovery, exact course/guide downloads and real learner import of the emitted JSON. Independent analytical receiving challenges the exact equations and examples without depending on the author's test oracle. Native execution uses existing Node and Chrome only, with a fresh owned profile and256MiB free-space floor. Preserve original failures and exact source/runtime/artifact identities. No optional repeat of settled shared learner gates.

## Source boundary

New course files only: courses/least-squares-core.mjs, courses/least-squares-ui.mjs, courses/least-squares-lab.template.html, courses/least-squares-lab.html, courses/least-squares.json, courses/least-squares.md; dedicated tools/build_least_squares.mjs, tools/check_least_squares_browser.mjs and tests/least-squares.test.mjs; evidence under docs/receiving/least-squares-db371a37f4c8/. One additive README section during final source composition. The #39 catalog owner retains catalog files/manifest and receives the integrated lesson as a later catalog input. No learner, importer, editor, model, existing course or other-owner test implementation is changed.
