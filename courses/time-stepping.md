# Time stepping: decay, stability and accuracy

A differential equation describes change continuously. A numerical update moves between selected times. Those are different objects: a decaying equation can produce a growing numerical sequence when its step is poorly chosen.

Open [the offline time-stepping lab](time-stepping-lab.html). Predict one update, apply the settings and inspect the recorded rows. Download the [original 16-question course](time-stepping.json) into the existing [RecallWeave learner](../demo.html) for a separate question, review and retry session. The lab does not alter the learner.

This lesson connects the [RC transient guide](rc-transients.md), which gives an exact exponential response, with [discrete feedback](feedback-control.md), whose update index does not itself specify physical duration. It studies one scalar equation. Spatial diffusion, numerical quadrature and adaptive ODE solvers are outside this lesson.

## 1. Keep the equation, time and state separate

We use the ideal model

    y'(t) = -lambda y(t),     y(0) = y0,     lambda > 0.

Here y is dimensionless, t is measured in seconds and lambda is in inverse seconds. Its exact solution is

    y(t) = y0 exp(-lambda t).

A positive initial value remains positive and approaches zero. A negative initial value remains negative and approaches zero in magnitude. Zero remains zero. A nonzero exact solution does not reach zero at any finite time.

This is a mathematical teaching example, not a fitted device or measured data. For an ideal unforced RC voltage gap, lambda could represent 1/(RC); the lab does not infer circuit parameters or simulate a complete circuit.

Choose a time step h > 0. Row n is at physical time t[n] = n h. N updates record N+1 rows because row zero contains the initial condition. Changing h while keeping N fixed also changes the experiment's final time.

The product

    z = lambda h

has no units. It will determine both numerical multipliers.

## 2. Use the old slope: forward Euler

Forward Euler evaluates the derivative at the state already known:

    F[n+1] = F[n] + h (-lambda F[n])
           = (1 - z) F[n].

For lambda=1, h=0.5 and y0=1, the multiplier is 1/2. The first five values are

    1, 1/2, 1/4, 1/8, 1/16.

They occur at 0, 0.5, 1, 1.5, 2 seconds. At the final time, the exact value is exp(-2), approximately 0.135335. The forward estimate1/16=0.0625 is smaller.

Forward Euler replaces an exponential response over one step with a linear increment based on the old slope. That replacement can alter signs and growth.

## 3. Read the multiplier before trusting the plot

For this equation, forward Euler has multiplier q=1-z.

| Step product z | Multiplier q | Behavior of a nonzero numerical starting state |
| --- | --- | --- |
| 0 < z < 1 | 0 < q < 1 | Keeps its sign and decays in magnitude |
| z = 1 | q = 0 | Becomes zero after one update |
| 1 < z < 2 | -1 < q < 0 | Alternates in sign and decays in magnitude |
| z = 2 | q = -1 | Alternates without decaying |
| z > 2 | q < -1 | Alternates and grows in magnitude |

The boundary z=2 is bounded but nondecaying. Calling it a boundary avoids confusing boundedness with attraction to zero. The lab classifies the multiplier independently of y0.

With z=1.5 and y0=1, forward Euler gives

    1, -1/2, 1/4, -1/8, 1/16.

The magnitude shrinks, but the negative values are absent from the exact positive decay. A decaying sequence can still have a poor shape or a large error.

With lambda=1.25 and h=2, z=2.5. The sequence starts

    1, -3/2, 9/4, -27/8, 81/16.

The underlying equation still decays. The growth belongs to this chosen numerical update.

At y0=0 every computed state is zero, even if |q|>1. To interpret that flat plot, subtract two trajectories with the same settings. Their initial difference is multiplied by q at each update. A nonzero perturbation grows when |q|>1; the special zero trajectory does not establish attraction.

## 4. Use the new slope: backward Euler

Backward Euler evaluates the derivative at the next state:

    B[n+1] = B[n] + h (-lambda B[n+1]).

The unknown appears on both sides. For this scalar linear equation we can solve it directly:

    (1+z) B[n+1] = B[n],
    B[n+1] = B[n] / (1+z).

Because z>0, its multiplier1/(1+z) lies strictly between zero and one. A nonzero starting state retains its sign and decays in magnitude for every admitted positive step.

At z=0.5 and y0=1, the first five values are

    1, 2/3, 4/9, 8/27, 16/81.

At t=2 seconds, 16/81 is approximately 0.197531. The forward and backward methods bracket the exact value in this small-step positive example.

That bracket is not an assertion about every arbitrary differential equation, every numerical method, or every sign-changing forward trace.

## 5. Stability does not supply accuracy

With lambda=1, h=2 and y0=1, backward Euler's first value is 1/3. The exact value at the same time is exp(-2), approximately 0.135335.

The numerical sequence decays, yet this first estimate has an absolute error of approximately 0.197998. Its decay property does not make it exact.

