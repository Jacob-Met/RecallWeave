# Least squares: fit a line and read its residuals

This original RecallWeave course is a small laboratory for a specific question: **which straight line minimizes the total squared vertical error for these point rows?** The answer is exact for the entered data. It does not establish that a straight line is the right model of a population, that a fitted association is causal, or that a new observation will land on the line.

The six datasets below are fictional teaching examples. Every row has equal weight. Repeated rows remain separate rows; duplicating a row is not evidence that a new independent observation was made.

## Start with a line you can change

1. Open `courses/least-squares-lab.html` directly in a modern browser. The lab contains its own code, course and guide; it does not need a server, network requests or a provider account.
2. Load **A noisy trend**. Read the three entered points. Compare the trial line with the fitted line, the signed vertical residuals and the two sums of squared errors (SSE).
3. Select **Use fitted line**. It copies the exact fractions into the trial controls. The excess SSE becomes exactly zero; displayed rounded decimals never become the calculation inputs.
4. Change the middle y from 0 to 2. Predict what will happen before reading the new coefficients and residuals. Change the trial line yourself, then try the other examples.
5. Download **Course JSON** from the lab. In the repository's `demo.html` learner, use **Bring your own lesson** to choose that actual downloaded file, review the import preview and start the lesson. This is a `recallweave-deck/1` course, separate from session, trace and study-note files. The sixteen original questions, explanations and transfer prompts do not change when you edit lab data.
6. Answer a question, inspect its explanation and use the learner's review/practice flow. Use this guide to work the transfer prompts before checking the answers below. A downloaded course contains lesson content, not your answers or a saved model state.

Lab changes last only in the open tab. Loading an example replaces its point rows, trial coefficients and query value. Neither the lab nor its downloads automatically store or upload those edits. The fixed course and this guide remain downloadable when an unfinished or invalid lab value has temporarily retired the calculated results.

## What is being minimized?

Write a line as **ŷ = a + bx**, where a is the intercept and b is the slope. For row i, the signed residual is

`r_i = y_i − (a + b*x_i)`.

It is measured vertically: observed y minus the line's y at the **same x**. A positive residual places the point above the line; a negative one places it below. This is not perpendicular distance to the line. The criterion is

`SSE(a,b) = Σ r_i²`.

Squaring prevents positive and negative errors from cancelling and gives large residuals more influence on the total. For example, residuals −2, 1 and 3 have sum 2 but SSE `4 + 1 + 9 = 14`. A sum of zero residuals alone does not identify the best line: for points (−1,1) and (1,−1), the trial line y = 0 has residuals 1 and −1 and SSE 2; the line y = −x has SSE 0.

For n rows, let x̄ and ȳ be the arithmetic means. If at least two x values differ, define

```text
Sxx = Σ(x_i − x̄)²
Sxy = Σ(x_i − x̄)(y_i − ȳ)
b* = Sxy / Sxx
a* = ȳ − b* x̄
```

Equivalently, `b* = (n Σxy − Σx Σy) / (n Σx² − (Σx)²)`. The nonzero denominator identifies a unique slope. The fitted line passes through (x̄,ȳ), and its residuals satisfy both `Σr_i = 0` and `Σx_i r_i = 0`.

### Why this is the minimum

Compare any trial a,b with the fitted a*,b*. Put `δa = a − a*` and `δb = b − b*`. Expanding the squared residuals and using the two zero sums gives

```text
SSE(a,b) − SSE(a*,b*)
  = n(δa + x̄ δb)² + Sxx δb².
```

Both terms are nonnegative. With distinct x values, Sxx is positive, so equality requires δb = 0 and then δa = 0. This proves uniqueness and the minimum for the stated straight-line criterion. The first term measures how far the trial line misses the mean point; the second measures its slope difference, weighted by the spread in x. The lab reports both exact terms.

**All x equal is a valid, different state.** If every x equals c, then Sxx = 0. The minimum occurs whenever `a + bc = ȳ`, and the observed fitted value is ȳ for every row. Minimum SSE is `Σ(y_i − ȳ)²`, and the trial's excess is `n(a + bc − ȳ)²`. There are infinitely many minimizing lines, so the lab does not choose an arbitrary slope or draw a uniquely fitted line. Only the fitted value at x = c is determined. Ordinary repeated x values cause no such ambiguity when another distinct x is present. Constant y with distinct x has the unique horizontal fit b = 0.

## Six worked examples

### 1. A noisy trend

Points: (−2,−1), (0,0), (2,3). Here x̄ = 0, ȳ = 2/3, Sxx = 8 and Sxy = 8. Thus **a* = 2/3, b* = 1**.

| Row | Fitted ŷ | Residual y − ŷ | Squared residual |
| --- | ---: | ---: | ---: |
| (−2,−1) | −4/3 | 1/3 | 1/9 |
| (0,0) | 2/3 | −2/3 | 4/9 |
| (2,3) | 8/3 | 1/3 | 1/9 |

