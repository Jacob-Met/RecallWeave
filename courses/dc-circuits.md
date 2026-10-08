# DC circuits: current, connections and power

An original 12-question RecallWeave course and a companion offline explorer.

**Open [the circuit lab](dc-circuits-lab.html)** to vary one source and two resistors, see their connections and compare current, voltage and power. The standalone HTML needs no server, package, account or internet connection. The external reference links open only when selected.

## Start with a prediction

1. Choose **Unequal resistors**: 12 V, R1 = 4 Ω, R2 = 8 Ω. In series, predict which resistor has the larger voltage drop. Switch to parallel and predict which has the larger current.
2. While parallel is selected, change only R2 from 8 Ω to 16 Ω. R1 still has the same resistance and source voltage. Predict its current before comparing it with the total source current.
3. Choose **Equal resistors**. Compare the total power in series and parallel while keeping the source voltage fixed.
4. Set the source to 0 V. Identify which quantities become zero and which still describe the connections.

The selected circuit has a diagram and a table of each resistor's values. The comparison table always uses the same three input values for both connections. Arrows represent conventional current, from the positive source terminal through the resistors to the negative terminal. They do not depict individual particles or switching transients.

Inputs admit 0–24 V and 1–1,000 Ω per resistor, including decimal values. Blank, nonfinite and out-of-range edits clear the displayed calculations and disable the comparison download until corrected. A zero-volt source is valid: currents and powers are zero while equivalent resistance remains positive. Displayed numbers are rounded to six significant figures, so small apparent differences in a displayed sum can come from rounding.

**Download both connections as CSV** saves both source and resistor results using unrounded numeric values. **Download the question deck** always saves the exact companion JSON, independently of the current circuit inputs.

## Four connected ideas

| Concept | What to distinguish | Question IDs |
| --- | --- | --- |
| Current and resistance | Charge per second; the fixed-resistance relation between voltage and current | dc-current-1 through dc-current-3 |
| Series connections | One steady current; voltage drops add around a loop | dc-series-1 through dc-series-3 |
| Parallel connections | Shared node voltage; branch currents add at a junction | dc-parallel-1 through dc-parallel-3 |
| Energy and power | Charge is conserved; electrical energy is transferred at a rate | dc-power-1 through dc-power-3 |

Current and resistance precede series and parallel connections. The final power questions connect those ideas. Each question has four choices, an explanation and an open transfer prompt. Correct answer positions are evenly distributed; the content file records canonical option indices.

To study the course, open the [RecallWeave learner](../demo.html). Under **Bring your own lesson**, use **Choose a deck file** to select the downloaded dc-circuits.json. Inspect its preview, then explicitly start the selected deck. Choosing a file or canceling its preview preserves the current session; starting the selected deck replaces it. Complete the questions, review their explanations, retry any missed items and download study notes from that session.

