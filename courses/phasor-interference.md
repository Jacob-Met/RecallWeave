# Coherent waves: from phasors to interference

This original RecallWeave course connects a complex amplitude, a real cosine, and the sum of two coherent signals. The companion lab follows the same calculation in an arrow diagram, a time trace and a numerical table. Its purpose is to make amplitude, phase and instantaneous value distinguishable.

## Open the lab and practice the course

Open [phasor-interference-lab.html](phasor-interference-lab.html) directly in a browser. Its controls, diagrams, calculations and downloads are contained in that file. No server, account, installation or network connection is needed.

The starting example has peak amplitudes **3 and 4**, with B **90° ahead of A**. Predict the combined peak and the initial real value before changing anything. They are different: the peak is 5, while the initial value is 3. Move the cursor through a quarter cycle to see the sum reach −4. Its actual extrema occur at other times.

**Download practice course** saves the exact adjacent [course JSON](phasor-interference.json). Open RecallWeave's [learner](../demo.html), choose it under **Bring your own lesson**, inspect the preview, and select **Start this deck**. There are sixteen questions across four connected concepts, each with an explanation and a transfer prompt. The unchanged learner supports first-answer review, separate practice and downloaded study notes. Its displayed choice order can be shuffled; the correct answer stays attached to the original option text.

## A convention that stays explicit

We describe two real scalar cosine signals in the same units:

$$
a(t)=A\cos(2\pi ft+\phi),\qquad
b(t)=B\cos(2\pi ft+\phi+\delta).
$$

Here $A,B\geq0$ are peak amplitudes, $f>0$ is the shared frequency in hertz, $\phi$ is common phase, and $\delta$ is B's phase relative to A. Angles inside these formulas use radians. The controls show degrees.

With the **real-part, cosine convention**, the constant complex amplitudes are

$$
Z_A=Ae^{i\phi},\qquad Z_B=Be^{i(\phi+\delta)},\qquad
a(t)+b(t)=\operatorname{Re}\{(Z_A+Z_B)e^{i2\pi ft}\}.
$$

Euler's formula connects complex rotation to a real cosine. Addition is valid because both components share the same time factor. Complex components, magnitudes and phases are standard mathematical tools; a zero complex number has no unique direction. [1, 2]

The arrows in the lab include the time rotation at the selected cursor position. Their horizontal projections are the instantaneous real values. The **resultant phase** card instead reports the phase of the constant sum at $t=0$, in $[-180^\circ,180^\circ)$. Moving the cursor does not redefine that initial phase. A positive phase advances a cosine in time: $\cos(\omega t+\phi)=\cos(\omega(t+\phi/\omega))$ for positive $\omega$.

These axes are **Real** and **Imaginary**, not coordinates in a room. The model supplies no propagation direction, source position or law for energy transport.

## Derive the interference rule

First set the common phase to zero. The resultant has coordinates

$$
Z=A+B\cos\delta+iB\sin\delta.
$$

Its magnitude $R=|Z|$ obeys

$$
R^2=(A+B\cos\delta)^2+(B\sin\delta)^2
    =A^2+B^2+2AB\cos\delta.
$$

A common rotation multiplies the whole sum by $e^{i\phi}$, preserving its magnitude. Relative phase controls whether the cross term raises or lowers the combined amplitude. Same-frequency phasor addition and its in-phase and opposite-phase limits also appear in UNSW's teaching material; that resource uses a sine projection, while this lesson consistently uses cosine. [3]

Our four original preset examples make the rule concrete:

| Example | Constant phasors at zero common phase | Combined peak | Initial real value | What to notice |
|---|---|---:|---:|---|
| Quarter-cycle · 3 + 4 | $3$ and $4i$ | 5 | 3 | Perpendicular arrows add by the Pythagorean rule. |
| In phase · 2 + 2 | $2$ and $2$ | 4 | 4 | Peaks align, so peak amplitudes add. |
| Cancel · 2 − 2 | $2$ and $−2$ | 0 | 0 | Equal opposite components cancel at every time. |
| Oppose · 3 − 1 | $3$ and $−1$ | 2 | 2 | Opposite unequal components leave a residual. |

