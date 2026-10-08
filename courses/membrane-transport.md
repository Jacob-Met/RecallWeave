# Membrane transport: direction, selectivity, and energy

This optional RecallWeave course gives introductory biology learners twelve questions about what crosses a membrane, which way it moves, and where the energy comes from. It connects naturally with the bundled cellular-energy lesson: making ATP and using a stored ion gradient are related steps, but they are different energy mechanisms.

The companion file is [membrane-transport.json](membrane-transport.json). The questions, examples, explanations, and transfer tasks are original. Numerical concentrations describe fictional, idealized systems; they are not experimental measurements or clinical guidance.

## What you will practice

| Concept | Questions | Reasoning goal |
| --- | --- | --- |
| Membrane selectivity | `ms-1`–`ms-3` | Connect the bilayer's structure and a protein's selectivity to the route a substance can take. |
| Passive transport | `pt-1`–`pt-3` | Separate individual movement from net movement, and distinguish a carrier from an energy source. |
| Osmosis | `os-1`–`os-3` | Count retained solute particles, predict initial water movement, and account for pressure. |
| Active transport | `at-1`–`at-3` | Compare chemical and electrical effects, then distinguish direct ATP use from energy stored in a gradient. |

The intended level is high-school biology or a first college biology course. You should recognize a cell membrane, know that ions carry charge, and know that ATP hydrolysis can supply energy. No calculus, membrane-voltage calculation, or prior clinical knowledge is needed. Concentration in mmol/L means millimoles of the stated substance per litre of solution.

RecallWeave can choose a different question order for different sessions. The prerequisite links help its selector identify related concepts; they do not enforce a teaching sequence. Each question therefore supplies the conditions needed to answer it. In particular, the potassium question belongs to the active-transport concept because it prepares you to reason about stored gradients; the channel in that question is itself passive.

## Study with the course

This file requires RecallWeave's local course importer, tracked in [issue #7](https://github.com/Jacob-Met/RecallWeave/issues/7). Use a build that includes its local JSON-deck picker. The course does not replace the bundled lesson automatically.

1. Save the JSON file locally and select it through the deck picker. Check that the preview names this course and shows four concepts and twelve questions.
2. Choose **Start this deck** to begin the new session. Previewing a file alone does not begin it.
3. Before choosing an answer, ask three questions: **Can this substance cross? What drives its net movement? What supplies energy, if energy is needed?**
4. Read the explanation after answering. Try the “Apply the idea” transfer prompt before opening its worked answer below.
5. At the end, review your first answers and use the separate practice round for missed connections. Save study notes if you want the session's answers and explanations in a local text file.

The worked answers below identify choices by their text, not by displayed letters or positions. RecallWeave shuffles displayed options. Practice records a later attempt; it does not rewrite the original answer or the first-session model estimate. Those estimates are pedagogical model states, not grades or validated measures of ability.

## Assumptions that matter

For a neutral solute in the stated ideal, equal-pressure situations, a concentration difference sets the direction of passive net movement. For an ion, electrical attraction or repulsion also matters. A membrane's permeability controls whether a route is available and how readily passage occurs; adding a route does not by itself reverse a driving force.

For the osmosis questions, count dissolved particles that remain on their side of the membrane. “Nonpenetrating” means the solute cannot cross in the specified model. “Non-dissociating” means one dissolved formula unit contributes one particle. The prompts say when pressure is initially equal. Pressure can later oppose the concentration effect, so an initial prediction does not assert that water must continue moving until solute concentrations match.

## Worked answers and misconception guide

### `ms-1` — Two water-facing surfaces

**Answer:** “Hydrophilic heads face the water; hydrophobic tails face one another.”

The phospholipids form two opposing layers. Their heads contact the watery solutions at both surfaces, while their tails form the interior. A useful sketch should show heads on both outer faces rather than treating the bilayer as a single row.

The other choices diagnose three different errors:

- **Tails facing water:** reverses which part interacts favorably with water.
- **All heads on one side:** recognizes two parts but loses the bilayer's two-leaflet arrangement.
- **Heads and tails alternating freely through the thickness:** confuses motion within a membrane with unrestricted mixing of its polar and nonpolar regions.

**Transfer — a cut edge:** A cut can expose the interior tails to water. Closing or sealing that edge reduces this unfavorable exposure while leaving heads facing water. The reasoning concerns the exposed edge; it does not require the phospholipids to stop moving.

### `ms-2` — Size is not the only filter

**Answer:** “Oxygen crosses readily; sodium ions cross very poorly.”

Oxygen is a small nonpolar molecule, whereas sodium is charged. The nonpolar bilayer interior presents a much greater barrier to the ion. The question asks about direct passage through a protein-free membrane, so a channel cannot be silently assumed.

- **Sodium crossing more readily than oxygen:** reverses the effect of the hydrophobic interior.
- **Both crossing because both are small:** uses size as the only permeability rule and ignores charge.
- **Neither crossing without ATP:** treats all membrane passage as active transport, even though oxygen can diffuse directly.