The [question file](dc-circuits.json) uses the existing recallweave-deck/1 format and shared deck validator. It can also be inspected or reopened in Deck studio. This course uses the published [lesson importer](https://github.com/Jacob-Met/RecallWeave/pull/33) and leaves the default cellular-energy lesson available.

## Relationships used in this ideal model

Let V be source voltage, I current, R resistance, Q charge, t time and P power.

| Relationship | Meaning and assumptions |
| --- | --- |
| I = Q / t | Average current over an interval; Q = It when current is constant |
| V = IR | The voltage drop across a fixed ohmic resistor |
| Rseries = R1 + R2 | Equivalent resistance of the single unbranched series loop |
| 1 / Rparallel = 1 / R1 + 1 / R2 | Equivalent resistance when both resistors connect to the same two nodes |
| P = VI = I²R = V² / R | Electrical power transferred in a resistor; the latter two forms use V = IR |
| E = Pt | Energy transferred during an interval of constant power |

A resistor transfers electrical energy to thermal energy. It does not consume charge. Series resistors share current; parallel resistors share voltage. The position of a resistor on the page does not determine its connection.

The source is ideal and maintains its stated voltage. Wires have zero resistance. Both resistors remain ohmic with fixed resistance, and the circuit is in steady state. Switching transients, temperature changes, source internal resistance and component ratings are outside the model.

## Worked examples from the explorer

For **12 V, R1 = 4 Ω and R2 = 8 Ω**:

| Quantity | Series | Parallel |
| --- | --- | --- |
| Equivalent resistance | 12 Ω | 8/3 Ω |
| Source current | 1 A | 4.5 A |
| R1 voltage / current / power | 4 V / 1 A / 4 W | 12 V / 3 A / 36 W |
| R2 voltage / current / power | 8 V / 1 A / 8 W | 12 V / 1.5 A / 18 W |
| Source power | 12 W | 54 W |

In series, 4 V + 8 V accounts for the source voltage. In parallel, 3 A + 1.5 A accounts for the source current. In both, the two resistor powers add to source power.

Now change only R2 to **16 Ω**. In series, the new equivalent resistance is 20 Ω, so both resistors carry 0.6 A. In parallel, R1 still carries 3 A, while R2 carries 0.75 A and the source supplies 3.75 A. The conclusion that R1 is unchanged depends on the ideal source holding its terminal voltage fixed.

With two equal resistors of resistance R, the series equivalent is 2R and the parallel equivalent is R/2. At the same nonzero source voltage, parallel draws four times as much total power. That comparison would change if a fixed-current source were used instead.

## Answer key and transfer guidance

The answers below are available for checking after an attempt. The JSON contains the full item explanations, including common incorrect interpretations.

| Question | Correct answer | Worked check |
| --- | --- | --- |
| dc-current-1 | 3 A | 15 V / 5 Ω = 3 A |
| dc-current-2 | It doubles | At unchanged R, (8/R) / (4/R) = 2 |
| dc-current-3 | 6 C | 0.75 A × 8 s = 6 C |
| dc-series-1 | 8 V | I = 12/(4 + 8) = 1 A; V2 = 1 × 8 = 8 V |
| dc-series-2 | 0.5 A | Steady current is the same at every cross-section of the unbranched loop |
| dc-series-3 | 1 A | New I = 18/(3 + 15) = 1 A |
| dc-parallel-1 | 6 A | 12/6 + 12/3 = 2 + 4 = 6 A |
| dc-parallel-2 | 18 V | Both resistors join the same two source nodes |
| dc-parallel-3 | R1 stays at 2 A | R1 still has 10 V across 5 Ω |
| dc-power-1 | 3 W | (0.5 A)² × 12 Ω = 3 W |
| dc-power-2 | ×4 | Series: 144/16 = 9 W; parallel: 144/4 = 36 W |
| dc-power-3 | 18 W | 6²/3 + 6²/6 = 12 + 6 = 18 W |

Transfer prompts admit equivalent explanations; they are not another scored test.

- **dc-current-1:** At 10 V across the same 5 Ω, current is 2 A. Fixed ohmic resistance makes the same R applicable.
- **dc-current-2:** Doubling both V and R leaves I = V/R unchanged.
- **dc-current-3:** 3 C takes 3/0.75 = 4 s. Charge counts the net charge passing; energy transferred through a potential difference is QV, so the quantities are distinct.
- **dc-series-1:** Swapping ideal series positions changes neither equivalent resistance nor current. The 8 Ω resistor still drops 8 V, regardless of position.
- **dc-series-2:** The drops are 0.5 × 3 = 1.5 V and 0.5 × 9 = 4.5 V. Different energy transferred per coulomb is compatible with equal charge per second.
- **dc-series-3:** With 3 Ω and 9 Ω, the current is 18/12 = 1.5 A. Drops of 4.5 V and 13.5 V sum to 18 V.
- **dc-parallel-1:** Equivalent resistance is 12 V / 6 A = 2 Ω. Two positive conductances add, giving a larger total conductance and a resistance below either branch value.
- **dc-parallel-2:** The common pair of electrical nodes determines parallel connection, regardless of the drawing's layout.
- **dc-parallel-3:** A load-dependent terminal voltage would change R1's current. Revisit the ideal fixed-voltage source assumption.
- **dc-power-1:** Doubling I at fixed R multiplies I²R by four.
- **dc-power-2:** At V ≠ 0 and R > 0, [V²/(R/2)] / [V²/(2R)] = 4.
- **dc-power-3:** Over 5 s, source energy is 18 × 5 = 90 J. R1 transfers 60 J and R2 transfers 30 J, which sum to 90 J.

## Sources and attribution

Questions, examples, explanations and diagrams are original work for this repository. No textbook passages, exercises or figures are reproduced. Background relationships were checked against the primary textbook:

- OpenStax, *University Physics Volume 2*, [9.1 Electrical Current](https://openstax.org/books/university-physics-volume-2/pages/9-1-electrical-current).
- OpenStax, *University Physics Volume 2*, [9.4 Ohm's Law](https://openstax.org/books/university-physics-volume-2/pages/9-4-ohms-law).
- OpenStax, *University Physics Volume 2*, [9.5 Electrical Energy and Power](https://openstax.org/books/university-physics-volume-2/pages/9-5-electrical-energy-and-power).
- OpenStax, *University Physics Volume 2*, [10.2 Resistors in Series and Parallel](https://openstax.org/books/university-physics-volume-2/pages/10-2-resistors-in-series-and-parallel).

The cited OpenStax book has its own CC BY-NC-SA 4.0 terms. This course does not declare a new repository-wide license. AI assistance was used to draft and develop this original material; the explorer performs no AI or provider calls. The course and calculations are educational examples, without a claim of measured learning effectiveness.

## Maintainer commands

From the repository root:

~~~bash
node tools/build-dc-circuits.mjs
node tools/build-dc-circuits.mjs --check
node --test tests/dc-circuits.test.mjs tests/dc-circuits-course.test.mjs
node --test tests/*.test.mjs
~~~

The builder combines only the DC template, model, UI and exact course JSON. It validates the deck with the existing contract and refuses unexpected module or script boundaries. The learner and author builders are separate. The optional lab source is in templates/dc-circuits-lab.html, src/dc-circuits.mjs and src/dc-circuits-ui.mjs.

The [receiving packet](../docs/receiving/dc-circuits-bd1abdb2f886/README.md) records independent physics review, native model and browser execution, exact source hashes and integration results.
