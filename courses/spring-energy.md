# Spring energy: motion, force and conservation

This original introductory lesson connects a spring's restoring force to its motion and energy. It contains twelve questions, four linked concepts, explanations and transfer exercises. The companion [offline phase lab](spring-energy-lab.html) lets a learner test predictions by preparing a release and inspecting points in one ideal cycle.

## Use the lesson and lab

Open `courses/spring-energy-lab.html` directly in a browser. It is self-contained and needs no package installation, server or provider. Set the mass, spring stiffness, release amplitude and phase, then choose **Apply inputs**. The diagram, values and table change together. An unfinished or invalid edit leaves the last applied release visible and disables phase changes and experiment export until the inputs are applied or reset.

The slider's arrow keys change phase by one degree; Page Up and Page Down change it by fifteen degrees, and Home and End select the endpoints. Decimal phase values entered in the form are retained. Shortcuts mark 0°, 90°, 180°, 270° and 360°. The presets compare separately prepared systems with four times the mass, four times the stiffness or twice the amplitude. **Reset example** restores 2 kg, 50 N/m, 0.2 m and phase 0°.

The lab has two separate downloads:

- **Download the 12-question lesson** saves the exact `spring-energy.json` content embedded in the checked lab.
- **Download applied experiment JSON** saves the applied inputs, their current observation, assumptions, units and all 73 unrounded observations at 5° intervals. It does not export an unapplied text draft.

To study the course, open the repository's [existing learner](../demo.html), choose **Bring your own lesson**, and select the downloaded JSON through **Choose a deck file**. Preview the title and question count, then explicitly start the lesson. Canceling a preview preserves the existing learner session. First answers remain part of the original review; a later correct practice answer is recorded separately. Download study notes from that completed review to keep its questions, explanations and transfer work. This guide is also a worked reference; learners can attempt its predictions before revealing the solutions below.

## Model and limits

The system has one positive point mass attached to an ideal, massless, horizontal spring. The equilibrium position is fixed. There is no friction, drive or other horizontal force, and the spring obeys Hooke's law over the whole admitted range. Take rightward displacement as positive and spring potential energy to be zero at equilibrium.

Every parameter set describes a **separately prepared release** from rest at the positive turning point, x = +A. Selecting a new mass or stiffness is not a simulation of replacing a component in an oscillator already moving. The lab therefore does not calculate the work needed to intervene in a running experiment.

The classroom input bounds are inclusive:

| Quantity | Accepted range |
|---|---|
| Mass m | 0.1–10 kg |
| Spring stiffness k | 1–200 N/m |
| Release amplitude A | 0–0.5 m |
| Phase θ | 0–360 degrees |

Text fields accept explicit decimal and scientific notation, up to 64 characters. Blanks, hexadecimal notation, units embedded in a number, nonfinite values and values outside the range are refused. The model API accepts actual finite JavaScript numbers rather than coercing strings or booleans.

The model is analytical, with ordinary floating-point arithmetic. The displayed values use six significant digits; the JSON retains the computed numbers. The force and velocity arrows show direction only. Their lengths do not represent magnitudes. The horizontal displacement axis is fixed at −0.5 to +0.5 m, and the block's drawing size is constant across masses.

### Motion and energy

With phase in radians, the release convention gives

```text
ω = √(k/m)                  T = 2π/ω           f = 1/T
θ = ωt                      x = A cos θ       v = −Aω sin θ
F = −kx                     a = F/m
K = ½mv²                    U = ½kx²          E_release = ½kA²
```

A full turn of the phase is 360°, or 2π radians. The model converts degrees to the corresponding time within one natural period. At the exact cardinal phases, it uses the exact sine and cosine values, so a numerical approximation to cos(π/2) does not draw a spurious force arrow at equilibrium.

The model calculates K and U separately from the computed velocity and position. It then reports both K + U and its difference from the release energy. A small nonzero residual is rounding error in the calculation, not physical damping.

