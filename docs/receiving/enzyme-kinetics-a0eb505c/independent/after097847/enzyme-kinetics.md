# Enzyme kinetics: more substrate, same enzyme

Open [the standalone explorer](enzyme-kinetics-lab.html) directly in a browser. It calculates locally and needs no installation or network connection. It extends the existing [Enzymes: energy, speed and control](enzymes-energy-and-control.md) lesson; the twelve-question [deck](enzymes-energy-and-control.json) is unchanged.

## Use it with the lesson

Question **enz-binding-2** supplies the saturation example; **enz-regulation-1** asks about the fractional effect of a specified competitive inhibitor. The explorer makes those comparisons visible while holding the fictional uninhibited parameters fixed.

1. Use **S = 1**, **S = 4** and **S = 16** to inspect the course's substrate values. These buttons change only substrate.
2. Keep **I/Ki = 3** and compare the three rows. Use **Explain a curve** for the relevant interpretation.
3. Try **I/Ki = 0**, then **S = 0**. Overlapping curves and an undefined zero-over-zero percentage are shown explicitly.
4. Download the comparison CSV when you want the numerical record.
5. Download the existing enzyme deck. In RecallWeave, use **Bring your own lesson → Choose a deck file**, preview it, and explicitly start the selected deck. The explorer does not change a learner session.

All controls work with a keyboard. On a narrow screen, the numeric comparison table scrolls horizontally. Line styles, point shapes and text distinguish the cases without relying on color alone.

## Three specified calculations

Let S be substrate concentration in the fictional concentration unit, and let r = I/Ki be a dimensionless inhibitor ratio. The fixed baseline is Vmax = 10 product units/min and Km = 1 concentration unit.

| Case | Initial-rate equation in these units | Apparent limiting rate | Apparent Km |
|---|---|---|---|
| Uninhibited | v = 10 S / (1 + S) | 10 | 1 |
| Competitive | v = 10 S / (1 + r + S) | 10 | 1 + r |
| Pure noncompetitive | v = (10 / (1 + r)) S / (1 + S) | 10 / (1 + r) | 1 |

The inhibition cases represent two hypothetical inhibitors at the same ratio, not a claim about one real substance changing mechanism.

Km denotes the half-limiting-rate substrate concentration for this Michaelis–Menten model; it is not generally a binding equilibrium constant. Vmax is a limit approached as substrate grows. The page does not treat a finite substrate value as attaining it. IUBMB's terminology distinguishes **pure noncompetitive**—the equal-inhibition-constant special case—from the broader mixed-inhibition category. [R1]

### Work one comparison

At S = 4 and r = 3, the uninhibited rate is 40/5 = **8**. The competitive rate is 40/8 = **5**, or **62.5%** of the uninhibited rate. The pure noncompetitive rate is (10/4) × 4/5 = **2**, or **25%**.

Keeping r = 3 and moving S from 1 to 16 changes the competitive retained fraction from **40%** to **85%**. The pure noncompetitive fraction remains **25%** at positive S. Both inhibited rates rise; only the competitive model approaches the original limiting rate.

The uninhibited values at S = 1, 4 and 16 are 5, 8 and 160/17. Rounding to one decimal reproduces the course's **5.0, 8.0, 9.4**.

At S = 0, all rates are zero. A fraction of the uninhibited rate is undefined, so the table says **Undefined** and the CSV leaves that cell empty. This is separate from the positive-S limit of a ratio.

## What the model does—and does not establish

The page assumes initial-rate conditions with fixed enzyme, temperature and pH, negligible substrate depletion and product accumulation, and equilibrated reversible inhibition. It does not simulate elapsed time, cooperativity, substrate inhibition, slow or irreversible inhibition, feedback-pathway dynamics, or equilibrium composition.

The course's **enz-regulation-2** deliberately says that allosteric binding alone does not establish a complete kinetic class. Pure noncompetitive is a stated extension here, with explicit assumptions; it is not inferred from that question. The biological context follows the existing course's enzyme-regulation references. [R2]

Inputs and calculations are fictional. Native model and browser checks establish program behavior, not measured learning effectiveness.

## Download contract

**enzyme-kinetics-comparison.csv** contains three current-point rows, then 129 substrate samples from 0 through 32 in increments of 0.25, with three model rows for each sample: **390 data rows** in total. Each row records the input ratio, fixed baseline parameters, apparent parameters, initial rate and fraction of the uninhibited rate. Numbers retain JavaScript's unrounded numeric representation; this is not a fitted dataset or a RecallWeave learning trace.

The course button downloads the exact existing JSON text, including its original identifiers, answers, attributions and trailing newline. The explorer neither imports nor restores a session or archive.

## Source and checks

The dependency-free source is in `src/enzyme-kinetics.mjs`, `src/enzyme-kinetics-ui.mjs` and `templates/enzyme-kinetics-lab.html`. The standalone build follows the existing DC-circuits explorer convention.

~~~sh
node tools/build-enzyme-kinetics.mjs
node tools/build-enzyme-kinetics.mjs --check
node --test tests/enzyme-kinetics.test.mjs tests/enzyme-kinetics-build.test.mjs
~~~

Native receiving evidence and its browser driver are under `docs/receiving/enzyme-kinetics-a0eb505c/`. The course JSON, learner, model, catalog, registration and archive remain owned by their existing contributors.

## Primary references and provenance

- **R1:** IUBMB, *Symbolism and Terminology in Enzyme Kinetics* (1981), [§§4.1–4.2 and 6.2–6.4](https://iubmb.qmul.ac.uk/kinetics/ek4t6.html). Used for the kinetic-parameter definitions and the precise inhibition distinction.
- **R2:** OpenStax, *Biology 2e*, [§6.5, Enzymes](https://openstax.org/books/biology-2e/pages/6-5-enzymes). Used for continuity with the course's biological context. The precise pure-noncompetitive label follows R1.

References were read on 2026-10-08. No textbook figures, questions or passages are reproduced. The interface, numerical comparisons and explanations are original, with AI assistance disclosed by the project's existing policy.
