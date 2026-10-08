# Feedback control: correction, fixed points and stability

An original 18-question course about one discrete feedback rule, paired with an
offline explorer. The course connects six ideas: reading an update, closing the
loop, finding a fixed point, testing perturbations, separating reference tracking
from disturbance, and recognizing what the model leaves out.

## Open the explorer and course

Open [feedback-control-lab.html](feedback-control-lab.html) in a modern browser.
It is a self-contained file: computation, plotting and both downloads work
offline. Choose a preset or enter settings, then select **Apply settings**.
The page keeps the last applied plot visible while you edit. An invalid or
unfinished draft cannot be downloaded as if it were a newly computed run.

Select **Download the 18-question course**. In RecallWeave's
[offline learner](../demo.html), choose that JSON file and select **Start this
deck** after reviewing its preview. You can also import the checked-in
[feedback-control.json](feedback-control.json) directly. The modular
[index.html](../index.html) learner supports the same file when served locally.

Answer the questions before reading their explanations. After the first pass,
review the connections and retry missed questions. RecallWeave keeps practice
separate from the first-answer trace. Its model estimates are illustrative;
neither this course nor the explorer establishes assessment validity or improved
learning outcomes.

## 1. Read one update in the right order

The state is a dimensionless number x[n]. The index n counts updates; it does not
specify a physical duration.

At each update, the controller reads the current state and computes

    u[n] = k (r − x[n]).

The next state then follows

    x[n+1] = a x[n] + u[n] + d.

Here a is persistence, k is correction gain, r is a constant reference and d is a
constant additive input. All four stay unchanged during one run. This definition
has no delay, saturation or noise.

With a = 0.75, k = 0.5, r = 1, d = 0 and x[0] = 0, the first correction is 0.5,
so x[1] = 0.5. At the next update the correction is 0.25, and x[2] = 0.625.
The correction changes even though the rule's coefficients do not.

**Try it:** select **Gentle correction** and inspect n = 0, then n = 1. Predict
both numbers before moving the inspection control.

## 2. Close the loop

Substituting the correction gives

    x[n+1] = (a − k) x[n] + k r + d
           = q x[n] + c,

where q = a − k and c = k r + d.

Now compare two runs with identical coefficients and forcing, but with a starting
difference δ. Subtract their updates. The common c cancels:

    difference[n+1] = q difference[n],
    difference[n] = δ q^n.

This is why the explorer includes a second starting state. It makes the effect
of an initial perturbation visible without changing the rule.

**Try it:** choose **Alternating recovery**. Its q is −0.5. With a starting
difference of 1, predict the difference after three updates: −0.125. The minus
sign describes which run is larger; its magnitude has decreased.

## 3. Find a fixed point

A fixed point x* stays unchanged after one update. If q is not 1, solve

    x* = q x* + c,
    x* = c / (1 − q).

At the default settings, c = 0.5 and q = 0.25, so x* = 2/3. The reference is 1.
These are different quantities.

When q = 1 there are two cases. If c = 0, every state is fixed. If c is nonzero,
there is no fixed point: each update adds c.

A fixed point can exist even when nearby states move away from it. The explorer
therefore labels the value **Fixed point**, without presenting every such value
as the eventual limit.

**Try it:** select **No fixed point**. The state gains 0.25 at each update while
the separation between the two starting states remains unchanged.

## 4. Test decay, repetition and growth

For a unique fixed point, let z[n] = x[n] − x*. Then z[n] = q^n z[0].

| Multiplier | Effect on a nonzero deviation |
| --- | --- |
| 0 < q < 1 | Keeps its sign and shrinks |
| q = 0 | Reaches the fixed point after one update |
| −1 < q < 0 | Alternates in sign and shrinks |
| q = −1 | Alternates without shrinking |
| q = 1 | Initial separation persists; the constant input determines fixed states or drift |
| q > 1 | Keeps its sign and grows |
| q < −1 | Alternates in sign and grows |

Perturbations decay exactly when |q| < 1. With a = 0.75 and nonnegative gain,
that condition is 0 ≤ k < 1.75. The endpoint k = 1.75 gives q = −1, so it is a
nondecaying boundary. Increasing correction gain can cross from recovery into
growth.