These relations follow from Hooke's law and Newton's second law and are developed in [MIT OpenCourseWare 8.01SC, Chapter 23, sections 23.2–23.3](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/mit8_01scs22_chapter23.pdf). [OpenStax University Physics, section 15.1](https://openstax.org/books/university-physics-volume-1/pages/15-1-simple-harmonic-motion) provides another introductory treatment of simple harmonic motion. All question wording, distractors, worked exercises and lab presentation here are original.

### A complete default cycle

For m = 2 kg, k = 50 N/m and A = 0.2 m, ω = 5 rad/s, T = 2π/5 s ≈ 1.25664 s, and E = 1 J.

| Phase | Position | Velocity | Acceleration | Spring force | K | U |
|---|---:|---:|---:|---:|---:|---:|
| 0° | +0.2 m | 0 m/s | −5 m/s² | −10 N | 0 J | 1 J |
| 90° | 0 m | −1 m/s | 0 m/s² | 0 N | 1 J | 0 J |
| 180° | −0.2 m | 0 m/s | +5 m/s² | +10 N | 0 J | 1 J |
| 270° | 0 m | +1 m/s | 0 m/s² | 0 N | 1 J | 0 J |
| 360° | +0.2 m | 0 m/s | −5 m/s² | −10 N | 0 J | 1 J |

At 0° and 360°, the physical state is the same, but the elapsed times differ by one period. At 90° and 270°, position, force and both energies are the same while velocity reverses direction.

At A = 0, the block remains at equilibrium and at rest. Its forces and energies are zero. The system still has a natural period, which describes its response to a disturbance; the stationary block is not completing observed cycles. Neither K/E nor U/E is defined when E = 0. The interface explicitly reports that absence instead of showing a fabricated percentage. It also avoids percentages if a positive amplitude is so small that its energy underflows the floating-point representation.

## Concept sequence and worked answers

The four concepts have three questions each. Restoring force comes first; phase and period build on it. Energy exchange uses those motion ideas, and changing the system compares complete preparations.

| Item | Correct response | Reason |
|---|---|---|
| spring-force-1 | −12 N | −(80 N/m)(+0.15 m); the spring pulls left. |
| spring-force-2 | +2 m/s² | F = +4 N and a = F/(2 kg). |
| spring-force-3 | Maximum speed, zero acceleration | At x = 0, the spring force vanishes while K is greatest. |
| spring-phase-1 | π/2 s | √(32/2) = 4 rad/s; T = 2π/4. |
| spring-phase-2 | −1.0 m/s | At T/4, v = −Aω = −0.2 × 5. |
| spring-phase-3 | 270° | x = 0 and sin θ = −1, so v is positive. |
| spring-energy-1 | 2 J | ½ × 100 × 0.2². |
| spring-energy-2 | K = 15 J, U = 5 J | At x = A/2, U/E = 1/4. |
| spring-energy-3 | Energy ratio 4 | Energy depends on A² at fixed stiffness. |
| spring-change-1 | The period doubles | Mass increases fourfold; T depends on √m. |
| spring-change-2 | Period ×1/2, energy ×4 | Stiffness increases fourfold at the same mass and amplitude. |
| spring-change-3 | Rest with K = U = 0 | Zero amplitude gives zero displacement, speed and restoring force. |

Canonical zero-based answer positions are `[2, 0, 3, 1, 2, 0, 3, 1, 2, 0, 3, 1]`. The learner may change display order; stored choices refer to the canonical item options.

### Transfer solutions

1. **A spring on the other side of equilibrium.** For k = 120 N/m and x = −0.05 m, F = −kx = +6 N. The spring pulls right, toward equilibrium.

2. **Separate force from acceleration.** For k = 60 N/m, m = 3 kg and x = +0.10 m, F = −6 N and a = −2 m/s². A separate 6 kg block at the same displacement has the same spring force and acceleration −1 m/s².

3. **A turning point is not permanent rest.** At x = −A the velocity is momentarily zero. The spring force and acceleration are positive, so the block begins to move back toward equilibrium. Zero instantaneous velocity does not imply zero acceleration.

4. **Angular and ordinary frequency.** For m = 2 kg and k = 18 N/m, ω = 3 rad/s, T = 2π/3 s ≈ 2.09440 s, and f = 3/(2π) Hz ≈ 0.477465 Hz.

5. **The opposite turning point.** With A = 0.30 m and ω = 4 rad/s, half a period gives x = −0.30 m and v = 0. Acceleration is −ω²x = +4.8 m/s².

6. **Same position, different motion.** At 45° and 315°, x = A/√2 and F = −kA/√2 are equal. The speeds are equal too. At 45° the velocity is negative; at 315° it is positive. Potential and kinetic energies also agree.

7. **Account for the complete energy.** For k = 80 N/m and A = 0.25 m, E = ½ × 80 × 0.25² = 2.5 J. At either turning point, K = 0 and U = 2.5 J. At equilibrium, K = 2.5 J and U = 0.

8. **Equal energies do not determine direction.** At x = A/√2, U/E = 1/2. With E = 8 J, U = K = 4 J. The block can pass through that position in either direction, so the energies do not fix the sign of velocity.

9. **Half the amplitude.** At fixed mass and stiffness, half the release amplitude gives one quarter the total energy, half the maximum speed and the same natural period. These are separate preparations.

10. **Four times the mass at the same phase.** The displacement and spring force stay the same; acceleration becomes one quarter as large. Velocity is halved, but K = ½mv² is unchanged because the mass factor four cancels the squared-velocity factor one quarter.

11. **Nine times the stiffness.** Changing k from 10 to 90 N/m at fixed mass and amplitude gives one third the natural period, three times the maximum speed and nine times the release energy.

12. **The zero-energy case.** Dividing 0 J by 0 J does not produce an energy percentage. The natural period remains a property of the mass and spring, but it does not describe observed oscillations while the unperturbed system rests.

## Maintain the standalone artifact

From the repository root, use the existing Node runtime:

```sh
node tools/build-spring-energy.mjs
node tools/build-spring-energy.mjs --check
node --test tests/spring-energy.test.mjs tests/spring-energy-course.test.mjs
node --test tests/*.test.mjs
```

The builder validates the course through the unchanged `src/deck.mjs` contract before embedding it. Its check mode refuses a stale artifact without overwriting it. Model, UI and course changes belong in their native source files; regenerate the HTML afterward. The lab, guide and course do not modify the learner, its selection rules, mastery model or practice records.

The experiment export format is `recallweave-spring-energy-observation/1`. It contains `assumptions`, `units`, the four applied `input` values, a complete `observation`, and a `cycle` array of 73 observations. Exporting recomputes from admitted inputs, so a caller cannot smuggle an altered displayed result into the model's serialization helper. No timestamp or random field prevents a byte-for-byte repeat.

The original question wording, explanations and transfer exercises are offered under CC BY 4.0 as declared in the course. The linked physics references retain their own licenses.