The inspector reports two errors for each method:

    signed error = numerical value - exact value,
    absolute error = |signed error|.

The signed error distinguishes an overestimate from an underestimate. Absolute error measures the magnitude in the same dimensionless state units. Initial-row errors are zero.

## 6. Refine at the same physical endpoint

To isolate the effect of step size, retain lambda, y0 and the final physical time. For lambda=1, y0=1 and T=1 second:

| h / s | N updates | Forward value at T | Backward value at T |
| ---: | ---: | --- | --- |
| 1 | 1 | 0 | 1/2 |
| 1/2 | 2 | 1/4 | 4/9 |
| 1/4 | 4 | 81/256 | 256/625 |
| 1/8 | 8 | 5764801/16777216 | 16777216/43046721 |

Every row compares with the same exact value exp(-1). Both methods' absolute errors decrease through these refinements.

Both Euler methods have first-order global convergence for this smooth problem at a fixed endpoint. In exact arithmetic, the leading error is proportional to h as h becomes small. Consequently, halving a sufficiently small step approximately halves that leading error. A finite error ratio need not be exactly two. At sufficiently fine scales, floating-point roundoff can also affect what a computer reports.

The lab has a finite grid and horizon. It illustrates the argument and exposes counterexamples; a plot of a few runs is not a proof of general convergence.

## 7. Work with one applied experiment

The initial small-step experiment is applied when the lab opens. Select a preset to load a draft, or edit the four settings. Any edit retires the previous results and disables the observation download. Select **Apply settings** to compute the new experiment.

The admitted controls are:

| Control | Range and spacing |
| --- | --- |
| lambda / s^-1 |0.25 through4 in increments of0.25 |
| h / s |1/32 through2 in increments of1/32 |
| y0 |-2 through2 in increments of0.25 |
| N |1 through64, integer |

These grids make z and the z=1 and z=2 boundaries exactly representable in binary arithmetic. Later recurrence values and exponentials still use finite floating-point arithmetic. All admitted traces remain finite; values are not clipped or smoothed.

Use the step slider or **Previous**, **Next** and **Final** controls. The three plotted methods, selected markers and inspection table refer to one recorded row. They share one linear vertical scale. A rapidly growing forward trace can make the smaller curves appear flat at that scale; inspect the numeric table and download before interpreting a line as zero. Negative values remain signed.

The six presets are small step, alternating decay, nondecaying boundary, growing numerical sequence, a negative initial value, and zero with a growing multiplier. They are drafts until explicitly applied.

### Downloads have separate purposes

- **Applied observation JSON** contains the equation, assumptions, units, applied settings, multipliers, classification, all N+1 full-precision rows, selected index and selected row. It is an experiment record, not a learner trace or an importer format.
- **Course JSON** is the exact fixed original 16-question deck. Settings and step selection do not change its questions or answer key.
- **Worked guide** is this exact Markdown document.

The lab has no network dependency, makes no automatic remote requests and stores no browser state. It requires no server or installed package. Background reference links require a connection; relative links to the learner and adjacent guides require the normal repository layout.

## Study in RecallWeave

1. Open the existing root demo.html and choose the downloaded course under **Bring your own lesson**.
2. Check the title, sixteen questions, four concepts, attribution and license in the preview. Cancel leaves the existing session intact.
3. Start the deck explicitly. Answer before reading each explanation.
4. At the end, inspect the first-answer review, then retry missed questions separately.
5. Write what distinguishes a stable multiplier from an accurate approximation. Download study notes to retain the authored explanations, your reflection and the separate retry record.

The learner's estimates remain illustrative model state. This original lesson does not establish assessment validity or improved learning outcomes.

## Original content and background

Questions, examples, derivations, diagrams and explanations were authored for this lesson with AI assistance. The original course and guide text are dedicated under CC0-1.0. No textbook passages, exercises or figures are reproduced.

Mathematical background is provided by MIT OpenCourseWare's [18.330 Introduction to Numerical Analysis, Chapter 5: Ordinary Differential Equations](https://ocw.mit.edu/courses/18-330-introduction-to-numerical-analysis-spring-2012/a9d2bd9be098f0ada172af40379a17cc_MIT18_330S12_Chapter5.pdf). That reference retains its own terms. It uses a signed coefficient for its test equation; this lesson instead writes the negative sign explicitly and restricts lambda to positive decay rates.

## Maintainer checks

The new model and UI are separate modules. The builder embeds those modules and the exact course/guide bytes in the standalone page. It does not alter any existing learner, catalog or lesson.

    node tools/build-time-stepping.mjs
    node tools/build-time-stepping.mjs --check
    node --test tests/time-stepping.test.mjs tests/time-stepping-course.test.mjs

The maintained model cases retain independently frozen rational-power expectations, distinct from the implemented step recurrence. Browser receiving is a separate resource-gated operation; source presence or native model tests do not establish an actual browser pass.
