# Two qubits: amplitudes, phase and shared outcomes

This original RecallWeave lesson connects complex numbers to a small, inspectable quantum model. It is for a learner who can square numbers, add complex numbers and read a probability table. You do not need a quantum account, device, package installation or network connection.

Open `courses/quantum-states-lab.html` directly in a modern browser. It contains its model, interface, this guide and the original course JSON. Download the course, open the project's unchanged `demo.html`, choose that JSON under **Bring your own lesson**, inspect the preview and explicitly select **Start this deck**. Previewing alone does not replace the current session. The new course is a direct import; it does not change the existing catalog or offline pack.

## Start with the question the tables cannot answer alone

The initial comparison places two circuits side by side. Circuit A prepares a Bell state, (|00> + |11>)/√2. Circuit B prepares a product state, |++>, whose four amplitudes are all 1/2.

Both individual qubits have a 50% chance of 0 and a 50% chance of 1 in either circuit. Those **marginals** do not identify the joint state. In A, the two measured labels would always agree in this ideal computational-basis model. In B, all four label pairs have probability 1/4, so agreement has probability 1/2.

Before changing a gate, predict the four joint probabilities. Then select step 0 and advance through each circuit using **View step**. The two gates in each example create different joint outcomes even though their individual-qubit tables end up the same.

## Read the labels before doing the arithmetic

Every label in this lesson is |q0q1>, with **q0 on the left**. The array order is [00, 01, 10, 11]. Therefore X on q0 moves |00> to |10>; X on q1 moves it to |01>. In this lesson q0 is the more significant label bit.

This choice is explicit rather than universal. Qiskit displays its least-significant q0 on the right of a bit string. Do not copy an unlabeled index between these conventions and assume it means the same circuit.

Each amplitude is a complex number a = r + i·s. A basis outcome's probability is |a|² = r² + s². A normalized vector has the sum of these four squared magnitudes equal to 1. Negative or imaginary amplitudes can be valid; probabilities remain real and nonnegative.

The page shows amplitudes and probabilities rounded to six decimal places. Downloaded observations retain the computed binary64 values without display rounding or renormalization. The displayed norm-squared check should remain close to 1; it is not an instruction to silently repair a state.

## Gate rules you can work through by hand

For a chosen target qubit, pair amplitudes whose labels differ only in that bit. Write the pair as (a,b), with target bit 0 first and 1 second.

| Gate | New amplitude pair |
| --- | --- |
| X | (b,a) |
| H | ((a+b)/√2, (a-b)/√2) |
| Z | (a,-b) |
| S | (a,i·b) |

CNOT has a distinct control and target. It flips the target label exactly in components whose control label is 1. It moves amplitudes between basis positions; it does not make a measurement or choose a hidden classical branch.

For example, with control q1 and target q0, |01> becomes |11>. With control q0 and target q1, the same input |01> remains unchanged. Apply either CNOT twice and it returns every basis input to its starting label.

The lab admits four computational-basis starts and at most 24 gates from this list. The bound keeps every step readable. It is a teaching scope, not a general quantum compiler or a restriction of quantum mechanics.

## Experiment 1: turn a relative sign into a different outcome

Select **Phase becomes visible**. A applies H0 then H0 to |00>. B inserts Z0 between those two H gates.

After the first H, q0 has amplitudes (1/√2,1/√2). In B, Z changes that pair to (1/√2,-1/√2). At this point their probabilities still agree. The final H combines amplitudes: A returns to |00>, while B reaches |10>. One combination cancels and the other reinforces.

Changing only the relative sign can affect later interference. A probability table at one intermediate step loses that sign information. It cannot generally replace the full complex state when predicting later gates.

Try the **Complex phase** comparison next. H1 followed by S1 gives amplitudes 1/√2 and i/√2 at 00 and 01. Applying H1 again gives (1+i)/2 and (1-i)/2. Both probabilities are still 1/2, but the complex values are different. Two S gates act like Z because i² = -1; four S gates act like the identity.

## Experiment 2: contrast global and relative phase

Select **Global sign**. A keeps |00>; B applies X0, Z0, X0 and ends at -|00>. The amplitudes differ by a common factor -1, while every probability agrees.