For the first example, $Z=3+4i$, so $R=5$ and the initial phase is approximately $53.130102^\circ$. Write $\theta=\operatorname{atan2}(4,3)$ in radians. Then

$$
3\cos(2\pi ft)-4\sin(2\pi ft)=5\cos(2\pi ft+\theta).
$$

At cycle positions $0,1/4,1/2,3/4$, the real values are $3,-4,-3,4$. None of those four instants is the positive or negative peak of this resultant.

For any relative phase, $|A-B|\leq R\leq A+B$. With strictly positive component amplitudes, the resultant vanishes at every time only when the amplitudes are equal and relative phase is a half-turn modulo a full turn. A single zero crossing does not establish cancellation.

## Mean square and RMS

A nonzero resultant is $x(t)=R\cos(2\pi ft+\theta)$. Over one complete cycle, cosine squared averages to $1/2$, giving

$$
\langle x^2\rangle=\frac{R^2}{2}
=\frac{A^2+B^2}{2}+AB\cos\delta,\qquad
x_{\mathrm{RMS}}=\frac{R}{\sqrt 2}.
$$

The zero-result case obeys the same average without requiring an angle. Separate mean squares are $A^2/2$ and $B^2/2$. Their sum need not equal the mean square after coherent addition because the product term also contributes.

For an original numerical example, let both peak amplitudes be 2 and relative phase be $60^\circ$. Then $R^2=4+4+8(1/2)=12$. The combined mean square is 6: separate contributions total 4, and the coherent cross term adds 2. At $0^\circ$ the combined mean square would be 8; at $180^\circ$ it would be 0.

These are mathematical averages in squared signal units. An intensity interpretation would require additional definitions about the physical signal, medium and relevant proportionality. This lesson makes no calibrated intensity, power or energy-conservation claim from the displayed number alone.

## Three experiments that expose the assumptions

1. **Rotate both together.** Start with 3 and 4 at a quarter-cycle separation. Change common phase from $0^\circ$ to $40^\circ$. The peak stays 5 and mean square stays 12.5. Resultant phase becomes approximately $93.130102^\circ$, so the initial projection and peak times change.

2. **Disturb cancellation.** Start with 2 and 2 at $180^\circ$. Rotate both by $37.5^\circ$; the zero sum remains zero. Then change B to 1.99999999. A small nonzero residual remains in A's direction. The lab preserves that residual and uses scientific notation instead of inventing an exact zero. Phase becomes meaningful again.

3. **Change the shared clock.** Hold amplitudes and phases fixed and change frequency from 2 to 5 Hz. The period changes from 0.5 to 0.2 seconds. At a fixed cycle position, arrows and values agree; the seconds axis contracts. Different frequencies for A and B would make their relative phase change with time, so this model would no longer describe them with one constant resultant.

## Controls, precision and saved files

Amplitudes range from 0 to 5 in common units. Both phase controls range from −180° to 180°. Frequency ranges from 0.1 to 10 Hz. The slider covers two cycles in steps of $1/64$ cycle; adjacent buttons move by $1/16$ cycle. Presets restore their amplitudes, phases, 1 Hz frequency and zero cursor.

The table and time curves use 129 uniform model evaluations across two cycles, including both endpoints: 128 intervals, or 64 per cycle. The curves join those values. They are not measurements or a reconstruction of unknown data. The table rounds display values to at most six decimal places and uses scientific notation below $10^{-5}$ for nonzero values. Exports retain JavaScript's floating-point precision. Very small representable inputs remain subject to ordinary rounding and underflow; this is not arbitrary-precision arithmetic.

An empty, nonfinite or out-of-range control retires previous results and disables experiment exports. The practice-course download remains independent of numerical input. Correcting a control or selecting a preset creates a fresh checked experiment. There is no automatic saving after refresh.

- **Experiment · JSON** contains all six settings, constant and cursor-rotated phasors, amplitude, initial phase, period, RMS, mean square, the amplitude range, all 129 values and explicit assumptions. An exactly zero resultant uses JSON **null** for its undefined phase.
- **Signal values · CSV** contains 129 data rows. Each row carries index, cycle, seconds, A's value, B's value, the combined value and all six settings. Repeated settings make a detached row traceable to its experiment.
- **Download practice course** contains the original deck, including attribution and license. It is a separate learning file, not an experiment-restoration format.