**Transfer — add a sodium channel:** The main change is the route. A suitable channel provides an environment through which sodium can pass without crossing the lipid interior directly. Sodium remains a positively charged ion. Opening the route does not supply the missing information needed to determine its full electrochemical driving force.

### `ms-3` — A channel changes permeability

**Answer:** “Water flows faster in the same direction; solute stays blocked.”

The question holds the driving force fixed and adds water-selective routes. It asks about the rate of an already driven process. It does not say that the solute becomes permeable or that the concentration difference reverses.

- **Water reversing direction:** treats an added route as though it reversed the force driving passage.
- **Solute accelerating while water stops:** assigns a water channel the wrong transported substance.
- **Both substances accelerating:** assumes every pore passes every solute rather than recognizing selectivity.

**Transfer — remove aquaporins:** Water can also cross a lipid bilayer directly, though less readily than through its water channels. Removing aquaporins can reduce total water permeability without making it exactly zero. The same initial direction can therefore remain while the rate falls.

### `pt-1` — Net movement is a difference of fluxes

**Answer:** “More X crosses from A to B than from B to A.”

Initially, side A contains 8 mmol/L and side B contains 2 mmol/L. Under the stated conditions, the difference favors net A-to-B diffusion. It does not prohibit individual B-to-A crossings.

- **Only A-to-B crossings:** replaces a net tendency with a one-way molecular rule.
- **More B-to-A crossings:** reverses the neutral solute's concentration effect.
- **Waiting for ATP:** adds an energy requirement to diffusion that the model does not contain.

**Transfer — 5 mmol/L on both sides:** Net flow becomes zero on average under the same temperature and pressure conditions. Random motion and crossings continue. Equal opposing average fluxes produce zero net flux; zero net flux does not mean zero crossings.

### `pt-2` — Equilibrium is dynamic

**Answer:** “Molecules cross both ways at equal average rates.”

The observation at equilibrium is a balance over many molecular events, not a frozen arrangement. It also does not mean that the membrane changed its selectivity when the concentrations became equal.

- **Molecules stopping:** confuses macroscopic constancy with absence of thermal motion.
- **Only water crossing:** invents a change in membrane permeability for X.
- **ATP balancing crossings:** invents a powered controller for a passive equilibrium.

**Transfer — one labeled molecule:** A single crossing is compatible with either equilibrium or net diffusion. Compare the amount of X crossing each way during an appropriate interval, or measure a sustained change in the total distribution. An imbalance between the opposing average fluxes establishes net movement; one tracked event does not.

### `pt-3` — A carrier need not be an active pump

**Answer:** “Facilitated diffusion down the nutrient's concentration gradient.”

The nutrient has a downhill concentration route, but uses a carrier to cross. The prompt excludes both direct ATP use and coupling to another solute. “Protein-assisted” describes a route, not necessarily an energy input.

- **Primary active because a protein is involved:** substitutes protein presence for evidence of direct energy coupling.
- **Secondary active because every carrier uses an ion gradient:** adds a coupled solute even though the prompt excludes one.
- **Simple diffusion because ATP is absent:** correctly notices the absence of ATP but ignores the required carrier.

**Transfer — increasing nutrient concentration:** A fixed number of carriers can bind and complete only a finite number of transport cycles per unit time. Once they are operating near capacity, supplying still more nutrient need not keep increasing uptake proportionally. This is a capacity limit, not evidence that the carrier began consuming ATP.

### `os-1` — Predict the initial water direction

**Answer:** “Net water leaves the cell, so its volume initially decreases.”

Initially the outside has 300 mmol/L of retained particles and the inside has 200 mmol/L. With only water able to cross and no initial pressure difference, the net water movement is outward. This is an initial prediction; the evolving concentrations and pressure would be needed to determine the eventual state.

- **Water entering and volume increasing:** reverses the initial effect of the retained-particle difference.
- **Solute leaving:** uses a route explicitly excluded by the prompt.
- **No flow because solute is blocked:** overlooks that water can cross even when solute cannot.

**Transfer — exchange the concentrations:** Inside is now 300 mmol/L and outside is 200 mmol/L. Water initially enters and the flexible cell initially gains volume. With equal pressure in this ideal model, compare the total retained-particle concentrations, then predict movement toward the side with the higher value.

### `os-2` — Count particles, not solute names

**Answer:** “No net water flow, although water crosses in both directions.”

On side A, 100 + 100 = 200 mmol/L of retained particles. Side B also has 200 mmol/L. Because the solutions are ideal, the solutes do not dissociate, and the pressures and temperatures match, there is no initial osmotic imbalance. The number of different solute names is irrelevant to this comparison.

- **Flow to A because it has more types:** counts chemical identities instead of particles per volume.
- **Flow to B because 200 exceeds either 100:** compares B against only one of A's two components.
- **No crossings at all:** repeats the mistake of treating equilibrium as a halt to molecular motion.