Minimum SSE is **2/3**. The initial trial a = 0, b = 1 has SSE 2, with excess 4/3 entirely from missing the mean point. At x = 1, the fit gives 5/3 inside the observed x range [−2,2]. At x = 3, it gives 11/3 outside that range: this is extrapolation.

Change only the middle y to 2. The new fit is **a* = 4/3, b* = 1**; residuals become −1/3, 2/3, −1/3. Minimum SSE remains 2/3 even though both the intercept and the signed residual pattern changed.

### 2. A perfect line

Points: (−2,−3), (0,1), (2,5). The line **ŷ = 1 + 2x** reaches every point. All residuals and minimum SSE are zero. That is a statement about these authored rows, not a causal conclusion or a guarantee about unseen rows.

### 3. A curved pattern

Points: (−2,4), (−1,1), (0,0), (1,1), (2,4). Their mean point is (0,2), and Sxy = 0. The best line is **ŷ = 2**. Its residuals are 2, −1, −2, −1, 2, and minimum SSE is **14**. The flat trial y = 0 has SSE 34, so its excess 20 equals `5 × (0 − 2)²`.

The residual pattern still curves. The rule y = x² reaches these five points exactly, but it is a different model class. Comparing in-sample SSE does not by itself establish future predictive accuracy or causation.

### 4. Repeated x values

Points: (0,0), (0,2), (2,2). Both x = 0 rows count. Their distinct y values cannot both be reached by one line at x = 0. The unique fit is **ŷ = 1 + x/2**; its residuals −1, 1, 0 have minimum SSE **2**. The x = 2 row makes the slope identifiable. Removing it leaves only x = 0: the optimum requires a = 1, with arbitrary b and the same minimum SSE 2.

### 5. All x values equal

Points: (3,1), (3,3), (3,5). Their shared best fitted value is ȳ = 3. Residuals −2, 0, 2 give minimum SSE **8**. Every line satisfying **a + 3b = 3** reaches that minimum.

Trial a = 0, b = 1 and trial a = 3, b = 0 are both minimizers. At x = 3 both give 3. At x = 4 they give 4 and 3 respectively, so a unique fitted value at x = 4 cannot be inferred from these data. Trial a = 0, b = 0 instead has SSE 35; its excess 27 is `3 × (0 − 3)²`.

### 6. One distant point

Points: (0,0), (1,1), (2,2), (10,−10). The first three lie on y = x. With the fourth row included, n = 4, Σx = 13, Σy = −7, Σx² = 105 and Σxy = −95. Therefore

```text
b* = [4(−95) − 13(−7)] / [4(105) − 13²] = −289/251
a* = −7/4 − (−289/251)(13/4) = 500/251
minimum SSE = 2400/251
```

The fitted residuals are −500/251, 40/251, 580/251 and −120/251. Their sum and x-weighted sum are both zero. Changing only the final y to 10 restores **ŷ = x**, with SSE 0. The large change illustrates sensitivity to a distant row; it is not a rule that an inconvenient observation should be deleted. Whether a row is erroneous requires information beyond its residual.

## Worked answers to the sixteen transfer prompts

The question IDs connect these answers to the actual downloaded course.

| Question | Worked transfer answer |
| --- | --- |
| `ls-residual` | With x = 2 and line ŷ = 1 + 2x, ŷ = 5. Changing observed y to 7 gives r = 7 − 5 = 2 and r² = 4. The point is above the line. |
| `ls-sse` | Reversing every residual's sign leaves its square unchanged. Residuals 2, −1, −3 still have SSE 4 + 1 + 9 = 14. |
| `ls-cancellation` | The trial y = 0 has opposite residuals that sum to zero but SSE 2. The fitted y = −x has two zero residuals and SSE 0. Squared errors, not their signed cancellation, select the fit. |
| `ls-vertical` | At point (2,5) and line ŷ = x, the vertical residual is 5 − 2 = 3, with square 9. Perpendicular distance is 3/√2, with square 9/2; it describes a different criterion. |
| `ls-exact-fit` | Replacing the middle y by 2 changes ȳ to 4/3 while x̄ = 0 and b* = 1 remain. The fit is 4/3 + x, residuals are −1/3, 2/3, −1/3, and SSE is 2/3. |
| `ls-mean-point` | Adding 5 to every x moves the mean from (3/2,3) to (13/2,3). A line expressed in x′ = x + 5 keeps slope b and changes intercept to a − 5b. The fitted y values and residuals remain the same. |
| `ls-minimum-not-perfect` | Adding 10 to every y adds 10 to the fitted intercept, with unchanged slope and residuals. The noisy example still has minimum SSE 2/3. |
| `ls-repeated-x` | Removing the x = 2 row leaves (0,0) and (0,2). Their best fitted value is 1 at x = 0, so a = 1 and b is arbitrary. Residuals −1 and 1 give minimum SSE 2. |
| `ls-y-shift` | First adding 7 to every y gives intercept 23/3 and slope 1. Then using x′ = x + 5 changes the intercept to 23/3 − 5 = 8/3. Fitted values shift by 7 and residuals do not change. |
| `ls-x-units` | With x′ = 2x, write 2/3 + x as 2/3 + (1/2)x′. The numerical slope halves, while the intercept, fitted y values, residuals and SSE remain unchanged. Slope units must be interpreted with the chosen x units. |
| `ls-duplicate-rows` | Repeating every original row three times multiplies every candidate line's SSE by three. The fitted coefficients stay 2/3 and 1; minimum SSE becomes 3 × 2/3 = 2. These copies do not demonstrate independent new evidence. |
| `ls-influential-point` | With final point (10,10), all four points lie on y = x. The fit returns a* = 0, b* = 1 and SSE 0. Restoring y = −10 returns a* = 500/251, b* = −289/251 and SSE = 2400/251. |
| `ls-equal-x` | At x = 4, the equally minimizing lines a = 0, b = 1 and a = 3, b = 0 give 4 and 3. Agreement at the shared observed x = 3 does not determine a unique prediction elsewhere. |
| `ls-extrapolation` | Querying x = 1 gives 2/3 + 1 = 5/3, inside [−2,2]. Being inside the range avoids this particular extension beyond observed x, but does not guarantee an accurate new observation or a correct model. |
| `ls-causation` | A common cause could influence both x and y, or selection could create an association in the recorded sample. Establishing a causal interpretation needs substantive knowledge and an appropriate study or intervention design; a perfect fitted line alone supplies neither. |
| `ls-curved-pattern` | For the five authored rows, y = x² has in-sample SSE 0, versus the best line's 14. This demonstrates that the model classes differ, not that the quadratic relationship is causal or will generalize. |

