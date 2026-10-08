# Rates and accumulation

An original RecallWeave lesson about turning a continuous velocity graph into a change in position. Open `rates-accumulation-explorer.html` directly in a browser. The worked curves are authored mathematical examples, not measurements of a vehicle or person.

## Explore before checking an answer

Use **Out and back** first. Before moving the inspection time, predict whether returning to the starting position also means traveling zero distance. Inspect 4 s, then 8 s. The first four seconds add 8 m of displacement. The next four subtract 8 m. The final displacement is zero, while total traveled distance is 16 m.

Next use **One interval crosses zero**. Predict where its velocity changes sign, then compare 3 s with 4 s. That short backward portion reduces net displacement but increases traveled distance. The row table shows both contributions.

You can author 2–8 points. Start at time zero, use strictly increasing whole-number seconds through 120 s, and velocities from −50 through 50 m/s with at most one decimal place. Straight line segments connect the points. Press **Apply curve** after editing. A changed or invalid draft clears the previous result and its download; it never keeps an old graph under new input.

Inspect time with the slider, its arrow/Home/End keys, or the time field. The field uses a tenth-second grid. The complete table and calculation download retain exact fractions. Graphs and decimal labels are approximations for reading; neither controls the exact arithmetic.

## What the three curves mean

Let v(t) be the authored velocity, in metres per second. The explorer chooses initial displacement zero and computes

- signed displacement D(t) = integral from 0 to t of v(u) du;
- traveled distance L(t) = integral from 0 to t of |v(u)| du;
- average velocity over [0,t] = D(t)/t, when t > 0.

The velocity plot shades only the interval already selected. Above-zero shading adds to displacement; below-zero shading subtracts. Distance counts both magnitudes. The second plot shows the resulting displacement and distance over the whole authored interval, with markers at the selected time. Its sampled curves aid reading; the inspector and complete table evaluate the exact model.

Absolute position needs an initial position: x(t) = x(0) + D(t). The explorer's displacement graph is not a claim that all motions begin at a physical origin. Adding 10 m to an initial position shifts the position curve without changing velocity, displacement or distance.

The derivative of accumulated position is the continuous velocity. A local velocity and an interval's average velocity can differ. At time zero the rate is known from the first point, but the interval average over [0,0] is undefined because duration is zero.

## A line segment, worked exactly

For adjacent points (a,A) and (b,B), let h = b−a and m = (B−A)/h. At elapsed time s from the first point,

v(a+s) = A + m s.

The signed accumulation over that prefix is A s + m s²/2. This also equals the trapezoid area s × (A + v(a+s))/2. The equality is exact for the declared straight line, not a numerical integration approximation.

If the prefix does not cross zero, traveled distance is the magnitude of that signed area. If its endpoint velocities have opposite signs, divide it at the unique zero and add the two positive triangle areas. Taking the absolute value only after adding signed areas would erase the backward portion.

For the complete segment from (0,3) to (4,−1):

1. The slope is −1 m/s², so v(t) = 3−t.
2. The zero occurs at t = 3 s.
3. Positive accumulation is (3 × 3)/2 = 9/2 m.
4. Negative accumulation is −(1 × 1)/2 = −1/2 m.
5. Net displacement is 4 m; traveled distance is 5 m.
6. At t = 2 s, v = 1 m/s but the interval average is 4 m / 2 s = 2 m/s.

A zero can occur between the slider's tenths. From (0,1) to (1,−2), the exact zero is 1/3 s. The full signed area is −1/2 m and distance is 5/6 m. The model splits at that exact rational time even though the slider cannot select it directly. At 0.5 s, the signed area is 1/8 m and distance is 5/24 m.

## Corners and boundaries

A vertex is a velocity corner only if its adjoining slopes differ. The continuous velocity from (0,0) through (2,4) to (4,0) has left slope +2 and right slope −2 m/s² at 2 s. Its acceleration, the two-sided derivative of velocity, is undefined there. Position still has derivative 4 m/s because velocity itself is continuous.

Inserting a vertex along an unchanged straight segment does not create a corner. A flat zero segment is an interval of rest. Merely touching zero at one vertex is not necessarily a reversal: (0,2), (2,0), (4,2) stays nonnegative.

At the beginning and end, the supplied curve specifies only one side. The explorer reports that one-sided slope and labels the boundary; it does not invent values beyond the authored interval. At interior non-corner times it reports the defined acceleration.

## Study the original twelve-question lesson

Choose **Download lesson**, then open RecallWeave's `demo.html`. Under **Bring your own lesson**, choose the downloaded JSON, inspect its preview, and explicitly choose **Start this deck**. Preview or cancellation should leave an existing lesson intact. The lesson uses the maintained importer, first-answer trace, review, separate missed-answer practice and study-note download.

The course does not alter the adaptive model or score the explorer. Scripted acceptance checks can establish that the interface preserves the authored questions and answers; they do not establish improved learning. To keep a readable learning record, use the current learner's study notes. The explorer's calculation JSON is a different file describing the selected curve and its exact mathematical results.

## Reproduce the explorer

`node tools/build-rates-accumulation.mjs` builds the direct-open HTML from its checked deck, model, UI, guide and template. Add `--check` to verify byte parity without rewriting. `node --test tests/rates-accumulation.test.mjs` runs the focused cases; the unchanged repository test command also discovers them.

The runtime needs a browser supporting JavaScript BigInt. Fractions are reduced using integer arithmetic. Converting a fraction to a plotting coordinate or approximate decimal does not feed back into the calculation. Files are downloaded only through explicit buttons. Everything stays in the current tab until a download; there is no network service, automatic storage or account.

## Sources and authorship

The questions, numerical choices, diagrams, explanations and code in this contribution are original. The mathematical concepts were checked on 2026-10-08 against these official OpenStax teaching sections by Gilbert Strang and Edwin Herman:

- [3.1 Defining the Derivative](https://openstax.org/books/calculus-volume-1/pages/3-1-defining-the-derivative): local rate, difference quotients and derivative existence.
- [5.3 The Fundamental Theorem of Calculus](https://openstax.org/books/calculus-volume-1/pages/5-3-the-fundamental-theorem-of-calculus): a continuous rate and its accumulation.
- [5.4 Integration Formulas and the Net Change Theorem](https://openstax.org/books/calculus-volume-1/pages/5-4-integration-formulas-and-the-net-change-theorem): net change, signed displacement and total distance.

Those sources retain their own terms. No passage, supplied exercise or figure is copied. This contribution makes no additional reuse-license grant.