The boundary labels here concern decay of initial perturbations. They do not
silently substitute other definitions of stability involving bounded inputs or
more general systems.

**Try it:** compare the first four presets. Then choose **A flat run can hide
instability**. Its first state remains exactly zero, but its q is −1.25. A
nonzero starting difference grows. One perfectly flat trajectory is insufficient
evidence of attraction.

## 5. Separate reference tracking from disturbance

With fixed a and k, changing r or d leaves q unchanged. It can move the fixed
point because it changes c.

For example, changing only d from 0 to −0.25 at the default settings moves x*
from 2/3 to 1/3. The multiplier stays 0.25, so the decay factor is unchanged.
The final reference error is not determined by the decay factor alone.

If k = 0, the reference does not enter the recurrence at all. Changing it then
changes the reported reference error, but not the state trajectory.

**Try it:** reset, predict the result of d = −0.25, and apply it. Compare the
fixed point, multiplier and inspected reference error.

## 6. Read the limits of a finite trace

The geometric expression gives an argument for every integer update n. A finite
plot shows only the chosen initial states and recorded horizon. It can illustrate
the argument, or expose a mistaken prediction, but it does not prove behavior
for all initial states or for a physical controller with additional effects.

The explorer admits exact quarter increments for its six scalar controls:

| Control | Admitted range |
| --- | --- |
| a | 0 to 1.25 |
| k | 0 to 3 |
| r and x[0] | −2 to 2 |
| d | −0.5 to 0.5 |
| δ | −1 to 1 |
| N | 1 to 60 integer updates |

The second initial state is x[0] + δ and may therefore range from −3 to 3.
The restricted grid makes entered coefficients and the q = ±1 boundaries exact
in binary arithmetic. Subsequent state calculations still use finite-precision
numbers. For the default rule at n = 26, subtracting the computed state values
gives zero, while δ q^n is approximately 5.55 × 10^−17. Both values are retained
and explicitly labeled.

The inspector shows N + 1 states for N updates. The final row records x[N] and
its reference error. It has no applied control or recorded next state after the
experiment ends.

**Download applied trace CSV** includes every setting, both trajectories,
reference errors, applied controls, next states, computed separation and the
analytical separation. Displayed values are rounded for reading; the CSV retains
the computed numbers. It is an experiment trace, separate from RecallWeave's
learning-trace download.

## Content and sources

The questions, options, explanations, transfer prompts and worked examples were
authored for this course with AI assistance. Course prose and questions are
dedicated under CC0-1.0. No MIT exercises, diagrams or passages are reproduced.
The following primary materials provide background on discrete recurrences and
stability and retain their own reuse terms:

- Dennis Freeman, MIT OpenCourseWare, *6.003 Signals and Systems*, Fall 2011,
  [Lecture 2: Discrete Time Systems](https://ocw.mit.edu/courses/6-003-signals-and-systems-fall-2011/resources/lecture-2-discrete-time-dt-systems/).
- Derek Rowell, MIT OpenCourseWare, *2.161 Signal Processing: Continuous and
  Discrete*, Fall 2008,
  [Lecture 14](https://ocw.mit.edu/courses/2-161-signal-processing-continuous-and-discrete-fall-2008/resources/lecture_14/).

The numerical examples follow the stated recurrence. The course does not fit a
controller to measured data, model an actual device, or evaluate learner outcomes.

## Maintainer checks

The model is in [src/feedback-control.mjs](../src/feedback-control.mjs). The
standalone HTML is generated from that module, the separate UI module, the
template and the exact original JSON bytes. It requires no installed packages
or remote assets.

From the repository root:

    node tools/build-feedback-control.mjs
    node tools/build-feedback-control.mjs --check
    node --test tests/feedback-control.test.mjs tests/feedback-control-course.test.mjs

The optional browser receiver uses Node 22 or newer and a locally installed
Chrome or Chromium executable:

    node tools/check_feedback_control_browser.mjs --browser /path/to/chromium --output /path/to/receiving

It exercises actual offline downloads, invalid drafts, keyboard controls,
desktop and 320-pixel layouts, all six presets, the 18-question learner session,
missed-question practice, study notes, and learning-trace restore. It also checks
the unchanged modular learner through a temporary local server. Browser profiles,
downloads and receipts are written only under the specified receiving directory.
