# RC transients: charge, time and energy

This course follows the DC circuits material with the behavior it leaves out: what happens after a source changes while a capacitor already holds charge. You will predict the response of one ideal resistor and one ideal capacitor, distinguish physical time from time measured in time constants, and account for energy delivered, stored and dissipated.

Use the [offline RC lab](rc-transients-lab.html) to test a prediction, then import the [16-question course](rc-transients.json) into the [RecallWeave offline learner](../demo.html). The lab, guide and course are original learning materials. Their physics background is [OpenStax, University Physics Volume 2, §10.5](https://openstax.org/books/university-physics-volume-2/pages/10-5-rc-circuits) and [MIT OCW 8.02T, Chapter 7](https://ocw.mit.edu/courses/8-02t-electricity-and-magnetism-spring-2005/01decae81aae80df6e65d8831582764a_chap7dc_circuits.pdf). No textbook passages, figures or exercises are reproduced.

## What you should already know

You should be able to use Ohm's law, follow a voltage polarity and a chosen current direction, convert microfarads to farads, and distinguish charge, current, power and energy. The [DC circuits guide](dc-circuits.md) is the preceding study. The RC course uses four concepts: capacitor voltage and current, time constants, general voltage steps, and energy flow.

The circuit is deliberately small. At time t = 0 a fixed ideal source at Vs is connected through a positive resistor R to a capacitor C whose initial voltage is V0. The source then remains fixed. The model excludes leakage, equivalent series resistance, inductance, switching parasitics and component ratings. A physical device can differ from this ideal model.

## Keep the reference directions

The marked positive capacitor terminal defines vC. Positive current i flows from the source, through the resistor, into that terminal. The resistor voltage in that same direction is Vs − vC.

With this convention:

- A positive current raises vC; a negative current lowers it.
- Charge on the marked positive plate is Q = C vC and can be signed.
- Stored capacitor energy is U = ½ C vC² and is nonnegative.
- Source power delivered is Ps = Vs i. Positive means delivery; negative means absorption.
- Resistor power dissipated is PR = i²R and is nonnegative.

Changing a reference direction changes the reported sign, not the physical circuit. In particular, negative current does not make a resistor supply energy.

The source and initial voltages may both be positive, negative or zero. For a negative source, determine its energy direction from the product Vs i, not from the sign of current alone.

## Derive the response once

Kirchhoff's voltage law and the capacitor relation give

    Vs = R i + vC
    i = C dvC/dt

Combining them produces the first-order differential equation

    RC dvC/dt + vC = Vs
    vC(0) = V0

Define the time constant τ = RC, the normalized time u = t/τ, and the initial voltage gap Δ = Vs − V0. For t ≥ 0,

    vC(t) = Vs + (V0 − Vs) exp(−t/τ)
          = V0 + Δ [1 − exp(−u)]

    vR(t) = Δ exp(−u)
    i(t)  = Δ exp(−u) / R

At t = 0+, vC is still V0. A finite positive resistance allows a finite current, so the capacitor voltage does not jump. In the infinite-time limit, vC tends to Vs and current tends to zero.

The general formula covers charging from zero, discharging to a zero-volt source, reversed polarity and a capacitor initially above the source. There is no need for separate physical models for those cases.

### One time constant is a fraction of the initial gap

The remaining voltage gap is multiplied by exp(−u). It is the gap, not necessarily the capacitor voltage itself, that follows this fraction.

| Normalized time | Remaining fraction of the initial gap | Fraction of the gap traversed |
| --- | ---: | ---: |
| 0 τ | 100% | 0% |
| 1 τ | about 36.788% | about 63.212% |
| 2 τ | about 13.534% | about 86.466% |
| 5 τ | about 0.6738% | about 99.3262% |
| 8 τ | about 0.03355% | about 99.96645% |

A nonzero gap is not exactly zero at any finite time in this ideal model. The lab's 8 τ horizon is a finite observation window, not a claim of completion.

If V0 = Vs, the initial gap is already zero. The exponential multiplier still has a numerical value, but it multiplies zero: the voltage stays constant, current is zero, and there is no subsequent energy transfer. Stored energy can still be nonzero.

### Convert capacitance before multiplying

The input field uses microfarads:

    C in farads = C in microfarads × 10^−6
    τ in seconds = R in ohms × C in farads

For R = 2,000 Ω and C = 500 µF, τ = 2,000 × 0.0005 = 1 s.

Doubling R doubles τ and halves the initial current for the same voltage gap. Doubling C doubles τ but leaves the initial current unchanged. At the same normalized time u, these changes do not alter vC when Vs and V0 are fixed. At the same physical time t, they generally do.

## Track energy over the same interval

The lab measures work, heat and energy change from t = 0 to the selected time. Let g = exp(−u) and Δ = Vs − V0.

    Q(t)  = C vC(t)
    U(t)  = ½ C vC(t)²
    ΔU(t) = ½ C [vC(t)² − V0²]

    Wsource(t) = Vs C Δ (1 − g)
    Hresistor(t) = ½ C Δ² (1 − g²)

The source does work equal to its fixed voltage times the charge it transfers. Resistor heat is the integral of i²R over time. These quantities satisfy

    Wsource(t) = ΔU(t) + Hresistor(t)

The balance uses the change in stored energy, not the total stored energy. Mixing total final energy with interval work loses the capacitor's initial energy.

The implementation evaluates small changes using expm1 and a factored energy difference to reduce cancellation near t = 0. It retains full numerical values in JSON. The screen rounds values for reading, so small displayed residuals can result from floating-point arithmetic.

### The familiar half-and-half result has a specific starting condition

For V0 = 0 and t → ∞:

    Ufinal = ½ C Vs²
    Hresistor = ½ C Vs²
    Wsource = C Vs²

Half the work becomes stored energy and half becomes resistor heat in this ideal charging-from-zero case. This is not a universal split for arbitrary initial capacitor voltage.

For discharge to Vs = 0, the source does zero work. All the initial stored capacitor energy eventually becomes resistor heat.

For a capacitor at 10 V connected to a 5 V source, current points toward the source. The source absorbs energy, while the resistor still dissipates heat.

## Six investigations in the lab

Each example button loads a draft. Select **Apply circuit** to replace the applied response. Editing any circuit field retires the old results and disables their observation download until the new values are applied.

The default circuit is already applied when the page opens. Move the native time slider, use its arrow keys, or select the 0, 1, 5 and 8 τ landmarks. The graphs, inspection table and observation download all refer to the same applied circuit and selected time.

| Example | R / Ω | C / µF | Vs / V | V0 / V | Predict before applying |
| --- | ---: | ---: | ---: | ---: | --- |
| Charge from zero | 1,000 | 1,000 | 5 | 0 | τ = 1 s; initial current +5 mA; vC at 1 τ is about 3.1606 V. |
| Discharge to zero | 1,000 | 1,000 | 0 | 5 | Initial current −5 mA; vC at 1 τ is about 1.8394 V; source work is zero. |
| Cross through zero | 1,000 | 1,000 | 5 | −5 | vC crosses zero at u = ln(2), about 0.6931, while current remains positive. |
| Return energy to the source | 1,000 | 1,000 | 5 | 10 | Initial current −5 mA; the source absorbs energy; resistor heat stays nonnegative. |
| Double the resistance | 2,000 | 1,000 | 5 | 0 | τ = 2 s; initial current +2.5 mA; voltage at the same u matches the first example. |
| Already at equilibrium | 1,000 | 1,000 | 5 | 5 | Voltage stays at 5 V, current stays zero, and stored energy stays at 12.5 mJ. |

The slider samples every 0.05 τ, so ln(2) is between selectable sample times. The general equation gives the exact zero crossing; compare the samples at 0.65 and 0.70 τ to see it bracketed. The exported observation has all 161 samples from 0 through 8 τ.

A useful additional investigation is to start with both voltages negative. Predict the signs of current and source power separately. Another is to double C: compare voltage at equal u, time at equal u, charge and energy.

### Input and download contract

The lab accepts finite decimal numbers, including decimal exponent notation. It admits R from 1 to 1,000,000 Ω, C from 0.001 to 1,000,000 µF, and Vs and V0 from −24 to +24 V. These are exploration bounds for the ideal model, not component specifications.

The three downloads serve different study needs:

- **Observation JSON:** schema recallweave.rc-observation.v1, the applied circuit, its assumptions and unit map, selected time and result, and all 161 response samples. Physical values use SI units; capacitance input is explicitly in microfarads. The screen shows current in mA, charge in mC, energy in mJ and power in mW for readability.
- **Course JSON:** the fixed original 16-question RecallWeave deck. It is unchanged by input edits, examples or time selection.
- **Study guide:** this Markdown document, including equations and worked transfer answers.

The lab does not send data over the network or save browser state. It runs as a standalone HTML file. Reference links require a connection, and the relative learner link requires the repository's usual layout.

## Study in RecallWeave

1. Download rc-transients.json from the lab, or use the JSON beside this guide.
2. Open the repository-root demo.html. Under **Bring your own lesson**, choose that file.
3. Check the title, 16 questions, four concepts, attribution and license in the preview. **Cancel preview** leaves the current lesson in place. **Start this deck** begins the new lesson immediately.
4. Complete the questions. For a missed item, explain the direction, unit conversion or energy interval that caused the mistake.
5. Use the existing review and practice controls to revisit the concept. Add a note in your own words and compare your prediction with the lab.

The course uses the existing recallweave-deck/1 schema and importer. Its course file contains answer explanations and transfer prompts. The guide below supplies worked transfer answers so the questions can also support a discussion or independent study.

## Worked answers and transfer notes

### 1. Capacitor voltage continuity

**Course answer: 2 V.** The starting capacitor voltage remains continuous immediately after a finite-resistance step. The new resistor voltage is 8 − 2 = 6 V.

**Transfer:** Reversing the source to −8 V still leaves vC(0+) = 2 V. The initial resistor voltage becomes −10 V, so the post-switch current is negative in the chosen source-to-capacitor reference. The new current can change immediately; the capacitor voltage remains continuous. Its current before the switch depends on the previous circuit.

### 2. Initial charging current

**Course answer: 3 mA.** (6 − 0)/2,000 A = 0.003 A.

**Transfer:** Starting at 2 V gives (6 − 2)/2,000 A = 2 mA. The initial voltage gap is smaller, so the current is smaller.

### 3. Discharge sign

**Course answer: −2 mA.** (0 − 6)/3,000 A = −0.002 A.

**Transfer:** Choosing the opposite reference reports +2 mA for exactly the same physical discharge. The label changes; charge still leaves the initially positive capacitor plate.

### 4. Long-time state

**Course answer: 7 V and 0 A in the limit.** The resistor voltage tends to zero.

**Transfer:** With a fixed 7 V source and positive R and C, none of the starting capacitor voltage, R or C changes the asymptotic voltage. They affect the path, rate, charge or energy.

### 5. Units in the time constant

**Course answer: 1 s.** 2,000 Ω × 500 × 10^−6 F = 1 s.

**Transfer:** 4,000 Ω × 250 × 10^−6 F is also 1 s. Different R and C can share the same product while having different currents, charge and energy.

### 6. One time constant

**Course answer: approximately 6.32 V.** The 10 V initial gap shrinks to 3.68 V.

**Transfer:** Starting at 4 V and tending to 10 V leaves 6 × 0.368 = 2.208 V of gap. The capacitor voltage is about 7.792 V.

### 7. Double the resistance

**Course answer: τ doubles, initial current halves, final voltage stays the same.**

**Transfer:** At the same physical time, the larger-R circuit has a smaller u and has traversed less of the voltage gap. At the same u, it has the same voltage but takes twice as long to reach it. Do not mix those two comparisons.

### 8. Five time constants

**Course answer: about 0.674% of the original gap remains.**

**Transfer:** For an initial gap of 12 V, the remaining gap is about 12 × 0.00674 = 0.08088 V. It is small but nonzero.

### 9. Crossing zero

**Course answer: 0 V.** 4 + (−4 − 4)/2 = 0.

**Transfer:** At the crossing, the source is +4 V and the capacitor is 0 V, so i = 4/R is positive. Current does not vanish at zero capacitor voltage; it tends to zero only as the capacitor approaches the source voltage.

### 10. A precharged capacitor

**Course answer: −2 mA.** (3 − 9)/3,000 A = −0.002 A.

**Transfer:** With Vs increased to 12 V and V0 still 9 V, i(0+) = (12 − 9)/3,000 A = +1 mA. The capacitor voltage now rises toward the source.

### 11. Equilibrium with stored energy

**Course answer: constant 5 V, zero current and constant stored energy.**

**Transfer:** The changing multiplier exp(−u) is multiplied by Vs − V0 = 0. There is no voltage change. The stored energy remains ½ C × 25, despite zero ongoing power transfer.

### 12. Double the capacitance

**Course answer: τ doubles, initial current stays the same, final charge doubles.**

**Transfer:** Final stored energy ½ C Vs² also doubles at the same source voltage. Larger capacitance stores more charge and energy at that voltage.

### 13. Charging energy

**Course answer: 8 mJ stored, 8 mJ resistor heat, 16 mJ source work.** Here C = 0.001 F and Vs = 4 V, with V0 = 0.

**Transfer:** Changing positive R alone changes none of these infinite-time energies. It changes the current and power rates and the time needed to approach the final state.

### 14. Discharging energy

**Course answer: 9 mJ of resistor heat.** ½ × 0.0005 × 6² J = 0.009 J.

**Transfer:** Starting at −6 V gives the same initial energy and the same total eventual heat because energy depends on voltage squared. The current direction reverses.

### 15. Returning energy to the source

**Course answer: the source absorbs energy while the resistor dissipates nonnegative heat.**

**Transfer:** For C = 0.001 F, V0 = 10 V and Vs = 5 V in the infinite-time limit:

    Wsource = 5 × 0.001 × (5 − 10) = −0.025 J = −25 mJ
    ΔU = ½ × 0.001 × (5² − 10²) = −0.0375 J = −37.5 mJ
    Hresistor = ½ × 0.001 × (5 − 10)² = 0.0125 J = 12.5 mJ

The capacitor loses 37.5 mJ. The source absorbs 25 mJ and the resistor receives 12.5 mJ. Their signs satisfy −25 = −37.5 + 12.5.

### 16. Energy balance

**Course answer: +13 mJ of stored energy change.** ΔU = 20 − 7 = 13 mJ.

**Transfer:** With Wsource = −25 mJ and Hresistor = 12.5 mJ, ΔU = −25 − 12.5 = −37.5 mJ. The negative sign means the capacitor has lost stored energy over the interval. Its total energy is still nonnegative.

## Reproduce the standalone lab

The checked-in lab is generated from the RC model, UI, template, course and this guide. The builder uses the existing deck validator. From the repository root:

    node tools/build-rc-transients.mjs
    node tools/build-rc-transients.mjs --check
    node --test tests/rc-transients.test.mjs

The first command rebuilds courses/rc-transients-lab.html. The second checks exact byte parity without writing. The third checks the bounded model, energy/sign behavior, course structure and standalone payloads.

The contribution adds separate RC files. It does not change the existing learner, parser, other course builders or course catalog. Catalog registration is a separate coordinated integration step.