## What changes with units or rows?

Adding k to every y adds k to the fitted intercept and leaves the residuals unchanged. Multiplying every y by a nonzero factor q multiplies a*, b* and each residual by q, and multiplies SSE by q². SSE has squared y units, so a smaller numerical SSE after a unit change is not automatically a better fit.

Using x′ = h + g x with nonzero g changes the slope to b*/g and the intercept to a* − b*h/g, while fitted y values and SSE stay the same. Reordering rows changes their presentation, not the criterion. Repeating all rows k times leaves a unique optimum's coefficients unchanged and multiplies SSE by k. Adding or repeating just one row changes its relative weight and can change the optimum.

## Input and display boundaries

- Use 2–12 ordered point rows. Each x and y is an integer from −20 to 20. Empty, fractional or out-of-range point text remains visible for correction and retires the old results.
- Trial a and b are bounded to absolute value 1000. Query x is bounded to absolute value 40. Use integers, decimals with at most three places and a leading digit (`0.5`), or fractions such as `2/3`. A fraction's denominator must be nonzero; numerator and denominator each have at most nine digits. Exponent notation is not admitted.
- Coefficients, predictions, residuals and SSE are reduced fractions calculated with integer arithmetic. Exact fractions are the authoritative values. Secondary decimals and plot coordinates are approximate views only.
- The point range and fitted line determine the plot scale. A distant trial line is clipped at the plot boundary rather than compressing the data into a tiny region. The exact trial values remain in the table, and the plot says when the trial is wholly off screen. The table can scroll horizontally on a narrow display.
- A fitted value is a line evaluation, not a prediction interval. This lab estimates no noise distribution, confidence interval, p-value or population effect. It does not assess measurement quality, independence, sampling design or omitted variables.

## Build and check the repository artifact

From the repository root, using its existing Node runtime:

```sh
node tools/build_least_squares.mjs
node tools/build_least_squares.mjs --check
node --test tests/least-squares.test.mjs
node tools/check_least_squares_browser.mjs
```

The builder validates the actual course with `src/deck.mjs` and embeds the exact JSON and guide bytes. `--check` refuses a stale generated HTML file. The browser receiver uses an explicitly supplied existing Chromium executable, the current actual `demo.html`, a fresh private profile and an evidence directory; see its command-line help for the required paths and the 256 MiB native free-space floor. It records actual downloaded files, changed-input outcomes and desktop/mobile captures. It does not install dependencies or change another running browser.

## Attribution and references

Original lab, questions, distractors, worked examples, explanations and transfer prompts: HAMON contributor `estate-db371a37f4c8 / capability`, for RecallWeave. All datasets above are newly authored fictional examples. No reference exercises, figures or passages were copied.

Mathematical background:

- NIST/SEMATECH, *e-Handbook of Statistical Methods*, [4.4.3.1, Least Squares](https://www.itl.nist.gov/div898/handbook/pmd/section4/pmd431.htm): squared-error criterion and line-fitting formulas.
- NIST/SEMATECH, [4.1.4.1, Linear Least Squares Regression](https://www.itl.nist.gov/div898/handbook/pmd/section1/pmd141.htm): model scope and sensitivity/extrapolation limitations.
- OpenStax, *Introductory Statistics 2e*, [12.3, The Regression Equation](https://openstax.org/books/introductory-statistics-2e/pages/12-3-the-regression-equation): vertical residuals, mean-point property and interpretation.

This course and guide make no separate reuse-license grant. The linked references retain their own terms. The repository's AI disclosure also applies.
