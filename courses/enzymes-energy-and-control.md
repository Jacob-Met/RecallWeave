# Enzymes: energy, speed and control

An optional twelve-question RecallWeave unit for introductory biology learners who have encountered the existing cellular-energy lesson.

## Why this unit belongs here

The receiving curriculum at `4775af91ba6a5d4df787669f39b44364dd1e37ba` contains six questions on photosynthesis, glucose, cellular respiration and ATP (`data/deck.json`, Git blob `f1d4eb431c073b7bda268a2008e733b254a115fc`). It asks how cells transfer energy and mentions linked reaction pathways, but has no question on activation barriers, catalysis, substrate saturation or feedback regulation. This unit supplies those missing ideas. It does not replace the original lesson.

The learner should recognize reactants, products, molecules and the idea of ATP as an energy-transfer carrier. The numerical questions require subtraction and one proportional calculation. No calculus, kinetic-parameter fitting or clinical knowledge is assumed.

| Concept | Questions | What a learner practices |
|---|---|---|
| Reaction energy | `enz-energy-1`–`3` | Distinguishing energetic direction, activation barriers and equilibrium |
| Catalytic pathways | `enz-catalysis-1`–`3` | Tracking what a catalyst changes and separating recognition from conversion |
| Binding and saturation | `enz-binding-1`–`3` | Reading active-site and initial-rate evidence with stated assumptions |
| Enzyme regulation | `enz-regulation-1`–`3` | Reasoning about competition, regulatory binding and a feedback pathway |

Each concept points to the next as a prerequisite. The adaptive selector may choose a different order; the links are a learning aid, not a prerequisite examination.

## Use the course

The companion [JSON deck](enzymes-energy-and-control.json) uses the existing `recallweave-deck/1` contract. It contains four concepts, twelve unique questions, four options per question, and an explicit explanation and transfer prompt for every item. Correct answer identities occur three times in each canonical position. Displayed option order belongs to RecallWeave's existing session behavior.

Current canonical source supports opening this file in **Deck studio → Open a deck to edit → Preview → Replace draft**, then checking or downloading the deck. This changes only that author tab's in-memory draft. A canceled preview leaves the draft in place.

