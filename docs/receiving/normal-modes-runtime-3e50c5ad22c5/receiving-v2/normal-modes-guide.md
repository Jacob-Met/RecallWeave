# Coupled motion: two patterns inside one system

Open [the normal-modes lab](normal-modes-lab.html) directly in a browser. It works from a local file without an account, server, connection or automatic browser storage. Download the [sixteen-question course](normal-modes.json), then choose it under **Bring your own lesson** in RecallWeave and select **Start this deck**. Its questions use the existing feedback, review, practice and study-note flows.

This lesson connects spring forces, superposition and eigenvector reasoning. Two physical coordinates can look complicated together while two carefully chosen combinations each behave as a single oscillator. The lab evaluates that analytical solution; it does not integrate time steps or measure an apparatus.

## 1. State the system before choosing coordinates

There are two equal point masses, each of mass **m**. Each mass is attached to a fixed wall by a spring of stiffness **k**. A third spring of stiffness **c** connects the masses. The springs are massless and obey an ideal linear force law. There is no friction, forcing or moving support.

The ideal springs are unstrained at equilibrium; there is no preload.

Both displacements **x1** and **x2** are positive rightward and measured from equilibrium. These are displacement coordinates; the drawn spacing is schematic. The lab does not assign physical spring rest lengths or model contact between the masses.

The coupling spring's extension relative to equilibrium is x2 − x1. Its force on mass 1 is c(x2 − x1); its force on mass 2 is the opposite. The wall springs supply −kx1 and −kx2. Therefore:

```
m x1'' = −(k+c)x1 + c x2
m x2'' = c x1 − (k+c)x2
```

The two coupling forces cancel when the equations are added. The wall forces do not. Momentum of the pair alone is generally not conserved because the walls exert external forces.

**Predict before inspecting.** Set k = 10 N/m, c = 5 N/m, x1 = 0.10 m and x2 = 0.30 m. Mass 1's wall force is −1 N and its coupling force is +1 N. Its net force is zero at that instant. This is not a statement that it will stay still: its velocity and the subsequent motion of both masses still matter.

## 2. Choose the two patterns

This course uses the **half-sum** convention:

```
q+ = (x1+x2)/2       q− = (x1−x2)/2
x1 = q+ + q−        x2 = q+ − q−
u+ = (v1+v2)/2      u− = (v1−v2)/2
```

Here u+ and u− mean the time derivatives of q+ and q−. They have velocity units.

Add and subtract the force equations:

```
q+'' = −(k/m) q+
q−'' = −((k+2c)/m) q−
```

The angular frequencies are:

```
ω+ = sqrt(k/m)
ω− = sqrt((k+2c)/m)
```

Angular frequency is measured in radians per second. The corresponding frequency in cycles per second is ω/(2π), and the period is 2π/ω.

The in-phase pattern has x1 = x2: both masses move together, so the coupling spring does not change its extension. The opposite-motion pattern has x1 = −x2: changing either displacement changes the separation by twice that amount. This is why its stiffness expression contains **2c**.

In matrix language, the stiffness matrix has diagonal entries k+c and off-diagonal entries −c. Its pattern vectors (1,1) and (1,−1) have stiffness eigenvalues k and k+2c. Dividing by the mass gives squared angular frequencies. These physical patterns connect the lab to the separately developed eigen-directions lesson without depending on that lesson's files.

**Worked values.** With m = 2 kg, k = 8 N/m and c = 6 N/m, ω+ = 2 rad/s and ω− = sqrt(10) rad/s. Increasing only the coupling raises the second frequency and leaves the first unchanged.

When c = 0, both frequencies equal sqrt(k/m). The masses are uncoupled. The half-sum and half-difference are still useful coordinates, but they are no longer a uniquely selected basis: any independent pair of combinations can span the repeated-frequency motions.

## 3. Specify positions and velocities

The complete initial state includes four numbers: x1(0), x2(0), v1(0) and v2(0). Convert both the positions and velocities into normal coordinates.

For either sign, the analytical solution is:

```
q(t) = q(0) cos(ωt) + u(0)/ω sin(ωt)
u(t) = −ω q(0) sin(ωt) + u(0) cos(ωt)
```

Then reconstruct x1, x2, v1 and v2 using the half-sum formulas.

A pure in-phase motion requires **q−(0) = 0 and u−(0) = 0**. Equal initial positions alone do not suffice. For example, x1 = x2 = 0.40 m with v1 = +0.20 m/s and v2 = −0.20 m/s starts with q− = 0 but u− = 0.20 m/s. The opposite-motion coordinate is excited.

A pure opposite-motion state requires **q+(0) = 0 and u+(0) = 0**. Thus both the positions and velocities must be opposite.

**Quarter-period check.** Let q+(0) = 0.20 m, u+(0) = 0, ω+ = 2 rad/s, and set the other mode to zero. At t = π/4 s, both physical positions are zero and both velocities are −0.40 m/s. At t = π/2 s, both positions are −0.20 m and the velocities are zero.

The **Localized** preset starts only mass 1 displaced. Both normal modes are present. For positive coupling, their different phases produce changing physical motion. The displayed time window is an inspection interval, not a promised common period: arbitrary frequency ratios need not give an exact shared recurrence.

The **Uncoupled** preset uses the same idea with c = 0. Both chosen normal coordinates can be nonzero while mass 2 remains at rest, because their equal-frequency contributions cancel in x2.