**Transfer — Z produces two retained particles:** Side B now has 2 × 200 = 400 mmol/L of particles while side A remains at 200 mmol/L. Keeping the other ideal, equal-pressure assumptions, the initial net water movement is toward B. The word “retained” matters: allowing one product to cross would change the model and require more information.

### `os-3` — Pressure can oppose osmosis

**Answer:** “Rising hydrostatic pressure as the cell presses against its wall.”

As the cell pushes against its resistant wall, pressure rises inside. This turgor pressure opposes further net entry. The wall is a mechanical constraint; it does not turn an aquaporin into a pump.

- **ATP pushing water through every aquaporin:** gives passive water channels an active pumping mechanism.
- **The wall becoming a solute-permeable membrane:** confuses the wall with the selective cell membrane and changes a stated permeability condition.
- **Random motion disappearing:** attempts to explain a pressure balance by stopping molecular motion.

**Transfer — unequal solute concentrations at zero net flow:** Yes. A sufficient pressure difference can balance the osmotic effect of the higher retained-solute concentration inside. Both contributions to water movement must be considered. Individual water crossings continue even when their net effect is zero.

### `at-1` — Direct ATP coupling

**Answer:** “Primary active transport, with ATP directly powering uphill movement.”

The specified net movement is from 1 to 10 mmol/L for a neutral solute. The pump couples this uphill movement to ATP hydrolysis. Both the direction and the named energy source distinguish the mechanism.

- **Facilitated diffusion because a protein carries the solute:** notices the route but ignores uphill movement and direct ATP coupling.
- **Simple diffusion because molecules move randomly:** confuses individual random events with a sustained uphill net flux.
- **Secondary active transport:** introduces a second coupled solute that the prompt explicitly excludes.

**Transfer — ATP runs out:** The pump cannot sustain that same uphill net flux without another energy source. Energy already bound or a final incomplete cycle is not a continuing supply. The question concerns sustained transport, not the exact instant at which the last molecular cycle finishes.

### `at-2` — Opposing chemical and electrical effects

**Answer:** “Its direction needs both the chemical and electrical effects to be compared.”

Potassium is positive. Its higher concentration inside favors outward movement, while the negative interior attracts it inward. Opposing signs alone do not tell you which effect is stronger or whether they exactly balance.

- **Always outward:** ignores the electrical contribution.
- **Always inward:** assumes electrical attraction must dominate without its magnitude being supplied.
- **Always zero:** assumes opposition guarantees equality rather than recognizing a possible imbalance.

**Transfer — sodium concentrated outside:** The concentration effect favors inward sodium movement, and the negative interior also favors inward movement of a positive ion. Both contributions point inward, so the initial net passive movement through the open sodium channel is inward. No numerical comparison is needed to decide the direction when both contributions agree.

### `at-3` — A stored gradient can outlast its pump

**Answer:** “Uphill uptake can continue using the sodium gradient, then weaken as that gradient dissipates.”

The operating cotransporter uses energy from sodium moving down its electrochemical gradient. It does not consume ATP directly. Stopping the maintaining pump does not instantly erase a gradient that the prompt says still exists. Continued uphill nutrient uptake depends on that gradient remaining sufficient; it cannot draw on it indefinitely if nothing restores it.

- **Instant stop because every protein needs ATP:** assigns direct ATP consumption to a transporter that the prompt says does not hydrolyze it.
- **Immediate outward nutrient diffusion:** discards the stated coupling while a usable inward sodium gradient remains.
- **Indefinite uphill uptake:** treats a finite stored gradient as an inexhaustible energy supply.

**Transfer — inhibit a different ATP pump:** The first pump may maintain the gradient that supplies the second transporter's immediate energy. Inhibiting the pump can therefore weaken the second transporter later, as the shared gradient runs down, even though the second transporter never binds ATP. This distinguishes direct energy use from dependence on another process that replenishes stored energy.

## References and reuse

Scientific concepts were checked against Mary Ann Clark, Matthew Douglas, and Jung Choi, *Biology 2e*, OpenStax (2018), accessed 8 October 2026:

- [5.1 Components and Structure](https://openstax.org/books/biology-2e/pages/5-1-components-and-structure): bilayer organization (`ms-1`).
- [5.2 Passive Transport](https://openstax.org/books/biology-2e/pages/5-2-passive-transport): selective permeability, protein-assisted transport, carrier capacity, diffusion, osmosis, and pressure (`ms-2`–`os-3`).
- [5.3 Active Transport](https://openstax.org/books/biology-2e/pages/5-3-active-transport): electrochemical gradients, direct ATP coupling, and secondary transport (`at-1`–`at-3`).

The scenarios, numerical choices, question wording, answer options, explanations, and worked transfer tasks in this course were newly written for RecallWeave. No OpenStax passage, question, illustration, or figure is reproduced, and OpenStax has not endorsed this course. The current publisher pages identify their textbook material as CC BY-NC-SA; older references to that book's licensing should not be assumed to describe the current pages.

This original course text is offered under [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/). Retain its attribution when sharing it. This applies to these two course files and does not change the application's code license or the attribution of any other lesson.
