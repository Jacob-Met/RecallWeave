# Reaction amounts: ratios, limits and leftovers

A small, original chemistry course with an offline explorer for learners who can read a balanced equation and want to understand why the smaller starting amount is not always the limiting reactant.

## Use the explorer

Open [stoichiometry-explorer.html](stoichiometry-explorer.html) directly in a browser. It is one self-contained file: no server, account, installation, external script or model call is required.

1. Choose one of three authored balanced reactions.
2. Enter each reactant amount **in moles**. The accepted range is 0–1000 mol, with at most three decimal places. Convert a mass using that substance's molar mass before entering it.
3. Make an optional prediction, then select **Compare amounts**.
4. Compare the two capacities, the theoretical product and the start/used/left table. Change one amount and predict again.
5. Download the displayed worked record if you want to keep the calculation. Editing an amount, prediction or reaction retires the previous record until you compare again.

The example buttons load starting amounts without answering for the learner. Every result also works with a keyboard; the result heading receives focus after a successful comparison. The page stores nothing automatically. A download is an explicit local action.

Inputs have a resolution of 0.001 mol. That admission rule keeps the limiting-reactant comparison exact; it is not a statement of measurement uncertainty or significant figures. Computed amounts may have more decimal places and are rounded to eight significant figures for display. Blank, negative, nonnumeric, out-of-range, scientific-notation and over-precision inputs are rejected.

## The chemistry model

For the stated balanced reaction, let \(n_i\) be the starting amount of reactant \(i\), in mol, and let \(\nu_i\) be its positive stoichiometric coefficient. Under ideal completion,

\[
\xi = \min_i\left(\frac{n_i}{\nu_i}\right),\qquad
n_{i,\mathrm{used}} = \nu_i\xi,\qquad
n_{i,\mathrm{left}} = n_i-\nu_i\xi.
\]

A product with coefficient \(\nu_p\) forms a theoretical amount \(\nu_p\xi\). All capacities are amounts of reaction extent, in mol. Comparing raw starting amounts would ignore how much of each reactant the balanced equation requires.

The three fixed reactions conserve each element:

| Authored reaction | Coefficients for reactants → product |
| --- | --- |
| 2 H₂ + O₂ → 2 H₂O | 2, 1 → 2 |
| N₂ + 3 H₂ → 2 NH₃ | 1, 3 → 2 |
| 2 Mg + O₂ → 2 MgO | 2, 1 → 2 |

The model assumes the stated reaction proceeds until a reactant is exhausted, with no side reactions. These are **theoretical amounts**, not predictions of experimental yield, rate, equilibrium or recovery. The balanced equation alone cannot supply those quantities. No experimental procedure is provided.

When the two positive capacities match, neither reactant remains. If either required reactant is absent, no product can form; the page uses a distinct “no product” outcome, including when both amounts are zero. For predictions, “alone limits” and “exact ratio” refer to cases where product forms.

## Original worked comparisons

| Starting amounts | Capacities, in mol of extent | Theoretical product | Reactants left |
| --- | --- | --- | --- |
| 6 mol H₂; 2 mol O₂ | 6/2 = 3; 2/1 = 2 | 4 mol H₂O | 2 mol H₂; 0 mol O₂ |
| 2 mol H₂; 2 mol O₂ | 2/2 = 1; 2/1 = 2 | 2 mol H₂O | 0 mol H₂; 1 mol O₂ |
| 4 mol H₂; 2 mol O₂ | 4/2 = 2; 2/1 = 2 | 4 mol H₂O | Neither remains |
| 2 mol N₂; 3 mol H₂ | 2/1 = 2; 3/3 = 1 | 2 mol NH₃ | 1 mol N₂; 0 mol H₂ |
| 1.5 mol Mg; 1 mol O₂ | 1.5/2 = 0.75; 1/1 = 1 | 1.5 mol MgO | 0 mol Mg; 0.25 mol O₂ |
| 0 mol H₂; 5 mol O₂ | 0/2 = 0; 5/1 = 5 | 0 mol H₂O | 0 mol H₂; 5 mol O₂ |

Try increasing only an excess reactant. Why does the product sometimes stay unchanged? Then double both starting amounts. Explain why the normalized capacities retain their ordering while the theoretical amounts double.

## Companion RecallWeave course

[stoichiometry-foundations.json](stoichiometry-foundations.json) contains 12 original questions, worked explanations and transfer prompts in the existing `recallweave-deck/1` schema. The explorer embeds the same course and can download it as JSON.

| Concept | Questions | Connections developed |
| --- | ---: | --- |
| Reaction ratios | 3 | Coefficients relate mole amounts; a product coefficient converts a reactant amount |
| Limiting reactants | 3 | Compare amount/coefficient; account for excess with unequal coefficients |
| Excess and scaling | 3 | Exact ratios, absent reactants, and increasing only excess supply |
| Theoretical amounts | 3 | Scaling, mass-to-mole conversion, and the model's experimental limits |

Prerequisites run from reaction ratios through limiting reactants and excess to theoretical amounts. The course does not change the default lesson. The published deck parser, native item selection, review, practice and study-notes APIs are qualification targets. Loading the JSON through a learner-facing importer depends on a lesson player that supports local deck import; the offline explorer is useful independently of that separate feature.

## Rebuild and check

From the repository, with Node 22 or later:

```sh
node tools/build_stoichiometry_explorer.mjs
node tools/build_stoichiometry_explorer.mjs --check
node --test tests/stoichiometry.test.mjs tests/stoichiometry-course.test.mjs
```

The builder validates the companion deck and writes only this standalone artifact. It can also be invoked by absolute path from another working directory. The dedicated browser receiver uses an already installed Chromium executable and an isolated temporary profile; it does not download dependencies. Exact commands, source hashes and receiving results live under `docs/receiving/stoichiometry-87eaaf0fdf63/`.

## Sources and authorship

The chemistry relationships are grounded in OpenStax, *Chemistry 2e*, [4.3 Reaction Stoichiometry](https://openstax.org/books/chemistry-2e/pages/4-3-reaction-stoichiometry) and [4.4 Reaction Yields](https://openstax.org/books/chemistry-2e/pages/4-4-reaction-yields), consulted 2026-10-08. The questions, numerical examples, explanations, interface and source code here were authored for this contribution. No textbook passage, figure or exercise was reproduced.

Original course wording and examples by HAMON estate contributor 87eaaf0fdf63: CC0-1.0. Referenced material retains its own license.