The lab does not import a saved experiment. Its status says the browser download was prepared; successful file persistence depends on the browser's normal download flow.

## Worked course key

These letters refer to the JSON's original option order, which can differ from the learner's displayed order. The course itself includes a complete explanation for each item.

| Question | Correct option | Calculation or distinction |
|---|---|---|
| Real-part convention | C · $A\cos(2\pi ft+\phi)$ | Take the real part after multiplying exponentials. |
| Quarter-cycle projection | A · 0 | The arrow is $3i$; its real component is zero. |
| Magnitude of $−3+4i$ | D · 5 | $\sqrt{9+16}=5$, although the initial value is −3. |
| Negative real phasor | B · Amplitude 2, phase −180° | The specified interval represents a half-turn as −180°. |
| Equal-phase amplitudes | B · 4 | $1.5+2.5=4$. |
| Opposite unequal phasors | D · 2 | $3+(-1)=2$. |
| Quadrature amplitudes | A · 5 | $|3+4i|=5$; individual peaks do not align. |
| Resultant quadrant | C · −135° | Both coordinates of $−2−2i$ are negative. |
| Common rotation | D · Peak amplitude | Rotation preserves the sum's length. |
| Amplitude law | C · $A^2+B^2+2AB\cos\delta$ | Square and add real and imaginary components. |
| Complete cancellation | B · Equal amplitudes, half-turn phase difference | Equal opposite vectors sum to zero for all time. |
| Cycle mean square | A · 6 | $R^2=12$, so the average is $12/2$. |
| Different frequencies | A · Relative phase changes | There is no shared time factor for one constant resultant. |
| Phase of zero | C · Amplitude 0, phase undefined | Zero has no unique direction. |
| Positive phase shift | B · Leads by 0.125 s | $(\pi/2)/(4\pi)=1/8$ second. |
| Meaning of the diagram | D · Phase in the cosine convention | Complex-amplitude coordinates are not spatial coordinates. |

Common wrong turns include adding magnitudes without checking phase, confusing a projection with the peak, using a one-argument inverse tangent without its quadrant, and treating the sum of separate mean squares as the combined mean square for every phase.

## Source and authorship

Questions, distractors, explanations, transfer prompts, worked examples and diagrams are original for RecallWeave, with AI assistance. Original lesson content is **CC0-1.0**. No source exercises, figures or passages are reproduced; references retain their own licenses.

1. MIT MAS.160, *Signals, Systems and Information for Media Technology*, Fall 2007, [Recitation 2](https://ocw.mit.edu/courses/mas-160-signals-systems-and-information-for-media-technology-fall-2007/66c9d296a29c7e96d7ceb3be945e2d71_rec2.pdf). Background on sinusoidal signals and complex amplitudes.
2. MIT 8.03SC, *Physics III: Vibrations and Waves*, Fall 2016, [Chapter 1, section 1.4](https://ocw.mit.edu/courses/8-03sc-physics-iii-vibrations-and-waves-fall-2016/8eb46d081c5ba4728cbbb369a03ba45e_MIT8_03SCF16_Text_Ch1.pdf). Background on complex numbers, phase, magnitude and Euler's formula.
3. UNSW School of Physics, [Physclips: Phasor addition](https://animations.physics.unsw.edu.au/jw/phasor-addition.html). Background on adding sinusoids and the importance of common frequency.

## Rebuild and verify

The lab uses native dependency-free JavaScript. Rebuild or verify exact generated parity:

    node tools/build-phasor-interference.mjs
    node tools/build-phasor-interference.mjs --check

The builder validates the embedded deck through the unchanged native parser before creating the standalone file. Run the focused or full native suite:

    node --test tests/phasor-interference*.test.mjs
    node --test tests/*.test.mjs

Receiving evidence and the separately solved blind answer key are kept under docs/receiving/phasor-interference-f5611f6dc10a/. These checks verify the stated calculations and source behavior; they do not measure learning efficacy.