## 4. Account for all three springs

The physical mechanical energy is:

```
E = ½m(v1²+v2²) + ½k(x1²+x2²) + ½c(x2−x1)²
    kinetic        wall springs       coupling spring
```

Substitute the half-sum reconstruction:

```
E+ = m u+² + k q+²
E− = m u−² + (k+2c) q−²
E = E+ + E−
```

Each normal coordinate has effective modal mass **2m** with this normalization. An extra factor of one half would be wrong here. An orthonormal convention using division by sqrt(2) would have differently scaled coordinates and energy formulas; neither convention should be mixed with the other.

Both modal energies are constant in this ideal conservative model. Physical kinetic energy and the energy in each spring can vary. The lab displays both descriptions at the same inspection time and reports the numerical residual E(t) − E(0) in joules.

**Worked energy.** For m = 1 kg, k = 4 N/m, c = 6 N/m, x1 = +0.50 m, x2 = −0.50 m and zero velocities, the wall springs store 1 J and the coupling spring stores 3 J. The total is 4 J. The same result comes from q− = 0.50 m and E− = (4+12)×0.50² = 4 J.

A small displacement of one mass is not evidence that its energy has disappeared: its velocity may be large, and the coupling spring may also hold energy. A visible amplitude envelope does not establish complete energy transfer between masses. The explicit kinetic and spring terms provide the appropriate accounting.

At the all-zero initial state, every displacement, velocity and energy stays zero. The natural frequencies remain defined because they are properties of the system, even when neither mode is excited.

## 5. Use the lab deliberately

1. Choosing a preset applies it immediately and returns the inspection time to zero. Otherwise, edit any of the eight initial-system fields.
2. After editing fields, select **Apply experiment** to accept the complete set together. A pending or refused edit leaves the previous applied diagram visible and labeled; it disables time inspection and observation export until you successfully apply.
3. Use the time slider or the exact time field to inspect the analytical state. Compare physical coordinates, mode coordinates and energy at the same time.
4. Download the **applied observation** to keep the accepted parameters, inspection state and sampled trajectory. Download the course and this guide separately to study or share them.

The controls accept mass 0.1–10 kg, wall stiffness 1–200 N/m, coupling stiffness 0–200 N/m, each initial displacement −1–1 m, each initial velocity −2–2 m/s, and a time window 0.1–20 s. Entries must be complete finite decimal numbers. The positive wall stiffness keeps both mode frequencies nonzero, including the c = 0 case.

The graphs use at least 240 intervals and at least 48 intervals per fastest mode cycle over the chosen window. Each point is evaluated from the analytical formula. Connecting those samples is a visual approximation, not another numerical solution. Displayed numbers are rounded; the downloaded JSON retains the underlying JavaScript numbers.

The observation format is `recallweave-normal-modes-observation/1`. It includes the model assumptions and units, applied numeric parameters, angular frequencies, initial normal coordinates and energies, selected time/state, sampling metadata, and the complete sampled trajectory. It contains no learner answers and does not change a learner session. It is a calculation record, not a measurement or proof of learning.

## Question checks

The course contains sixteen original questions across four linked concepts. Correct answers are identified here by their values or meaning, independently of the option order shown in a learner session.

| Question | Check |
|---|---|
| Force balance | −1 N + 1 N = 0 N |
| Common displacement | The coupling extension and force are zero |
| Opposite acceleration | −5 N / 2 kg = −2.5 m/s² |
| Total force | −k(x1+x2) |
| Half-sum coordinates | q+ = 0.20 m; q− = 0.40 m |
| Frequencies | 2 rad/s; sqrt(10) rad/s |
| Stiffer coupling | ω+ unchanged; ω− increases |
| Degenerate basis | c = 0 gives two uncoupled equal-frequency oscillators |
| Equal positions only | u− = 0.20 m/s still excites the opposite mode |
| Pure opposite motion | Both positions and velocities are opposite |
| Quarter period | Both x = 0; both v = −0.40 m/s |
| Uncoupled localized state | Mass 2 stays at rest |
| Three-spring energy | 1 J + 3 J = 4 J |
| Modal normalization | 0.08 J + 0.08 J = 0.16 J |
| Conserved energies | E+, E− and their sum are constant |
| Rest and frequencies | Motion and energy zero; natural frequencies still defined |

## Sources and original-content provenance

Mathematical background was checked against [MIT OpenCourseWare 8.03SC, Chapter 3: Normal Modes](https://ocw.mit.edu/courses/8-03sc-physics-iii-vibrations-and-waves-fall-2016/d96262076cff658e551107bbb7c4b14c_MIT8_03SCF16_Text_Ch3.pdf) and [Lecture 4: Coupled Oscillators, Normal Modes](https://ocw.mit.edu/courses/8-03sc-physics-iii-vibrations-and-waves-fall-2016/pages/part-i-mechanical-vibrations-and-waves/lecture-4/), accessed 2026-10-08. The equations above are derived for the explicitly stated wall-spring model; they do not reuse a source exercise, apparatus diagram or narrative.

All course wording, distractors, transfer prompts, numerical examples, explanatory derivations and lab graphics are original, produced with AI assistance for RecallWeave. Original lesson content is offered under CC0-1.0. Referenced materials and other repository content retain their own terms. Structural deck checks do not establish subject accuracy or learning efficacy; independent physical/content review and executable receiving evidence are retained separately with the source contribution.
