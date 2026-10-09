# Damped motion: force, response, and energy

Open `damped-motion-lab.html` directly in a modern browser. The standalone file contains this analytical lab, a guide, and an original sixteen-question course. It needs no server, account, external assets or package. Download the course, open the repository's current `demo.html`, select the JSON, inspect the preview and explicitly start. The existing learner provides feedback, review, practice and study notes; importing content does not change its model.

## The system

One point mass moves horizontally with displacement measured from equilibrium. The spring force is Fs = −kx, the viscous damping force is Fd = −bv, and the unforced equation is m x″ + b x′ + kx = 0.

Positive displacement and velocity point right. Mass m is in kg, stiffness k in N/m and damping coefficient b in N·s/m (equivalently kg/s). No drive, dry friction, collision, nonlinear spring or thermal model is included. This is a teaching model, not a measured apparatus or calibration tool.

The controls use the dimensionless damping ratio ζ and calculate b = 2ζ√(mk). Write ω0 = √(k/m) and α = ζω0.

| Entered ratio | Regime | Response ingredients |
| --- | --- | --- |
| ζ = 0 | Undamped | Sinusoidal motion; constant mechanical energy |
| 0 < ζ < 1 | Underdamped | Sinusoidal terms multiplied by exp(−αt) |
| ζ = 1 exactly | Critical | A linear polynomial in t multiplied by exp(−ω0t) |
| ζ > 1 | Overdamped | Two negative real exponential rates |

The regime uses the entered ratio without rounding a nearby value to one. Calculations use binary64 arithmetic, so small differences can be below display precision.

## Two initial conditions

For 0 ≤ ζ < 1, let ωd = ω0√(1−ζ²). Then

x(t) = exp(−αt) [x0 cos(ωd t) + (v0 + αx0) sin(ωd t)/ωd].

At ζ = 1, the continuous limit is

x(t) = exp(−ω0t) [x0 + (v0 + ω0x0)t].

For ζ > 1, the two rates are −ω0(ζ ± √(ζ²−1)). Both exponential coefficients are set by x0 and v0. The lab evaluates equivalent stable combinations of these functions, rather than time-stepping a differential equation.

A zero initial displacement does not guarantee rest when velocity is nonzero. With both x0 and v0 zero, every admitted regime remains at rest.

**Critical release.** Let m = k = ζ = 1, x0 = 1 and v0 = 0. Then b = 2, x = (1+t)exp(−t), and v = −t exp(−t). At t = 1 s, x = 2/e m and v = −1/e m/s.

**Critical crossing.** Keep m = k = ζ = 1 but set x0 = 0.25 and v0 = −1. Now x = (0.25−0.75t)exp(−t), which crosses equilibrium once at t = 1/3 s. Critical damping removes sinusoidal oscillation; an adverse initial velocity can still carry the mass across equilibrium. Overdamped responses can also cross under suitable initial conditions.

Avoid a universal “critical is fastest” claim. A settling statement needs fixed initial conditions, a tolerance and a definition of remaining inside it. Heavy damping can have a slow exponential tail. This lab makes no fastest-settling optimization claim.

## Follow the energy

Mechanical energy in the mass-and-spring store is E = ½mv² + ½kx². Differentiation and the force equation give

dE/dt = v(mv′ + kx) = −bv².

Thus energy never increases in the exact unforced model for b ≥ 0 and is constant for b = 0. At a turning point v = 0, instantaneous energy-loss rate is zero, but spring energy and acceleration can remain nonzero.

For m = 2, k = 8, x = 0.25 and v = −0.50, kinetic and spring energy are each 0.25 J; total energy is 0.50 J. If b = 3, the energy rate is −0.75 W.

The lab reports E(0)−E(t) as energy transferred out of the modeled mechanical store. Floating-point roundoff is retained, including a possible tiny negative residual for a theoretically lossless response. The ideal model does not locate or measure heat in a real device.

## Use the lab deliberately

1. Select a preset or enter all six parameters. Editing marks the old experiment stale and disables inspection and observation download.
2. Choose **Apply parameters**. Only a complete valid record creates a new experiment. Invalid fields receive an actionable message.
3. Move the inspection slider or enter a time within the applied window. The numeric state and vertical plot markers refer to that time.
4. Compare displacement and energy. Each plot has its own labeled vertical scale and units. Lines join exact analytical samples; they are not integration steps. Sampling includes at least 48 intervals per sinusoidal cycle, a baseline time grid and extra points resolving exponential decay near the start.
5. Download an observation JSON containing exact applied parameters, the inspected state, all samples and the grid policy. An unapplied draft cannot export as if applied.

Teaching bounds: m in [0.1,10] kg; k in [0.1,100] N/m; ζ in [0,3]; x0 in [−1,1] m; v0 in [−2,2] m/s; duration in [0.1,20] s. These are not engineering design limits.

Compare ζ = 0, 0.25, 1 and 2 for the same displacement and zero velocity. Then try negative initial velocity in the critical case. Explain the roles of the roots and initial conditions, and use the original course in the existing learner to check your reasoning.

## Reproducibility and attribution

Source consists of the new core, UI, template, JSON course and this guide. Run `node tools/build-damped-motion.mjs` to regenerate the standalone file, or append `--check` to check exact agreement. The unchanged course codec validates structure; that alone does not establish mathematical correctness.

Original lesson wording, worked examples and lab diagrams: CC0-1.0. Background references retain their own licenses: [MIT 18.03SC, Damped Harmonic Oscillators](https://ocw.mit.edu/courses/18-03sc-differential-equations-fall-2011/resources/mit18_03scf11_s13_2text/) and [MIT RES.8-009, Lecture 4](https://live.ocw.mit.edu/courses/res-8-009-introduction-to-oscillations-and-waves-summer-2017/mitres_8_009su17_lec4.pdf). No source passages, exercises or figures are copied.