If the same linear gate sequence follows both complete state vectors, that common factor follows them through the sequence. Squared magnitudes still agree. This is global phase. It differs from changing the sign of just one of several nonzero amplitudes.

The comparison panel reports whether the selected probability and marginal tables agree to an absolute tolerance of 10^-12. It does not label the vectors as equal states. In particular, equal computational-basis distributions can conceal relative-phase differences.

## Experiment 3: understand what the Bell example establishes

For a pure two-qubit state a|00> + b|01> + c|10> + d|11>, a product of two single-qubit states has ad = bc. Expand (u|0> + v|1>)(s|0> + t|1>): a=us, b=ut, c=vs and d=vt, so both products equal uvst.

The Bell state's coefficients give ad = 1/2 and bc = 0. They cannot be those of a product state; the modeled pure state is entangled. For |++>, all coefficients are 1/2, so the equality holds.

This reasoning uses full pure-state amplitudes. A matching-pairs probability table by itself is not an experimental certificate of entanglement: a classical mixture can also have correlated outcomes. The lab deliberately does not infer entanglement from its probability-only comparison.

Try starting from |01> before H0 and CNOT q0→q1. Work through both basis components and predict the new Bell pair. Then swap the CNOT direction. The labeled control and complete step table make the change auditable.

## Operate and keep a small observation

Each circuit has an initial-basis selector and an explicit **Add gate** action. Selecting a gate or qubit only prepares that next operation; it does not change the circuit until you add it. Changing the initial basis immediately recomputes the existing sequence. **Undo last gate** removes only the last operation; **Clear gates** keeps the chosen initial basis.

The step selector changes which retained state is displayed. It does not remove later gates. The complete trace includes the starting state and every subsequent result, even when two vectors are numerically equal. A zero-gate circuit therefore has one row; a 24-gate circuit has 25.

**Save model observation** downloads a JSON record with both complete circuits, all state traces, the selected step indices, the explicit basis convention and model limits. It is a record of deterministic computation, not measured samples, a signed certificate, learner mastery or a physical experiment. **Download course** and **Download guide** preserve the original bundled file bytes.

The lab keeps its controls in page memory and does not write learner progress. Reloading restores its original comparison. In the separate learner, answering and retrying questions uses the existing behavior; a retry does not rewrite the first-attempt record. Save the learner's study notes explicitly if you want to keep them.

## Model and source boundaries

This is an ideal, finite, two-qubit pure-state model with X, H, Z, S and CNOT. It has no noise, random shot generator, measurement collapse, device connection or claim of universal gate coverage. This small gate family is classically simulable; the lab demonstrates no computational speed advantage. It also makes no claim of measured learning efficacy.

Original explanations, questions and interface copy were authored for this project. Mathematical references, whose original prose and exercises are not reproduced:

- IBM Quantum Learning, *Basics of Quantum Information*, single-system quantum information: https://quantum.cloud.ibm.com/learning/en/courses/basics-of-quantum-information/single-systems/quantum-information
- IBM Quantum Learning, multiple-system quantum information: https://quantum.cloud.ibm.com/learning/en/courses/basics-of-quantum-information/multiple-systems/quantum-information
- IBM Quantum documentation, *Bit ordering*: https://quantum.cloud.ibm.com/docs/en/guides/bit-ordering
- Aaronson and Gottesman, *Improved Simulation of Stabilizer Circuits*: https://arxiv.org/abs/quant-ph/0406196

Original lesson and guide content: CC0 1.0 Universal, https://creativecommons.org/publicdomain/zero/1.0/ . Referenced publications keep their own terms.

## Maintainer commands

From the repository root, using existing Python 3 and Node 20 or newer:

```sh
python3 tools/build_quantum_states_lab.py
python3 tools/build_quantum_states_lab.py --check
node --test tests/quantum-states.test.mjs
```

The builder uses only the Python standard library and reads the owned template, core, interface, original course and guide. It emits the single directly openable lab. There are no fetched assets or installed dependencies. Native receiving and an unchanged original decoder do not substitute for any future required repository or browser gates.