The shared lesson importer is separately owned in [issue #7](https://github.com/Jacob-Met/RecallWeave/issues/7). Actual course selection, explicit lesson start, feedback, review, practice and study-note downloads must be qualified against its finalized current-source composition before those browser receiving steps are called complete. This contribution does not replace the bundled deck, publish an app fork or provide a competing importer. The complete worked unit below is readable independently while that receiving handoff is pending.

## Learning boundaries

The energy profiles, concentrations and pathway names are invented teaching inputs. Values are not measurements. Claims in a question apply to its stated conditions. In particular, an initial-rate model is not a prediction for every biological experiment, allosteric regulation does not identify a complete kinetic inhibition class, and a local regulatory response does not determine an entire pathway's steady-state flux.

This material teaches molecular reasoning. It does not give medical advice, prescribe laboratory interventions or claim measured learning effectiveness. The existing RecallWeave model estimates remain illustrative state rather than grades.

## Worked questions

Choose an answer before opening its explanation. Canonical A–D labels below identify the source options; the app may shuffle their display.

### 1. Reaction energy — enz-energy-1

A fictional cellular reaction has a free-energy change ΔG = −12 kJ/mol under the stated conditions, yet product forms slowly. Which explanation fits both observations?

- **A.** A negative ΔG means each molecule must convert immediately.
- **B.** Slow conversion proves that the reported ΔG must be positive.
- **C.** A favorable energy change can coexist with a substantial activation barrier.
- **D.** The slow rate shows that no enzyme could accelerate conversion.

<details>
<summary>Worked answer and option reasoning</summary>

**Answer: C.** ΔG describes the free-energy difference between the reaction's products and reactants under the stated conditions. It does not specify how quickly the transition occurs. A barrier along the reaction pathway can make a thermodynamically favorable conversion slow. [R1; R3]

- **A:** ΔG does not supply a time scale.
- **B:** Rate alone cannot reverse the stated ΔG.
- **C:** Correct: thermodynamic direction and kinetic barrier answer different questions.
- **D:** An enzyme may provide a faster pathway despite the slow uncatalyzed rate.

**Apply it:** When a pathway is slow, distinguish a question about its energy balance from a question about its rate.

</details>

### 2. Reaction energy — enz-energy-2

In an invented energy profile, reactants are at 20, products at 8, and the transition state at 68 kJ/mol, on the same reference scale. What are ΔG and the forward activation barrier?

- **A.** ΔG = −12 kJ/mol; forward barrier = 48 kJ/mol.
- **B.** ΔG = +12 kJ/mol; forward barrier = 48 kJ/mol.
- **C.** ΔG = −12 kJ/mol; forward barrier = 60 kJ/mol.
- **D.** ΔG = +48 kJ/mol; forward barrier = 12 kJ/mol.

<details>
<summary>Worked answer and option reasoning</summary>

**Answer: A.** The reaction difference is 8 − 20 = −12 kJ/mol. The forward barrier is measured from the reactants to the transition state: 68 − 20 = 48 kJ/mol. The 60 kJ/mol difference uses the products as its starting point and is the reverse barrier in this profile. [R1]

- **A:** Correct: products minus reactants; transition state minus reactants.
- **B:** This reverses the endpoint subtraction.
- **C:** 60 is the reverse barrier, measured from the products.
- **D:** 48 is a barrier, not the endpoint difference.

**Apply it:** Sketch the three levels, then label the starting level for each subtraction before calculating.

</details>

### 3. Reaction energy — enz-energy-3

A reversible reaction A ⇌ B is away from equilibrium. A catalyst is added without changing temperature or the reaction's reactants and products; binding does not appreciably sequester either species. What can catalysis change?

- **A.** The equilibrium ratio, so that only B remains at the end.
- **B.** The reaction's ΔG, by permanently lowering product energy.
- **C.** The direction of equilibrium, by making the reverse reaction impossible.
- **D.** The approach rate, while leaving the equilibrium ratio unchanged.

<details>
<summary>Worked answer and option reasoning</summary>

**Answer: D.** A catalyst provides a faster route for interconversion without changing the reaction's energy endpoints. It accelerates approach to the equilibrium set by those conditions rather than selecting a new equilibrium composition. [R3; R4]

- **A:** A catalyst does not demand complete conversion to one species.
- **B:** It changes the pathway rather than permanently lowering the product level.
- **C:** The reversible reaction retains its reverse pathway.
- **D:** Correct: endpoint thermodynamics stay fixed while interconversion can speed up.

**Apply it:** Separate how soon a reversible system approaches equilibrium from the composition it approaches.

</details>

### 4. Catalytic pathways — enz-catalysis-1

For an invented reaction, reactants are at 5 and products at −3 kJ/mol. An enzyme lowers the transition-state level from 47 to 29 kJ/mol. Which pair describes the catalyzed forward pathway?

- **A.** The forward barrier is 18 kJ/mol, and ΔG is −8 kJ/mol.
- **B.** The forward barrier is 24 kJ/mol, and ΔG is −8 kJ/mol.
- **C.** The forward barrier is 24 kJ/mol, and ΔG is −26 kJ/mol.
- **D.** The forward barrier is 32 kJ/mol, and ΔG is +8 kJ/mol.

<details>
<summary>Worked answer and option reasoning</summary>

**Answer: B.** The new forward barrier is 29 − 5 = 24 kJ/mol. ΔG remains −3 − 5 = −8 kJ/mol because the endpoints are unchanged. The enzyme reduced the barrier by 18 kJ/mol; that reduction is not the remaining barrier. [R1; R2]

- **A:** 18 is the reduction in barrier, not the new barrier.
- **B:** Correct: 29 − 5 = 24 and −3 − 5 = −8.
- **C:** The endpoints did not move; subtracting the barrier reduction from ΔG is invalid.
- **D:** 32 is the new reverse barrier; +8 reverses the endpoint sign.

**Apply it:** Compare the barrier before and after catalysis without moving the reactant or product level.

</details>

### 5. Catalytic pathways — enz-catalysis-2

One enzyme molecule has completed many ordinary catalytic cycles and released each product. No inhibitor, damage or degradation is present. What permits another cycle?

- **A.** A product must be converted into a new enzyme after every cycle.
- **B.** The enzyme must supply the net free energy consumed by each reaction.
- **C.** The enzyme becomes a permanent part of each released product molecule.
- **D.** The regenerated enzyme can bind another substrate and catalyze again.

<details>
<summary>Worked answer and option reasoning</summary>

**Answer: D.** A catalyst participates in reaction steps but is regenerated across a completed catalytic cycle. Product release allows another cycle under suitable conditions. This does not make an enzyme immortal: damage or degradation could end its activity, but those effects are excluded here. [R4]

- **A:** Product and enzyme are separate species; a catalyst is regenerated.
- **B:** Catalysis does not make an enzyme the net energy source.
- **C:** An ordinary catalyst is not permanently incorporated into each product.
- **D:** Correct: product release and catalyst regeneration allow another cycle.

**Apply it:** Follow the enzyme separately from the substrate and product when accounting for repeated reaction cycles.

</details>

### 6. Catalytic pathways — enz-catalysis-3

A folded enzyme variant still binds its substrate tightly, but no longer helps the reacting atoms reach the transition state. Which conclusion is justified?

- **A.** Tight substrate binding proves that its catalytic rate must stay unchanged.
- **B.** Substrate binding alone does not establish that the variant catalyzes efficiently.
- **C.** Any bound substrate must become product, even without a catalytic pathway.
- **D.** Losing transition-state assistance must change the reaction's equilibrium ratio.

<details>
<summary>Worked answer and option reasoning</summary>

**Answer: B.** Recognition and catalysis are related but distinct. Binding can position a substrate, yet efficient conversion also depends on interactions along the reaction pathway, including transition-state stabilization. The premise therefore does not support an unchanged catalytic rate. [R3; R4]

- **A:** Binding is not a measurement of catalytic turnover.
- **B:** Correct: the premise removes assistance for reaching the transition state.
- **C:** Binding does not guarantee conversion on a relevant time scale.
- **D:** Changing a catalytic pathway does not change the stated endpoint equilibrium.

**Apply it:** When testing an enzyme variant, distinguish evidence for binding from evidence for product formation.

</details>

### 7. Binding and saturation — enz-binding-1

An enzyme recognizes substrate S through complementary shape and charge. A mutation reverses a contact charge while the protein remains folded. What may follow?

- **A.** Recognition of S and the observed reaction rate may change.
- **B.** All substrates must now bind equally because the protein is folded.
- **C.** The same reaction must acquire a different equilibrium constant.
- **D.** Every catalytic cycle must consume the mutated enzyme permanently.

<details>
<summary>Worked answer and option reasoning</summary>

**Answer: A.** A folded protein can still have altered active-site interactions. Changing a contact charge may affect recognition, orientation or subsequent catalysis. The observation does not establish the direction or size of the rate change; that would require further evidence. [R2; R4]

- **A:** Correct: local chemical recognition can change without global unfolding.
- **B:** A folded active site still distinguishes chemical interactions.
- **C:** The reaction equilibrium is not determined by which catalyst is present.
- **D:** A local mutation does not imply permanent consumption during every cycle.

**Apply it:** Avoid treating 'still folded' as proof that all molecular interactions remain unchanged.

</details>

### 8. Binding and saturation — enz-binding-2

In a fictional initial-rate experiment with fixed enzyme and suitable constant conditions, substrate concentrations of 1, 4 and 16 units give rates of 5.0, 8.0 and 9.4 product units per minute. Assume a simple saturating enzyme with no inhibition. Which reading fits?

- **A.** The reaction's equilibrium ratio rises whenever substrate concentration rises.
- **B.** Each fourfold substrate increase must cause a fourfold rate increase.
- **C.** The rate approaches an enzyme-limited ceiling as substrate becomes abundant.
- **D.** The enzyme is necessarily being consumed because the rate does not scale.

<details>
<summary>Worked answer and option reasoning</summary>

**Answer: C.** The increases become progressively smaller. In the stated saturating model, the fixed enzyme population spends more time occupied and has a limited turnover capacity. More substrate therefore gives diminishing increases in initial rate. These fictional values do not identify an exact mechanism outside the stated model. [R3; R4]

- **A:** The initial-rate data do not establish a changed equilibrium ratio.
- **B:** This ignores the explicitly saturating model and the observed plateau.
- **C:** Correct: a fixed catalyst population supplies finite turnover capacity.
- **D:** Substrate saturation does not require catalyst consumption.

**Apply it:** Look for a plateau in initial-rate data, then ask which capacity is held fixed.

</details>

### 9. Binding and saturation — enz-binding-3

In a simple initial-rate assay with maintained saturating substrate, 0.10 μmol/L of active enzyme produces 10 μmol/L of product per second. Only active enzyme concentration doubles; turnover and all other conditions stay the same. What rate does this model predict?

- **A.** 5 μmol/L/s
- **B.** 20 μmol/L/s
- **C.** 10 μmol/L/s
- **D.** 40 μmol/L/s

<details>
<summary>Worked answer and option reasoning</summary>

**Answer: B.** At saturating substrate, the stated model's rate scales with the amount of active enzyme when turnover per enzyme is unchanged. Doubling 0.10 to 0.20 μmol/L doubles 10 to 20 μmol/L/s. This is a model prediction, not a measured response for an arbitrary biological system. [R3; R4]

- **A:** This halves the rate even though active enzyme doubles.
- **B:** Correct: the maintained saturation and unchanged turnover make the rate proportional to active enzyme.
- **C:** This overlooks the increase in available catalytic capacity.
- **D:** This adds an unsupported extra factor of two.

**Apply it:** State what remains constant before using a proportional prediction.

</details>

### 10. Enzyme regulation — enz-regulation-1

In a simple reversible competitive-inhibition model, substrate S and inhibitor I cannot occupy the enzyme together. Which change can reduce I's fractional effect on the initial rate?

- **A.** Lower substrate while keeping inhibitor and active enzyme fixed.
- **B.** Add enough inhibitor to occupy a larger fraction of the active sites.
- **C.** Remove active enzyme while keeping substrate and inhibitor fixed.
- **D.** Raise substrate while keeping inhibitor and active enzyme fixed.

<details>
<summary>Worked answer and option reasoning</summary>

**Answer: D.** In this specified competition, more substrate increases the opportunity for substrate rather than inhibitor to occupy the enzyme. That can reduce inhibition relative to the uninhibited rate at the same substrate concentration. It is not a claim that every inhibitor can be overcome this way. [R2; R4]

- **A:** Reducing substrate gives it less opportunity to compete.
- **B:** More inhibitor does not supply the proposed relief.
- **C:** Removing enzyme does not remove substrate–inhibitor competition.
- **D:** Correct within the stated simple reversible competition.

**Apply it:** Check the stated binding mechanism before predicting whether additional substrate can offset inhibition.

</details>

### 11. Enzyme regulation — enz-regulation-2

A reversible regulator binds away from an enzyme's active site. Substrate can still bind, but catalytic turnover decreases. What does this observation support?

- **A.** The regulator must compete with substrate for the same binding position.
- **B.** The regulator has changed the free-energy difference of the reaction endpoints.
- **C.** Binding at a separate site can change the enzyme's catalytic behavior.
- **D.** The regulator must have irreversibly destroyed every enzyme it contacts.

<details>
<summary>Worked answer and option reasoning</summary>

**Answer: C.** Binding at a regulatory site can influence enzyme activity without occupying the substrate's site. The observation supports allosteric regulation. It does not by itself determine a complete kinetic inhibition class or imply irreversible damage. [R2; R4]

- **A:** The premise explicitly places the regulator at another site and allows substrate binding.
- **B:** Catalytic regulation does not establish changed reaction endpoints.
- **C:** Correct: a separate binding event can alter catalytic turnover.
- **D:** The interaction was explicitly described as reversible.

**Apply it:** Describe what the evidence shows before attaching a more specific kinetic label.

</details>

### 12. Enzyme regulation — enz-regulation-3

In the fictional pathway A → B → C → D, product D reversibly inhibits the enzyme for A → B. A is available and other conditions remain fixed. If free D is removed, what immediate regulatory response is expected?

- **A.** Inhibition can ease, allowing the first enzyme's activity to increase.
- **B.** The first enzyme must stop because D was its required substrate.
- **C.** The first reaction's equilibrium constant must reverse its value.
- **D.** Every downstream reaction must instantly run at the same maximum rate.

<details>
<summary>Worked answer and option reasoning</summary>

**Answer: A.** The pathway's own product suppresses an earlier step: this is feedback inhibition. Lowering free D can relieve reversible inhibition. That predicts a regulatory response of the first enzyme, not an instant final pathway flux or guaranteed downstream production. [R2; R4]

- **A:** Correct: less free D can reduce reversible occupancy at the inhibitory site.
- **B:** A, not D, is the substrate of the first step.
- **C:** Regulatory binding does not invert the reaction's equilibrium constant.
- **D:** Downstream rates and transients are not determined by this local response alone.

**Apply it:** Identify the regulated step, the feedback molecule and the time scale of the prediction.

</details>

## Reference map and original-content provenance

- **R1 — Reaction energy:** OpenStax, *Biology 2e*, [§6.2: Potential, Kinetic, Free, and Activation Energy](https://openstax.org/books/biology-2e/pages/6-2-potential-kinetic-free-and-activation-energy). Used for the distinction between endpoint difference and activation barrier.
- **R2 — Enzyme mechanisms and regulation:** OpenStax, *Biology 2e*, [§6.5: Enzymes](https://openstax.org/books/biology-2e/pages/6-5-enzymes).
- **R3 — Catalysis, equilibrium and saturation:** Alberts and colleagues, *Molecular Biology of the Cell*, fourth edition, [Catalysis and the Use of Energy by Cells](https://www.ncbi.nlm.nih.gov/books/NBK26838/), NCBI Bookshelf.
- **R4 — Binding, kinetics and feedback:** Cooper, *The Cell: A Molecular Approach*, second edition, [The Central Role of Enzymes as Biological Catalysts](https://www.ncbi.nlm.nih.gov/books/NBK9921/), NCBI Bookshelf.

These primary textbook sources were checked on 2026-10-08. All scenarios, question wording, answer options, numerical examples and option rationales are original to this contribution. No source question, figure or passage is reproduced. References retain their own copyright and reuse terms; this guide does not assign a textbook license to the original course.

AI assistance was used in drafting and checking the unit. Native format, model and browser checks establish software compatibility, not educational efficacy. An independent content reviewer must assess scientific correctness and ambiguity separately from those checks.

## Ownership and receiving

External contributor: `chatgpt-a0eb505c4971/estate_products`. Native scope claim: Conscience event 3958, `cev_12257b9d337646c89595ebe7`.

The membrane-transport course (#15) retains permeability, osmosis, gradients and active/coupled transport; this unit contains no transport questions. Probability (#13), vector geometry (#17), default-deck wording (#9), authoring/reopening (#10), and the importer (#7) retain their complete scopes. Existing application, validator, model, review, archive, builder and default-deck files are unchanged.

Receiving evidence is recorded separately under `docs/qualification/enzymes-energy-and-control-a0eb/`. A structural pass is not an assertion that the pending lesson importer is published or integrated.
